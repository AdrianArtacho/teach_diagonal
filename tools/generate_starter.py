#!/usr/bin/env python3
"""Generate the small, sourced teaching MIDIs. Standard library only.

Preserves unrelated entries in library/index.json. --check verifies bytes,
metadata, source notes, monophony and the declared single-octave range.
"""
import argparse
import json
import re
import struct
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PITCHES = dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)

def note_number(name):
    m = re.fullmatch(r'([A-G])([#b]?)(-?\d+)', name or '')
    if not m:
        raise ValueError(f'Invalid note name: {name}')
    return 12 * (int(m[3]) + 1) + PITCHES[m[1]] + {'': 0, '#': 1, 'b': -1}[m[2]]

def vlq(n):
    if not 0 <= n <= 0x0fffffff:
        raise ValueError('Invalid MIDI delta time')
    data = [n & 127]
    while n >> 7:
        n >>= 7
        data.insert(0, (n & 127) | 128)
    return bytes(data)

def meta(kind, text):
    b = text.encode('utf-8')
    return b'\0\xff' + bytes([kind]) + vlq(len(b)) + b

def encode(song):
    track = meta(3, song['title']) + meta(1, song['adaptation']) + meta(2, song['credit'] + ' | ' + song['license'])
    track += b'\0\xff\x51\x03' + round(60_000_000 / song['bpm']).to_bytes(3, 'big')
    numerator, denominator = song['meter']
    track += b'\0\xff\x58\x04' + bytes([numerator, denominator.bit_length()-1, 24, 8])
    pending = 0
    for name, beats in song['notes']:
        ticks = round(beats * 480)
        if ticks <= 0:
            raise ValueError('Durations must be positive')
        if name is None:
            pending += ticks
            continue
        pitch = note_number(name)
        if not 60 <= pitch <= 72:
            raise ValueError(f"{song['id']}: {name} is outside C4–C5")
        # Small release gap even for consecutive repeated pitches.
        gate = max(1, round(ticks * .92))
        track += vlq(pending) + bytes([144, pitch, 90])
        track += vlq(gate) + bytes([128, pitch, 0])
        pending = ticks - gate
    track += vlq(pending) + b'\xff\x2f\0'
    return b'MThd' + struct.pack('>IHHH', 6, 0, 1, 480) + b'MTrk' + struct.pack('>I', len(track)) + track

def generate(check=False):
    spec = json.loads((ROOT / 'tools/starter-pack.json').read_text())
    index_path = ROOT / 'library/index.json'
    index = json.loads(index_path.read_text())
    sources = ['# Starter pack: sources and changes', '',
        'These are short monophonic teaching adaptations, not complete works or facsimile editions. '
        'Every generated note fits C4–C5 (MIDI 60–72). Rhythm, transposition and register changes are disclosed below. '
        'Local user files are not affected. No source PDF, third-party MIDI recording, modern fingering or accompaniment is bundled.', '']
    summary = []
    for s in spec['songs']:
        pitches = [note_number(n) for n, _ in s['notes'] if n is not None]
        entry = {k: s[k] for k in ['id', 'title', 'file', 'description', 'source', 'license', 'license_url']}
        entry['range'] = [min(pitches), max(pitches)]
        entry['starterPack'] = True
        index = [entry if x['id'] == s['id'] else x for x in index]
        if not any(x['id'] == s['id'] for x in index): index.append(entry)
        data = encode(s)
        target = ROOT / 'library' / s['file']
        if check:
            if not target.exists() or target.read_bytes() != data: raise SystemExit(f'Stale MIDI: {target.name}')
        else: target.write_bytes(data)
        sources += [f"## {s['title']}", '', f"**Source:** [{s['source_title']}]({s['source']})", '',
                    f"**Changes:** {s['adaptation']}", '',
                    f"**Credit:** {s['credit']}", '', f"**Encoding licence:** [{s['license']}]({s['license_url']}).", '',
                    f"**File:** `{s['file']}` · {len(pitches)} notes · MIDI {min(pitches)}–{max(pitches)} · {s['bpm']} quarter notes/minute.", '']
        if s.get('checked_against'): sources += [f"Melodic cross-check: [score excerpt]({s['checked_against']}); linked only, not bundled.", '']
        summary.append({'id':s['id'],'notes':len(pitches),'range':[min(pitches),max(pitches)]})
    for entry in spec['localOnly']:
        index = [entry if x['id']==entry['id'] else x for x in index]
        if not any(x['id']==entry['id'] for x in index): index.append(entry)
    sources += ['## Yakety Sax / Benny Hill', '',
        '“Yakety Sax”, by Boots Randolph and James Q. “Spider” Rich, is not included as a MIDI. '
        'No licence for publishing a new arrangement was established. The library entry explains how to open a local MIDI '
        'you may use; it does not substitute a different melody or silently load a dummy file. '
        '[Work identification](https://en.wikipedia.org/wiki/Yakety_Sax).', '',
        '## Rebuilding', '', '`python3 tools/generate_starter.py` regenerates these files and updates only their index entries; '
        'unrelated library songs are retained. `--check` detects drift. The editable pitches, rhythms and source notes are in `tools/starter-pack.json`.', '']
    outputs = {index_path: json.dumps(index, ensure_ascii=False, indent=2)+'\n', ROOT/'library/SOURCES.md':'\n'.join(sources)}
    for path, text in outputs.items():
        if check:
            if path.read_text() != text: raise SystemExit(f'Stale generated file: {path.name}')
        else: path.write_text(text)
    print(json.dumps({'checked' if check else 'generated': summary}, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    generate(parser.parse_args().check)

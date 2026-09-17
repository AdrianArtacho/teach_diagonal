#!/usr/bin/env python3
"""Rebuild the bundled Standard MIDI Files using only Python's standard library.
These are new, simple teaching sequences, not third-party MIDI downloads.
"""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def vlq(number):
    result = [number & 127]
    while number >> 7:
        number >>= 7
        result.insert(0, (number & 127) | 128)
    return bytes(result)

def midi(title, sequence, bpm=100):
    name = title.encode('utf-8')
    track = b'\x00\xff\x03' + vlq(len(name)) + name
    track += b'\x00\xff\x51\x03' + int(60_000_000 / bpm).to_bytes(3, 'big')
    for pitches, beats in sequence:
        pitches = [pitches] if isinstance(pitches, int) else pitches
        for pitch in pitches:
            track += bytes([0, 144, pitch, 90])
        for i, pitch in enumerate(pitches):
            track += vlq(round(beats * 480) if i == 0 else 0) + bytes([128, pitch, 0])
    track += b'\x00\xff\x2f\x00'
    return b'MThd' + struct.pack('>IHHH', 6, 0, 1, 480) + b'MTrk' + struct.pack('>I', len(track)) + track

def main():
    songs = [
        ('ode-to-joy', 'Ode to Joy', 'L. van Beethoven · opening melody · C major',
         [64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60]),
        ('frere-jacques', 'Frère Jacques', 'Traditional · a first melody across the diamond',
         [60,62,64,60,60,62,64,60,64,65,67,64,65,67,67,69,67,65,64,60,67,69,67,65,64,60,60,67,60,60,67,60]),
        ('chromatic-walk', 'Chromatic Walk', 'Original exercise · discover all five black keys', list(range(60,73))+list(range(71,59,-1))),
        ('diamond-chords', 'Diamond Chords', 'Original exercise · choose “All notes at each onset”', [[60,64,67],[60,65,69],[62,67,71],[64,67,72],[60,64,67]])
    ]
    index = []
    for ident, title, description, notes in songs:
        sequence = [(n, 1 if not isinstance(n, list) else 2) for n in notes]
        if ident == 'ode-to-joy':
            for i in [12,27]: sequence[i] = (notes[i],1.5)
            for i in [13,28]: sequence[i] = (notes[i],0.5)
            for i in [14,29]: sequence[i] = (notes[i],2)
        if ident == 'frere-jacques':
            for i in [10,13,28,31]: sequence[i] = (notes[i],2)
            for i in [14,15,16,17,20,21,22,23]: sequence[i] = (notes[i],0.5)
        (ROOT / 'library' / f'{ident}.mid').write_bytes(midi(title, sequence))
        index.append(dict(id=ident, title=title, file=f'{ident}.mid', description=description))
    (ROOT / 'library' / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2)+'\n')

if __name__ == '__main__': main()

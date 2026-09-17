// Pure musical geometry and a bounded Standard MIDI File (SMF 0/1) reader.
export const WHITE = [0, 2, 4, 5, 7, 9, 11, 12];
export const SHARP_AFTER = [0, 1, 3, 4, 5];
export const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const noteName = n => names[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
export function layout(base = 60) {
  return Array.from({length: 64}, (_, i) => {
    const r = Math.floor(i / 8), c = i % 8;
    const white = r === c, black = c === r + 1 && SHARP_AFTER.includes(r);
    return {r, c, id: `${r}-${c}`, kind: white ? 'white' : black ? 'black' : 'unused',
      note: white ? base + WHITE[r] : black ? base + WHITE[r] + 1 : null};
  });
}
export function address(r, c, rotation = 0) {
  for (let i = 0; i < rotation; i++) [r, c] = [7 - c, r];
  return (8 - r) * 10 + c + 1;
}
export function fold(note, base) {
  return note === base + 12 ? note : base + ((note % 12) + 12) % 12;
}
export function rangeFor(notes, base, policy) {
  if (policy === 'fold') return {base, notes: [...new Set(notes.map(n => fold(n, base)))], blocked: false};
  if (policy === 'follow' && !notes.every(n => n >= base && n <= base + 12)) {
    const possible = Array.from({length: 10}, (_, i) => i * 12)
      .filter(b => notes.every(n => n >= b && n <= b + 12));
    if (possible.length) base = possible.sort((a, b) => Math.abs(a - base) - Math.abs(b - base))[0];
  }
  return {base, notes, blocked: !notes.every(n => n >= base && n <= base + 12)};
}
export function parseMidi(input) {
  const a = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (a.length > 8 * 1024 * 1024) throw new Error('MIDI file is larger than the 8 MB limit.');
  const view = new DataView(a.buffer, a.byteOffset, a.byteLength);
  let p = 0, end = a.length, events = 0;
  const need = n => { if (n < 0 || p + n > end) throw new Error('Truncated or malformed MIDI file.'); };
  const u8 = () => {need(1); return a[p++];};
  const u16 = () => {need(2); const n = view.getUint16(p); p += 2; return n;};
  const u32 = () => {need(4); const n = view.getUint32(p); p += 4; return n;};
  const text = n => {need(n); const s = new TextDecoder().decode(a.subarray(p, p + n)); p += n; return s;};
  const vlq = () => {
    let n = 0;
    for (let i = 0; i < 4; i++) { const b = u8(); n = n * 128 + (b & 127); if (!(b & 128)) return n; }
    throw new Error('Invalid MIDI variable-length integer.');
  };
  if (text(4) !== 'MThd') throw new Error('This is not a Standard MIDI File (.mid / .midi).');
  const len = u32(); if (len < 6) throw new Error('Invalid MIDI header.');
  const format = u16(), count = u16(), division = u16();
  if (format > 1) throw new Error('Format 2 MIDI is not supported. Export as format 0 or 1.');
  if (!division || (division & 0x8000)) throw new Error('SMPTE timing is not supported. Export with musical ticks (PPQ).');
  if (!count || count > 1024 || (format === 0 && count !== 1)) throw new Error('Invalid MIDI track count.');
  need(len - 6); p += len - 6;
  const tracks = [], tempos = [{tick: 0, us: 500000}], warnings = [];
  for (let t = 0; t < count; t++) {
    end = a.length;
    if (text(4) !== 'MTrk') throw new Error('Missing MIDI track chunk.');
    const length = u32(); need(length); end = p + length;
    let tick = 0, running = 0, title = '', dangling = 0;
    const notes = [], active = new Map();
    while (p < end) {
      if (++events > 500000) throw new Error('MIDI file has too many events.');
      tick += vlq(); let status = u8();
      if (status < 128) { if (!running) throw new Error('Invalid MIDI running status.'); p--; status = running; }
      if (status === 255) {
        const type = u8(), size = vlq(); need(size);
        if (type === 3) title = text(size).replace(/[\x00-\x1f]/g, '').slice(0, 160);
        else if (type === 81 && size === 3) { const us = u8() * 65536 + u8() * 256 + u8(); if (us) tempos.push({tick, us}); }
        else p += size;
        // Meta events do not replace the preceding channel-message running status.
        if (type === 47) {p = end; break;}
        continue;
      }
      if (status === 240 || status === 247) {running = 0; const n = vlq(); need(n); p += n; continue;}
      if (status >= 240) throw new Error('Unsupported system event inside MIDI track.');
      running = status;
      const type = status >> 4, channel = status & 15, x = u8(), y = type === 12 || type === 13 ? 0 : u8();
      if (x > 127 || y > 127) throw new Error('Invalid MIDI data byte.');
      const key = `${channel}:${x}`;
      if (type === 9 && y > 0) {
        const n = {midi: x, tick, endTick: tick + division / 2, velocity: y, channel, track: t};
        notes.push(n); if (!active.has(key)) active.set(key, []); active.get(key).push(n);
      } else if (type === 8 || (type === 9 && y === 0)) {
        const n = active.get(key)?.shift(); if (n) n.endTick = Math.max(n.tick + 1, tick);
      }
    }
    for (const queue of active.values()) dangling += queue.length;
    if (dangling) warnings.push(`Track ${t + 1}: ${dangling} unclosed notes use a half-beat duration.`);
    tracks.push({index: t, title: title || `Track ${t + 1}`, notes});
  }
  tempos.sort((a, b) => a.tick - b.tick);
  const map = [];
  for (const item of tempos) {if (map.at(-1)?.tick === item.tick) map[map.length - 1] = item; else map.push(item);}
  let sec = 0;
  for (let i = 0; i < map.length; i++) {
    if (i) sec += (map[i].tick - map[i - 1].tick) / division * map[i - 1].us / 1e6;
    map[i].sec = sec;
  }
  const seconds = tick => {
    let lo = 0, hi = map.length - 1;
    while (lo < hi) {const m = Math.ceil((lo + hi) / 2); if (map[m].tick <= tick) lo = m; else hi = m - 1;}
    return map[lo].sec + (tick - map[lo].tick) / division * map[lo].us / 1e6;
  };
  for (const track of tracks) for (const n of track.notes) {
    n.time = seconds(n.tick); n.duration = Math.max(0.03, seconds(n.endTick) - n.time);
  }
  if (!tracks.some(t => t.notes.some(n => n.channel !== 9))) throw new Error('No pitched notes found (drum channel 10 is excluded).');
  return {format, division, tracks, warnings};
}
export function stepsFor(song, track = 'all', mode = 'melody', transpose = 0) {
  const notes = song.tracks.filter(t => track === 'all' || t.index === Number(track))
    .flatMap(t => t.notes).filter(n => n.channel !== 9).sort((a, b) => a.tick - b.tick || b.midi - a.midi);
  const groups = [];
  for (const n of notes) {
    const pitch = n.midi + transpose;
    if (pitch < 0 || pitch > 127) throw new Error('Transposition places notes outside MIDI 0–127.');
    if (groups.at(-1)?.tick !== n.tick) groups.push({tick: n.tick, time: n.time, duration: n.duration, notes: []});
    const g = groups.at(-1); g.duration = Math.max(g.duration, n.duration);
    if (!g.notes.includes(pitch)) g.notes.push(pitch);
  }
  return groups.map(g => ({...g, notes: mode === 'melody' ? [Math.max(...g.notes)] : g.notes.sort((a, b) => a - b)}));
}
export class Practice {
  constructor() {this.reset([]);}
  reset(steps) {this.steps = steps; this.index = 0; this.accepted = new Set(); this.hits = 0; this.errors = 0;}
  press(note, expected) {
    if (this.index >= this.steps.length) return 'free';
    if (!expected.includes(note)) {this.errors++; return 'wrong';}
    if (this.accepted.has(note)) return 'held';
    this.accepted.add(note); this.hits++;
    if (expected.every(n => this.accepted.has(n))) {this.index++; this.accepted.clear(); return 'advance';}
    return 'correct';
  }
  seek(index) {this.index = Math.max(0, Math.min(this.steps.length, index)); this.accepted.clear();}
}

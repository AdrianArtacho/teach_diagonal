import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layout, address, rangeFor, fold, noteName, parseMidi, stepsFor, Practice} from '../src/music.js';
import {decodeNote, programmerMessage, Midi} from '../src/midi.js';
const file = name => readFileSync(new URL(`../library/${name}.mid`, import.meta.url));
const be32 = n => [n >>> 24, n >>> 16 & 255, n >>> 8 & 255, n & 255];
const smf = (...tracks) => Uint8Array.from([...Buffer.from('MThd'),0,0,0,6,0,tracks.length>1?1:0,0,tracks.length,1,224,
  ...tracks.flatMap(t => [...Buffer.from('MTrk'),...be32(t.length),...t])]);
test('64 pads; eight whites, five accidentals, 51 inactive', () => {
  const p = layout(); assert.equal(p.length,64); assert.equal(p.filter(p=>p.kind==='white').length,8);
  assert.equal(p.filter(p=>p.kind==='black').length,5); assert.equal(p.filter(p=>p.note===null).length,51);
});
test('white diagonal is C4 to C5, left to right after −45° rotation',()=>assert.deepEqual(layout().filter(p=>p.kind==='white').map(p=>p.note),[60,62,64,65,67,69,71,72]));
test('accidentals sit above, no black keys between E/F or B/C',()=>assert.deepEqual(layout().filter(p=>p.kind==='black').map(p=>[p.r,p.c,p.note]),[[0,1,61],[1,2,63],[3,4,66],[4,5,68],[5,6,70]]));
test('Mini programmer note addresses match factory grid',()=>assert.deepEqual([address(0,0),address(7,0),address(7,7),address(0,7)],[81,11,18,88]));
test('every orientation is a 64-address bijection',()=>{for(let r=0;r<4;r++) assert.equal(new Set(layout().map(p=>address(p.r,p.c,r))).size,64);});
test('rotation cycles physical corners',()=>assert.deepEqual([0,1,2,3].map(r=>address(0,0,r)),[81,11,18,88]));
test('C4 naming convention and sharps',()=>{assert.equal(noteName(60),'C4');assert.equal(noteName(61),'C♯4');assert.equal(noteName(0),'C-1');});
test('follow range does not move a visible upper C',()=>assert.equal(rangeFor([72],60,'follow').base,60));
test('follow shifts for out-of-range pitches',()=>assert.equal(rangeFor([73],60,'follow').base,72));
test('wide chords are explicitly blocked',()=>assert.equal(rangeFor([48,72],60,'follow').blocked,true));
test('fixed mode blocks rather than silently omitting notes',()=>assert.equal(rangeFor([59],60,'fixed').blocked,true));
test('fold is explicit and collapses unison pitch classes',()=>assert.deepEqual(rangeFor([48,60,64,76],60,'fold').notes,[60,64]));
test('fold retains displayed top C',()=>assert.equal(fold(72,60),72));
for(const name of ['ode-to-joy','frere-jacques','chromatic-walk','diamond-chords']) test(`parses bundled ${name}`,()=>{
  const song=parseMidi(file(name)); assert.equal(song.format,0);assert.equal(song.division,480);assert.ok(stepsFor(song).length>0);assert.equal(song.warnings.length,0);
});
test('melody versus chords',()=>{
  const s=parseMidi(file('diamond-chords'));assert.deepEqual(stepsFor(s,'all','melody')[0].notes,[67]);assert.deepEqual(stepsFor(s,'all','chords')[0].notes,[60,64,67]);
});
test('transposes all song notes',()=>assert.equal(stepsFor(parseMidi(file('ode-to-joy')),'all','melody',12)[0].notes[0],76));
test('rejects impossible transposition',()=>assert.throws(()=>stepsFor(parseMidi(file('ode-to-joy')),'all','melody',100),/outside/));
test('running status and velocity-zero note-off',()=>{
 const s=parseMidi(smf([0,144,60,90,0x83,0x60,60,0,0,255,47,0]));assert.equal(s.tracks[0].notes[0].duration,0.5);
});
test('tempo changes are integrated across conductor and note tracks',()=>{
 const s=parseMidi(smf([0,255,81,3,7,161,32,0x83,0x60,255,81,3,15,66,64,0,255,47,0],
 [0,144,60,90,0x87,0x40,128,60,0,0,255,47,0]));assert.equal(s.tracks[1].notes[0].duration,1.5);
});
test('track and channel selection excludes percussion',()=>{
 const s=parseMidi(smf([0,144,60,90,0,153,90,100,0x83,0x60,128,60,0,0,137,90,0,0,255,47,0]));
 assert.deepEqual(stepsFor(s)[0].notes,[60]);
});
test('overlapping same-note voices pair note-offs FIFO',()=>{
 const s=parseMidi(smf([0,144,60,90,0x81,0x70,144,60,80,0x81,0x70,128,60,0,0x81,0x70,128,60,0,0,255,47,0]));
 assert.deepEqual(s.tracks[0].notes.map(n=>n.duration),[0.5,0.5]);
});
test('dangling notes produce a warning and finite fallback duration',()=>{
 const s=parseMidi(smf([0,144,60,90,0,255,47,0]));assert.equal(s.warnings.length,1);assert.equal(s.tracks[0].notes[0].duration,0.25);
});
test('rejects bad signature',()=>assert.throws(()=>parseMidi(new Uint8Array(32)),/Standard MIDI/));
test('rejects truncated chunk',()=>assert.throws(()=>parseMidi(file('ode-to-joy').subarray(0,50)),/Truncated/));
test('rejects format 2',()=>{const b=Uint8Array.from(file('ode-to-joy'));b[9]=2;assert.throws(()=>parseMidi(b),/Format 2/);});
test('rejects SMPTE',()=>{const b=Uint8Array.from(file('ode-to-joy'));b[12]=0xe8;assert.throws(()=>parseMidi(b),/SMPTE/);});
test('rejects overlong VLQ',()=>assert.throws(()=>parseMidi(smf([128,128,128,128,0])),/variable-length/));
test('rejects running status without a status',()=>assert.throws(()=>parseMidi(smf([0,60,90])),/running status/));
test('wrong notes do not advance',()=>{const p=new Practice();p.reset([{}]);assert.equal(p.press(62,[60]),'wrong');assert.equal(p.index,0);assert.equal(p.errors,1);});
test('correct notes advance and song completion is safe',()=>{const p=new Practice();p.reset([{}]);assert.equal(p.press(60,[60]),'advance');assert.equal(p.index,1);assert.equal(p.press(60,[]),'free');});
test('chord collection accepts each distinct note once',()=>{const p=new Practice();p.reset([{}]);p.press(64,[60,64]);assert.equal(p.press(64,[60,64]),'held');assert.equal(p.index,0);p.press(60,[60,64]);assert.equal(p.index,1);});
test('seek clamps and clears partial chord',()=>{const p=new Practice();p.reset([{},{}]);p.press(64,[60,64]);p.seek(-4);assert.equal(p.index,0);assert.equal(p.accepted.size,0);p.seek(100);assert.equal(p.index,2);});
test('MIDI handles explicit note-off and velocity zero on any channel',()=>{assert.equal(decodeNote([0x95,81,0]).on,false);assert.equal(decodeNote([0x85,81,40]).on,false);assert.equal(decodeNote([0x95,81,127]).channel,5);});
test('MIDI ignores clock, CC and short packets',()=>{assert.equal(decodeNote([248]),null);assert.equal(decodeNote([176,1,127]),null);assert.equal(decodeNote([144,60]),null);});
test('Mini MK3 SysEx mode command has correct model identifier',()=>{assert.deepEqual(programmerMessage(true),[240,0,32,41,2,13,14,1,247]);assert.equal(programmerMessage(false)[7],0);});
test('lighting is opt-in, addressed as pads not musical pitches, and delta-cached',()=>{
 const sent=[],m=new Midi(()=>{},()=>{},()=>{});m.out={send:msg=>sent.push(msg)};
 m.paint(layout(),[60],new Set(),new Set(),new Set());assert.equal(sent.length,0);
 m.lights=true;m.paint(layout(),[60],new Set(),new Set(),new Set());assert.equal(sent.length,64);assert.ok(sent.some(a=>a[1]===81&&a[2]===37));
 m.paint(layout(),[60],new Set(),new Set(),new Set());assert.equal(sent.length,64);m.clear();assert.equal(sent.length,128);assert.ok(sent.slice(64).every(a=>a[2]===0));
});
test('learned map respects input channels',()=>{const m=new Midi();m.profile='custom';m.custom={'0-0':{note:36,channel:2}};assert.equal(m.padFor(36,2,layout()).note,60);assert.equal(m.padFor(36,1,layout()),undefined);});

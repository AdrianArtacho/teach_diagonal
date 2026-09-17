import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Repeat, loopOption, loopURL} from '../src/repeat.js';
import {Practice, layout} from '../src/music.js';
import {Midi} from '../src/midi.js';
import {NOVATION_PROFILE, NOVATION_MAPPING} from '../src/presets.js';
const url = 'https://example.test/teach_diagonal/?song=ode-to-joy&view=piano&simple=1#lesson';
test('loop defaults off and uses saved preference', () => {
  assert.equal(loopOption(url), false); assert.equal(loopOption(url, {loop:true}), true);
});
test('explicit URL loop overrides saved preference', () => {
  assert.equal(loopOption(url.replace('#lesson','&loop=0#lesson'), {loop:true}), false);
  assert.equal(loopOption(url.replace('#lesson','&loop=1#lesson'), {loop:false}), true);
});
test('loop accepts bare, true and 1 but not arbitrary values', () => {
  for (const value of ['', '1', 'true', 'yes', 'on']) assert.equal(loopOption('https://example.test/?loop='+value), true);
  for (const value of ['0', 'false', 'no', 'bad']) assert.equal(loopOption('https://example.test/?loop='+value), false);
});
test('loop links preserve view, song, simple, path and fragment', () => {
  const u=loopURL(url,true); assert.equal(u.searchParams.get('loop'),'1');
  assert.equal(u.searchParams.get('song'),'ode-to-joy'); assert.equal(u.searchParams.get('view'),'piano');
  assert.equal(u.searchParams.get('simple'),'1'); assert.equal(u.hash,'#lesson');
  assert.equal(u.pathname,'/teach_diagonal/');
  assert.equal(loopURL(url,false).searchParams.get('loop'),'0');
});
test('loop policy never wraps an empty or unfinished melody', () => {
  const r=new Repeat(), p=new Practice(); r.enabled=true;
  assert.equal(r.wrap(p),false); p.reset([{},{}]); p.press(60,[60]); assert.equal(r.wrap(p),false);
});
test('disabled loop leaves the completed state intact', () => {
  const r=new Repeat(), p=new Practice(); p.reset([{}]); p.press(60,[60]);
  assert.equal(r.wrap(p),false); assert.equal(p.index,1);
});
test('loop restarts after the complete chord and retains session scores', () => {
  const r=new Repeat(), p=new Practice(); r.enabled=true; p.reset([{}]);
  p.press(62,[60,64]); p.press(60,[60,64]); assert.equal(r.wrap(p),false);
  p.press(64,[60,64]); assert.equal(r.wrap(p),true);
  assert.equal(p.index,0); assert.equal(p.accepted.size,0); assert.equal(r.laps,1);
  assert.equal(p.errors,1); assert.equal(p.hits,2);
});
test('multiple completed loops wrap once per completed round', () => {
  const r=new Repeat(), p=new Practice(); r.enabled=true; p.reset([{}]);
  for (let i=1;i<=4;i++) {p.press(60,[60]); assert.equal(r.wrap(p),true); assert.equal(r.wrap(p),false); assert.equal(r.laps,i);}
});
test('bundled mapping exactly preserves the uploaded data values', () => {
  const original=JSON.parse(readFileSync(new URL('../mappings/novation-launchpad.json',import.meta.url),'utf8'));
  assert.equal(original.format,'diamond-pad-map'); assert.equal(original.version,2);
  assert.deepEqual(NOVATION_MAPPING, original.mapping);
  assert.deepEqual(layout().filter(p=>p.kind==='white').map(p=>NOVATION_MAPPING[p.id].note),[64,61,58,55,80,77,74,71]);
  assert.deepEqual(layout().filter(p=>p.kind==='black').map(p=>NOVATION_MAPPING[p.id].note),[65,62,84,81,78]);
});
test('generated preset module matches its source JSON', () => {
  execFileSync(process.execPath, [new URL('../tools/generate_preset.mjs',import.meta.url).pathname,'--check']);
});
test('preset map is immutable and does not replace custom data', () => {
  const midi=new Midi(); midi.custom={'0-0':{note:35,channel:4}}; midi.profile=NOVATION_PROFILE;
  assert.ok(midi.mapped); assert.equal(midi.padAddress({id:'0-0'}),64);
  assert.throws(()=>{NOVATION_MAPPING['0-0'].note=1;},TypeError);
  midi.profile='custom'; assert.equal(midi.padAddress({id:'0-0'}),35);
});
test('preset matches actual MIDI input channel and works in any musical octave', () => {
  const midi=new Midi(); midi.profile=NOVATION_PROFILE;
  assert.equal(midi.padFor(64,0,layout(72)).note,72); assert.equal(midi.padFor(64,1,layout()),undefined);
  midi.rotation=3; assert.equal(midi.padFor(64,0,layout()).note,60);
});
test('preset lights exact exported addresses, then clears them', () => {
  const sent=[],midi=new Midi(()=>{},()=>{},()=>{}); midi.profile=NOVATION_PROFILE; midi.lights=true;
  midi.out={send:b=>sent.push(b)}; midi.paint(layout(),[60],new Set(),new Set(),new Set());
  assert.equal(sent.length,13); assert.ok(sent.some(b=>b[0]===144&&b[1]===64&&b[2]===37));
  midi.clear(); assert.equal(sent.length,26); assert.ok(sent.slice(13).every(b=>b[2]===0));
});
test('preset selection is local and never sends a mode command', () => {
  const sent=[],midi=new Midi(); midi.out={send:b=>sent.push(b)}; midi.profile=NOVATION_PROFILE;
  assert.equal(sent.length,0); assert.equal(midi.programmed,false);
});
test('new browsers default to Novation preset and deployment includes its JSON', () => {
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.includes('<select id="profile"><option value="novation-launchpad">'));
  const yml=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
  assert.ok(yml.includes('cp -R src library mappings')); assert.ok(yml.includes('node tools/generate_preset.mjs --check'));
});

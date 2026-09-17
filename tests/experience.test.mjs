import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeMapping, importMapping, exportMapping, playablePads, learnOrder} from '../src/mapping.js';
import {viewOptions, viewURL} from '../src/experience.js';
import {Midi} from '../src/midi.js';
const example = () => Object.fromEntries(playablePads.map((p,i) => [p.id,{note:36+i,channel:2,ledNote:90+i,ledChannel:4}]));
const url = 'https://example.test/teach_diagonal/?song=ode-to-joy';
test('view URLs default to diamond and full controls',()=>assert.deepEqual(viewOptions(url),{view:'diamond',simple:false}));
test('piano and simple URL override remembered preferences',()=>assert.deepEqual(viewOptions(url+'&view=piano&simple=1',{view:'diamond',simple:false}),{view:'piano',simple:true}));
test('clear alias opens simple mode',()=>assert.equal(viewOptions(url+'&clear=1').simple,true));
test('bare simple option and true are accepted',()=>{assert.equal(viewOptions(url+'&simple').simple,true);assert.equal(viewOptions(url+'&simple=true').simple,true)});
test('explicit simple=0 overrides persistence and alias',()=>assert.equal(viewOptions(url+'&simple=0&clear=1',{simple:true}).simple,false));
test('invalid view and boolean have safe defaults',()=>assert.deepEqual(viewOptions(url+'&view=%3Cscript%3E&simple=nope'),{view:'diamond',simple:false}));
test('saved view is used without URL options',()=>assert.deepEqual(viewOptions(url,{view:'piano',simple:true}),{view:'piano',simple:true}));
test('view URL preserves song, path, unrelated parameters and hash',()=>{
 const result=viewURL(url+'&foo=bar&clear=1#lesson',{view:'piano',simple:true});
 assert.equal(result.pathname,'/teach_diagonal/');assert.equal(result.searchParams.get('song'),'ode-to-joy');
 assert.equal(result.searchParams.get('foo'),'bar');assert.equal(result.hash,'#lesson');assert.equal(result.searchParams.has('clear'),false);
});
test('learning order: eight white keys then five sharps',()=>{assert.equal(learnOrder.length,13);assert.ok(learnOrder.slice(0,8).every(p=>p.kind==='white'));assert.equal(new Set(learnOrder.map(p=>p.id)).size,13)});
test('valid complete map has thirteen independent MIDI/LED addresses',()=>assert.deepEqual(normalizeMapping(example(),true),example()));
test('old input-only map migrates LED note and channel',()=>assert.deepEqual(normalizeMapping({'0-0':{note:36,channel:7}})['0-0'],{note:36,channel:7,ledNote:36,ledChannel:0}));
test('rejects partial maps on Apply/Export',()=>assert.throws(()=>normalizeMapping({'0-0':{note:36,channel:1}},true),/13/));
test('rejects duplicate input pairs',()=>{const m=example();m['1-1'].note=m['0-0'].note;assert.throws(()=>normalizeMapping(m),/input/)});
test('same input note on different channels is allowed with distinct LED destinations',()=>{const m=example();m['1-1'].note=m['0-0'].note;m['1-1'].channel=6;assert.equal(Object.keys(normalizeMapping(m)).length,13)});
test('rejects duplicate output pairs',()=>{const m=example();m['1-1'].ledNote=m['0-0'].ledNote;assert.throws(()=>normalizeMapping(m),/LED/)});
test('same output note on different LED channels is allowed',()=>{const m=example();m['1-1'].ledNote=m['0-0'].ledNote;m['1-1'].ledChannel=3;assert.equal(Object.keys(normalizeMapping(m)).length,13)});
for(const value of [-1,128,NaN,1.5,'60']) test(`rejects invalid note ${String(value)}`,()=>{const m=example();m['0-0'].note=value;assert.throws(()=>normalizeMapping(m),/whole number/)});
test('rejects out-of-range channels and unknown pad roles',()=>{assert.throws(()=>normalizeMapping({'0-0':{note:60,channel:16}}));assert.throws(()=>normalizeMapping({'2-3':{note:60,channel:0}}))});
test('JSON export round-trips through import',()=>assert.deepEqual(importMapping(exportMapping(example())),example()));
test('accepts raw map and v1 custom envelope',()=>{assert.deepEqual(importMapping(JSON.stringify(example())),example());assert.deepEqual(importMapping(JSON.stringify({version:1,custom:example()})),example())});
test('rejects malformed, unrelated, large and future-version imports',()=>{
 for (const s of ['{oops','null','[]',JSON.stringify({format:'other'}),JSON.stringify({version:3,mapping:example()}),' '.repeat(65537)]) assert.throws(()=>importMapping(s));
});
test('custom input mapping is independent of LED output mapping',()=>{
 const m=new Midi();m.profile='custom';m.custom=example();
 assert.equal(m.padFor(36,2,playablePads).id,'0-0');assert.equal(m.padFor(36,0,playablePads),undefined);
 assert.deepEqual(m.ledAddress(playablePads.find(p=>p.id==='0-0')),{note:90,channel:4});
});
test('custom LEDs use configured channel and address, including cleanup',()=>{
 const sent=[],m=new Midi();m.out={send:b=>sent.push(b)};m.custom=example();m.profile='custom';m.lights=true;
 m.paint(playablePads,[60],new Set(),new Set(),new Set());assert.ok(sent.some(b=>b[0]===148&&b[1]===90&&b[2]===37));
 m.clear();assert.ok(sent.slice(13).every(b=>b[0]===148&&b[2]===0));
});
test('LED test is explicit and cleanup works with lighting disabled',()=>{
 const sent=[],m=new Midi();m.out={send:b=>sent.push(b)};m.testLed({note:42,channel:3},17);
 assert.deepEqual(sent,[[147,42,17]]);m.clear();assert.deepEqual(sent[1],[147,42,0]);
});
test('invalid LED test sends nothing',()=>{const m=new Midi();assert.throws(()=>m.testLed({note:36,channel:0},128),/velocity/)});
test('HTML loads v2 stylesheet after base stylesheet',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.indexOf('href="experience.css"')>html.indexOf('href="styles.css"'));
});
test('Pages stages experience stylesheet and all module directories',()=>{
 const yml=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');assert.ok(yml.includes('experience.css'));assert.ok(yml.includes('cp -R src library'));
});

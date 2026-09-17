import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fullscreenRequested} from '../src/fullscreen.js';
import {viewOptions, viewURL} from '../src/experience.js';
import {parseMidi, stepsFor} from '../src/music.js';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const manifest = JSON.parse(read('tools/starter-pack.json'));
const index = JSON.parse(read('library/index.json'));
const URLBASE = 'https://example.test/teach_diagonal/?song=augustin&loop=1';
for (const value of ['', '1', 'true', 'YES', 'on']) test(`fullscreen=${value} expresses entry intent`,()=>assert.equal(fullscreenRequested(URLBASE+'&fullscreen='+value),true));
for (const value of ['0','false','no','undefined']) test(`fullscreen=${value} is not entry intent`,()=>assert.equal(fullscreenRequested(URLBASE+'&fullscreen='+value),false));
test('missing fullscreen param does not request it',()=>assert.equal(fullscreenRequested(URLBASE),false));
test('fullscreen link defaults to simple view but honors an explicit full-controls override',()=>{
 assert.equal(viewOptions(URLBASE+'&fullscreen=1').simple,true);
 assert.equal(viewOptions(URLBASE+'&fullscreen=1&simple=0').simple,false);
 assert.equal(viewOptions(URLBASE+'&fullscreen=0').simple,false);
});
test('view link retains fullscreen, loop and song',()=>{
 const url=viewURL(URLBASE+'&fullscreen=1',{view:'piano',simple:true});
 for (const [k,v] of [['fullscreen','1'],['loop','1'],['song','augustin']]) assert.equal(url.searchParams.get(k),v);
});
for (const entry of manifest.songs) test(`${entry.id}: generated pitches, onset rhythm, monophony and one-octave limits`,()=>{
 const song=parseMidi(read('library/'+entry.file));
 assert.equal(song.tracks.length,1);assert.equal(song.warnings.length,0);
 const notes=song.tracks[0].notes;
 assert.equal(notes.length,entry.notes.filter(([n])=>n!=null).length);
 let tick=0,i=0;
 const pitch=n=>{const m=n.match(/^([A-G])([#b]?)(-?\d+)$/);return (Number(m[3])+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[m[1]]+({'':0,'#':1,b:-1})[m[2]]};
 for (const [name,beats] of entry.notes) {
  if(name!==null){const note=notes[i++];assert.equal(note.midi,pitch(name));assert.equal(note.tick,tick);assert.ok(note.midi>=60&&note.midi<=72);}
  tick+=Math.round(beats*480);
 }
 for(let j=1;j<notes.length;j++) assert.ok(notes[j-1].endTick<=notes[j].tick);
 assert.ok(stepsFor(song).every(step=>step.notes.length===1));
 const catalog=index.find(x=>x.id===entry.id);assert.ok(catalog?.file);assert.ok(catalog.source);assert.ok(catalog.license);
});
test('every public library entry is either playable or explicitly local-only',()=>{
 assert.equal(new Set(index.map(x=>x.id)).size,index.length);
 for(const entry of index){if(entry.localOnly){assert.equal(entry.file,undefined);continue;}assert.ok(stepsFor(parseMidi(read('library/'+entry.file))).length>0);}
});
test('Yakety Sax entry does not contain a bundled or substitute MIDI',()=>{
 const entry=index.find(x=>x.id==='yakety-sax');assert.equal(entry.localOnly,true);assert.equal(entry.file,undefined);
 assert.equal(manifest.songs.some(x=>x.id==='yakety-sax'),false);
});
test('Moonlight credit states source engraving and share-alike licence',()=>{
 const entry=manifest.songs.find(x=>x.id==='moonlight');assert.equal(entry.license,'CC BY-SA 2.5');assert.match(entry.credit,/Stewart Holmes/);
 assert.match(entry.description,/triplet/);assert.match(read('library/SOURCES.md').toString(),/creativecommons.org\/licenses\/by-sa\/2.5/);
});
test('all existing four library demos remain present',()=>{
 for(const id of ['ode-to-joy','frere-jacques','chromatic-walk','diamond-chords']) assert.ok(index.find(x=>x.id===id)?.file);
});
test('starter generator drift check succeeds',()=>execFileSync('python3',['tools/generate_starter.py','--check'],{cwd:root,stdio:'pipe'}));
test('CI checks starter data before deployment',()=>assert.match(read('.github/workflows/pages.yml').toString(),/generate_starter.py --check/));
test('both layouts include a fullscreen toggle and startup asks for a gesture',()=>{
 const html=read('index.html').toString();for(const id of ['fullscreen','simple-fullscreen','fullscreen-enter','fullscreen-dismiss']) assert.ok(html.includes(`id="${id}"`));
 assert.match(read('src/fullscreen.js').toString(),/before any await/);
});

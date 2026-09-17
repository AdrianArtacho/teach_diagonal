import {layout, noteName, parseMidi, stepsFor, rangeFor, Practice, WHITE} from './music.js';
import {Sound} from './audio.js';
import {Midi, decodeNote, isLaunchpad} from './midi.js';
import {normalizeMapping} from './mapping.js';
import {setupExperience} from './experience.js';
import {Repeat, setupRepeat} from './repeat.js';
const $ = id => document.getElementById(id);
const practice = new Practice(), voices = new Map(), wrong = new Set();
let pads = layout(), base = 60, song = null, catalog = [], free = false, listening = false, listenIndex = 0;
let playToken = 0, loadToken = 0, errorTimer = 0;
let experience, repeatUI;
const repeat = new Repeat();
const timers = new Set();
let settings = {};
try {const stored = JSON.parse(localStorage.getItem('diamond-v1') || '{}'); if (stored && typeof stored === 'object' && !Array.isArray(stored)) settings = stored;} catch {}
const storedControls = ['reading', 'play-mode', 'range-mode', 'octave', 'transpose', 'speed', 'input-kind', 'profile', 'rotation', 'timbre', 'volume'];
function save() {
  for (const id of storedControls) settings[id] = $(id).value;
  settings.sound = $('sound-enabled').checked; settings.custom = midi.custom;
  try {localStorage.setItem('diamond-v1', JSON.stringify(settings));} catch {}
}
function notice(message = '') {$('notice').textContent = message; $('notice').hidden = !message;}
const safe = fn => (...args) => Promise.resolve().then(() => fn(...args)).catch(e => notice(e.message));
const sound = new Sound(() => {$('sound-start').textContent = sound.enabled ? 'Sound on' : 'Sound muted';});
const midi = new Midi(receive, refreshPorts, message => notice(`MIDI: ${message}`));
function later(fn, ms) {const id = setTimeout(() => {timers.delete(id); fn();}, Math.max(0, ms)); timers.add(id); return id;}
function step() {return practice.steps[listening ? listenIndex : practice.index];}
function target() {
  if (free && !listening) return {notes: [], blocked: false, base};
  const s = step(); if (!s) return {notes: [], blocked: false, base};
  return rangeFor(s.notes, base, $('range-mode').value);
}
function held() {return new Set([...voices.values()].map(v => v.note));}
function updateLayout() {
  pads = layout(base);
  for (const pad of pads) {
    const button = $(`pad-${pad.id}`);
    button.dataset.note = pad.note ?? '';
    button.firstChild.textContent = pad.note == null ? '' : noteName(pad.note);
    button.setAttribute('aria-label', pad.note == null ? 'Unused pad' : `${noteName(pad.note)}, ${pad.kind} key`);
  }
  for (const key of document.querySelectorAll('.piano-key')) {
    const note = base + Number(key.dataset.offset); key.dataset.note = note;
    key.textContent = noteName(note); key.setAttribute('aria-label', `${noteName(note)}, piano key`);
  }
  $('range-label').textContent = `${noteName(base)} — ${noteName(base + 12)}`;
}
function render() {
  const expected = target();
  if (expected.base !== base) {base = expected.base; updateLayout();}
  const active = held(), notes = expected.blocked ? [] : expected.notes;
  for (const key of document.querySelectorAll('[data-note]')) {
    const n = key.dataset.note === '' ? null : Number(key.dataset.note);
    key.classList.toggle('target', notes.includes(n)); key.classList.toggle('pressed', active.has(n));
    key.classList.toggle('wrong', wrong.has(n)); key.classList.toggle('accepted', !listening && practice.accepted.has(n));
    key.setAttribute('aria-pressed', String(active.has(n)));
  }
  midi.paint(pads, notes, active, wrong, listening ? new Set() : practice.accepted);
  const done = practice.steps.length && practice.index >= practice.steps.length;
  $('next-label').textContent = listening ? 'LISTENING' : free ? 'EXPLORE THE KEYS' : done ? 'MELODY COMPLETE' : expected.blocked ? 'OUTSIDE THIS OCTAVE' : 'PLAY NEXT';
  $('next-note').textContent = free && !listening ? 'Free play' : done && !listening ? 'Well played.' : expected.notes.map(noteName).join(' · ') || '—';
  $('next-note').classList.toggle('chord', expected.notes.length > 1 || (done && !listening) || free);
  $('original-note').textContent = step() && $('range-mode').value === 'fold' ? `Original: ${step().notes.map(noteName).join(' · ')} · octave-folded practice` : `Visible register: ${noteName(base)}–${noteName(base + 12)}`;
  if (expected.blocked) $('feedback').textContent = 'This step does not fit. Choose octave folding, change the octave, or select a melody part.';
  else if (free) $('feedback').textContent = 'Explore with pads, piano, touch, or MIDI.';
  else if (listening) $('feedback').textContent = 'Listen to the melody and watch the corresponding keys.';
  else if (done) $('feedback').textContent = 'You reached the end. Restart for another round.';
  else if (!wrong.size) $('feedback').textContent = practice.accepted.size ? 'Good. Now play the remaining highlighted notes.' : 'Play the illuminated note. Take your time.';
  const index = listening ? listenIndex : practice.index;
  $('progress-label').textContent = practice.steps.length ? `${Math.min(index + 1, practice.steps.length)} / ${practice.steps.length} steps` : 'No melody loaded';
  $('progress').max = practice.steps.length || 1; $('progress').value = done && !listening ? practice.steps.length : index;
  $('score').textContent = practice.errors ? `${practice.errors} ${practice.errors === 1 ? 'retry' : 'retries'}` : 'No rush.';
  $('upcoming').replaceChildren(...practice.steps.slice(index, index + 5).map(s => {
    const span = document.createElement('span'); span.textContent = s.notes.map(noteName).join('+'); return span;
  }));
  $('listen').textContent = listening ? '■ Stop' : '▶ Listen';
  for (const id of ['listen', 'restart', 'back', 'next']) $(id).disabled = !practice.steps.length;
  $('hear-note').disabled = !step();
  $('rotation').disabled = midi.mapped;
  $('rotation').title = midi.mapped ? 'This mapping already defines physical orientation. Learn a custom map after rotating the controller.' : '';
  experience?.status(); repeatUI?.status();
}
function press(note, id, velocity = 96, gesture = false, judge = true) {
  if (!Number.isInteger(note) || note < 0 || note > 127 || voices.has(id)) return;
  const alreadyHeld = held().has(note), out = midi.synth;
  const alreadySent = [...voices.values()].some(v => v.note === note && v.out === out);
  voices.set(id, {note, out});
  if (out && !alreadySent) midi.send(out, [144, note, velocity]);
  if (gesture) {
    // Context creation/resume is called synchronously within the pointer/key gesture.
    sound.unlock().then(() => {if (voices.get(id)?.note === note) sound.on(id, note, velocity);}).catch(e => notice(e.message));
  } else sound.on(id, note, velocity);
  if (judge && !alreadyHeld && !free && !listening && !target().blocked) {
    const result = practice.press(note, target().notes);
    if (result === 'wrong') {
      wrong.add(note); $('feedback').textContent = `You played ${noteName(note)}. Try the illuminated note.`;
      clearTimeout(errorTimer); errorTimer = setTimeout(() => {wrong.clear(); render();}, 700);
    } else {wrong.clear();}
    if (result === 'advance') repeat.wrap(practice); // Keep held voices until their real note-off.
  }
  render();
}
function release(id) {
  const voice = voices.get(id); if (!voice) return;
  voices.delete(id); sound.off(id);
  if (voice.out && ![...voices.values()].some(v => v.note === voice.note && v.out === voice.out)) midi.send(voice.out, [128, voice.note, 0]);
  render();
}
function silence() {
  for (const id of [...voices.keys()]) release(id);
  sound.panic(); wrong.clear(); clearTimeout(errorTimer);
}
function stopListen() {
  playToken++; for (const t of timers) clearTimeout(t); timers.clear(); listening = false;
  silence(); render();
}
function restart() {stopListen(); repeat.laps = 0; practice.seek(0); practice.hits = 0; practice.errors = 0; base = Number($('octave').value); updateLayout(); render();}
function rebuild() {
  cancelLearn(); stopListen(); repeat.laps = 0; base = Number($('octave').value); updateLayout();
  if (!song) return;
  try {
    const transposition = Number($('transpose').value);
    if (!Number.isInteger(transposition) || Math.abs(transposition) > 24) throw new Error('Use a whole-number transposition between −24 and +24.');
    practice.reset(stepsFor(song, $('track').value, $('reading').value, transposition));
    notice(song.warnings.join(' '));
  } catch (e) {practice.reset([]); notice(e.message);}
  render(); save();
}
function setSong(bytes, title, description, id) {
  const parsed = parseMidi(bytes); // Invalid files do not destroy the currently loaded song.
  stopListen(); song = parsed;
  $('song-title').textContent = title; $('song-description').textContent = description;
  $('track').replaceChildren(new Option('All pitched tracks', 'all'));
  const tracks = song.tracks.filter(t => t.notes.some(n => n.channel !== 9));
  for (const t of tracks) $('track').add(new Option(`${t.title} (${t.notes.filter(n => n.channel !== 9).length} notes)`, t.index));
  const avg = t => {const n = t.notes.filter(n => n.channel !== 9); return n.reduce((a, b) => a + b.midi, 0) / n.length;};
  const candidates = tracks.filter(t => t.notes.filter(n => n.channel !== 9).length >= 4);
  $('track').value = String((candidates.length ? candidates : tracks).sort((a, b) => avg(b) - avg(a))[0].index);
  if (id) {settings.song = id; const url = new URL(location.href); url.searchParams.set('song', id); try {history.replaceState(null, '', url);} catch { /* Sandboxed embeds may not allow URL updates. */ }}
  else {const url = new URL(location.href); url.searchParams.delete('song'); try {history.replaceState(null, '', url);} catch { /* Sandboxed embeds may not allow URL updates. */ }}
  rebuild();
}
async function loadLibrary(id) {
  const ticket = ++loadToken, entry = catalog.find(e => e.id === id); if (!entry) return;
  const url = new URL(entry.file, new URL('library/', document.baseURI));
  if (url.origin !== new URL(document.baseURI).origin) throw new Error('Library songs must be hosted with this app.');
  const res = await fetch(url); if (!res.ok) throw new Error(`Could not load ${entry.title} (HTTP ${res.status}).`);
  const bytes = await res.arrayBuffer(); if (ticket !== loadToken) return;
  setSong(bytes, entry.title, entry.description || 'From the song library', entry.id); $('song-select').value = id;
}
async function listen() {
  if (listening) {stopListen(); return;}
  stopListen(); const token = playToken; await sound.unlock(); if (token !== playToken) return;
  if (!practice.steps.length) return;
  listening = true; listenIndex = practice.index < practice.steps.length ? practice.index : 0;
  let start = performance.now(), origin = practice.steps[listenIndex].time;
  const speed = Number($('speed').value) / 100;
  const next = () => {
    if (token !== playToken) return;
    if (listenIndex >= practice.steps.length) {
      if (!repeat.enabled) {stopListen(); return;}
      // A fresh time origin prevents compressed or runaway scheduling after wrap.
      listenIndex = 0; start = performance.now(); origin = practice.steps[0].time;
    }
    const s = practice.steps[listenIndex]; render();
    const notes = target().notes; // Reference playback can sound pitches outside a fixed range.
    for (const [j, n] of notes.entries()) {
      const id = `preview:${listenIndex}:${j}`; press(n, id, 88, false, false);
      later(() => release(id), s.duration * 900 / speed);
    }
    const following = practice.steps[listenIndex + 1];
    const delay = following ? (following.time - origin) * 1000 / speed - (performance.now() - start) : s.duration * 1000 / speed + 250;
    later(() => {listenIndex++; next();}, delay);
  };
  next();
}
function addKeyEvents(button) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || button.dataset.note === '') return;
    event.preventDefault(); if (listening) stopListen();
    try { button.setPointerCapture?.(event.pointerId); } catch { /* Synthetic/assistive pointer: no capture available. */ }
    press(Number(button.dataset.note), `pointer:${event.pointerId}`, 96, true);
  });
  button.addEventListener('lostpointercapture', event => release(`pointer:${event.pointerId}`));
  button.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault(); if (!event.repeat) press(Number(button.dataset.note), `focus:${event.code}`, 96, true);
  });
  // Screen readers can activate a button without a pointer/keyboard-down event.
  button.addEventListener('click', event => {
    if (event.detail !== 0 || voices.has('focus:Enter') || voices.has('focus:Space')) return;
    const id = `accessible:${button.id}`; press(Number(button.dataset.note), id, 96, true); later(() => release(id), 220);
  });
}
function buildKeyboards() {
  for (const p of pads) {
    const b = document.createElement('button'); b.id = `pad-${p.id}`; b.className = `pad ${p.kind}`;
    b.type = 'button'; b.disabled = p.note == null; b.append(document.createElement('span'));
    if (p.note != null) addKeyEvents(b); $('diamond').append(b);
  }
  for (const p of pads.filter(p => p.note != null)) {
    const b = document.createElement('button'); b.id = `piano-${p.id}`; b.className = `piano-key ${p.kind}`;
    b.dataset.offset = p.note - base; b.style.left = `${p.kind === 'white' ? p.r * 12.5 : (p.r + 1) * 12.5 - 3.6}%`;
    addKeyEvents(b); $('piano').append(b);
  }
  updateLayout();
}
const shortcuts = {KeyA:0,KeyW:1,KeyS:2,KeyE:3,KeyD:4,KeyF:5,KeyT:6,KeyG:7,KeyY:8,KeyH:9,KeyU:10,KeyJ:11,KeyK:12};
window.addEventListener('keydown', event => {
  if (event.code === 'Escape') {stopListen(); experience?.escape(); return;}
  if (experience?.modal()) return;
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (experience?.shortcut(event)) return;
  const offset = shortcuts[event.code]; if (offset == null) return;
  event.preventDefault(); if (listening) stopListen(); press(base + offset, `key:${event.code}`, 96, true);
});
window.addEventListener('keyup', event => {release(`key:${event.code}`); release(`focus:${event.code}`);});
for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, e => release(`pointer:${e.pointerId}`));
window.addEventListener('blur', () => stopListen());
document.addEventListener('visibilitychange', () => {if (document.hidden) stopListen();});
window.addEventListener('pagehide', () => {stopListen(); midi.disconnect();});
function receive(data) {
  const event = decodeNote(data); if (!event) return;
  const {note, channel, velocity, on} = event;
  $('midi-monitor').textContent = `Ch ${channel + 1} · note ${note} · velocity ${velocity} · ${on ? 'ON' : 'OFF'}`;
  if (experience?.receive(event)) return;
  const id = `midi:${channel}:${note}`;
  if (!on) {release(id); return;}
  if (listening) stopListen();
  const musical = $('input-kind').value === 'piano' ? note : midi.padFor(note, channel, pads)?.note;
  if (musical != null) press(musical, id, velocity);
  else if (on && $('input-kind').value === 'pads') $('learn-status').textContent = `Unassigned input: note ${note}, channel ${channel + 1}. Use Map controller to assign it.`;
}
function options(select, ports, empty) {
  const previous = select.value; select.replaceChildren(new Option(empty, ''));
  for (const p of ports) select.add(new Option(p.name || p.id, p.id));
  if ([...select.options].some(o => o.value === previous)) select.value = previous;
}
function refreshPorts() {
  experience?.refreshPorts();
  options($('midi-in'), midi.ports('inputs'), 'None'); options($('midi-led'), midi.ports('outputs'), 'None');
  options($('midi-synth'), midi.ports('outputs').filter(p => !isLaunchpad(p) && p.id !== midi.out?.id), 'None · use browser sound');
  if (midi.in?.state === 'disconnected' || midi.synth?.state === 'disconnected' || midi.out?.state === 'disconnected') {
    stopListen(); midi.disconnect(); $('connection-badge').textContent = 'Device disconnected';
    notice('A MIDI device was disconnected. Reconnect it, then press Connect MIDI and enable the lights again.');
  }
}
async function connect() {
  notice(); await midi.connect();
  const inputs = midi.ports('inputs'), outputs = midi.ports('outputs');
  const preferred = ports => ports.find(p => isLaunchpad(p) && !/DAW/i.test(p.name)) || ports.find(p => isLaunchpad(p));
  const input = inputs.find(p => p.name === settings.inputName) || preferred(inputs);
  const output = outputs.find(p => p.name === settings.ledName) || preferred(outputs);
  if (input) {$('midi-in').value = input.id; await midi.input(input.id); settings.inputName = input.name;}
  if (output) {$('midi-led').value = output.id; await midi.output(output.id); settings.ledName = output.name;}
  $('settings').open = true; $('connection-badge').textContent = input ? 'MIDI input connected' : 'MIDI access ready';
  if (!inputs.length) notice('MIDI permission granted, but no input devices found. Touch and mouse remain available.');
  save(); render();
}
async function enableLights(program) {
  notice();
  if (midi.synth && midi.out?.id === midi.synth.id) throw new Error('Choose different outputs for controller LEDs and musical sound.');
  if (program && !midi.access?.sysexEnabled) {
    const inputId = $('midi-in').value, outputId = $('midi-led').value;
    await midi.connect(true); await midi.input(inputId); await midi.output(outputId);
    $('midi-in').value = inputId; $('midi-led').value = outputId;
  }
  await midi.enable(program); $('connection-badge').textContent = 'Controller lights enabled';
  render(); if (program) later(() => {midi.cache.clear(); render();}, 100);
}
function cancelLearn() {experience?.cancelLearning();}
for (let c = 0; c <= 9; c++) $('octave').add(new Option(`${noteName(c * 12)}–${noteName(c * 12 + 12)}`, c * 12));
$('octave').value = 60;
for (const id of storedControls) if (settings[id] != null) {
  const el = $(id); el.value = settings[id]; if (el.tagName === 'SELECT' && !el.value) el.selectedIndex = 0;
}
base = Number($('octave').value); pads = layout(base); free = $('play-mode').value === 'free';
$('sound-enabled').checked = settings.sound !== false; sound.enabled = $('sound-enabled').checked;
sound.timbre = $('timbre').value; sound.setVolume(Number($('volume').value) / 100);
midi.profile = $('profile').value; midi.rotation = Number($('rotation').value);
if (settings.custom) {
  try {midi.custom = normalizeMapping(settings.custom);} catch(e) {notice(`Saved map needs repair: ${e.message}`);}
}
buildKeyboards(); render();
$('sound-start').onclick = () => {sound.enabled = true; $('sound-enabled').checked = true; sound.unlock().catch(e => notice(e.message)); save();};
$('connect').onclick = safe(connect);
$('programmer').onclick = safe(() => enableLights(true)); $('lights').onclick = safe(() => enableLights(false));
$('disconnect').onclick = () => {stopListen(); midi.disconnect(); $('connection-badge').textContent = 'Lights off · reconnect MIDI to resume';};
$('midi-in').onchange = safe(async () => {stopListen(); await midi.input($('midi-in').value); settings.inputName = midi.in?.name; save();});
$('midi-led').onchange = safe(async () => {
  if ($('midi-led').value && $('midi-led').value === midi.synth?.id) { $('midi-led').value = midi.out?.id || ''; throw new Error('LED and sound outputs must be separate.'); }
  stopListen(); await midi.output($('midi-led').value); settings.ledName = midi.out?.name; refreshPorts(); save(); render();
});
$('midi-synth').onchange = safe(async () => {
  stopListen(); const out = midi.access?.outputs.get($('midi-synth').value);
  if (out && (out.id === midi.out?.id || isLaunchpad(out))) throw new Error('The sound output cannot be the Launchpad lighting output.');
  midi.synth = out; if (out) await out.open();
});
$('profile').onchange = () => {stopListen(); cancelLearn(); midi.clear(); midi.lights = false; midi.profile = $('profile').value; // Presets never change hardware mode.
 $('connection-badge').textContent = 'Lights off · select Enable lighting'; save(); render();};
$('rotation').onchange = () => {stopListen(); midi.clear(); midi.rotation = Number($('rotation').value); save(); render();};
$('input-kind').onchange = () => {stopListen(); save();};
$('sound-enabled').onchange = () => {sound.enabled = $('sound-enabled').checked; sound.panic(); $('sound-start').textContent = sound.enabled ? 'Enable sound' : 'Sound muted'; save();};
$('volume').oninput = () => {sound.setVolume(Number($('volume').value) / 100); save();};
$('timbre').onchange = () => {sound.panic(); sound.timbre = $('timbre').value; save();};
$('panic').onclick = () => {stopListen(); if (midi.synth) midi.send(midi.synth, [176, 123, 0]);};
$('restart').onclick = restart; $('back').onclick = () => {stopListen(); practice.seek(practice.index - 1); render();};
$('next').onclick = () => {stopListen(); practice.seek(practice.index + 1); render();};
$('listen').onclick = () => {listen().catch(e => notice(e.message));};
$('hear-note').onclick = () => {
  stopListen(); const token = playToken;
  sound.unlock().then(() => {if (token !== playToken) return; for (const n of target().notes) {const id = `hear:${n}`; press(n, id, 96, false, false); later(() => release(id), 650);}}).catch(e => notice(e.message));
};
for (const id of ['track', 'reading', 'transpose']) $(id).onchange = rebuild;
for (const id of ['octave', 'range-mode']) $(id).onchange = () => {cancelLearn(); stopListen(); practice.accepted.clear(); base = Number($('octave').value); updateLayout(); render(); save();};
$('play-mode').onchange = () => {stopListen(); practice.accepted.clear(); free = $('play-mode').value === 'free'; render(); save();};
$('speed').oninput = () => {$('speed-label').textContent = `${$('speed').value}%`; if (listening) stopListen(); save();};
$('speed-label').textContent = `${$('speed').value}%`;
$('song-select').onchange = safe(() => loadLibrary($('song-select').value));
$('file').onchange = safe(async () => {
  const file = $('file').files[0]; if (!file) return; const ticket = ++loadToken;
  try {
    if (file.size > 8 * 1024 * 1024) throw new Error('Choose a MIDI file smaller than 8 MB.');
    const data = await file.arrayBuffer(); if (ticket !== loadToken) return;
    setSong(data, file.name.replace(/\.(mid|midi)$/i, ''), 'Local MIDI file · stays on this device', null); $('song-select').value = '';
  } finally {$('file').value = '';}
});
$('upload-label').onkeydown = event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); $('file').click();}};
$('fullscreen').onclick = safe(async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
  else notice('Fullscreen is unavailable here. On iPad, add this page to the Home Screen for a larger practice view.');
});
experience = setupExperience({midi, settings, save, stop:stopListen, render, connect});
repeatUI = setupRepeat({repeat, practice, settings, save, render, restart});
render();
if (!navigator.requestMIDIAccess) $('connect').title = 'This browser has no Web MIDI. Touch and browser sound work without it.';
(async () => {
  try {
    const res = await fetch('library/index.json'); if (!res.ok) throw new Error('The song library could not be loaded. You can still open a local MIDI file.');
    catalog = await res.json(); if (!Array.isArray(catalog)) throw new Error('Invalid library index.');
    $('song-select').replaceChildren(new Option('Choose a song…', ''));
    for (const entry of catalog) $('song-select').add(new Option(entry.title, entry.id));
    const requested = new URL(location.href).searchParams.get('song') || settings.song;
    await loadLibrary(catalog.find(e => e.id === requested)?.id || catalog[0]?.id);
  } catch (e) {notice(e.message);}
})();

import {layout, noteName} from './music.js';
import {learnOrder, playablePads, normalizeMapping, importMapping, exportMapping} from './mapping.js';
const $ = id => document.getElementById(id);

// All edits are staged. Closing/cancelling never destroys the last working map.
export class MappingEditor {
  constructor({midi, connect, changed, stop, render}) {
    Object.assign(this, {midi, connect, changed, stop, render});
    this.dialog = $('mapping-dialog'); this.draft = {}; this.held = new Set(); this.rows = new Map();
    this.target = null; this.queue = []; this.previousLights = false;
    for (const p of layout()) {
      const b = document.createElement('button'); b.type = 'button'; b.className = `map-pad ${p.kind}`;
      b.disabled = p.note == null; b.id = `map-pad-${p.id}`;
      const label = document.createElement('span'); label.textContent = p.note == null ? '' : noteName(p.note); b.append(label);
      b.setAttribute('aria-label', p.note == null ? 'Unused pad' : `Learn ${noteName(p.note)}`);
      if (p.note != null) b.onclick = () => this.learnOne(p.id);
      $('map-diamond').append(b);
    }
    for (const p of [...playablePads].sort((a,b) => a.note - b.note)) {
      const row = document.createElement('tr'); row.id = `map-row-${p.id}`;
      const title = document.createElement('th'); title.scope = 'row'; title.textContent = noteName(p.note); row.append(title);
      const fields = {};
      for (const field of ['note','channel','ledNote','ledChannel']) {
        const td = document.createElement('td'), input = document.createElement('input');
        input.type = 'number'; input.min = field.endsWith('hannel') ? 1 : 0; input.max = field.endsWith('hannel') ? 16 : 127; input.step = 1;
        input.setAttribute('aria-label', `${noteName(p.note)} ${field}`); input.dataset.field = field; input.dataset.pad = p.id;
        input.oninput = () => {this.cancelLearning(); this.readRows(); this.message('Edits are not applied yet. Choose Apply mapping when ready.');};
        td.append(input); row.append(td); fields[field] = input;
      }
      const td = document.createElement('td'), learn = document.createElement('button'), test = document.createElement('button');
      learn.textContent = 'Learn'; learn.type = 'button'; learn.onclick = () => this.learnOne(p.id);
      test.textContent = 'LED'; test.type = 'button'; test.setAttribute('aria-label', `Test LED for ${noteName(p.note)}`);
      test.onclick = () => this.attempt(() => {
        this.readRows(); const v = normalizeMapping(this.draft)[p.id];
        if (!v) throw new Error('Assign the input and LED address for this pad first.');
        this.midi.testLed({note: v.ledNote, channel: v.ledChannel}, Number($('map-test-value').value));
        this.message(`Testing ${noteName(p.note)}: LED note ${v.ledNote}, channel ${v.ledChannel + 1}.`);
      });
      td.append(learn, test); row.append(td); $('map-rows').append(row); this.rows.set(p.id, fields);
    }
    for (const id of ['learn', 'map-controller']) $(id).onclick = () => this.open();
    $('map-connect').onclick = () => this.attempt(async () => {await this.connect(); this.refreshPorts();});
    $('map-input').onchange = () => this.attempt(async () => {
      this.cancelLearning(); this.stop(); await this.midi.input($('map-input').value);
      $('midi-in').value = this.midi.in?.id || ''; this.changed(false); this.refreshPorts();
    });
    $('map-learn-all').onclick = () => {
      if (!this.midi.in?.onmidimessage) {this.message('Connect MIDI and select an input above first.', true); return;}
      this.draft = {}; this.fillRows(); this.queue = learnOrder.map(p => p.id); this.target = this.queue[0]; this.showTarget();
    };
    $('map-stop-learn').onclick = () => {this.cancelLearning(); this.message('Learning paused. Draft retained; the saved map has not changed.');};
    $('map-cancel').onclick = () => this.close();
    this.dialog.addEventListener('cancel', event => {event.preventDefault(); this.close();});
    $('map-apply').onclick = () => this.attempt(() => {
      this.readRows(); const validated = normalizeMapping(this.draft, true);
      this.midi.clear(); this.midi.custom = validated; this.midi.profile = 'custom'; this.midi.lights = false;
      // Never change the controller's hardware mode during calibration.
      $('profile').value = 'custom'; $('input-kind').value = 'pads'; this.previousLights = false;
      this.changed(true); this.close();
      $('learn-status').textContent = '13 pads saved. Use Light up to enable feedback in the same hardware mode.';
      $('connection-badge').textContent = 'Custom map saved · lighting off';
    });
    $('map-export').onclick = () => this.attempt(() => {
      this.readRows(); const blob = new Blob([exportMapping(this.draft)], {type:'application/json'});
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'diamond-pad-map.json';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.message('Mapping exported. Import it on another browser or device.');
    });
    $('map-import-button').onclick = () => $('map-import').click();
    $('map-import').onchange = () => this.attempt(async () => {
      const file = $('map-import').files[0]; if (!file) return;
      const ticket = this.session;
      try {
        if (file.size > 65536) throw new Error('Mapping files must be smaller than 64 KB.');
        const validated = importMapping(await file.text());
        if (!this.dialog.open || ticket !== this.session) return;
        this.cancelLearning(); this.draft = validated; this.fillRows(); this.message('Imported 13 pads. Review, then Apply mapping.');
      } finally {$('map-import').value = '';}
    });
  }
  async attempt(fn) {try {await fn();} catch(e) {this.message(e.message, true);}}
  message(text, error = false) {$('map-message').textContent = text; $('map-message').classList.toggle('error', error);}
  refreshPorts() {
    if (!this.dialog.open) return;
    const select = $('map-input'); select.replaceChildren(new Option('Choose MIDI input…',''));
    for (const p of this.midi.ports('inputs')) select.add(new Option(p.name || p.id, p.id));
    select.value = this.midi.in?.id || '';
    $('map-output-name').textContent = this.midi.out?.name || 'No LED output selected (choose one in Controller & sound settings).';
  }
  open() {
    if (this.dialog.open) return;
    this.stop(); this.session = (this.session || 0) + 1; this.previousLights = this.midi.lights; this.midi.clear(); this.midi.lights = false;
    this.draft = this.midi.profile === 'custom' ? structuredClone(this.midi.custom) : Object.fromEntries(playablePads.map(p => {
      const note = this.midi.padAddress(p); return [p.id,{note,channel:0,ledNote:note,ledChannel:0}];
    }));
    this.cancelLearning(); this.fillRows(); this.dialog.showModal(); this.refreshPorts();
    this.message('Learn all 13 pads, click one key to repair it, or enter the numbers below. Your saved mapping stays unchanged until Apply.');
    $('map-learn-all').focus();
  }
  close() {
    this.cancelLearning(); this.midi.clear(); this.dialog.close(); this.session++;
    this.midi.lights = this.previousLights; this.render(); $('map-controller').focus();
  }
  cancelLearning() {this.target = null; this.queue = []; this.held.clear(); this.showTarget(false);}
  learnOne(id) {
    if (!this.midi.in?.onmidimessage) {this.message('Connect MIDI and choose an input first.', true); return;}
    this.readRows(); this.queue = [id]; this.target = id; this.showTarget();
  }
  showTarget(announce = true) {
    for (const p of playablePads) {
      const active = p.id === this.target;
      $(`map-pad-${p.id}`).classList.toggle('learning', active);
      $(`map-pad-${p.id}`).setAttribute('aria-pressed', String(active));
      $(`map-row-${p.id}`).classList.toggle('learning-row', active);
    }
    $('map-stop-learn').disabled = !this.target;
    if (this.target && announce) {
      const p = playablePads.find(p => p.id === this.target);
      this.message(`Press and release the physical pad for ${noteName(p.note)} — outlined on the diamond. ${Object.keys(this.draft).length} / 13 assigned.`);
    }
  }
  readRows() {
    const next = {};
    for (const [id, fields] of this.rows) {
      if (Object.values(fields).every(el => el.value === '')) continue;
      next[id] = Object.fromEntries(Object.entries(fields).map(([f, el]) => [f, el.value === '' ? NaN : Number(el.value) - (f.endsWith('hannel') ? 1 : 0)]));
    }
    this.draft = next;
  }
  fillRows() {
    for (const [id, fields] of this.rows) for (const [f, el] of Object.entries(fields)) {
      const value = this.draft[id]?.[f]; el.value = value == null ? '' : value + (f.endsWith('hannel') ? 1 : 0);
    }
  }
  receive(event) {
    if (!this.dialog.open) return false;
    const {note, channel, velocity, on} = event, key = `${channel}:${note}`;
    $('map-monitor').textContent = `Received note ${note} · channel ${channel + 1} · velocity ${velocity} · ${on ? 'ON' : 'OFF'}`;
    if (!on) {this.held.delete(key); return true;}
    if (this.held.has(key)) return true;
    this.held.add(key); if (!this.target) return true;
    const duplicate = Object.entries(this.draft).find(([id,v]) => id !== this.target && v.note === note && v.channel === channel);
    if (duplicate) {this.message(`Note ${note} on channel ${channel + 1} is already assigned. Press a different pad, or edit the conflicting row.`, true); return true;}
    this.draft[this.target] = {note, channel, ledNote:note, ledChannel:Number($('map-led-channel').value)-1};
    this.fillRows(); this.queue.shift(); this.target = this.queue[0] || null;
    this.showTarget();
    if (!this.target) this.message('Learning finished. Review or test the LEDs, then choose Apply mapping.');
    return true;
  }
}

import {address} from './music.js';
export const MINI_HEADER = [240, 0, 32, 41, 2, 13];
export const programmerMessage = enabled => [...MINI_HEADER, 14, enabled ? 1 : 0, 247];
export function decodeNote(data) {
  const [s, note, velocity] = data, type = s & 240;
  if ((type !== 128 && type !== 144) || data.length < 3 || note > 127 || velocity > 127) return null;
  return {note, velocity, channel: s & 15, on: type === 144 && velocity > 0};
}
export const isLaunchpad = port => /launchpad|lpmini|lpx/i.test(port?.name || '');
export class Midi {
  constructor(onMessage, onPorts, onError) {
    Object.assign(this, {onMessage, onPorts, onError});
    this.cache = new Map(); this.lights = false; this.programmed = false; this.rotation = 0; this.profile = 'mini'; this.custom = {};
  }
  async connect(sysex = false) {
    if (!navigator.requestMIDIAccess) throw new Error('Hardware MIDI is unavailable here. Use touch + browser sound, or desktop Chrome/Edge for your Launchpad.');
    const access = await navigator.requestMIDIAccess({sysex});
    if (this.access) this.access.onstatechange = null;
    this.access = access; access.onstatechange = () => this.onPorts(); this.onPorts();
  }
  ports(type) {return this.access ? [...this.access[type].values()].filter(p => p.state !== 'disconnected') : [];}
  async input(id) {
    if (this.in) {this.in.onmidimessage = null; await this.in.close().catch(() => {});}
    this.in = this.access?.inputs.get(id);
    if (this.in) {await this.in.open(); this.in.onmidimessage = event => this.onMessage(event.data);}
  }
  send(port, bytes) {
    if (!port || port.state === 'disconnected') return false;
    try {port.send(bytes); return true;} catch (e) {this.onError(e.message); return false;}
  }
  async output(id) {
    this.clear(); this.live(); this.lights = false;
    this.out = this.access?.outputs.get(id); this.cache.clear(); if (this.out) await this.out.open();
  }
  async enable(program = false) {
    if (!this.out) throw new Error('Choose the controller LED output first.');
    if (program) {
      if (this.profile !== 'mini') throw new Error('Automatic Programmer Mode is only for Launchpad Mini MK3.');
      if (!this.access?.sysexEnabled) throw new Error('Allow SysEx first, or enter Programmer Mode manually.');
      if (!this.send(this.out, programmerMessage(true))) throw new Error('Could not send Programmer Mode command.');
      this.programmed = true;
    }
    this.lights = true; this.cache.clear();
  }
  live() {if (this.programmed) this.send(this.out, programmerMessage(false)); this.programmed = false;}
  padAddress(pad) {return this.profile === 'custom' ? this.custom[pad.id]?.note : address(pad.r, pad.c, this.rotation);}
  padFor(note, channel, pads) {
    return pads.find(p => this.padAddress(p) === note && (this.profile !== 'custom' || this.custom[p.id]?.channel === channel));
  }
  paint(pads, expected, held, wrong, accepted) {
    if (!this.lights) return;
    for (const pad of pads) {
      const key = this.padAddress(pad); if (key == null) continue;
      // Mini MK3 palette, channel 1 = steady light. Custom hardware may use a different palette.
      const color = pad.note == null ? 0 : wrong.has(pad.note) ? 5 : held.has(pad.note) || accepted.has(pad.note) ? 21 : expected.includes(pad.note) ? 37 : pad.kind === 'white' ? 1 : 47;
      if (this.cache.get(key) !== color && this.send(this.out, [144, key, color])) this.cache.set(key, color);
    }
  }
  clear() {
    if (this.lights) for (const key of this.cache.keys()) this.send(this.out, [144, key, 0]);
    this.cache.clear();
  }
  disconnect() {this.clear(); this.live(); this.lights = false; if (this.in) this.in.onmidimessage = null;}
}

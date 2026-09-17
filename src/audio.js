// Small, self-contained teaching synth. No samples, soundfonts, CDN or GM dependency.
export class Sound {
  constructor(onState = () => {}) {this.voices = new Map(); this.enabled = true; this.volume = 0.35; this.timbre = 'piano'; this.onState = onState;}
  async unlock() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('Web Audio is unavailable in this browser.');
    if (!this.ctx) {
      this.ctx = new Context(); this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      const limiter = this.ctx.createDynamicsCompressor();
      this.master.connect(limiter); limiter.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    this.onState(this.ctx.state);
  }
  setVolume(value) {this.volume = value; if (this.ctx) this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.03);}
  on(id, note, velocity = 96) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running' || this.voices.has(id)) return;
    const t = this.ctx.currentTime, frequency = 440 * 2 ** ((note - 69) / 12);
    const amp = this.ctx.createGain(); amp.connect(this.master);
    const peak = velocity / 127 * 0.24;
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(peak, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.25), t + 0.55);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 8);
    const harmonics = this.timbre === 'sine' ? [[1, 1]] : this.timbre === 'bell' ? [[1, 1], [2.76, 0.25], [5.4, 0.09]] : [[1, 1], [2, 0.3], [3, 0.1]];
    const nodes = [];
    for (const [ratio, gain] of harmonics) {
      if (frequency * ratio >= this.ctx.sampleRate / 2) continue;
      const osc = this.ctx.createOscillator(), level = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency * ratio; level.gain.value = gain;
      osc.connect(level); level.connect(amp); osc.start(t); osc.stop(t + 9);
      nodes.push({osc, level});
    }
    const cleanup = () => {for (const {osc, level} of nodes) {osc.disconnect(); level.disconnect();} amp.disconnect();};
    const timer = setTimeout(() => {if (this.voices.get(id)?.amp === amp) this.voices.delete(id); cleanup();}, 9300);
    this.voices.set(id, {amp, nodes, timer, cleanup});
  }
  off(id) {
    const voice = this.voices.get(id); if (!voice) return;
    const t = this.ctx.currentTime;
    voice.amp.gain.cancelScheduledValues(t); voice.amp.gain.setTargetAtTime(0, t, 0.04);
    for (const {osc} of voice.nodes) {try {osc.stop(t + 0.25);} catch {}}
    clearTimeout(voice.timer); setTimeout(voice.cleanup, 300); this.voices.delete(id);
  }
  panic() {for (const id of [...this.voices.keys()]) this.off(id);}
}

// Repeat policy is shared by both views. Held-note handling remains in app.js.
export function loopOption(url, saved = {}) {
  const raw = new URL(url).searchParams.get('loop');
  return raw == null ? saved.loop === true : ['', '1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}
export function loopURL(url, enabled) {
  const result = new URL(url); result.searchParams.set('loop', enabled ? '1' : '0'); return result;
}
export class Repeat {
  constructor() {this.enabled = false; this.laps = 0;}
  wrap(practice) {
    if (!this.enabled || !practice.steps.length || practice.index < practice.steps.length) return false;
    this.laps++; practice.seek(0); return true;
  }
}
export function setupRepeat({repeat, practice, settings, save, render, restart}) {
  const $ = id => document.getElementById(id);
  function persist() {
    settings.loop = repeat.enabled; save();
    // Include even loop=0, so a copied link overrides the recipient's preferences.
    try {history.replaceState(null, '', loopURL(location.href, repeat.enabled));} catch {}
  }
  function status() {
    $('loop-mode').checked = repeat.enabled;
    $('simple-loop').setAttribute('aria-pressed', String(repeat.enabled));
    $('simple-loop').title = repeat.enabled ? 'Loop on — repeat the melody' : 'Loop off — stop at the end';
    $('simple-loop').setAttribute('aria-label', repeat.enabled ? 'Turn melody loop off' : 'Turn melody loop on');
    $('simple-restart').disabled = !practice.steps.length;
    $('loop-count').textContent = repeat.enabled ? `Loop on · ${repeat.laps} completed ${repeat.laps === 1 ? 'round' : 'rounds'}` : 'Play once';
  }
  function set(enabled) {
    repeat.enabled = enabled;
    // Turning Loop on after completion starts another round immediately.
    repeat.wrap(practice); persist(); render(); status();
  }
  repeat.enabled = loopOption(location.href, settings); persist(); status();
  $('loop-mode').onchange = () => set($('loop-mode').checked);
  $('simple-loop').onclick = () => set(!repeat.enabled);
  $('simple-restart').onclick = restart;
  window.addEventListener('popstate', () => set(loopOption(location.href, settings)));
  return {status};
}

// Native fullscreen requires user activation. A URL expresses intent, not permission.
export function fullscreenRequested(url) {
  const raw = new URL(url).searchParams.get('fullscreen');
  return raw != null && ['', '1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}
export function setupFullscreen({notice, simple}) {
  const root = document.documentElement;
  const buttons = [document.getElementById('fullscreen'), document.getElementById('simple-fullscreen')];
  const invite = document.getElementById('fullscreen-invite');
  const enter = document.getElementById('fullscreen-enter');
  const dismiss = document.getElementById('fullscreen-dismiss');
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;
  const available = () => Boolean((root.requestFullscreen && document.fullscreenEnabled !== false) ||
    (root.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false));
  let busy = false, wasActive = Boolean(current()), requestVersion = 0;
  function writeIntent(value) {
    const url = new URL(location.href); url.searchParams.set('fullscreen', value ? '1' : '0');
    try {history.replaceState(null, '', url);} catch { /* Embedded contexts can block history. */ }
  }
  function sync() {
    const active = Boolean(current());
    for (const button of buttons) {
      button.textContent = active ? '⤡' : '⛶';
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
      button.title = active ? 'Exit fullscreen' : available() ? 'Enter fullscreen' : 'Fullscreen unavailable · use simple view';
      button.disabled = busy;
    }
    root.classList.toggle('native-fullscreen', active);
    if (active) {invite.hidden = true; writeIntent(true);}
    else if (wasActive) {writeIntent(false); invite.hidden = true;}
    wasActive = active;
  }
  function fallback(message) {
    invite.hidden = true; simple();
    notice(message + ' Simple view remains available; the browser toolbar may remain visible.');
  }
  async function toggle() {
    if (busy) return;
    if (!current() && !available()) {
      fallback('This browser or embedded page does not permit native fullscreen.');
      return;
    }
    busy = true; sync(); const ticket = ++requestVersion;
    try {
      // Call directly in the click handler, before any await: retain user activation.
      const result = current()
        ? (document.fullscreenElement && document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen())
        : (root.requestFullscreen && document.fullscreenEnabled !== false ? root.requestFullscreen() : root.webkitRequestFullscreen());
      await result; invite.hidden = true;
    } catch (error) {
      if (ticket === requestVersion) fallback(`Fullscreen could not start or exit: ${error.message || 'request denied'}.`);
    } finally {busy = false; sync();}
  }
  function fromURL() {
    if (!current()) invite.hidden = !fullscreenRequested(location.href);
    if (!invite.hidden) {
      enter.textContent = available() ? 'Enter fullscreen' : 'Use simple view';
      document.getElementById('fullscreen-explanation').textContent = available()
        ? 'Your link requests fullscreen. Tap to enter; your browser requires this confirmation.'
        : 'Native fullscreen is not available here. The keyboard can still fill a simple page view.';
    }
  }
  for (const button of buttons) button.onclick = toggle;
  enter.onclick = toggle;
  dismiss.onclick = () => {invite.hidden = true; writeIntent(false);};
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  window.addEventListener('popstate', () => {fromURL(); sync();});
  sync(); fromURL();
  return {toggle, sync, active: () => Boolean(current())};
}

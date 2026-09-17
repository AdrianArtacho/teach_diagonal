import {MappingEditor} from './mapping-ui.js';
export function viewOptions(url, saved = {}) {
  const params = new URL(url).searchParams;
  const candidate = params.get('view') ?? saved.view;
  const raw = params.get('simple') ?? params.get('clear');
  const fullscreen = ['', '1', 'true', 'yes', 'on'].includes((params.get('fullscreen') ?? '0').toLowerCase());
  return {view: candidate === 'piano' ? 'piano' : 'diamond', simple: raw == null ? (fullscreen || saved.simple === true) : ['', '1','true','yes','on'].includes(raw.toLowerCase())};
}
export function viewURL(url, {view, simple}) {
  const result = new URL(url); result.searchParams.set('view', view); result.searchParams.set('simple', simple ? '1' : '0');
  result.searchParams.delete('clear'); return result;
}
export function setupExperience({midi, settings, save, stop, render, connect}) {
  const el = id => document.getElementById(id);
  let state = viewOptions(location.href, settings);
  const mapper = new MappingEditor({midi, connect, stop, render, changed: () => {
    settings.inputName = midi.in?.name; save();
  }});
  function present(write = true, focus = false) {
    document.body.dataset.view = state.view; document.body.classList.toggle('simple', state.simple);
    el('instrument').hidden = state.view !== 'diamond'; el('piano-panel').hidden = state.view !== 'piano';
    for (const view of ['diamond','piano']) el(`view-${view}`).setAttribute('aria-pressed', String(state.view === view));
    el('simple-bar').hidden = !state.simple;
    if (write) {
      settings.view = state.view; settings.simple = state.simple; save();
      try {history.replaceState(null, '', viewURL(location.href, state));} catch { /* Sandboxed embeds may deny history updates. */ }
    }
    if (focus) {
      window.scrollTo(0, 0); (state.simple ? el('restore-controls') : el(`view-${state.view}`)).focus({preventScroll:true});
    }
  }
  function change(view, simple = state.simple) {
    if (mapper.dialog.open) return;
    stop(); state = {view, simple}; present(true, true); render();
  }
  for (const view of ['diamond','piano']) el(`view-${view}`).onclick = () => change(view);
  el('simple-mode').onclick = () => change(state.view, true);
  el('restore-controls').onclick = () => change(state.view, false);
  el('copy-practice-link').onclick = async () => {
    const url = viewURL(location.href, {...state, simple:true});
    try {
      await navigator.clipboard.writeText(url.href);
      el('link-status').textContent = 'Simple practice link copied.';
    } catch {
      el('practice-link').hidden = false; el('practice-link').value = url.href; el('practice-link').focus(); el('practice-link').select();
      el('link-status').textContent = 'Copy the selected link.';
    }
  };
  window.addEventListener('popstate', () => {stop(); state = viewOptions(location.href, settings); present(false); render();});
  present(false);
  return {
    simple: () => change(state.view, true),
    receive: event => mapper.receive(event),
    cancelLearning: () => mapper.cancelLearning(),
    refreshPorts: () => mapper.refreshPorts(),
    modal: () => mapper.dialog.open,
    shortcut(event) {
      if (event.code === 'KeyV') {event.preventDefault(); change(state.view === 'diamond' ? 'piano' : 'diamond'); return true;}
      if (event.code === 'KeyM') {event.preventDefault(); change(state.view, !state.simple); return true;}
      return false;
    },
    escape() {if (state.simple && !mapper.dialog.open) change(state.view, false);},
    status() {
      el('simple-title').textContent = el('song-title').textContent;
      el('simple-next').textContent = `${el('next-label').textContent} · ${el('next-note').textContent} · ${el('progress-label').textContent}`;
      el('simple-next').title = el('feedback').textContent;
    }
  };
}

// Optional browser regression: npm install --no-save playwright && npx playwright install chromium
// Run: node tests/browser_song_picker.mjs
// Set CHROMIUM_EXECUTABLE_PATH to reuse an existing browser installation.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {extname, resolve, sep} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(resolve(root, 'library/index.json'), 'utf8'));
const playable = catalog.filter(entry => !entry.localOnly);
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.mid':'audio/midi'};
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root.slice(0, -1) && !path.startsWith(root.endsWith(sep) ? root : root + sep)) throw Error('Invalid path');
    const file = path === root.slice(0, -1) ? resolve(root, 'index.html') : path;
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[extname(file)] || 'application/octet-stream'}).end(data);
  } catch {res.writeHead(404).end('Not found');}
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args:['--no-sandbox']});
  const errors = [];
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror', error => errors.push(error.message));
  const selectors = async expected => assert.deepEqual(await page.locator('#song-select, #simple-song-select').evaluateAll(items => items.map(x=>x.value)), [expected, expected]);
  const selected = async entry => {
    await page.waitForFunction(id => new URL(location.href).searchParams.get('song') === id, entry.id);
    await selectors(entry.id);
    assert.equal(await page.locator('#simple-title').textContent(), entry.title);
    assert.equal(await page.locator('#song-title').textContent(), entry.title);
  };
  const choose = async entry => {await page.selectOption('#simple-song-select', entry.id); await selected(entry);};
  const progress = () => page.locator('#progress').evaluate(el=>el.value);
  const advance = async () => {
    const offset = await page.locator('.piano-key.target').first().getAttribute('data-offset');
    await page.locator('#simple-song-select').blur();
    await page.keyboard.press(['a','w','s','e','d','f','t','g','y','h','u','j','k'][Number(offset)]);
    assert.ok(await progress() > 0, 'Playing the highlighted pitch advances the melody');
  };

  for (const view of ['diamond','piano']) {
    await page.goto(`${origin}/?song=${playable[0].id}&simple=1&view=${view}&loop=1&fullscreen=1&extra=keep#lesson`);
    await selected(playable[0]);
    await page.locator('#fullscreen-enter').click();
    await page.waitForFunction(()=>Boolean(document.fullscreenElement));
    assert.deepEqual(await page.locator('#simple-song-select option').evaluateAll(items=>items.slice(1).map(x=>x.value)), catalog.map(x=>x.id));
    assert.equal(await page.locator('#simple-song-select').isVisible(),true);
    await advance();
    await choose(playable[1]);
    assert.equal(await progress(), 0);
    assert.equal(await page.locator('body').getAttribute('data-view'), view);
    assert.match(await page.locator('body').getAttribute('class'), /simple/);
    assert.equal(await page.locator('#simple-loop').getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true);
    const url = new URL(page.url());
    for (const [key,value] of [['simple','1'],['view',view],['loop','1'],['fullscreen','1'],['extra','keep']]) assert.equal(url.searchParams.get(key),value);
    assert.equal(url.hash,'#lesson');
    await page.locator('#restore-controls').click();
    assert.equal(await page.locator('#simple-song-select').isVisible(), false);
    await page.selectOption('#song-select',playable[0].id);
    await selected(playable[0]);
    await page.locator('#simple-mode').click();
    await page.evaluate(()=>document.exitFullscreen());
  }
  console.log('PASS simple piano and diamond, complete options, shared selection, progress reset, URL/loop/native fullscreen preservation');

  for (const entry of playable) await choose(entry);
  console.log(`PASS all ${playable.length} bundled library entries load through the simple selector`);

  await choose(playable[0]); await advance();
  const oldProgress = await progress(), oldURL = page.url();
  const missing = playable[1];
  const failedPath = new URL('library/'+missing.file,origin+'/').href;
  await page.route(failedPath, route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.selectOption('#simple-song-select',missing.id);
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('HTTP 503'));
  await selectors(playable[0].id);
  assert.equal(await progress(),oldProgress); assert.equal(page.url(),oldURL);
  await page.unroute(failedPath);
  console.log('PASS failed load rolls both menus back and preserves the current lesson');

  let releaseFirst, firstArrived;
  const gate = new Promise(resolve=>{releaseFirst=resolve;});
  const arrived = new Promise(resolve=>{firstArrived=resolve;});
  const slowPath = new URL('library/'+playable[1].file,origin+'/').href;
  await page.route(slowPath,async route=>{firstArrived(); await gate; await route.continue();});
  await page.selectOption('#simple-song-select',playable[1].id); await arrived;
  await choose(playable[2]);
  const slowResponse = page.waitForResponse(slowPath);
  releaseFirst(); await slowResponse;
  await page.waitForTimeout(100);
  await selected(playable[2]);
  await page.unroute(slowPath);
  console.log('PASS rapidly changing songs keeps the latest selection');

  const localOnly = catalog.find(entry=>entry.localOnly);
  await choose(playable[0]); await advance();
  const beforeLocal = await progress(), beforeLocalURL = page.url();
  await page.selectOption('#simple-song-select',localOnly.id);
  await page.waitForFunction(()=>!document.querySelector('#local-import-prompt').hidden);
  await selectors(playable[0].id);
  assert.equal(await progress(),beforeLocal); assert.equal(page.url(),beforeLocalURL);
  assert.equal(await page.locator('#local-import-name').textContent(),localOnly.title);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#local-import-open').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({name:'my-local-song.mid',mimeType:'audio/midi',buffer:await readFile(resolve(root,'library',playable[1].file))});
  await page.waitForFunction(()=>document.querySelector('#song-title').textContent==='my-local-song');
  await selectors('');
  assert.equal(new URL(page.url()).searchParams.has('song'),false);
  assert.match(await page.locator('#simple-song-select option').first().textContent(),/Local MIDI · my-local-song/);
  assert.equal(await page.locator('#local-import-prompt').isVisible(),false);
  await choose(playable[0]);
  console.log('PASS local-only prompt, native file import, local title, and return to library song');

  for (const viewport of [{width:320,height:568},{width:1440,height:360}]) {
    await page.setViewportSize(viewport);
    for (const view of ['diamond','piano']) {
      await page.goto(`${origin}/?song=${playable[0].id}&simple=1&view=${view}`);
      await selected(playable[0]);
      const geometry = await page.evaluate(view=>{
        const select=document.querySelector('#simple-song-select').getBoundingClientRect();
        const graphic=document.querySelector(view==='diamond'?'.diamond-stage':'#piano').getBoundingClientRect();
        const keys=[...document.querySelectorAll(view==='diamond'?'.pad:not(:disabled)':'.piano-key')];
        return {
          selectAbove:select.bottom<=graphic.top,
          overflow:document.documentElement.scrollWidth>innerWidth,
          unreachable:keys.filter(key=>{const r=key.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2; return x<0||x>=innerWidth||y<0||y>=innerHeight||!key.contains(document.elementFromPoint(x,y));}).map(x=>x.id)
        };
      },view);
      assert.equal(geometry.selectAbove,true,`${view} selector above graphic at ${viewport.width}×${viewport.height}`);
      assert.equal(geometry.overflow,false,`${view} horizontal overflow at ${viewport.width}×${viewport.height}`);
      assert.deepEqual(geometry.unreachable,[],`${view} playable keys must be reachable at ${viewport.width}×${viewport.height}`);
      if (process.env.BROWSER_SCREENSHOT_DIR) {
        await mkdir(process.env.BROWSER_SCREENSHOT_DIR,{recursive:true});
        await page.screenshot({path:resolve(process.env.BROWSER_SCREENSHOT_DIR,`song-picker-${view}-${viewport.width}x${viewport.height}.png`)});
      }
    }
  }
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS 320px phone and shallow desktop: dropdown above graphics, all playable keys reachable, no horizontal overflow or browser exceptions');
} finally {
  await browser?.close();
  await new Promise(done=>server.close(done));
}

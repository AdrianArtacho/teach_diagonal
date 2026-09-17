#!/usr/bin/env python3
"""Browser smoke test and screenshots, with fixture-backed fetch and mocked Web MIDI.
Run: python -m pip install playwright; python tests/browser_smoke.py
Uses installed Chromium (CHROMIUM env override). No hardware is required. This
in-memory harness also works in environments that disallow browser navigation.
The shipped JS modules are concatenated with only import/export declarations
removed. A <base> represents the GitHub Pages project subpath.
"""
import base64
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
checks = []

def check(condition, label):
    assert condition, label
    checks.append(label)

files = {f'library/{p.name}': base64.b64encode(p.read_bytes()).decode() for p in (ROOT/'library').iterdir() if p.is_file()}
bundle = '\n'.join(re.sub(r'^import .*?;\n', '', (ROOT/'src'/name).read_text(), flags=re.M).replace('export ', '') for name in ['music.js','audio.js','midi.js','app.js'])
html = (ROOT/'index.html').read_text()
html = re.sub(r'<link[^>]*>', '', html)
html = re.sub(r'<script.*?</script>', '', html, flags=re.S)
html = html.replace('<head>', '<head><base href="https://diamond.test/teach_diagonal/">')
fixture_script = f"""
window.__sent=[]; window.__fetches=[];
const fixtures={json.dumps(files)};
window.fetch=async function(url){{
  window.__fetches.push(String(url));
  const key=String(url).replace('https://diamond.test/teach_diagonal/','');
  if(!fixtures[key])return new Response('Not found',{{status:404}});
  return new Response(Uint8Array.from(atob(fixtures[key]),c=>c.charCodeAt(0)));
}};
const port=(id,name,type)=>({{id,name,type,state:'connected',connection:'closed',
 open:async function(){{this.connection='open';return this;}},
 close:async function(){{this.connection='closed';return this;}},
 send:function(bytes){{window.__sent.push({{port:this.id,bytes:Array.from(bytes)}});}} }});
const input=port('in','LPMiniMK3 MIDI In','input');
const led=port('led','LPMiniMK3 MIDI Out','output');
const synth=port('synth','Test synthesizer','output');
window.__access={{inputs:new Map([['in',input]]),outputs:new Map([['led',led],['synth',synth]]),sysexEnabled:false}};
Object.defineProperty(navigator,'requestMIDIAccess',{{configurable:true,value:async options=>{{window.__access.sysexEnabled=!!options.sysex;return window.__access;}}}});
window.__midi=(bytes)=>input.onmidimessage?.({{data:Uint8Array.from(bytes)}});
"""
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1360,'height':1080}, device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html)
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    page.add_script_tag(content=fixture_script)
    page.add_script_tag(content=bundle)
    page.wait_for_function("document.getElementById('song-title').textContent === 'Ode to Joy'")
    check(page.locator('.pad').count()==64, '64 visible pads')
    check(page.locator('.pad:not(:disabled)').count()==13, '13 playable pads')
    check(page.locator('.piano-key').count()==13, '13 matching piano keys')
    check(page.locator('#next-note').inner_text()=='E4','Default song and next note load')
    check(page.evaluate("__fetches.some(p=>p==='https://diamond.test/teach_diagonal/library/ode-to-joy.mid')"),'Library URL respects GitHub Pages subpath')
    page.locator('#pad-0-0').click()
    check(page.locator('#progress-label').inner_text().startswith('1 /'),'Wrong note does not advance')
    page.locator('#pad-2-2').click()
    check(page.locator('#progress-label').inner_text().startswith('2 /'),'Correct note advances')
    page.locator('#pad-2-2').click()
    check(page.locator('#next-note').inner_text()=='F4','Repeated note advances after release/repress')
    page.locator('#piano-3-3').click()
    check(page.locator('#next-note').inner_text()=='G4','Piano input advances same lesson')
    page.keyboard.press('g')
    check(page.locator('#progress-label').inner_text().startswith('5 /'),'Computer keyboard shortcut works')
    page.locator('#restart').click()
    page.locator('#connect').click()
    page.wait_for_function("document.getElementById('connection-badge').textContent==='MIDI input connected'")
    check(page.evaluate('__sent.length')==0,'Connecting sends no unsolicited MIDI')
    page.locator('#programmer').click()
    page.wait_for_function('__sent.length>64')
    check(page.evaluate('__sent.some(x=>JSON.stringify(x.bytes)===JSON.stringify([240,0,32,41,2,13,14,1,247]))'),'Correct Mini MK3 Programmer SysEx')
    check(page.evaluate('__sent.some(x=>x.port==="led"&&x.bytes[0]===144&&x.bytes[1]===63&&x.bytes[2]===37)'),'Next musical E4 lights physical address 63')
    page.evaluate('__midi([144,63,100]);__midi([144,63,100])')
    check(page.locator('#progress-label').inner_text().startswith('2 /'),'Held/repeated note-on does not skip repeated notes')
    page.evaluate('__midi([144,63,0]);__midi([144,63,100]);__midi([128,63,0])')
    check(page.locator('#next-note').inner_text()=='F4','Both MIDI note-off forms release input')
    page.locator('#midi-synth').select_option('synth')
    page.locator('#pad-3-3').click()
    check(page.evaluate('__sent.some(x=>x.port==="synth"&&x.bytes[0]===144&&x.bytes[1]===65)'),'Sound output receives musical F4, not pad address')
    check(page.evaluate('__sent.some(x=>x.port==="synth"&&x.bytes[0]===128&&x.bytes[1]===65)'),'Sound output gets paired note-off')
    page.locator('#midi-synth').select_option('')
    page.locator('#settings').evaluate('(e)=>e.open=false')
    page.locator('#song-select').select_option('diamond-chords')
    page.wait_for_function("document.getElementById('song-title').textContent==='Diamond Chords'")
    page.locator('#reading').select_option('chords')
    for selector in ['#pad-0-0','#pad-2-2','#pad-4-4']: page.locator(selector).click()
    check(page.locator('#progress-label').inner_text().startswith('2 /'),'Chord collection advances after all pitches')
    page.locator('#song-select').select_option('ode-to-joy')
    page.wait_for_function("document.getElementById('song-title').textContent==='Ode to Joy'")
    page.locator('#transpose').fill('12');page.locator('#transpose').dispatch_event('change')
    check(page.locator('#range-label').inner_text()=='C5 — C6','Automatic octave following')
    page.locator('#range-mode').select_option('fixed')
    check(page.locator('#next-label').inner_text()=='OUTSIDE THIS OCTAVE','Fixed range reports out-of-range pitches')
    page.locator('#range-mode').select_option('fold')
    check(page.locator('#next-note').inner_text()=='E4','Octave folding maps back to visible keys')
    page.locator('#transpose').fill('0');page.locator('#transpose').dispatch_event('change')
    page.locator('#range-mode').select_option('follow')
    page.locator('#reading').select_option('melody')
    page.locator('#listen').click()
    page.wait_for_function("document.getElementById('next-label').textContent==='LISTENING'")
    page.wait_for_timeout(720)
    check(page.locator('#progress-label').inner_text()!='1 / 30 steps','Reference playback advances through melody')
    page.locator('#listen').click()
    check(page.locator('#next-label').inner_text()=='PLAY NEXT','Stop returns to practice')
    before=page.evaluate('__fetches.length')
    page.locator('#file').set_input_files(str(ROOT/'library/chromatic-walk.mid'))
    page.wait_for_function("document.getElementById('song-title').textContent==='chromatic-walk'")
    check(page.evaluate('__fetches.length')==before,'Local file import performs no network request')
    page.locator('#file').set_input_files({'name':'broken.mid','mimeType':'audio/midi','buffer':b'not a midi file'})
    page.wait_for_function("!document.getElementById('notice').hidden")
    check(page.locator('#song-title').inner_text()=='chromatic-walk','Invalid file preserves previous melody')
    page.locator('#song-select').select_option('ode-to-joy')
    page.wait_for_function("document.getElementById('song-title').textContent==='Ode to Joy'")
    # Full completion through the same public keyboard UI.
    notes=[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60]
    for n in notes: page.locator(f'.pad[data-note="{n}"]').click()
    check(page.locator('#next-label').inner_text()=='MELODY COMPLETE','Full song can be completed')
    page.locator('#restart').click()
    page.locator('#play-mode').select_option('free')
    page.locator('#pad-2-2').click()
    check(page.locator('#progress-label').inner_text().startswith('1 /'),'Free play leaves progress unchanged')
    page.locator('#play-mode').select_option('practice')
    page.locator('#settings').evaluate('(e)=>e.open=true')
    page.locator('#learn').click()
    for note in range(36,49): page.evaluate(f'__midi([146,{note},100]);__midi([146,{note},0])')
    check('13 pads learned' in page.locator('#learn-status').inner_text(),'13-note custom MIDI learn completes')
    page.locator('#profile').select_option('mini')
    page.locator('#settings').evaluate('(e)=>e.open=false')
    page.locator('#restart').click()
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(ART/'diamond-desktop-v1.png'),full_page=True)
    for width,height in [(820,1180),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        check(page.evaluate('document.documentElement.scrollWidth')==width,f'No horizontal overflow at {width}px')
        page.screenshot(path=str(ART/f'diamond-{width}-v1.png'),full_page=True)
    # Pointer events emulate a held touch and a cancellation, not a physical iPad.
    page.locator('#pad-2-2').dispatch_event('pointerdown',{'pointerId':42,'pointerType':'touch','button':0})
    page.dispatch_event('body','pointercancel',{'pointerId':42,'pointerType':'touch'})
    check(page.locator('.pad.pressed').count()==0,'Cancelled touch releases pressed pads')
    check(not errors, f'No uncaught browser errors: {errors}')
    browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},indent=2))

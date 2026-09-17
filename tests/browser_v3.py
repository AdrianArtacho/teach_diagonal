#!/usr/bin/env python3
"""Repeat and bundled-preset regressions. Uses the documented v2 fixture harness."""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from harness_v2 import ROOT, prepare
sys.path.insert(0,str(ROOT/'tools'))
from generate_demos import midi
ART=ROOT/'artifacts'; checks=[]
def check(value, name):
    assert value, name
    checks.append(name)
def single_note(page):
    page.locator('#file').set_input_files({'name':'one-note.mid','mimeType':'audio/midi','buffer':midi('One-note loop',[(60,0.1)],bpm=120)})
    page.wait_for_function("document.getElementById('song-title').textContent==='one-note'")
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=b.new_page(viewport={'width':390,'height':844}); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    prepare(page,'?view=piano&simple=1&loop=1')
    check(page.locator('#simple-loop').get_attribute('aria-pressed')=='true','loop=1 starts enabled in simple mode')
    check(page.locator('#simple-restart').is_visible(),'Simple mode provides a visible restart button')
    check(page.locator('#profile').input_value()=='novation-launchpad','Fresh startup uses the bundled Novation Launchpad preset')
    page.locator('#piano-2-2').click(); page.locator('#simple-restart').click()
    check('1 /' in page.locator('#simple-next').inner_text(),'Simple restart returns to the first step')
    check(page.locator('#simple-loop').get_attribute('aria-pressed')=='true','Restart preserves loop mode')
    page.locator('#restore-controls').click(); single_note(page)
    page.locator('#connect').click()
    page.wait_for_function("document.getElementById('connection-badge').textContent==='MIDI input connected'")
    check(page.evaluate('__sent.length')==0,'Connecting the preset sends no automatic messages')
    page.locator('#lights').click()
    check(page.evaluate('__sent.some(x=>x.port==="led"&&x.bytes[0]===144&&x.bytes[1]===64&&x.bytes[2]===37)'), 'Bundled C pad illuminates exported address 64')
    page.evaluate('__midi([144,64,100]);__midi([144,64,100])')
    check('1 completed round' in page.locator('#loop-count').inner_text(),'One-note melody wraps, held duplicate does not skip into another round')
    check(page.locator('#next-note').inner_text()=='C4','Loop returns to the first target')
    page.evaluate('__midi([144,64,0]);__midi([144,64,100]);__midi([128,64,0])')
    check('2 completed rounds' in page.locator('#loop-count').inner_text(),'Release and repress plays the next round')
    page.locator('#view-diamond').click()
    check('2 completed rounds' in page.locator('#loop-count').inner_text(),'View change retains completed loop count')
    page.locator('#simple-mode').click();page.locator('#simple-loop').click()
    check(page.evaluate("new URL(__testURL).searchParams.get('loop')==='0'"),'Simple loop toggle updates the URL')
    page.locator('#pad-0-0').click()
    check('MELODY COMPLETE' in page.locator('#simple-next').inner_text(),'With loop off, practice stops at the end')
    page.locator('#simple-loop').click()
    check('PLAY NEXT' in page.locator('#simple-next').inner_text(),'Enabling loop on a completed melody restarts the target')
    page.locator('#simple-restart').click()
    check('0 completed rounds' in page.locator('#loop-count').inner_text(),'Explicit restart resets completed rounds')
    page.locator('#restore-controls').click();page.locator('#listen').click()
    page.wait_for_timeout(1100)
    check(page.locator('#next-label').inner_text()=='LISTENING','Reference playback repeats beyond a single-note melody ending')
    page.locator('#simple-mode').click() # view transition intentionally stops playback
    page.locator('#restore-controls').click();page.locator('#listen').click()
    page.locator('#loop-mode').uncheck();page.wait_for_timeout(700)
    check(page.locator('#next-label').inner_text()=='PLAY NEXT','Disabling looping lets reference playback stop at the next ending')
    page.locator('#loop-mode').check();page.locator('#copy-practice-link').click()
    check('loop=1' in page.locator('#practice-link').input_value(),'Copied practice link includes the loop flag')
    page.locator('#map-controller').click()
    check(page.locator('#map-row-0-0 input[data-field=note]').input_value()=='64','Mapping editor opens the built-in preset for review or copying')
    page.locator('#map-cancel').click()
    # A saved custom map takes priority over the new default.
    custom={k:dict(v) for k,v in json.loads((ROOT/'mappings/novation-launchpad.json').read_text())['mapping'].items()}
    custom['0-0']['note']=50;custom['0-0']['ledNote']=50
    another=b.new_page(viewport={'width':1360,'height':1000});another.on('pageerror',lambda e:errors.append(str(e)))
    prepare(another,'?view=piano&simple=0&loop=0',{'profile':'custom','custom':custom,'loop':True})
    check(another.locator('#profile').input_value()=='custom','Existing saved Custom profile is preserved')
    check(not another.locator('#loop-mode').is_checked(),'loop=0 overrides saved enabled state')
    another.locator('#settings').evaluate('(el)=>el.open=true')
    another.locator('#profile').select_option('novation-launchpad');another.locator('#map-controller').click()
    check(another.locator('#map-row-0-0 input[data-field=note]').input_value()=='64','Built-in preset remains available without importing JSON')
    another.locator('#map-cancel').click();another.locator('#profile').select_option('custom');another.locator('#map-controller').click()
    check(another.locator('#map-row-0-0 input[data-field=note]').input_value()=='50','Switching to the preset does not overwrite the Custom calibration')
    another.locator('#map-cancel').click()
    another.locator('#loop-mode').check()
    saved=another.evaluate("JSON.parse(__storage['diamond-v1'])")
    third=b.new_page();third.on('pageerror',lambda e:errors.append(str(e)));prepare(third,'?view=piano',saved)
    check(third.locator('#loop-mode').is_checked(),'Loop preference is restored when no URL override is supplied')
    third.close()
    # Multi-note completion, not only a one-note fixture.
    another.locator('#restart').click()
    notes=[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60]
    for n in notes:another.locator(f'.piano-key[data-note="{n}"]').click()
    check(another.locator('#progress-label').inner_text().startswith('1 /') and '1 completed round' in another.locator('#loop-count').inner_text(),'Complete multi-note melody wraps to its first step')
    another.locator('#simple-mode').click();another.screenshot(path=str(ART/'piano-loop-desktop-v3.png'))
    # The new control strip fits both phone orientations and remains tappable.
    page.locator('#song-select').select_option('ode-to-joy');page.wait_for_timeout(100)
    page.locator('#view-piano').click();page.locator('#simple-mode').click()
    for w,h in [(320,568),(390,844),(820,1180),(844,390)]:
        page.set_viewport_size({'width':w,'height':h})
        check(page.evaluate('document.documentElement.scrollWidth')==w, f'Simple controls cause no overflow at {w}×{h}')
        check(page.locator('.simple-actions button').evaluate_all('(els)=>els.every(el=>{const r=el.getBoundingClientRect();return r.width>=40&&r.left>=0&&r.right<=innerWidth&&r.bottom<=68})'),f'Restart, loop and Controls remain visible at {w}×{h}')
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ART/'piano-loop-phone-v3.png'))
    check(not errors,'No uncaught browser errors')
    b.close()
report={'version':'2.1.0','date':'2026-09-17','passed':len(checks),'failed':0,'checks':checks,
        'environment':'Headless Chromium; fixture-backed URL, storage, fetch and Web MIDI; isolated source module harness.',
        'not_tested':['Physical Launchpad','Real iPad/Safari hardware','Audible latency','Live browser navigation (blocked by the environment)']}
(ART/'browser-verification-v3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))

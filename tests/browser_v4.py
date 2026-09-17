#!/usr/bin/env python3
"""Fullscreen API state/permission simulation and sourced starter-pack regressions.
Uses real Chromium DOM/CSS with fixture-backed source modules, URL and MIDI.
Native live-site navigation is blocked by the environment. This script tests
native fullscreen separately where Chromium exposes it, without simulating that call.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from harness_v2 import ROOT, prepare
ART=ROOT/'artifacts'; checks=[]; errors=[]
spec=json.loads((ROOT/'tools/starter-pack.json').read_text())

def check(value,name):
    assert value,name
    checks.append(name)

MOCK='''
window.__fsState=null;window.__fsCalls=[];
Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:true});
Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>__fsState});
document.documentElement.requestFullscreen=function(){__fsCalls.push({action:'enter',active:navigator.userActivation.isActive});__fsState=this;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();};
document.exitFullscreen=function(){__fsCalls.push({action:'exit'});__fsState=null;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    def fresh(query='', extra=MOCK, width=390,height=844):
        pg=browser.new_page(viewport={'width':width,'height':height});pg.on('pageerror',lambda e:errors.append(str(e)))
        prepare(pg,query,extra_setup=extra);return pg
    page=fresh('?song=augustin&view=piano&fullscreen=1&loop=1')
    check(page.locator('#simple-fullscreen').is_visible(),'Fullscreen link defaults to simple mode with an accessible toggle')
    check(page.locator('#fullscreen-invite').is_visible(),'Fullscreen URL shows a one-tap invitation')
    check(page.evaluate('__fsCalls.length')==0,'URL intent does not attempt fullscreen without activation')
    check(page.locator('#song-title').inner_text()=='O du lieber Augustin','Song parameter loads the requested new starter melody')
    page.locator('#fullscreen-enter').click()
    check(page.locator('#fullscreen-invite').is_hidden(),'Entry hides the fullscreen invitation')
    check(page.evaluate('__fsCalls[0].active') is True,'Entry request is invoked during the trusted click gesture')
    check(page.locator('#simple-fullscreen').get_attribute('aria-label')=='Exit fullscreen','Simple fullscreen button changes to exit state')
    check(page.locator('#fullscreen').get_attribute('aria-pressed')=='true','Regular fullscreen button stays synchronized')
    page.locator('#simple-fullscreen').click()
    check(page.evaluate('__fsState===null'),'Simple fullscreen button exits')
    check(page.evaluate("new URL(__testURL).searchParams.get('fullscreen')==='0'"),'Exit writes fullscreen=0 without reloading')
    check(page.evaluate("new URL(__testURL).searchParams.get('song')==='augustin'&&new URL(__testURL).searchParams.get('loop')==='1'"),'Fullscreen transitions preserve song and loop URL arguments')
    page.locator('#simple-fullscreen').click()
    page.evaluate('__fsState=null;document.dispatchEvent(new Event("fullscreenchange"))')
    check(page.locator('#simple-fullscreen').get_attribute('aria-label')=='Enter fullscreen','Browser-driven exit updates the control state')
    page.locator('#restore-controls').click();page.locator('#fullscreen').click()
    check(page.locator('#fullscreen').get_attribute('aria-pressed')=='true','Regular-mode toggle enters fullscreen too')
    page.locator('#fullscreen').click()
    page.close()

    page=fresh('?view=piano&fullscreen=1&simple=0')
    check(page.locator('.topbar').is_visible(),'An explicit simple=0 overrides fullscreen simple-view default')
    page.locator('#fullscreen-dismiss').click()
    check(page.evaluate('__fsCalls.length')==0 and page.locator('#fullscreen-invite').is_hidden(),'Not now dismisses without requesting fullscreen')
    check(page.evaluate("new URL(__testURL).searchParams.get('fullscreen')==='0'"),'Dismissal clears fullscreen URL intent')
    page.close()

    denied=MOCK+"document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Permission denied'));"
    page=fresh('?view=piano&fullscreen=1',denied);page.locator('#fullscreen-enter').click()
    page.wait_for_function("!document.getElementById('notice').hidden")
    check('Permission denied' in page.locator('#notice').inner_text(),'Denied fullscreen reports the reason instead of claiming success')
    check(page.locator('#simple-fullscreen').get_attribute('aria-pressed')=='false' and page.locator('#piano').is_visible(),'Denied fullscreen leaves a playable simple view')
    page.close()

    unavailable="Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:false});document.documentElement.webkitRequestFullscreen=undefined;"
    page=fresh('?view=diamond&fullscreen=1',unavailable)
    check(page.locator('#fullscreen-enter').inner_text()=='Use simple view','Unavailable fullscreen offers a simple-view alternative')
    page.locator('#fullscreen-enter').click()
    check(page.locator('#fullscreen-invite').is_hidden() and page.locator('#instrument').is_visible(),'Unavailable fullscreen fallback leaves the instrument accessible')
    page.close()

    prefixed='''window.__fsState=null;document.documentElement.requestFullscreen=undefined;
Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});
Object.defineProperty(document,'webkitFullscreenElement',{configurable:true,get:()=>__fsState});
document.documentElement.webkitRequestFullscreen=function(){__fsState=this;document.dispatchEvent(new Event('webkitfullscreenchange'));};
document.webkitExitFullscreen=function(){__fsState=null;document.dispatchEvent(new Event('webkitfullscreenchange'));};'''
    page=fresh('?view=piano&simple=1',prefixed);page.locator('#simple-fullscreen').click()
    check(page.locator('#simple-fullscreen').get_attribute('aria-pressed')=='true','Prefixed fullscreen entry updates the UI')
    page.locator('#simple-fullscreen').click()
    check(page.locator('#simple-fullscreen').get_attribute('aria-pressed')=='false','Prefixed fullscreen exit updates the UI')
    page.close()

    page=fresh('?view=piano&loop=1',width=1360,height=1000)
    for entry in spec['songs']:
        page.locator('#song-select').select_option(entry['id'])
        page.wait_for_function('(title)=>document.getElementById("song-title").textContent===title',arg=entry['title'])
        check(page.locator('#range-label').inner_text()=='C4 — C5',f"{entry['id']}: fits without automatic register changes")
        # Every public interaction follows the generated melody; no application-state mutation.
        notes=page.evaluate('''(id)=>{const encoded=Array.from(atob(fixtures['library/'+id]),c=>c.charCodeAt(0));return __modules['music.js'].parseMidi(Uint8Array.from(encoded)).tracks[0].notes.map(n=>n.midi)}''',entry['file'])
        for pitch in notes:page.locator(f'.piano-key[data-note="{pitch}"]').click()
        check(page.locator('#progress-label').inner_text().startswith('1 /') and '1 completed round' in page.locator('#loop-count').inner_text(),f"{entry['id']}: all notes can be played and loop back")
    page.locator('#song-select').select_option('augustin');page.wait_for_timeout(100)
    page.locator('.piano-key[data-note="67"]').click();before=page.locator('#progress-label').inner_text();fetches=page.evaluate('__fetches.length')
    page.locator('#song-select').select_option('yakety-sax')
    check(page.locator('#local-import-prompt').is_visible(),'Yakety Sax is clearly a local-import option, not a bundled track')
    check(page.evaluate('__fetches.length')==fetches,'Selecting the local-only entry never fetches a missing or substitute MIDI')
    check(page.locator('#song-title').inner_text()=='O du lieber Augustin' and page.locator('#progress-label').inner_text()==before,'Local-only selection preserves the current lesson and its progress')
    with page.expect_file_chooser() as chooser:page.locator('#local-import-open').click()
    chooser.value.set_files(str(ROOT/'library/ode-to-joy.mid'))
    page.wait_for_function("document.getElementById('song-title').textContent==='ode-to-joy'")
    check(page.locator('#local-import-prompt').is_hidden(),'User file import replaces the lesson and closes the import notice')
    check(page.evaluate('__fetches.length')==fetches,'Local import is still processed without an upload or network request')
    page.close()

    page=fresh('?song=yakety-sax&view=piano&simple=1')
    check(page.locator('#local-import-prompt').is_visible() and page.locator('#song-title').inner_text()=='Ode to Joy','Direct local-only song link explains the requirement alongside a valid fallback lesson')
    check(not page.evaluate('__fetches.some(x=>x.includes("undefined")||x.endsWith("yakety-sax.mid"))'),'Direct local-only link does not fetch an undefined path')
    page.locator('#local-import-close').click()
    for w,h in [(320,568),(390,844),(820,1180),(844,390),(1360,1000)]:
        page.set_viewport_size({'width':w,'height':h})
        check(page.evaluate('document.documentElement.scrollWidth')==w,f'Four-button simple header has no horizontal overflow at {w}×{h}')
        check(page.locator('.simple-actions button').evaluate_all('(els)=>els.length===4&&els.every(el=>{const r=el.getBoundingClientRect();return r.width>=40&&r.left>=0&&r.right<=innerWidth&&r.bottom<=68})'),f'Fullscreen, restart, loop and Controls remain tappable at {w}×{h}')
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ART/'piano-fullscreen-button-phone-v4.png'))
    page.close()
    page=fresh('?song=moonlight&view=piano&fullscreen=1&loop=1',width=1360,height=1000)
    page.screenshot(path=str(ART/'fullscreen-invitation-v4.png'));page.locator('#fullscreen-enter').click()
    page.screenshot(path=str(ART/'moonlight-piano-fullscreen-v4.png'));page.close()

    # Actual native Chromium API on this fixture page, no fullscreen monkey patch.
    native=fresh('?view=piano&simple=1',extra='')
    native.locator('#simple-fullscreen').click();native.wait_for_timeout(250)
    native_result=native.evaluate('!!document.fullscreenElement')
    if native_result:
        check(native.locator('#simple-fullscreen').get_attribute('aria-pressed')=='true','Native headless Chromium fullscreen entry succeeds without API simulation')
        native.locator('#simple-fullscreen').click();native.wait_for_timeout(150)
        check(not native.evaluate('!!document.fullscreenElement'),'Native headless Chromium fullscreen exits without API simulation')
    native.close()
    check(not errors,'No uncaught browser errors')
    browser.close()
report={'version':'2.2.0','date':'2026-09-17','passed':len(checks),'failed':0,'checks':checks,'native_chromium_fullscreen':native_result,
 'environment':'Headless Chromium; real DOM/CSS; fixture-backed fetch, storage, URL and Web MIDI; module harness. Fullscreen permission/prefix cases simulated, with a separate native Chromium API check.',
 'not_tested':['Live browser navigation (blocked by administrator)','Physical Launchpad LEDs','Real iPad/Safari devices','Audio latency']}
(ART/'browser-verification-v4.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))

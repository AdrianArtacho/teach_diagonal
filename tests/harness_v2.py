"""Fixture harness for environments where browser navigation is disabled.
Loads real source in isolated module scopes, rewrites only import/export and
location.href, and supplies an in-memory URL, storage, fetch and Web MIDI.
Node tests separately execute native ES module imports. No physical hardware.
"""
from pathlib import Path
import base64
import json
import re
ROOT = Path(__file__).resolve().parents[1]

def make_bundle():
    result = ['window.__modules = {};']
    for name in ['music.js','audio.js','presets.js','midi.js','mapping.js','mapping-ui.js','experience.js','repeat.js','app.js']:
        src = (ROOT/'src'/name).read_text()
        exports = re.findall(r'export (?:const|class|function) (\w+)',src)
        src = re.sub(r"import \{(.*?)\} from '\./(.*?)';",lambda m:f"const {{{m[1]}}} = window.__modules[{json.dumps(m[2])}];",src)
        src = src.replace('export ','').replace('location.href','window.__testURL')
        result.append(f'window.__modules[{json.dumps(name)}] = (()=>{{\n{src}\nreturn {{{",".join(exports)}}};\n}})();')
    return '\n'.join(result)

def prepare(page, query='', saved=None):
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<link[^>]*>','',html)
    html=re.sub(r'<script.*?</script>','',html,flags=re.S)
    html=html.replace('<head>','<head><base href="https://diamond.test/teach_diagonal/">')
    files={f'library/{p.name}':base64.b64encode(p.read_bytes()).decode() for p in (ROOT/'library').iterdir() if p.is_file()}
    setup="""
window.__sent=[];window.__fetches=[];
window.__testURL='https://diamond.test/teach_diagonal/' + QUERY;
window.__storage={'diamond-v1':JSON.stringify(SAVED)};
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__storage[k]||null,setItem:(k,v)=>__storage[k]=v}});
history.replaceState=(_a,_b,url)=>{window.__testURL=String(url)};
const fixtures=FILES;
window.fetch=async url=>{
 __fetches.push(String(url));const key=String(url).replace('https://diamond.test/teach_diagonal/','');
 return fixtures[key]?new Response(Uint8Array.from(atob(fixtures[key]),c=>c.charCodeAt(0))):new Response('Not found',{status:404});
};
const port=(id,name,type)=>({id,name,type,state:'connected',connection:'closed',
 open:async function(){this.connection='open';return this},close:async function(){this.connection='closed';return this},
 send:function(bytes){__sent.push({port:this.id,bytes:Array.from(bytes)})}});
const input=port('in','LPMiniMK3 MIDI In','input'),led=port('led','LPMiniMK3 MIDI Out','output'),synth=port('synth','Test synth','output');
window.__access={inputs:new Map([['in',input]]),outputs:new Map([['led',led],['synth',synth]]),sysexEnabled:false};
Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async opts=>{__access.sysexEnabled=!!opts.sysex;return __access}});
window.__midi=bytes=>input.onmidimessage?.({data:Uint8Array.from(bytes)});
""".replace('QUERY',json.dumps(query)).replace('SAVED',json.dumps(saved or {})).replace('FILES',json.dumps(files))
    page.set_content(html)
    styles = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"', (ROOT/'index.html').read_text())
    page.add_style_tag(content='\n'.join((ROOT / path).read_text() for path in styles))
    page.add_script_tag(content=setup)
    page.add_script_tag(content=make_bundle())
    page.wait_for_function("document.getElementById('song-title').textContent!=='Your next melody starts here.'")

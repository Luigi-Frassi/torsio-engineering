# Checks that the compiled Tailwind CSS (vendor/tailwind/app.css) is up to date and covers every class the
# calculator puts on the page, also those added at run time by the modules.
# Needs the Tailwind standalone CLI v3.4.17 (TAILWIND=/path/to/tailwindcss) and Playwright with Chromium.
# Run from the repository root:  TAILWIND=/path/to/tailwindcss python3 tests/css_check.py
import http.server, threading, functools, os, re, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TW = os.environ.get('TAILWIND', 'tailwindcss')
CSS = os.path.join(REPO, 'vendor', 'tailwind', 'app.css')

def selectors(css):
    out = set()
    for block in re.findall(r'([^{}]+)\{', css):
        for s in block.split(','):
            s = s.strip()
            if s and not s.startswith('@'): out.add(s)
    return out

def build(content_paths):
    with tempfile.TemporaryDirectory() as d:
        cfg = os.path.join(d, 'tw.config.js'); out = os.path.join(d, 'out.css')
        with open(cfg, 'w') as f:
            f.write(f"const c = require({os.path.join(REPO, 'tailwind.config.js')!r});\nmodule.exports = {{ ...c, content: {content_paths!r} }};\n")
        subprocess.run([TW, '-c', cfg, '-i', os.path.join(REPO, 'tools', 'tailwind.in.css'), '-o', out, '--minify'], check=True, capture_output=True)
        return open(out).read()

fails = []
committed = open(CSS).read()
fresh = build([os.path.join(REPO, 'app.html'), os.path.join(REPO, 'modules', '**', '*.js')])
if fresh != committed: fails.append('vendor/tailwind/app.css is out of date: run sh tools/build-css.sh')

# classes on the live page, module by module, after demos, buttons and select options
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=REPO))
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_address[1]}/app.html'
GET = "()=>{const s=new Set();document.querySelectorAll('[class]').forEach(e=>(e.getAttribute('class')||'').split(/\\s+/).forEach(t=>t&&s.add(t)));return [...s]}"
SEC = "m=>'#module'+m[0].toUpperCase()+m.slice(1)+'Section'"
toks = set()
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1400, 'height': 900})
    ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(B.rsplit('/', 1)[0]) else r.abort())
    pg = ctx.new_page()
    for q in ['', '?demo=transmission', '?demo=frames', '?demo=boltsExam', '?demo=shaftExam', '?demo=bearingFit']:
        pg.goto(B + q); pg.wait_for_timeout(1000); toks |= set(pg.evaluate(GET))
    for m in ['fits', 'belts', 'gears', 'shafts', 'frames', 'bolts']:
        pg.goto(B + '?m=' + m); pg.wait_for_timeout(800)
        n = pg.evaluate(f"m=>[...document.querySelectorAll(({SEC})(m)+' button')].filter(b=>b.offsetParent&&!b.closest('table')).length", m)
        for i in range(min(n, 40)):
            pg.evaluate(f"([m,i])=>{{const bs=[...document.querySelectorAll(({SEC})(m)+' button')].filter(b=>b.offsetParent&&!b.closest('table'));bs[i]&&bs[i].click()}}", [m, i])
            pg.wait_for_timeout(120); toks |= set(pg.evaluate(GET))
        for sid, opts in pg.evaluate(f"m=>[...document.querySelectorAll(({SEC})(m)+' select')].filter(s=>s.id).map(s=>[s.id,[...s.options].map(o=>o.value)])", m):
            for o in opts[:8]:
                pg.evaluate("([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))}", [sid, o])
                pg.wait_for_timeout(60); toks |= set(pg.evaluate(GET))
    b.close()
srv.shutdown()
with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False) as f:
    f.write('<div class="' + ' '.join(sorted(toks)) + '"></div>'); dom = f.name
missing = selectors(build([dom])) - selectors(committed)
os.unlink(dom)
if missing: fails.append('classes used on the page but missing from the CSS: ' + ', '.join(sorted(missing)[:20]))
print(f'{len(toks)} classes on the page')
print('\n'.join('FAIL ' + f for f in fails) if fails else 'CSS OK')
sys.exit(1 if fails else 0)

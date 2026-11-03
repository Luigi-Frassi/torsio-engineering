# Builds one page per language from the bilingual sources in tools/site-src/:
#   English  → /index.html, /metodo.html, /novita.html, /privacy.html
#   Italian  → /it/index.html, /it/metodo.html, /it/novita.html, /it/privacy.html
# Search engines see each address in one language only (lang attribute, text, title and description), with
# hreflang links between the two versions; the IT/EN buttons go to the other address. Old links with
# ?lang=it|en are sent to the right version; the English home sends an Italian browser to /it/ the first time.
# Edit the sources, never the generated pages. Run from the repository root:  python3 tools/mklang.py
import http.server, threading, functools, os, re
from playwright.sync_api import sync_playwright

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, 'tools', 'site-src')
SITE = 'https://torsio.app'

PAGES = {   # name: (english path, italian path, titles, descriptions)
  'index': ('/', '/it/', {'en': 'Torsio Engineering — preliminary sizing of machine elements', 'it': 'Torsio Engineering — dimensionamento di massima di organi di macchine'},
            {'en': None, 'it': 'Alberi, ruote dentate, cinghie sincrone, accoppiamenti ISO, telai FEM, bulloni, dischi, tubi e calettamenti: dimensionamento di massima gratuito nel browser, con la relazione di calcolo in PDF e il disegno DXF per il CAD. Verificato su {N} casi svolti a mano.'}),
  'metodo': ('/metodo.html', '/it/metodo.html', {'en': 'Method and validation — Torsio Engineering', 'it': 'Metodo e validazione — Torsio Engineering'},
             {'en': None, 'it': 'Metodi, formule, fonti e {N} casi di prova svolti a mano: cosa calcola Torsio e dove si ferma.'}),
  'novita': ('/novita.html', '/it/novita.html', {'en': "What's new — Torsio Engineering", 'it': 'Novità — Torsio Engineering'},
             {'en': None, 'it': 'Cosa cambia in Torsio Engineering, versione per versione.'}),
  'privacy': ('/privacy.html', '/it/privacy.html', {'en': 'Privacy — Torsio Engineering', 'it': 'Privacy — Torsio Engineering'},
              {'en': None, 'it': 'Quali dati usa Torsio Engineering: nessuna registrazione, i calcoli restano nel tuo browser.'}),
}
PAGE_OF = {'index.html': 'index', 'metodo.html': 'metodo', 'novita.html': 'novita', 'privacy.html': 'privacy'}

# in the browser, on the source page with its own scripts switched off: keep one language
TRANSFORM = r"""
lang => {
  const d = document;
  if (d.querySelector('[data-l]')) {
    d.querySelectorAll('[data-l]').forEach(el => { if (el.getAttribute('data-l') !== lang) el.remove(); });
  }
  // home: text from the dictionary T in its script (Italian is already in the HTML)
  const src = [...d.scripts].map(s => s.textContent).find(t => t.includes('var T = {') && t.includes('var IT = {}'));
  if (src && lang === 'en') {
    const T = new Function(src.slice(src.indexOf('var T = {'), src.indexOf('var IT = {}')) + '; return T;')().en;
    d.querySelectorAll('[data-t]').forEach(el => { const k = el.getAttribute('data-t'); if (T[k] != null) el.textContent = T[k]; });
    d.querySelectorAll('[data-t-svg]').forEach(el => { const k = el.getAttribute('data-t-svg'); if (T[k] != null) el.textContent = T[k]; });
    d.querySelectorAll('[data-t-html]').forEach(el => { const k = el.getAttribute('data-t-html'); if (T[k] != null) el.innerHTML = T[k]; });
  }
  if (src) {
    const H = new Function(src.slice(src.indexOf('var HREF = {'), src.indexOf('var goodman')) + '; return HREF;')();
    d.querySelectorAll('[data-href]').forEach(el => { const h = H[el.getAttribute('data-href')]; if (h) el.setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'lang=' + lang); });
  }
  d.querySelectorAll('[data-href-en]').forEach(el => el.setAttribute('href', el.getAttribute(lang === 'en' ? 'data-href-en' : 'data-href-it')));
  d.querySelectorAll('[data-app]').forEach(a => a.setAttribute('href', 'app.html?' + (a.getAttribute('data-app') === 'demo' ? 'demo=transmission&' : '') + 'lang=' + lang));
  d.querySelectorAll('[data-contact]').forEach(a => a.setAttribute('href', 'https://tally.so/r/Gev5gZ?module=contact&lang=' + lang));
  d.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)));
  d.documentElement.setAttribute('lang', lang);
  return '<!DOCTYPE html>\n' + d.documentElement.outerHTML + '\n';
}
"""

def cases():
    with open(os.path.join(SRC, 'index.html'), encoding='utf-8') as f:
        m = re.search(r'<div class="n">(\d+)</div>', f.read())
    return m.group(1) if m else ''

def page_url(name, lang):
    en, it, *_ = PAGES[name]
    return en if lang == 'en' else it

def postprocess(html, name, lang):
    en, it, titles, descs = PAGES[name]
    here, other = page_url(name, lang), page_url(name, 'it' if lang == 'en' else 'en')
    # every local address absolute (the Italian pages live in /it/)
    def absol(m):
        attr, q, url = m.group(1), m.group(2), m.group(3)
        if re.match(r'^(https?:|mailto:|data:|#|/|javascript:)', url): return m.group(0)
        if url in ('./', '.', ''): return f'{attr}={q}{page_url("index", lang)}{q}'
        return f'{attr}={q}/{url}{q}'
    html = re.sub(r'(?<=\s)(href|src)=(["\'])([^"\']*)\2', absol, html)
    html = html.replace("'app.html", "'/app.html").replace("'vendor/", "'/vendor/").replace('"vendor/', '"/vendor/')
    # links to the other static pages: to the version of this language (or of the language written in the link)
    def pagelink(m):
        nm, l = m.group(1), m.group(3) or lang
        return f'href="{page_url(PAGE_OF[nm + ".html"], l)}"'
    html = re.sub(r'href="/(index|metodo|novita|privacy)\.html(\?lang=(it|en))?"', pagelink, html)
    html = re.sub(r'href="/"', f'href="{page_url("index", lang)}"', html)
    # head: title, description, canonical, hreflang, og
    html = re.sub(r'<title>.*?</title>', f'<title>{titles[lang]}</title>', html, count=1, flags=re.S)
    d = descs[lang]
    if d:
        d = d.replace('{N}', cases())
        html = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + d + m.group(2), html, count=1)
        html = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + d + m.group(2), html, count=1)
    html = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + titles[lang] + m.group(2), html, count=1)
    html = re.sub(r'\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*">', '', html)
    alt = (f'\n  <link rel="alternate" hreflang="en" href="{SITE}{en}">\n  <link rel="alternate" hreflang="it" href="{SITE}{it}">'
           f'\n  <link rel="alternate" hreflang="x-default" href="{SITE}{en}">')
    if '<link rel="canonical"' in html:
        html = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{SITE}{here}">' + alt, html, count=1)
    else:
        html = html.replace('</title>', f'</title>\n  <link rel="canonical" href="{SITE}{here}">' + alt, 1)
    html = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + SITE + here + m.group(2), html, count=1)
    html = re.sub(r'<meta property="og:locale" content="[^"]*">', f'<meta property="og:locale" content="{"en_US" if lang == "en" else "it_IT"}">', html, count=1)
    html = re.sub(r'<meta property="og:locale:alternate" content="[^"]*">', f'<meta property="og:locale:alternate" content="{"it_IT" if lang == "en" else "en_US"}">', html, count=1)
    # language routing, first thing in the head
    home_redirect = ("var own = Array.from(new URLSearchParams(location.search).keys()).filter(function (k) { return !/^utm_/.test(k); });\n"
                     "      if (!saved && !q && !own.length && (navigator.language || '').slice(0, 2) === 'it') { location.replace('/it/' + location.search + location.hash); return; }"
                     if name == 'index' and lang == 'en' else '')
    route = (f"<script>\n    // {('English' if lang == 'en' else 'Italian')} page: ?lang= of old links and the language buttons go to the other version\n"
             f"    (function () {{\n      var other = '{other}', q = new URLSearchParams(location.search).get('lang'), saved = null;\n"
             f"      try {{ saved = localStorage.getItem('torsioLang'); }} catch (e) {{ /* private mode */ }}\n"
             f"      if (q && q !== '{lang}') {{ var p = new URLSearchParams(location.search); p.delete('lang'); var s = p.toString(); location.replace(other + (s ? '?' + s : '') + location.hash); return; }}\n"
             f"      {home_redirect}\n"
             f"      document.addEventListener('click', function (ev) {{ var b = ev.target.closest && ev.target.closest('.lang button'); if (!b) return; var l = b.getAttribute('data-lang');\n"
             f"        try {{ localStorage.setItem('torsioLang', l); }} catch (e) {{ /* private mode */ }}\n"
             f"        if (l !== '{lang}') {{ ev.stopImmediatePropagation(); location.href = other; }} }}, true);\n"
             f"    }})();\n  </script>")
    html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n  ' + route, 1) if '<meta charset="UTF-8">' in html else html.replace('<head>', '<head>\n  ' + route, 1)
    # the page scripts start in the page's language, not the browser's
    html = re.sub(r"setLang\((q \|\| )?saved \|\| \(\(navigator\.language \|\| 'it'\)\.slice\(0, 2\) === 'it' \? 'it' : 'en'\)\);", f"setLang('{lang}');", html)
    return html

def main():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=SRC))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_address[1]}/'
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(java_script_enabled=False)
        ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(base) and r.request.resource_type == 'document' else r.abort())
        pg = ctx.new_page()
        for name in PAGES:
            for lang in ('en', 'it'):
                pg.goto(base + name + '.html')
                html = postprocess(pg.evaluate(TRANSFORM, lang), name, lang)
                out = os.path.join(REPO, page_url(name, lang).lstrip('/'))
                if out.endswith('/') or out == REPO: out = os.path.join(out, 'index.html')
                os.makedirs(os.path.dirname(out), exist_ok=True)
                with open(out, 'w', encoding='utf-8') as f: f.write(html)
                print(os.path.relpath(out, REPO))
        b.close()
    srv.shutdown()

if __name__ == '__main__':
    main()

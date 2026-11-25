#!/usr/bin/env python3
# Writes sitemap.xml with every public page and its <lastmod> (date of the last commit that changed the page;
# today if it has changes not yet committed). Google ignores changefreq and priority, but uses lastmod.
# Run last, after mklang.py, mkguides.py and mkfits.py: python3 tools/mksitemap.py
import os, subprocess, datetime, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://torsio.app'
STATIC = ['index.html', 'it/index.html', 'metodo.html', 'it/metodo.html', 'novita.html', 'it/novita.html',
          'privacy.html', 'it/privacy.html', 'app.html']
GUIDES = ['shaft-calculator', 'bolted-joint-calculator', 'frame-truss-calculator', 'gear-calculator', 'iso-fits-calculator',
          'it/dimensionamento-albero', 'it/calcolo-bulloni', 'it/calcolo-telaio-traliccio', 'it/calcolo-ruote-dentate',
          'it/tolleranze-accoppiamenti-iso']

def files():
    out = list(STATIC) + [g + '/index.html' for g in GUIDES]
    for d in ('iso-fits', 'it/accoppiamenti'):
        out += sorted(os.path.relpath(f, ROOT) for f in glob.glob(os.path.join(ROOT, d, '*', 'index.html')))
    return out

def url(f):
    if f == 'index.html': return SITE + '/'
    return SITE + '/' + (f[:-len('index.html')] if f.endswith('/index.html') else f)

def lastmod(f):
    git = lambda *a: subprocess.run(['git', '-C', ROOT, *a], capture_output=True, text=True).stdout.strip()
    if git('status', '--porcelain', '--', f): return datetime.date.today().isoformat()
    return git('log', '-1', '--format=%cs', '--', f) or datetime.date.today().isoformat()

if __name__ == '__main__':
    fs = files()
    missing = [f for f in fs if not os.path.exists(os.path.join(ROOT, f))]
    assert not missing, missing
    body = ''.join(f'  <url><loc>{url(f)}</loc><lastmod>{lastmod(f)}</lastmod></url>\n' for f in fs)
    open(os.path.join(ROOT, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + '</urlset>\n')
    print(len(fs), 'URLs in sitemap.xml')

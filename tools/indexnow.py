#!/usr/bin/env python3
# Tells Bing (and the other IndexNow engines: Yandex, Seznam, Naver; Bing feeds ChatGPT search, Copilot and DuckDuckGo)
# which pages changed in a commit range, so they are crawled again soon.
#   python3 tools/indexnow.py BASE HEAD      pages changed between two commits
#   python3 tools/indexnow.py --all           every page of the sitemap
# The key is the <32 hex>.txt file at the root of the site. Run by .github/workflows/indexnow.yml after a push to main.
import glob, json, os, re, subprocess, sys, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = 'torsio.app'
key = next(os.path.basename(f)[:-4] for f in glob.glob(os.path.join(ROOT, '*.txt')) if re.fullmatch(r'[0-9a-f]{32}\.txt', os.path.basename(f)))
sitemap = re.findall(r'<loc>([^<]+)</loc>', open(os.path.join(ROOT, 'sitemap.xml')).read())

if sys.argv[1:] == ['--all']:
    urls = sitemap
else:
    changed = subprocess.run(['git', '-C', ROOT, 'diff', '--name-only', sys.argv[1], sys.argv[2]], capture_output=True, text=True, check=True).stdout.split()
    def url(f):
        if f == 'index.html': return f'https://{HOST}/'
        return f'https://{HOST}/' + (f[:-len('index.html')] if f.endswith('/index.html') else f)
    urls = [u for u in map(url, changed) if u in sitemap]
if not urls:
    print('no public page changed'); sys.exit(0)
body = json.dumps({'host': HOST, 'key': key, 'keyLocation': f'https://{HOST}/{key}.txt', 'urlList': urls}).encode()
req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body, headers={'Content-Type': 'application/json; charset=utf-8'})
with urllib.request.urlopen(req, timeout=30) as r:
    print(r.status, len(urls), 'URLs sent'); print('\n'.join(urls))

#!/usr/bin/env python3
# One page per recommended ISO fit, in English and Italian (42 pages):
#   /iso-fits/<fit>/        e.g. /iso-fits/h7-g6/
#   /it/accoppiamenti/<fit>/  e.g. /it/accoppiamenti/h7-g6/
# The numbers come from modules/core/fits-core.js through tools/fits-pages-data.js (needs node).
# Run after mkguides.py: python3 tools/mkfits.py
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mkguides import STYLE, GEAR, L, SITE, TALLY, ROOT, num, KIND, KCLS

FITS = json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'fits-pages-data.js')], capture_output=True, text=True, check=True).stdout)

def slug(fit): return fit.lower().replace('/', '-')
def path(fit, lang): return (f'iso-fits/{slug(fit)}/' if lang == 'en' else f'it/accoppiamenti/{slug(fit)}/')
HUB = {'en': 'iso-fits-calculator/', 'it': 'it/tolleranze-accoppiamenti-iso/'}

# Same descriptions as the calculator (app.html, fits labels), without the fit in brackets
USE = {
 'en': {'H11/c11': 'Very loose running, wide clearance', 'H9/d9': 'Free running, large clearance', 'H8/f7': 'Close running, lubricated journals',
        'H7/f7': 'Wide clearance, loose running', 'H7/g6': 'Precision running, journal bearings', 'H7/h6': 'Sliding by hand, location fit',
        'H8/h7': 'Sliding location, medium precision', 'H7/js6': 'Transition, mallet assembly', 'H7/k6': 'Light press, hand press fit',
        'H7/n6': 'Tight transition, press assembly', 'H7/p6': 'Permanent press or heat shrink fit', 'H7/r6': 'Medium interference, press fit',
        'H7/s6': 'Heavy interference, shrink fit', 'C11/h11': 'Very loose running, shaft basis', 'D9/h9': 'Free running, shaft basis',
        'F8/h7': 'Close running, shaft basis', 'G7/h6': 'Precision running, shaft basis', 'K7/h6': 'Transition, shaft basis',
        'N7/h6': 'Tight transition, shaft basis', 'P7/h6': 'Light interference, shaft basis', 'S7/h6': 'Heavy interference, shaft basis'},
 'it': {'H11/c11': 'Gioco molto ampio, montaggi grossolani', 'H9/d9': 'Rotante libero, gioco ampio', 'H8/f7': 'Rotante preciso, perni lubrificati',
        'H7/f7': 'Scorrevole con ampio gioco', 'H7/g6': 'Scorrevole di precisione, bronzine', 'H7/h6': 'Scorrevole a mano, posizionamento',
        'H8/h7': 'Scorrevole di posizionamento, precisione media', 'H7/js6': 'Incerto, montaggio a mazzuolo', 'H7/k6': 'Leggera interferenza, montaggio a pressione',
        'H7/n6': 'Incerto stretto, montaggio a pressa', 'H7/p6': 'Interferenza stabile, forzamento a pressa o a caldo', 'H7/r6': 'Interferenza media, montaggio a pressa',
        'H7/s6': 'Interferenza forte, calettamento a caldo', 'C11/h11': 'Gioco molto ampio, albero base', 'D9/h9': 'Rotante libero, albero base',
        'F8/h7': 'Rotante preciso, albero base', 'G7/h6': 'Scorrevole di precisione, albero base', 'K7/h6': 'Incerto, albero base',
        'N7/h6': 'Incerto stretto, albero base', 'P7/h6': 'Interferenza leggera, albero base', 'S7/h6': 'Interferenza forte, albero base'}}
PROC = {
 'en': {'H7/f7': ('Finish turning', 'Standard reaming or boring'), 'H7/g6': ('Precision turning or grinding', 'Accurate reaming'),
        'H7/h6': ('Finish turning or grinding', 'Reaming'), 'H7/js6': ('Cylindrical grinding', 'Fine reaming or boring'),
        'H7/k6': ('Cylindrical grinding', 'Finish reaming'), 'H7/p6': ('Precision cylindrical grinding', 'Internal grinding or fine reaming')},
 'it': {'H7/f7': ('Tornitura finita', 'Alesatura o tornitura interna'), 'H7/g6': ('Tornitura di precisione o rettifica', 'Alesatura accurata'),
        'H7/h6': ('Tornitura finita o rettifica', 'Alesatura'), 'H7/js6': ('Rettifica cilindrica', 'Alesatura o barenatura fine'),
        'H7/k6': ('Rettifica cilindrica', 'Alesatura di finitura'), 'H7/p6': ('Rettifica cilindrica di precisione', 'Rettifica per interni o alesatura fine')}}
KINDTXT = {
 'en': {'clearance': 'It is a <b>clearance fit</b>: on every size the hole is larger than the shaft, so the parts slide or turn.',
        'transition': 'It is a <b>transition fit</b>: depending on the actual sizes it can come out with a little clearance or a little interference. It locates the parts accurately; a key or a pin carries the torque.',
        'interference': 'It is an <b>interference fit</b>: on every size the shaft is larger than the hole, so the parts are pressed or shrunk together and the fit itself can carry torque.'},
 'it': {'clearance': 'È un accoppiamento <b>con gioco</b>: su ogni diametro il foro è più grande dell\'albero, quindi i pezzi scorrono o ruotano.',
        'transition': 'È un accoppiamento <b>incerto</b>: secondo le misure reali può venire con un po\' di gioco o con un po\' di interferenza. Centra bene i pezzi; la coppia la porta una linguetta o una spina.',
        'interference': 'È un accoppiamento <b>con interferenza</b>: su ogni diametro l\'albero è più grande del foro, quindi i pezzi si montano a pressa o a caldo e l\'accoppiamento da solo può trasmettere coppia.'}}

def ra(s, lang):
    s = s.split(' / ')[0]
    return s.replace('.', ',') if lang == 'it' else s

def mm(v, lang):
    t = f'{v:.3f}'
    return t.replace('.', ',') if lang == 'it' else t

def rng(r, lang):
    over, upto = ('over', 'up to') if lang == 'en' else ('oltre', 'fino a')
    return f'{upto} {r["max"]}' if r['min'] == 0 else f'{over} {r["min"]} {upto} {r["max"]}'

def fitpage(F, lang):
    fit, a = F['fit'], F['at30']
    hole, shaft = fit.split('/')
    url, alt = SITE + '/' + path(fit, lang), SITE + '/' + path(fit, 'it' if lang == 'en' else 'en')
    t = L[lang]; en = lang == 'en'
    kind = KIND[lang][a['kind']]
    kindp = {'clearance': 'con gioco', 'transition': 'incerto', 'interference': 'con interferenza'}[a['kind']] if lang == 'it' else kind
    gtxt = lambda g: (f'{num(g, lang, False)} µm ' + ('clearance' if en else 'di gioco')) if g >= 0 else (f'{num(-g, lang, False)} µm ' + ('interference' if en else 'di interferenza'))
    rows = F['rows']
    app = f'/app.html?m=fits&fitType={fit.replace("/", "%2F")}&nominalDiameter=30&lang={lang}'
    basis = ('hole basis' if F['basis'] == 'hole' else 'shaft basis') if en else ('foro base' if F['basis'] == 'hole' else 'albero base')
    if en:
        title = f'{fit} fit: tolerances, clearance and ISO 286 table'
        desc = (f'{fit} ISO fit ({kind}, {basis}): hole {hole} and shaft {shaft} deviations and the maximum and minimum clearance for every size from 1 to 500 mm. '
                f'On 30 mm: hole {num(a["ES"], lang)}/{num(a["EI"], lang)} µm, shaft {num(a["es"], lang)}/{num(a["ei"], lang)} µm.')
        h1 = f'{fit} fit'
        lead = f'{USE[lang][fit]}. ISO 286 {kind} fit, {basis}. Below: hole and shaft deviations, limits of size and clearance for every diameter range up to 500 mm.'
    else:
        title = f'Accoppiamento {fit}: tolleranze, giochi e tabella ISO 286'
        desc = (f'Accoppiamento ISO {fit} ({kindp}, {basis}): scostamenti del foro {hole} e dell\'albero {shaft}, gioco massimo e minimo per ogni diametro da 1 a 500 mm. '
                f'Su 30 mm: foro {num(a["ES"], lang)}/{num(a["EI"], lang)} µm, albero {num(a["es"], lang)}/{num(a["ei"], lang)} µm.')
        h1 = f'Accoppiamento {fit}'
        lead = f'{USE[lang][fit]}. Accoppiamento ISO 286 {kindp}, {basis}. Qui sotto: scostamenti di foro e albero, dimensioni limite e giochi per ogni scaglione di diametro fino a 500 mm.'
    # example on 30 mm
    ex = [(('Hole ' if en else 'Foro ') + hole, f'{num(a["ES"], lang)} / {num(a["EI"], lang)} µm → {mm(30 + a["EI"] / 1000, lang)} … {mm(30 + a["ES"] / 1000, lang)} mm'),
          (('Shaft ' if en else 'Albero ') + shaft, f'{num(a["es"], lang)} / {num(a["ei"], lang)} µm → {mm(30 + a["ei"] / 1000, lang)} … {mm(30 + a["es"] / 1000, lang)} mm'),
          ('Largest hole, smallest shaft' if en else 'Foro massimo, albero minimo', gtxt(a['gmax'])),
          ('Smallest hole, largest shaft' if en else 'Foro minimo, albero massimo', gtxt(a['gmin'])),
          ('Type' if en else 'Tipo', kind)]
    extab = '<div class="scroll"><table class="ex"><tbody>' + ''.join(f'<tr{" class=\"r\"" if i >= 2 else ""}><th>{k}</th><td>{v}</td></tr>' for i, (k, v) in enumerate(ex)) + '</tbody></table></div>'
    hd = (['Size [mm]', f'Hole {hole} [µm]', f'Shaft {shaft} [µm]', 'Max clearance', 'Min clearance', 'Type'] if en else
          ['Diametro [mm]', f'Foro {hole} [µm]', f'Albero {shaft} [µm]', 'Gioco max', 'Gioco min', 'Tipo'])
    body = ''.join(f'<tr{" class=\"r\"" if r["min"] < 30 <= r["max"] else ""}><th>{rng(r, lang)}</th><td>{num(r["ES"], lang)} / {num(r["EI"], lang)}</td>'
                   f'<td>{num(r["es"], lang)} / {num(r["ei"], lang)}</td><td>{num(r["gmax"], lang)}</td><td>{num(r["gmin"], lang)}</td>'
                   f'<td class="k {KCLS[r["kind"]]}">{KIND[lang][r["kind"]]}</td></tr>' for r in rows)
    cap = (f'ISO 286-2 deviations and clearances of {fit} in µm (negative clearance = interference). Computed by Torsio.' if en else
           f'Scostamenti e giochi ISO 286-2 di {fit} in µm (gioco negativo = interferenza). Calcolati da Torsio.')
    big = (f'<p class="cap">{cap}</p><div class="scroll"><table class="iso"><thead><tr><th style="text-align:left">{hd[0]}</th>' +
           ''.join(f'<th>{h}</th>' for h in hd[1:5]) + f'<th style="text-align:left">{hd[5]}</th></tr></thead><tbody>{body}</tbody></table></div>')
    p = PROC[lang].get(fit)
    rah, ras = ra(F['ra']['holeRa'], lang), ra(F['ra']['shaftRa'], lang)
    if en:
        use = [f'{USE[lang][fit]}.', KINDTXT[lang][a['kind']],
               f'Indicative roughness: hole {rah}, shaft {ras}.' + (f' Typical machining: shaft by {p[0].lower()}, hole by {p[1].lower()}.' if p else ''),
               f'On the drawing: <b>Ø30 {fit}</b> on the assembly, <b>Ø30 {hole}</b> on the hub and <b>Ø30 {shaft}</b> on the shaft (or the limits of size).']
    else:
        use = [f'{USE[lang][fit]}.', KINDTXT[lang][a['kind']],
               f'Rugosità indicativa: foro {rah}, albero {ras}.' + (f' Lavorazione tipica: albero con {p[0].lower()}, foro con {p[1].lower()}.' if p else ''),
               f'A disegno: <b>Ø30 {fit}</b> sull\'assieme, <b>Ø30 {hole}</b> sul mozzo e <b>Ø30 {shaft}</b> sull\'albero (oppure le dimensioni limite).']
    r50 = next(r for r in rows if r['min'] < 50 <= r['max'])
    r100 = next(r for r in rows if r['min'] < 100 <= r['max'])
    if en:
        faq = [(f'Is {fit} a clearance or an interference fit?', f'{kind.capitalize()}. ' + KINDTXT[lang][a['kind']].replace('<b>', '').replace('</b>', '')),
               (f'What clearance does {fit} give on 50 mm?', f'From {num(r50["gmin"], lang)} to {num(r50["gmax"], lang)} µm (range {rng(r50, lang)} mm; negative values are interference).'),
               (f'And on 100 mm?', f'From {num(r100["gmin"], lang)} to {num(r100["gmax"], lang)} µm (range {rng(r100, lang)} mm).'),
               ('Where do these values come from?', 'From the ISO 286-1 and 286-2 tables built into the Torsio calculator, checked by 904 tests against published deviations. For a contract drawing always refer to the standard.')]
    else:
        faq = [(f'{fit} è con gioco o con interferenza?', f'{kindp[0].upper() + kindp[1:]}. ' + KINDTXT[lang][a['kind']].replace('<b>', '').replace('</b>', '')),
               (f'Che gioco dà {fit} su 50 mm?', f'Da {num(r50["gmin"], lang)} a {num(r50["gmax"], lang)} µm (scaglione {rng(r50, lang)} mm; i valori negativi sono interferenza).'),
               ('E su 100 mm?', f'Da {num(r100["gmin"], lang)} a {num(r100["gmax"], lang)} µm (scaglione {rng(r100, lang)} mm).'),
               ('Da dove vengono questi valori?', 'Dalle tabelle ISO 286-1 e 286-2 del calcolatore Torsio, controllate da 904 test sugli scostamenti pubblicati. Per un disegno contrattuale fa sempre fede la norma.')]
    same = [f for f in FITS if f['basis'] == F['basis']]
    others = ''.join(f'<a href="/{path(G["fit"], lang)}"{" aria-current=\"page\"" if G is F else ""}>{G["fit"]}<span>{USE[lang][G["fit"]]}</span></a>' for G in same)
    other_basis = ('Shaft basis fits' if F['basis'] == 'hole' else 'Hole basis fits') if en else ('Accoppiamenti albero base' if F['basis'] == 'hole' else 'Accoppiamenti foro base')
    ob = next(G for G in FITS if G['basis'] != F['basis'])
    crumbs = [('Torsio', SITE + ('/' if en else '/it/')), ('ISO fits' if en else 'Accoppiamenti ISO', SITE + '/' + HUB[lang]), (fit, url)]
    ld = [{'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': x}} for q, x in faq]},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(crumbs)]}]
    home, meth = ('/' if en else '/it/'), ('/metodo.html' if en else '/it/metodo.html')
    h = f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Torsio</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{url}">
  <link rel="alternate" hreflang="{lang}" href="{url}">
  <link rel="alternate" hreflang="{'it' if en else 'en'}" href="{alt}">
  <link rel="alternate" hreflang="x-default" href="{SITE}/{path(fit, 'en')}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Torsio Engineering">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}/vendor/brand/og-image.png">
  <meta property="og:locale" content="{'en_US' if en else 'it_IT'}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/vendor/brand/torsio-mark.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#f1efea">
  <link rel="stylesheet" href="/vendor/fonts/fonts.css">
{STYLE}    .crumbs {{ font-size: 14px; color: var(--ink-2); margin: 0 0 10px; }} .crumbs a {{ color: inherit; }}
    .others a[aria-current] {{ border-color: var(--ink); }}
  </style>
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body class="guide">
  <div class="wrap">
    <div class="top">
      <a class="brand" href="{home}"><img src="/vendor/brand/torsio-mark.svg" alt=""><b><span class="wm-sr">Torsio</span><span aria-hidden="true">T{GEAR}rsio</span></b><span>Engineering</span></a>
      <nav class="nav" aria-label="{'Navigation' if en else 'Navigazione'}">
        <span class="links"><a href="{home}">{t['home']}</a><a href="{meth}">{t['method']}</a><a href="/{path(fit, 'it' if en else 'en')}" hreflang="{'it' if en else 'en'}">{t['langname']}</a></span>
        <a class="btn go small" href="{app}">{t['open']}</a>
      </nav>
    </div>
    <header class="page-head">
      <p class="crumbs"><a href="{home}">Torsio</a> › <a href="/{HUB[lang]}">{'ISO fits' if en else 'Accoppiamenti ISO'}</a> › {fit}</p>
      <h1>{h1}</h1>
      <p class="lead">{lead}</p>
      <div class="acts"><a class="btn go" href="{app}">{('Calculate ' + fit + ' on your diameter') if en else ('Calcola ' + fit + ' sul tuo diametro')} →</a></div>
      <p class="muted" style="margin-top:16px;font-size:15px">{t['free']}</p>
    </header>
  </div>
  <section><div class="wrap"><h2>{'Example on 30 mm' if en else 'Esempio su 30 mm'}</h2>{extab}</div></section>
  <section><div class="wrap"><h2>{('ISO 286 table of ' + fit) if en else ('Tabella ISO 286 di ' + fit)}</h2>{big}
    <p class="muted" style="margin-top:14px">{'For any other diameter, or to compare fits and work back from the clearance you want, open the calculator: it also gives the drawing callout and the calculation report.' if en else 'Per un diametro qualsiasi, per confrontare gli accoppiamenti o partire dal gioco che vuoi, apri il calcolatore: dà anche la quota da disegno e la relazione di calcolo.'}</p>
    <div class="acts"><a class="btn go" href="{app}">{t['open']} →</a></div></div></section>
  <section><div class="wrap"><h2>{'When to use it' if en else 'Quando si usa'}</h2>{''.join(f'<p>{x}</p>' for x in use)}</div></section>
  <section><div class="wrap"><h2>{t['faq']}</h2><dl class="faq">{''.join(f'<dt>{q}</dt><dd>{x}</dd>' for q, x in faq)}</dl></div></section>
  <section><div class="wrap"><h2>{('Other ' + basis + ' fits') if en else ('Altri accoppiamenti ' + basis)}</h2><div class="others">{others}</div>
    <p style="margin-top:18px"><a href="/{path(ob['fit'], lang)}">{other_basis} →</a> · <a href="/{HUB[lang]}">{'All ISO fit tables and the calculator' if en else 'Tutte le tabelle ISO e il calcolatore'} →</a></p></div></section>
  <div class="wrap">
    <footer>
      <span>Torsio Engineering · {t['by']}</span>
      <span><a href="{meth}">{t['method']}</a> · <a href="{'/novita.html' if en else '/it/novita.html'}">{t['news']}</a> · <a href="{'/privacy.html' if en else '/it/privacy.html'}">{t['privacy']}</a> · <a href="{TALLY}?module=contact&lang={lang}" target="_blank" rel="noopener">{t['contact']}</a> · <a href="mailto:info@torsio.app">info@torsio.app</a> · <a href="https://github.com/Luigi-Frassi/torsio-engineering" target="_blank" rel="noopener">{t['src']}</a></span>
    </footer>
  </div>
  <script>try {{ localStorage.setItem('torsioLang', '{lang}'); }} catch (e) {{ /* private mode */ }}</script>
  <script>window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};</script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
'''
    out = os.path.join(ROOT, path(fit, lang), 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write(h)
    return path(fit, lang)

if __name__ == '__main__':
    made = [fitpage(F, lang) for F in FITS for lang in ('en', 'it')]
    print(len(made), 'pages:', made[0], '…', made[-1])

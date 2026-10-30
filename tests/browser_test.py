# Browser test for shareable links and form behaviour.
# Requires Playwright with Chromium:  pip install playwright && playwright install chromium
# Run from the repository root:        python3 tests/browser_test.py
# Serves the repo locally, drives the real page in headless Chromium (offline: CDN scripts are
# stubbed, Tailwind's .hidden / md: / sm: rules are emulated), and checks that opening the
# generated URL in a fresh page reproduces exactly the same inputs, results and charts.
import http.server, threading, functools, json, sys, os
from playwright.sync_api import sync_playwright

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=REPO)
class Quiet(handler.func):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=REPO))
threading.Thread(target=srv.serve_forever, daemon=True).start()
HOME = f'http://127.0.0.1:{srv.server_address[1]}/'
BASE = HOME + 'app.html'   # the calculator; the root is the home page

SNAP_JS = """() => {
  const vis = el => !!(el.offsetParent || el.getClientRects().length);
  const sec = ['moduleFitsSection','moduleBeltsSection','moduleGearsSection','moduleShaftsSection'].find(id => !document.getElementById(id).classList.contains('hidden'));
  const root = document.getElementById(sec);
  const inputs = [...root.querySelectorAll('input,select')].filter(vis).map(e => e.id + '=' + (e.type==='checkbox'||e.type==='radio' ? e.checked : e.value));
  const svgs = [...root.querySelectorAll('svg')].map(s => s.innerHTML);
  return { sec, lang: currentLang, unit: currentUnit, title: document.getElementById('moduleTitle').innerText,
           text: root.innerText, inputs, svgs };
}"""

failures = []
def check(name, cond, detail=''):
    print(('PASS ' if cond else 'FAIL ') + name + (('  -- ' + detail) if detail and not cond else ''))
    if not cond: failures.append(name)

def set_val(page, id_, v):
    page.evaluate("([id,v]) => { const e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true})); }", [id_, str(v)])

def settle(page): page.wait_for_timeout(400)   # URL sync is debounced (250 ms)

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context()
    ctx.add_init_script("try { localStorage.setItem('torsioNoStart', '1') } catch (e) {}")   # the start screen has its own test
    TW_STUB = "document.head.insertAdjacentHTML('beforeend','<style>.hidden{display:none}@media(min-width:768px){.md\\\\:flex{display:flex}.md\\\\:hidden{display:none}}@media(min-width:640px){.sm\\\\:inline{display:inline}}</style>')"
    def router(r):
        u = r.request.url
        if u.startswith(HOME): return r.continue_()
        if 'cdn.tailwindcss.com' in u: return r.fulfill(status=200, content_type='application/javascript', body=TW_STUB)  # emulate Tailwind's .hidden
        return r.abort()
    ctx.route('**/*', router)   # offline: no CDN
    errors = []
    def new_page():
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        return pg

    # --- 0. plain load: no errors, clean URL
    pg = new_page(); pg.goto(BASE); settle(pg)
    check('caricamento senza errori JS', not errors, '; '.join(errors))
    check('URL pulito allo stato iniziale', pg.url == BASE, pg.url)

    def roundtrip(name, actions):
        pg = new_page(); pg.goto(BASE); settle(pg)
        actions(pg); settle(pg)
        url = pg.url; before = pg.evaluate(SNAP_JS)
        pg2 = new_page(); pg2.goto(url); settle(pg2)
        after = pg2.evaluate(SNAP_JS)
        same = before == after
        diff = ''
        if not same:
            import difflib
            for k in before:
                if before[k] != after[k]:
                    if k == 'text':
                        diff = 'text: ' + ' | '.join(l for l in difflib.unified_diff(before[k].split('\n'), after[k].split('\n'), lineterm='', n=0) if l[:1] in '+-' and l[:3] not in ('---', '+++'))
                    else:
                        diff = f'{k}: {str(before[k])[:300]} || {str(after[k])[:300]}'
                    break
        check(f'{name}: il link riapre lo stesso calcolo', same, diff)
        print('      ', url.replace(BASE, '/'))
        return pg, pg2, url

    # --- 1. fits, Italian, inches, reverse lookup
    def a1(pg):
        pg.click('#langIT'); pg.click('#unitImperial')
        set_val(pg, 'nominalDiameter', '1.25'); set_val(pg, 'fitType', 'H7/p6')
        pg.click('#modeReverse'); set_val(pg, 'reverseFitNature', 'interference'); set_val(pg, 'reverseTargetVal', '1.2')
    roundtrip('accoppiamenti IT/pollici/ricerca inversa', a1)

    # --- 2. fits: click a comparison-table row
    def a2(pg):
        set_val(pg, 'nominalDiameter', '75')
        pg.click('#comparisonTableBody tr:nth-child(9)')   # hole basis: c11 d9 f7(H8) f7 g6 h6 h7(H8) js6 k6 …
    _, _, u = roundtrip('accoppiamenti click su riga tabella', a2)
    check('  riga cliccata salvata (H7/k6)', 'fitType=H7%2Fk6' in u, u)

    # --- 3. belts, power mode, tau method
    def a3(pg):
        pg.click('#navBtnBelts'); pg.click('#beltModePower')
        pg.check('#methodTau'); set_val(pg, 'targetTau', '3.1')
        set_val(pg, 'beltProfile', '8'); set_val(pg, 'pulleyZ1', '24'); set_val(pg, 'desiredCenter', '420')
        set_val(pg, 'motorPower', '7.5'); set_val(pg, 'driverSpeed', '960'); set_val(pg, 'serviceFactor', '1.8')
    roundtrip('cinghie potenza + rapporto τ', a3)

    # --- 4. gears design: helical, torque input, center distance, auto-z, locked L, optimizer row 3
    def a4(pg):
        pg.click('#navBtnGears')
        set_val(pg, 'gearToothType', 'helical')
        pg.check('input[name="gearLoadMode"][value="torque"]'); set_val(pg, 'gearTorqueInput', '250')
        pg.check('input[name="gearGeomMode"][value="center"]'); set_val(pg, 'gearTargetCenter', '160'); set_val(pg, 'gearTargetTau', '0.3')
        pg.check('#toggleAutoZ'); pg.check('#toggleLockL'); set_val(pg, 'gearLockedLVal', '45')
        settle(pg)
        rows = pg.locator('#fixedOptTableBody tr')
        if rows.count() >= 3: rows.nth(2).click()
    pg4, _, u = roundtrip('ingranaggi elicoidali, ottimizzatore, riga 3', a4)
    check('  riga dell\'ottimizzatore salvata', 'combo=2' in u, u)

    # --- 5. gears spur with a Series 3 module, recommended alternative chosen
    def a5(pg):
        pg.click('#navBtnGears'); pg.click('#langIT')
        for zp in [17, 18, 19, 20, 21, 22, 23, 24, 25, 16, 15]:
            for P in [11, 15, 18.5, 22, 7.5, 30, 37, 45, 5.5, 4]:
                set_val(pg, 'gearZ1', zp); set_val(pg, 'gearPower', P)
                if pg.evaluate("!document.getElementById('gearSeries3ComparisonCard').classList.contains('hidden')"):
                    pg.click('#btnAdoptRecommended'); return
        raise RuntimeError('nessun caso Serie 3 trovato')
    _, pg5b, u = roundtrip('ingranaggi Serie 3, modulo consigliato', a5)
    check('  scelta "consigliato" salvata', 's3=recommended' in u, u)

    # --- 6. gears W_max helical
    def a6(pg):
        pg.click('#navBtnGears'); pg.click('#gearModeWmax')
        set_val(pg, 'gwToothType', 'helical'); set_val(pg, 'gwAlpha', '25'); set_val(pg, 'gwModule', '4')
        set_val(pg, 'gwZ1', '18'); set_val(pg, 'gwZ2', '50'); set_val(pg, 'gwFaceWidth', '70'); set_val(pg, 'gwSpeed', '750'); set_val(pg, 'gwSigmaH', '981')
    roundtrip('ingranaggi W_max elicoidale', a6)

    # --- 7. demo presets
    for btn in ['#demoHelicalBtn', '#demoSpurBtn', '#demoFitBtn']:
        roundtrip('preset ' + btn, lambda pg, b=btn: (pg.click('#demoBtn'), pg.click(b)))

    # --- 8. duplicate-id fix: gear geometry switcher must not touch the belt τ column
    pg = new_page(); pg.goto(BASE); settle(pg)
    pg.click('#navBtnBelts'); pg.check('#methodTau'); settle(pg)
    belt_tau_visible = lambda: pg.evaluate("!document.getElementById('colTargetTau').classList.contains('hidden')")
    gear_tau_visible = lambda: pg.evaluate("!document.getElementById('colGearTargetTau').classList.contains('hidden')")
    check('cinghie: colonna τ visibile con metodo τ', belt_tau_visible())
    pg.click('#navBtnGears'); pg.check('input[name="gearGeomMode"][value="teeth"]'); settle(pg)
    check('ingranaggi "denti": τ ingranaggi nascosta', not gear_tau_visible())
    check('ingranaggi "denti": τ cinghie NON toccata', belt_tau_visible())
    pg.check('input[name="gearGeomMode"][value="center"]'); settle(pg)
    check('ingranaggi "interasse": τ ingranaggi visibile', gear_tau_visible())

    # --- 8b. z1 visibility must not depend on the click order
    def z1_visible(order):
        pg = new_page(); pg.goto(BASE); settle(pg); pg.click('#navBtnGears')
        for step in order:
            if step == 'auto': pg.check('#toggleAutoZ')
            else: pg.check(f'input[name="gearGeomMode"][value="{step}"]')
        settle(pg)
        return pg.evaluate("!document.getElementById('colPinionZ1').classList.contains('hidden')")
    for geom, expected in [('tau', False), ('center', False), ('teeth', True)]:
        a, b = z1_visible([geom, 'auto']), z1_visible(['auto', geom])
        check(f'z1 con z automatico in modalità {geom}: {"visibile" if expected else "nascosto"} in ogni ordine', a == b == expected, f'{a} {b}')

    # --- 9. robustness: bad parameters are ignored
    pg = new_page(); pg.goto(BASE + '?m=gears&gearPower=abc&gearToothType=<script>&combo=99&lang=xx&unit=zz&geom=%22%5D'); settle(pg)
    snap = pg.evaluate(SNAP_JS)
    check('parametri non validi ignorati, nessun errore', not errors and snap['sec'] == 'moduleGearsSection', '; '.join(errors))
    pg = new_page(); pg.goto(BASE + '?m=nonexistent'); settle(pg)
    check('modulo sconosciuto: pagina normale', pg.evaluate(SNAP_JS)['sec'] == 'moduleFitsSection')

    # --- 10. share button copies the URL (desktop)
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=HOME.rstrip('/'))
    pg = new_page(); pg.goto(BASE); settle(pg)
    pg.click('#navBtnBelts'); set_val(pg, 'pulleyZ1', '31'); settle(pg)
    pg.click('.js-share-btn'); pg.wait_for_timeout(200)
    clip = pg.evaluate('navigator.clipboard.readText()')
    label = pg.inner_text('.js-share-btn')
    check('bottone Condividi copia il link', clip == pg.url and 'pulleyZ1=31' in clip, clip)
    check('feedback "Link copiato"', 'copied' in label.lower() or 'copiato' in label.lower(), label)

    # --- 11. shafts module
    pg = new_page(); pg.goto(BASE); settle(pg)
    pg.click('#navBtnShafts'); settle(pg)
    snap = pg.evaluate(SNAP_JS)
    check('alberi: il modulo si apre', snap['sec'] == 'moduleShaftsSection')
    # step 1: beam (default tab), values of the exam of 11 April 2003
    vis = lambda i: pg.evaluate(f"!document.getElementById('{i}').classList.contains('hidden')")
    check('alberi: si apre sulla scheda Trave', vis('shaftBeamPanel') and not vis('shaftSectionPanel'))
    check('alberi, trave: reazione in B = 40.11 kN (soluzione ufficiale 40.1)', 'R = 40.11 kN' in pg.inner_text('#shaftBeamRB'), pg.inner_text('#shaftBeamRB'))
    check('alberi, trave: C richiesto 14.45 / 86.42 kN (ufficiale 14.4 / 86.4)', pg.inner_text('#shaftBeamC').startswith('14.45 / 86.42'), pg.inner_text('#shaftBeamC'))
    check('alberi, trave: sezione più sollecitata x = 240, Mf = 1887', 'x = 240.0' in pg.inner_text('#shaftBeamCrit') and '1887' in pg.inner_text('#shaftBeamCritSub'), pg.inner_text('#shaftBeamCrit') + ' ' + pg.inner_text('#shaftBeamCritSub'))
    check('alberi, trave: diagrammi disegnati', pg.evaluate("document.getElementById('shaftBeamChart').innerHTML.split('<polyline').length - 1") >= 4)
    check('alberi, trave: forze della ruota B mostrate', 'Ft = 13642 N' in pg.inner_text('#shaftEl1Info'), pg.inner_text('#shaftEl1Info'))
    # section at B, then the critical one, then transfer to step 2
    set_val(pg, 'shaftSecX', 67.5); settle(pg)
    check('alberi, sezione in B: Mf = 452.8 N·m', 'Mf = 452.8' in pg.inner_text('#shaftSecInfo'), pg.inner_text('#shaftSecInfo'))
    pg.click('#shaftSecCritical'); settle(pg)
    check('alberi: "vai alla sezione più sollecitata" -> x = 240', pg.input_value('#shaftSecX') == '240', pg.input_value('#shaftSecX'))
    pg.click('#shaftUseSection'); settle(pg)
    check('alberi: "dimensiona questa sezione" apre il progetto con Mf = 1887.3', vis('shaftSectionPanel') and pg.input_value('#shaftMf') == '1887.3', pg.input_value('#shaftMf'))
    check('alberi: risultati calcolati', 'd ≥' in pg.inner_text('#shaftRes1') and 'X =' in pg.inner_text('#shaftRes3'), pg.inner_text('#shaftRes1'))
    check('alberi: diagramma di Goodman e schizzo disegnati', pg.evaluate("document.getElementById('shaftGoodmanChart').innerHTML.includes('<line') && document.getElementById('shaftSketch').innerHTML.includes('Ø')"))
    # a section outside the gears carries no torque
    pg.click('#shaftModeBeam'); set_val(pg, 'shaftSecX', 30); settle(pg); pg.click('#shaftUseSection'); settle(pg)
    check('alberi: sezione fra A e B -> niente torsione', not pg.is_checked('#shaftSecTorque'))
    # the page shows exactly what the core computes
    pg.click('#demoBtn'); pg.click('#demoShaftBtn'); settle(pg)
    check('  il menu Demo si chiude dopo la scelta', pg.evaluate("document.getElementById('demoMenu').classList.contains('hidden')"))
    check('alberi, preset: apre la trave con la sezione C', vis('shaftBeamPanel') and pg.input_value('#shaftSecX') == '240')
    pg.click('#shaftUseSection'); settle(pg)
    core = pg.evaluate('''() => { const { inp, Xreq } = readShaftInputs(); const r = shaftDesign(inp, Xreq); return { d: r.d, D: r.D, dMin: r.dMin, X: r.final.Xfatigue }; }''')
    check('alberi, preset esame: d scelto = 65 mm come nella soluzione', core['d'] == 65 and core['D'] == 77, str(core))
    check('alberi, preset esame: la pagina mostra il risultato del core', pg.inner_text('#shaftRes2').startswith('d = 65 mm · D = 77 mm') and f"{core['X']:.2f}" in pg.inner_text('#shaftRes3'), pg.inner_text('#shaftRes2') + ' | ' + pg.inner_text('#shaftRes3'))
    check('alberi, preset: evidenziazione tolta dal passaggio alla sezione', 'blue' not in pg.get_attribute('#demoShaftBtn', 'class'))
    # visibility of the inputs
    set_val(pg, 'shaftNotchType', 'keyway'); settle(pg)
    check('alberi: linguetta mostra tipo e stato, nasconde r e D/d', vis('colShaftKeyType') and vis('colShaftKeyCond') and not vis('colShaftR') and not vis('colShaftDd'))
    set_val(pg, 'shaftNotchType', 'shoulder'); pg.click('#shaftModeCheck'); settle(pg)
    check('alberi, verifica: mostra d e D, nasconde D/d', vis('colShaftDcheck') and vis('colShaftDDcheck') and not vis('colShaftDd'))
    set_val(pg, 'shaftTorqueInput', 'torque'); settle(pg)
    check('alberi: Mt diretto nasconde P e n', vis('colShaftMt') and not vis('colShaftPower') and not vis('colShaftSpeed'))
    # check mode reproduces the exam verification (d = 65, D = 76, r = 2)
    set_val(pg, 'shaftTorqueInput', 'power'); set_val(pg, 'shaftDcheck', 65); set_val(pg, 'shaftDDcheck', 76); set_val(pg, 'shaftR', 2); settle(pg)
    xf = pg.inner_text('#shaftRes3')
    check('alberi, verifica d=65 D=76 r=2: X a fatica ≈ 1.87 (1.82 con i coefficienti letti dal docente)', 'X = 1.87' in xf, xf)
    # language
    pg.click('#langIT'); settle(pg)
    check('alberi in italiano: titolo e schede tradotti', pg.inner_text('#moduleTitle') == 'Progetto a fatica degli alberi' and 'Sicurezza a fatica' in pg.inner_text('#shaftRes3Title'), pg.inner_text('#moduleTitle'))
    txt = pg.evaluate("document.getElementById('moduleShaftsSection').innerText")
    check('alberi: nessun testo mancante (undefined/NaN)', 'undefined' not in txt and 'NaN' not in txt)
    pg.click('#langEN'); settle(pg)

    # beam: element fields follow the element type
    pg.click('#shaftModeBeam'); set_val(pg, 'shaftEl3Type', 'force'); settle(pg)
    check('alberi, elemento "forza": campi Fv/Fh visibili, niente diametro', vis('colShaftEl3Fv') and vis('colShaftEl3Fh') and not vis('colShaftEl3D'))
    set_val(pg, 'shaftEl3Type', 'gear'); set_val(pg, 'shaftEl3Helix', 15); settle(pg)
    check('alberi, ruota elicoidale: compare il verso di Fa', vis('colShaftEl3FaDir'))
    check('alberi: coppia non bilanciata segnalata', 'balance' in pg.inner_text('#shaftBeamPanel') or 'bilanciano' in pg.inner_text('#shaftBeamPanel'))
    set_val(pg, 'shaftEl3Type', 'none'); settle(pg)

    # share round trip: beam with a helical gear and a coupling
    def a_beam(pg):
        pg.click('#navBtnShafts')
        set_val(pg, 'shaftEl2Type', 'coupling'); set_val(pg, 'shaftEl2X', 330)
        set_val(pg, 'shaftEl1Helix', 18); set_val(pg, 'shaftEl1FaDir', '-x'); set_val(pg, 'shaftAxialBearing', 'B')
        set_val(pg, 'shaftSecX', 67.5); set_val(pg, 'shaftBearingType', 'roller')
    roundtrip('alberi: trave con elicoidale e giunto', a_beam)

    # share round trip: keyway, finite life, check mode, Italian
    def a_sh(pg):
        pg.click('#navBtnShafts'); pg.click('#langIT'); pg.click('#shaftModeCheck')
        set_val(pg, 'shaftNotchType', 'keyway'); set_val(pg, 'shaftKeyType', 'profile'); set_val(pg, 'shaftKeyCond', 'hardened')
        set_val(pg, 'shaftDcheck', 42); set_val(pg, 'shaftMf', 320); set_val(pg, 'shaftTorsionCycle', 'pulsating')
        set_val(pg, 'shaftLife', 'finite'); set_val(pg, 'shaftCycles', 150000); set_val(pg, 'shaftFinish', 'g')
    _, _, u = roundtrip('alberi: linguetta, vita finita, verifica', a_sh)
    check('  modalità e linguetta nel link', 'smode=check' in u and 'shaftKeyType=profile' in u, u)
    def a_sh2(pg):
        pg.click('#navBtnShafts'); set_val(pg, 'shaftTorqueInput', 'torque'); set_val(pg, 'shaftMt', 250)
        set_val(pg, 'shaftBendCycle', 'static'); set_val(pg, 'shaftAxial', 5000); set_val(pg, 'shaftDd', 1.3); set_val(pg, 'shaftR', 0.8)
    roundtrip('alberi: progetto con Mt diretto e sforzo assiale', a_sh2)

    # esame 9/12/2002: trave con estremità A, B e punti C..F, poi intaglio spallamento + linguetta (ke dato)
    def a_sh3(pg):
        pg.click('#navBtnShafts'); set_val(pg, 'shaftPower', 14); set_val(pg, 'shaftSpeed', 115)
        for k, v in [('shaftLength', 270), ('shaftXA', 10), ('shaftXB', 260), ('shaftEl1X', 40), ('shaftEl1D', 170), ('shaftEl1FtDir', '+H'),
                     ('shaftEl1FrDir', '-V'), ('shaftEl2X', 160), ('shaftEl2D', 90), ('shaftEl2FtDir', '-H'), ('shaftEl2FrDir', '-V')]:
            set_val(pg, k, v)
    pg, _, u = roundtrip('alberi: esame 2002, trave con nomi A..F', a_sh3)
    txt = pg.evaluate("['shaftBeamRATitle','shaftBeamRBTitle','shaftBeamCrit','shaftBeamCritSub','shaftEl1Name','shaftEl2Name'].map(i=>document.getElementById(i).innerText).join(' | ')")
    check('  nomi: cuscinetti C, F; ruote D, E; sezione critica E con 1520 N·m',
          'C (' in txt and 'F (' in txt and '(E)' in txt and '1520' in txt and '→ D' in txt and '→ E' in txt, txt)
    svg = pg.evaluate("document.getElementById('shaftBeamChart').innerHTML")
    check('  diagrammi separati: piano verticale, orizzontale, risultante', all(k in svg for k in ['Mv [N·m]', 'Mh [N·m]', 'Mf [N·m]', 'E 624', 'E 1520']))
    pg.click('#shaftSecCritical'); pg.click('#shaftUseSection'); settle(pg)
    set_val(pg, 'shaftSigmaR', 880); set_val(pg, 'shaftSigmaS', 720); set_val(pg, 'shaftSigmaLF', 390); set_val(pg, 'shaftX', 1.25)
    set_val(pg, 'shaftFinish', 'd'); set_val(pg, 'shaftNotchType', 'combined'); set_val(pg, 'shaftDd', 1.2); set_val(pg, 'shaftR', 2)
    set_val(pg, 'shaftKeyType', 'given'); set_val(pg, 'shaftKeyKe', 1.4); settle(pg)
    r1 = pg.evaluate("document.getElementById('shaftRes1').innerText + ' | ' + document.getElementById('shaftBkKe').innerText")
    check('  intaglio combinato: d ≥ 60.8 mm, Ke = spallamento × 1.40', '60.8' in r1 and '× 1.40' in r1, r1)
    pg2 = new_page(); pg2.goto(pg.url); settle(pg2)
    r2 = pg2.evaluate("document.getElementById('shaftRes1').innerText + ' | ' + document.getElementById('shaftBkKe').innerText")
    check('  intaglio combinato: il link riapre lo stesso risultato', r1 == r2, r1 + ' vs ' + r2)

    # verifica a d = 65: carico massimo; riportando la potenza al massimo X deve valere esattamente quello richiesto
    pg.click('#shaftModeCheck'); set_val(pg, 'shaftDcheck', 65); set_val(pg, 'shaftDDcheck', 78); settle(pg)
    vis = pg.evaluate("!document.getElementById('shaftMaxCard').classList.contains('hidden')")
    lam = pg.evaluate("parseFloat(document.getElementById('shaftMaxFactor').innerText.replace('×',''))")
    pmax = pg.evaluate("document.getElementById('shaftMaxValues').innerText")
    check('  verifica: scheda carico massimo visibile con il fattore', vis and lam > 1, f'{vis} {lam} {pmax}')
    set_val(pg, 'shaftMf', round(1519.9 * lam, 3)); set_val(pg, 'shaftPower', round(14 * lam, 4)); settle(pg)
    x3 = pg.evaluate("document.getElementById('shaftRes3').innerText + ' ' + document.getElementById('shaftRes4').innerText")
    check('  carichi × fattore -> X = 1.25 (fatica o snervamento)', '1.25' in x3, x3)
    pg.click('#shaftModeDesign'); settle(pg)

    # variante 4/2/2019: due utenze al 50 % (quota di Mt), coppia bilanciata e Mf come nella soluzione
    q19 = ('?m=shafts&lang=it&shaftPower=50&shaftSpeed=220&shaftLength=215&shaftXA=70&shaftXB=163.75'
           '&shaftEl1X=20&shaftEl1D=60&shaftEl1FtDir=%2BV&shaftEl1FrDir=%2BH&shaftEl1Torque=out&shaftEl1Share=50'
           '&shaftEl2X=132.5&shaftEl2D=150&shaftEl2FtDir=-H&shaftEl2FrDir=-V&shaftEl2Torque=in'
           '&shaftEl3Type=gear&shaftEl3X=195&shaftEl3D=60&shaftEl3FtDir=%2BV&shaftEl3FrDir=%2BH&shaftEl3Torque=out&shaftEl3Share=50')
    pg3 = new_page(); pg3.goto(BASE + q19); settle(pg3)
    info = pg3.evaluate("document.getElementById('shaftBeamCritSub').innerText + ' | ' + (document.querySelector('.shaft-beam-warn')?.innerText || '') + ' | ' + document.getElementById('shaftEl1Info').innerText")
    check('alberi: quota di Mt al 50 % (2019): Mf 1925, coppia bilanciata, coppia elemento indicata',
          '1925' in info and 'bilanciano' not in info and '1085' in info, info)
    set_val(pg3, 'shaftBearingCA', 120); settle(pg3)
    life = pg3.evaluate("document.getElementById('shaftBeamLifeInfo').innerText")
    check('  durata cuscinetti: ore alla velocità data e con il C di catalogo', 'h a 220 giri/min' in life and 'C catalogo' in life, life)
    # 13/1/2006: vita con X richiesto e Miner nella scheda di verifica (attese 250 h e 172 h)
    Mt06 = 1.6875 * 250.7
    q06 = ('?m=shafts&lang=it&smode=check&shaftPower=%s&shaftSpeed=30&shaftMf=%s&shaftSigmaR=1180&shaftSigmaS=940&shaftSigmaLF=450'
           '&shaftLife=finite&shaftCycles=450000&shaftFinish=d&shaftX=1.75&shaftNotchType=combined&shaftR=2&shaftDcheck=32&shaftDDcheck=40'
           '&shaftPh1Mf=%s&shaftPh1Mt=%s&shaftPh1N=270000') % (round(Mt06 * 30 * 2 * 3.14159265358979 / 60 / 1000, 6), round(0.82378 * 250.7, 3), round(0.7513 * 250.7, 3), round(Mt06, 3))
    pg4 = new_page(); pg4.goto(BASE + q06); settle(pg4)
    lt = pg4.evaluate("document.getElementById('shaftLifeRes').innerText + ' | ' + document.getElementById('shaftMinerRes').innerText")
    check('alberi: vita con X richiesto (250 h) e Miner (D 0.310, 172 h) come nel 13/1/2006', '250 h' in lt and 'D = 0.310' in lt and '172 h' in lt, lt)
    set_val(pg4, 'shaftDamageRule', 'manson'); settle(pg4)
    mt = pg4.evaluate("document.getElementById('shaftMinerRes').innerText + ' | ' + document.getElementById('shaftRes4Sub').innerText")
    check('  regola di Manson selezionabile e von Mises statico nella scheda snervamento', 'Manson' in mt and 'nucleazione' in mt and 'von Mises' in mt, mt)
    # 18/1/2023: sezioni reali, la gola Ø40 r=8 è più critica della sede del cuscinetto Ø70; il bottone la porta nella verifica
    q23 = ('?m=shafts&lang=it&shaftTorqueInput=torque&shaftMt=784.7&shaftLength=222&shaftXA=8&shaftXB=120'
           '&shaftEl1X=150&shaftEl1D=120&shaftEl1FtDir=-H&shaftEl1FrDir=-V&shaftEl2X=202&shaftEl2D=52&shaftEl2FtDir=-H&shaftEl2FrDir=%2BV'
           '&shaftSigmaR=1200&shaftSigmaS=900&shaftSigmaLF=550&shaftLife=finite&shaftCycles=135000&shaftFinish=d&shaftX=2'
           '&shaftRs1X=120&shaftRs1D=70&shaftRs2X=173&shaftRs2D=40&shaftRs2DD=120&shaftRs2R=8')
    pg5 = new_page(); pg5.goto(BASE + q23); settle(pg5)
    w = pg5.evaluate("document.getElementById('shaftRealSecWorst').innerText + ' | ' + document.getElementById('shaftBeamCrit').innerText")
    check('alberi: sezioni reali (2023): più critica la gola x = 173, non il massimo di Mf', 'x = 173.0 mm (Ø40)' in w and 'x = 120.0' in w, w)
    pg5.click('#shaftCheckWorst'); settle(pg5)
    x5 = pg5.evaluate("document.getElementById('shaftNotchType').value + ' ' + document.getElementById('shaftDcheck').value + ' ' + document.getElementById('shaftRes3').innerText")
    check('  "Verifica questa sezione" porta d, D, r e intaglio nella verifica (X ≈ 1.97)', x5.startswith('shoulder 40') and '1.97' in x5, x5)
    # relazione di calcolo: il bottone apre una pagina con i capitoli, i numeri del progetto e i diagrammi
    pg6 = new_page(); pg6.goto(BASE + '?m=shafts&lang=it'); settle(pg6)
    pg6.evaluate("loadDemoPreset('shaftExam')"); settle(pg6)
    pg6.click('#reportBtn')
    check('  il bottone Relazione apre il menu (modulo / trasmissione)', pg6.evaluate("!document.getElementById('reportMenu').classList.contains('hidden')"))
    with ctx.expect_page() as rp:
        pg6.click('#reportMenuThis')
    rep = rp.value; rep.wait_for_load_state(); rep.wait_for_function("document.querySelector('.page') !== null")
    body = rep.evaluate("document.body.textContent")
    svgs = rep.evaluate("document.querySelectorAll('svg').length")
    check('  relazione: formule impaginate (frazioni e radici vere)', rep.evaluate("document.querySelectorAll('.eq .katex .mfrac').length > 5 && document.querySelectorAll('.katex .sqrt').length > 1"))
    check('relazione di calcolo (alberi): capitoli, Mf 1887, d = 65 e diagrammi', ('1.887' in body or '1887' in body) and all(k in body for k in ['Relazione di calcolo', 'Reazioni vincolari', 'Retta di Goodman', 'Quote per il CAD', 'd = 65 mm']) and svgs >= 5, f'svg={svgs} missing=' + str([k for k in ['Relazione di calcolo', 'Reazioni vincolari', 'Retta di Goodman', 'Quote per il CAD', '1.887', 'd = 65 mm'] if k not in body]))
    check('  bottone Relazione visibile in tutti i moduli', pg6.evaluate("['fits','belts','gears','shafts'].every(m => { switchModule(m); return !document.getElementById('reportBtn').classList.contains('hidden'); })"))
    # relazioni degli altri moduli: ingranaggi (progetto e potenza massima), cinghie, accoppiamenti
    for q, keys in [('?m=gears&lang=it', ['Progetto a usura (Hertz)', 'Verifica a flessione (Lewis)', 'Quote per il CAD', 'm = 2,250 mm']),
                    ('?m=gears&lang=it&gwToothType=helical&gwModule=4&gwFaceWidth=70&gwZ1=18&gwZ2=50&gwSpeed=750&gwAlpha=25&gwSigmaH=981&gop=wmax', ['Potenza e coppia massime', '94,91 kW']),
                    ('?m=belts&lang=it&bmode=power', ['Larghezza della cinghia', 'Interasse effettivo', 'Designazione']),
                    ('?m=fits&lang=it&nominalDiameter=30&fitType=H7%2Fk6', ['Scostamenti e dimensioni limite', 'Ø30 H7/k6', '+0,015'])]:
        pq = new_page(); pq.goto(BASE + q); settle(pq)
        pq.click('#reportBtn')
        with ctx.expect_page() as rp2:
            pq.click('#reportMenuThis')
        rr = rp2.value; rr.wait_for_load_state(); rr.wait_for_function("document.querySelector('.page') !== null")
        tx = rr.evaluate("document.body.textContent")
        check('  relazione ' + q.split('&')[0][3:] + ': ' + ', '.join(keys), all(k in tx for k in keys), str([k for k in keys if k not in tx]))

    # relazione della trasmissione completa: preset collegato, capitoli, controlli di coerenza
    pt = new_page(); pt.goto(BASE + '?demo=transmission&lang=it'); settle(pt)
    st = pt.evaluate("[document.getElementById('shaftSpeed').value, document.getElementById('gearSpeed').value, document.getElementById('nominalDiameter').value, document.getElementById('shaftEl3D').value]")
    check('trasmissione: il preset collega cinghia (725 rpm), ruote, albero e accoppiamento', st[0] == '725' and st[1] == '725' and st[2] == '35' and st[3] == '45', str(st))
    pt.click('#reportBtn')
    check('  menu: moduli visitati preselezionati', pt.evaluate("[...document.querySelectorAll('#reportMenuMods input:checked')].length") == 4)
    with ctx.expect_page() as rpt:
        pt.click('#reportMenuGo')
    rt = rpt.value; rt.wait_for_load_state(); rt.wait_for_function("document.querySelector('.page') !== null")
    tt = rt.evaluate("document.body.textContent")
    keys = ['Trasmissione completa', 'Coerenza tra i moduli', 'uscita della cinghia 725 rpm, pignone 725 rpm', 'albero-pignone', '4.6', 'Retta di Goodman', 'Ø35 H7/k6', 'Torsio Engineering']
    check('  relazione trasmissione: schema, coerenza, pignone di pezzo, capitoli numerati', all(k in tt for k in keys), str([k for k in keys if k not in tt]))
    check('  relazione trasmissione: 5 capitoli e formule impaginate', rt.evaluate("document.querySelectorAll('h2.ch').length") == 5 and rt.evaluate("document.querySelectorAll('.katex .mfrac').length > 10"))
    pt.evaluate("switchModule('gears')"); pt.click('#reportBtn')
    pt.evaluate("document.querySelectorAll('#reportMenuMods input').forEach(i => i.checked = false)"); pt.click('#reportMenuGo')
    check('  nessun modulo scelto: messaggio, nessuna relazione', 'almeno un modulo' in pt.evaluate("document.getElementById('reportMenuMsg').textContent"))
    # home page: link vecchi reindirizzati al calcolatore, link della home con lingua
    ph = new_page(); ph.goto(HOME + '?m=fits&nominalDiameter=30&fitType=H7%2Fk6'); ph.wait_for_url('**/app.html?*'); settle(ph)
    check('home: i vecchi link /?m=... aprono il calcolatore con i loro dati', ph.evaluate("document.getElementById('nominalDiameter').value") == '30', ph.url)
    ph2 = new_page(); ph2.goto(HOME); settle(ph2)
    ph2.click('.lang button[data-lang=it]')
    hrefs = ph2.evaluate("[...document.querySelectorAll('[data-href]')].map(a => a.getAttribute('href'))")
    check('  home: titolo, link al calcolatore e alla demo con la lingua', 'Torsio' in ph2.title() and 'app.html?lang=it' in hrefs and 'app.html?demo=transmission&lang=it' in hrefs, str(hrefs))

    # strutture (FEM): disegno con il mouse, vincoli e carichi con un clic, dimensionamento, link e relazione
    pf = new_page(); pf.goto(BASE + '?m=frames&lang=it'); settle(pf)
    pf.click('#frClear'); settle(pf)
    def scr(x, y):
        return pf.evaluate(f"(() => {{ document.getElementById('frCanvas').scrollIntoView({{block: 'center'}}); const p = frToScreen({{x:{x}, y:{y}}}), r = document.getElementById('frCanvas').getBoundingClientRect(); return [r.left + p.X * r.width / {900}, r.top + p.Y * r.height / {460}]; }})()")
    a = scr(0, 0); b = scr(4000, 0)
    pf.mouse.move(*a); pf.mouse.down(); pf.mouse.move((a[0] + b[0]) / 2, a[1], steps=4); pf.mouse.move(*b, steps=4); pf.mouse.up(); settle(pf)
    check('strutture: trascinando si crea un\'asta da 4 m tra due nodi', pf.evaluate("frModel.members.length === 1 && frModel.nodes.length === 2 && frModel.nodes[1].x === 4000"), pf.evaluate("JSON.stringify(frModel.nodes)"))
    pf.click('#frTools button[data-tool=support]'); settle(pf)
    for x in (0, 4000, 4000):   # positions read again before every click: the summary band above can change height
        pf.mouse.click(*scr(x, 0)); settle(pf)
    check('  vincoli con un clic: cerniera, poi carrello al secondo clic', pf.evaluate("frModel.supports.map(s => s.type).join(',')") == 'pin,rollerX', pf.evaluate("frModel.supports.map(s => s.type).join(',')"))
    pf.click('#frTools button[data-tool=dload]'); a = scr(0, 0); b = scr(4000, 0); pf.mouse.click((a[0] + b[0]) / 2, a[1]); settle(pf)
    best = pf.evaluate("frResults.best + ' ' + frResults.byFamily[frResults.best].secs[0].name")
    check('  carico distribuito sull\'asta e sezione più leggera (IPE con q = 10 kN/m, L = 4 m)', best.startswith('IPE'), best)
    m = pf.evaluate("frameMemberSummary(frResults.byFamily.IPE.ev.an.members[0], frModel).Mabs / 1e6")
    check('  M max = qL²/8 = 20 kN·m', abs(m - 20) < 1e-6, str(m))
    url = pf.evaluate("shareUrl()")
    pf2 = new_page(); pf2.goto(url); settle(pf2)
    check('  il link condivisibile riapre la stessa struttura', pf2.evaluate("frModel.members.length === 1 && frModel.dloads.length === 1 && frModel.supports.length === 2 && frResults.best") == best.split(' ')[0], url[-80:])
    pf3 = new_page(); pf3.goto(BASE + '?demo=frames&lang=it'); settle(pf3)
    tw = pf3.evaluate("[frModel.members.length, frResults.best, Math.round(frResults.notebook.W), frResults.byFamily.IPE.ok, frResults.notebook.tower, Math.round(frResults.notebook.buck.W)]")
    check('  confronto col notebook: 285 kg senza instabilità, ~1471 kg con instabilità (tondo pieno), gradiente 1453,6 kg', tw[2] == 285 and tw[4] is True and abs(tw[5] - 1471) <= 2 and any(k in pf3.evaluate("document.getElementById('frNb').textContent") for k in ('1.453,6 kg', '1453,6 kg')), str(tw))
    check('  demo torre radio (notebook): 20 aste, tubo il più leggero, IPE non basta (Eulero)', tw[0] == 20 and tw[1] == 'tube' and tw[3] is False, str(tw))
    pf3.click('#reportBtn')
    with ctx.expect_page() as rpf:
        pf3.click('#reportMenuThis')
    rf = rpf.value; rf.wait_for_load_state(); rf.wait_for_function("document.querySelector('.page') !== null")
    tf = rf.evaluate("document.body.textContent")
    keys = ['Struttura piana', 'Metodo di calcolo', 'Confronto delle famiglie', 'Esempio di verifica', 'FSD continuo', 'Tubo tondo']
    check('  relazione strutture: metodo, confronto, esempio di verifica, notebook', all(k in tf for k in keys) and rf.evaluate("document.querySelectorAll('.katex .mfrac').length > 10"), str([k for k in keys if k not in tf]))

    # progetto: dati, salvataggio e riapertura del file con tutti i moduli; relazione con cartiglio; DXF di ogni modulo
    pp = new_page(); pp.goto(BASE + '?demo=transmission&lang=it'); settle(pp)
    pp.click('#projectBtn')
    for k, v in [('company', 'Officine Rossi srl'), ('project', 'Riduttore R7'), ('code', 'C-2026-014'), ('client', 'Acme Spa'), ('drawnBy', 'L. Frassi')]:
        pp.fill('#prj_' + k, v)
    pp.fill('#prj_revDesc', 'Prima emissione'); pp.click('#prjNewRev')
    check('progetto: nuova revisione 0 → 1 con lo storico', pp.evaluate("projectMeta.rev === '1' && projectMeta.revisions.length === 1 && projectMeta.revisions[0].desc === 'Prima emissione'"))
    with pp.expect_download() as dl:
        pp.click('#prjSave')
    path = dl.value.path(); import json as _json; data = _json.load(open(path))
    check('  file di progetto: nome con commessa e revisione, stato di tutti i moduli', dl.value.suggested_filename == 'C-2026-014_Riduttore-R7_rev1.torsio.json' and set(data['modules']) >= {'fits', 'belts', 'gears', 'shafts', 'frames'} and data['modules']['belts']['motorPower'] == '7.5', dl.value.suggested_filename)
    pq2 = new_page(); pq2.goto(BASE + '?lang=it'); settle(pq2)
    pq2.click('#projectBtn'); pq2.set_input_files('#prjFile', path); pq2.wait_for_timeout(600)
    st = pq2.evaluate("[document.getElementById('motorPower').value, document.getElementById('gearSpeed').value, document.getElementById('nominalDiameter').value, projectMeta.company, activeModule]")
    check('  riaprendo il file tornano input di tutti i moduli e dati del progetto', st[0] == '7.5' and st[1] == '725' and st[2] == '35' and st[3] == 'Officine Rossi srl' and st[4] == 'shafts', str(st))
    pq2.keyboard.press('Escape')
    pq2.click('#reportBtn')
    with ctx.expect_page() as rpp:
        pq2.click('#reportMenuThis')
    rq = rpp.value; rq.wait_for_load_state(); rq.wait_for_function("document.querySelector('.page') !== null")
    tq = rq.evaluate("document.body.textContent")
    check('  relazione: intestazione e cartiglio con azienda, commessa, cliente, revisioni e firme', all(k in tq for k in ['Officine Rossi srl', 'C-2026-014', 'Acme Spa', 'Prima emissione', 'Redatto', 'Approvato']) and rq.evaluate("document.querySelectorAll('.cart .sig').length") == 3)
    # DXF
    check('  bottone DXF nascosto negli accoppiamenti, visibile negli alberi', pq2.evaluate("switchModule('fits'); const h = document.getElementById('dxfBtn').classList.contains('hidden'); switchModule('shafts'); h && !document.getElementById('dxfBtn').classList.contains('hidden')"))
    with pq2.expect_download() as dd:
        pq2.click('#dxfBtn')
    dtxt = open(dd.value.path(), encoding='latin-1', newline='').read()
    check('DXF albero: R12 valido con cartiglio, commessa, cave UNI 6604 e quote', dtxt.startswith('0\r\nSECTION') and 'AC1009' in dtxt and dtxt.rstrip().endswith('EOF') and 'C-2026-014' in dtxt and 'UNI 6604' in dtxt and 'QUOTE' in dtxt and dd.value.suggested_filename.endswith('_albero.dxf'), dd.value.suggested_filename)
    others = pq2.evaluate("['frames', 'gears', 'belts'].map(m => { if (m === 'frames') loadDemoPreset('frames'); const t = exportDxf(m); return !!t && t.includes('CARTIGLIO') && t.trim().endsWith('EOF'); })")
    check('  DXF di strutture, ruote e cinghie', all(others), str(others))
    # profilo dell'albero modificato a mano: resta nel link condivisibile
    pq3 = new_page(); pq3.goto(BASE + '?demo=shaftExam&lang=it'); settle(pq3)
    nseg = pq3.evaluate("shaftProfile.segs.length")
    pq3.fill('#shaftProfileTbl tr[data-i="1"] input[data-f="d"]', '52'); pq3.dispatch_event('#shaftProfileTbl tr[data-i="1"] input[data-f="d"]', 'change'); settle(pq3)
    url3 = pq3.evaluate("shareUrl()")
    pq4 = new_page(); pq4.goto(url3); settle(pq4)
    check('  profilo dell\'albero modificato a mano: resta nel link e nel DXF', 'spf=' in url3 and pq4.evaluate("!shaftProfile.auto && shaftProfile.segs[1].d === 52 && shaftProfile.segs.length") == nseg and '%%c52' in pq4.evaluate("exportDxf('shafts')"), url3[-60:])

    # collegamenti bullonati: esame del 2/2/2021, verifica da coppia (16 × M14 a 105 N·m), vite di manovra, link e relazione
    pb = new_page(); pb.goto(BASE + '?demo=boltsExam&lang=it'); settle(pb)
    b = pb.evaluate("[lastBoltState.m, Math.round(lastBoltState.r.Ms / 1000), Math.round(lastBoltState.ex.Mtmax / 1e3), lastBoltState.r.nMax]")
    check('bulloni (2/2/2021): 10 × M30 12.9, Ms ≈ 1769 N·m, con 110 kN di compressione Mt = 32 847 N·m, 14 viti al massimo', b[0] == 10 and b[1] == 1769 and abs(b[2] - 32847) <= 2 and b[3] == 14, str(b))
    pb.click('#btOpts tr[data-size="M36"]'); settle(pb)
    check('  scelta di un\'altra misura dalla tabella (M36 → 7 viti)', pb.evaluate("lastBoltState.size.name === 'M36' && lastBoltState.m === 7"))
    pb.click('#btMode_torque'); settle(pb)
    for k, v in [('btMs', '105'), ('btM', '16'), ('btDc', '250'), ('btCls', '8.8'), ('btSize', 'M14'), ('btPe', '0')]:
        pb.evaluate(f"document.getElementById('{k}').value = '{v}'")
    pb.evaluate("calculateBolts()")
    mt = pb.evaluate("lastBoltState.r.Mtmax / 1e6")
    check('  verifica da coppia: 16 × M14 8.8 a 105 N·m su Ø250 → Mt max ≈ 7,6 kN·m', abs(mt - 7.618) < 0.01, str(mt))
    urlb = pb.evaluate("shareUrl()")
    pb2 = new_page(); pb2.goto(urlb); settle(pb2)
    check('  il link riapre la verifica da coppia con gli stessi dati', pb2.evaluate("currentBoltMode === 'torque' && Math.abs(lastBoltState.r.Mtmax / 1e6 - 7.618) < 0.01"), urlb[-80:])
    pb2.click('#btMode_screw'); settle(pb2)
    sc = pb2.evaluate("[Math.round(lastBoltState.r.Ms / 1000), lastBoltState.r.selfLocking]")
    check('  vite di manovra della morsa (Ø25 × 5, f = 0,08, 80 kN): Ms ≈ 141 N·m, autobloccante', sc[0] == 141 and sc[1] is True, str(sc))
    pb.click('#btMode_design'); pb.evaluate("loadDemoPreset('boltsExam')"); settle(pb)
    pb.click('#reportBtn')
    with ctx.expect_page() as rpb:
        pb.click('#reportMenuThis')
    rb = rpb.value; rb.wait_for_load_state(); rb.wait_for_function("document.querySelector('.page') !== null")
    tb = rb.evaluate("document.body.textContent")
    keys = ['Collegamento bullonato', 'Numero di viti', 'Coppia di serraggio', 'Carico esterno assiale', 'Confronto delle misure', '10 × M30 12.9']
    check('  relazione bulloni: precarico, numero di viti, coppia, carico esterno, diagramma, formule', all(k in tb for k in keys) and rb.evaluate("document.querySelectorAll('.katex .mfrac').length > 10 && document.querySelectorAll('svg').length >= 1"), str([k for k in keys if k not in tb]))
    check('  quota e coppia "nessuna" nel selettore', pg3.evaluate("[...document.getElementById('shaftEl1Torque').options].some(o => o.value === 'none')"))

    check('  progetto: scheda carico massimo nascosta', pg.evaluate("document.getElementById('shaftMaxCard').classList.contains('hidden')"))

    # --- links between modules
    pl = new_page(); pl.goto(BASE + '?demo=transmission&lang=it'); settle(pl)
    pl.evaluate("switchModule('belts')"); settle(pl)
    bar = pl.evaluate("document.getElementById('linkBar_belts')?.innerText || ''")
    check('collegamenti: barra "Prosegui" nella cinghia', 'Ruote dentate a valle' in bar, bar[:120])
    bd = pl.evaluate("linkBeltData()")
    pl.click('#linkBar_belts button[data-link="beltGears"]'); settle(pl)
    gv = pl.evaluate("[activeModule, +document.getElementById('gearPower').value, +document.getElementById('gearSpeed').value, !!document.getElementById('linkBanner')]")
    check('  cinghia → ruote: potenza e giri del pignone, banner', gv[0] == 'gears' and abs(gv[1] - bd['P']) < 1e-3 and abs(gv[2] - bd['n2']) < 0.1 and gv[3], str(gv) + str(bd))
    gd = pl.evaluate("linkGearData()")
    pl.click('#linkBar_gears button[data-arg="wheel"]'); settle(pl)
    sv = pl.evaluate("(() => { const k = SHAFT_EL_SLOTS.find(i => document.getElementById('shaftEl' + i + 'Type').value === 'gear'); const p = 'shaftEl' + k; return [activeModule, currentShaftMode, +document.getElementById('shaftSpeed').value, +document.getElementById(p + 'D').value, document.getElementById(p + 'Torque').value, document.getElementById(p + 'Type').value]; })()")
    check('  ruote → albero della ruota: giri n1·τ, Ø primitivo della ruota, coppia entrante', sv[0] == 'shafts' and sv[1] == 'beam' and abs(sv[2] - gd['n2']) < 0.1 and abs(sv[3] - gd['dp2']) < 0.01 and sv[4] == 'in' and sv[5] == 'gear', str(sv) + str(gd))
    p0 = new_page(); p0.goto(BASE + '?m=shafts&lang=it'); settle(p0); p0.evaluate("linkRenderActive()")
    sbar = p0.evaluate("document.getElementById('linkBar_shafts').innerText"); p0.close()
    check('  albero appena aperto: la sezione è già calcolata, accoppiamento disponibile con il suo Ø', 'Accoppiamento sul diametro' in sbar and 'Calcola prima la sezione' not in sbar and 'Ø' in sbar, sbar[:160])
    pl.evaluate("setShaftMode('design')"); settle(pl)
    dsh = pl.evaluate("lastShaftSection.d")
    pl.click('#linkBar_shafts button[data-link="shaftFits"]'); settle(pl)
    fv = pl.evaluate("[activeModule, +document.getElementById('nominalDiameter').value]")
    check('  albero → accoppiamenti: Ø della sezione', fv[0] == 'fits' and fv[1] == dsh, str(fv) + ' d=' + str(dsh))
    pl.evaluate("switchModule('shafts')"); settle(pl)
    check('  il banner sparisce cambiando modulo', pl.evaluate("!document.getElementById('linkBanner')"))
    mt = pl.evaluate("readShaftTorque().Mt")
    pl.click('#linkBar_shafts button[data-link="shaftBolts"]'); settle(pl)
    bv = pl.evaluate("[activeModule, currentBoltMode, document.getElementById('btLoad').value, +document.getElementById('btMt').value, lastBoltState && lastBoltState.inp.Mt]")
    check('  albero → bulloni: giunto a flange con Mt dell\'albero', bv[0] == 'bolts' and bv[1] == 'design' and bv[2] == 'torque' and abs(bv[3] * 1000 - mt) < 0.5 and abs(bv[4] - mt * 1000) < 500, str(bv) + ' Mt=' + str(mt))
    url_l = pl.evaluate("shareUrl()")
    check('  il link condiviso porta il carico importato', 'btMt' in url_l or 'btLoad' in url_l or 'm=bolts' in url_l, url_l[-100:])
    pl.goto(BASE + '?demo=frames&lang=it'); settle(pl); pl.wait_for_timeout(1500)
    pl.evaluate("linkRenderActive()")
    reacs = pl.evaluate("linkFrameReactions().map(r => [r.node, r.Rx, r.Ry, r.M])")
    nb = pl.evaluate("document.querySelectorAll('#linkBar_frames button[data-link=\"frameBolts\"]:not([disabled])').length")
    check('  strutture: un pulsante per ogni vincolo', len(reacs) > 0 and nb == len(reacs), f'{nb} vs {reacs}')
    if reacs:
        pl.click('#linkBar_frames button[data-arg="0"]'); settle(pl)
        r0 = reacs[0]
        fb = pl.evaluate("[activeModule, document.getElementById('btLoad').value, +document.getElementById('btF').value, +document.getElementById('btPe').value, document.getElementById('linkBanner')?.innerText || '']")
        check('  strutture → bulloni: taglio |Rx| e sollevamento max(0, −Ry)', fb[0] == 'bolts' and fb[1] == 'force' and abs(fb[2] - abs(r0[1]) / 1000) < 1e-3 and abs(fb[3] - max(0, -r0[2]) / 1000) < 1e-3 and 'nodo' in fb[4], str(fb) + str(r0))
    pl.evaluate("updateLanguage('en')"); pl.evaluate("switchModule('gears')"); settle(pl)
    check('  barra tradotta in inglese', 'Continue with these results' in pl.evaluate("document.getElementById('linkBar_gears').textContent"))

    # --- product: steel table for shafts, method page, meta
    pm = new_page(); pm.goto(BASE + '?m=shafts&lang=it&smode=design'); settle(pm)
    pm.select_option('#shaftMaterial', '39NiCrMo3|40'); settle(pm)
    mv = pm.evaluate("['shaftSigmaR','shaftSigmaS','shaftSigmaLF'].map(id => +document.getElementById(id).value)")
    check('materiali: 39NiCrMo3 +QT 16<d≤40 compila σR 930, σs 735, σLF 465', mv == [930, 735, 465], str(mv))
    um = pm.evaluate("shareUrl()")
    pm2 = new_page(); pm2.goto(um); settle(pm2)
    check('  il link riapre lo stesso acciaio', pm2.evaluate("document.getElementById('shaftMaterial').value") == '39NiCrMo3|40', um[-120:]); pm2.close()
    dd = pm.evaluate("lastShaftSection.d")
    hint = pm.evaluate("document.getElementById('shaftMatInfo').innerText")
    check('  avviso quando il diametro è in un\'altra fascia', (('fascia' in hint) == (dd > 40 or dd <= 16)), f'd={dd} {hint}')
    pm.fill('#shaftSigmaR', '1000'); settle(pm)
    check('  modificando σR si torna a "personalizzato"', pm.evaluate("document.getElementById('shaftMaterial').value") == 'custom')
    pm.select_option('#shaftMaterial', '42CrMo4|16'); settle(pm)
    pm.click('#reportBtn')
    with ctx.expect_page() as rpm:
        pm.click('#reportMenuThis')
    rm = rpm.value; rm.wait_for_load_state(); rm.wait_for_function("document.querySelector('.page') !== null")
    check('  la relazione dell\'albero cita l\'acciaio della tabella', '42CrMo4 +QT' in rm.evaluate("document.body.textContent")); rm.close(); pm.close()
    pmet = new_page(); pmet.goto(HOME + 'metodo.html?lang=it'); pmet.wait_for_timeout(800)
    mt_it = pmet.evaluate("[document.title, document.querySelectorAll('.katex').length, [...document.querySelectorAll('.tbl tbody tr')].length, document.querySelector('.tbl tfoot .n').innerText]")
    check('pagina metodo: titolo, formule KaTeX, tabella dei moduli, totale casi', 'Metodo' in mt_it[0] and mt_it[1] >= 8 and mt_it[2] == 8 and mt_it[3] == '387', str(mt_it))
    pmet.click('.lang button[data-lang="en"]'); pmet.wait_for_timeout(200)
    check('  versione inglese', pmet.evaluate("document.title.startsWith('Method') && document.querySelector('h1').innerText === 'Method and validation' && document.querySelector('[data-app]').href.endsWith('lang=en')"))
    pmet.close()
    ph = new_page(); ph.goto(HOME + '?m=bolts&btLoad=force'); ph.wait_for_timeout(600)
    check('home: i vecchi link ai bulloni vanno al calcolatore', 'app.html?m=bolts' in ph.url, ph.url)
    ph.goto(HOME); ph.wait_for_timeout(300)
    meta = ph.evaluate("[document.querySelector('meta[property=\"og:image\"]')?.content, [...document.querySelectorAll('a')].some(a => a.getAttribute('href') === 'metodo.html'), document.querySelector('.facts .n').innerText]")
    check('  anteprima per i social, link alla pagina metodo, 387 casi', meta[0].endswith('og-image.png') and meta[1] and meta[2] == '387', str(meta)); ph.close()

    # --- phone (390 px): report menu inside the screen, report without sideways overflow
    mctx = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    mctx.add_init_script("try { localStorage.setItem('torsioNoStart', '1') } catch (e) {}")   # the start screen has its own test
    mctx.route('**/*', router)
    mp = mctx.new_page(); mp.on('pageerror', lambda e: errors.append(str(e)))
    mp.goto(BASE + '?demo=shaftExam&lang=it'); settle(mp)
    mp.click('#reportBtn'); mp.wait_for_timeout(200)
    mr = mp.evaluate("(() => { const r = document.getElementById('reportMenu').getBoundingClientRect(); return [r.left, r.right, innerWidth]; })()")
    check('telefono: il menu della relazione resta dentro lo schermo', mr[0] >= 0 and mr[1] <= mr[2], str(mr))
    with mctx.expect_page() as mrp:
        mp.click('#reportMenuThis')
    mrr = mrp.value; mrr.wait_for_load_state(); mrr.wait_for_function("document.querySelector('.page') !== null")
    # offline the popup does not fetch the KaTeX stylesheet: inject it, as a real browser has it
    mrr.add_style_tag(content=open(os.path.join(REPO, 'vendor/katex/katex.min.css')).read().replace('url(fonts/', 'url(' + HOME + 'vendor/katex/fonts/')); mrr.wait_for_timeout(300)
    mov = mrr.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth, document.querySelectorAll('.tscroll').length, !!document.querySelector('meta[name=viewport]')]")
    check('telefono: la relazione non sborda (tabelle con scorrimento proprio)', mov[0] <= mov[1] + 1 and mov[2] > 3 and mov[3], str(mov))
    mctx.close()

    # --- module views for Analytics
    lctx = browser.new_context(); lctx.route('**/*', router)
    lctx.add_init_script("try { localStorage.setItem('torsioNoStart', '1') } catch (e) {}")   # the start screen has its own test
    lp = lctx.new_page(); lp.on('pageerror', lambda e: errors.append(str(e)))
    lp.goto(BASE); settle(lp)
    lp.evaluate("switchModule('shafts'); switchModule('bolts'); switchModule('bolts')")
    pv = lp.evaluate("(window.vaq || []).filter(a => a[0] === 'pageview').map(a => a[1].path)")
    check('analytics: ogni modulo aperto conta come /app/<modulo>, senza doppioni', '/app/shafts' in pv and pv.count('/app/bolts') == 1, str(pv))
    ev = lp.evaluate("(() => { const f = (window.vaq || []).find(a => a[0] === 'beforeSend'); return f ? [f[1]({ url: location.origin + '/app/shafts?x=1' }).url, f[1]({ url: location.origin + '/app.html?m=gears&gearPower=5' }).url] : null; })()")
    check('  il filtro privacy lascia passare /app/<modulo> e toglie i dati del calcolo', ev and ev[0].endswith('/app/shafts') and ev[1].endswith('/app.html?m=gears'), str(ev))
    lctx.close()

    # --- feedback: 👍/👎 under the module and in the report toolbar (Tally form Gev5gZ)
    fp = new_page(); fp.goto(BASE + '?demo=boltsExam&lang=it'); settle(fp)
    check('riscontro: domanda sotto il modulo', 'Questo modulo ti è stato utile?' in fp.evaluate("document.getElementById('fbBar').innerText"))
    fp.click('#fbBar button[data-fb="up"]'); fp.wait_for_timeout(6500)   # offline Tally cannot load: fallback link after the timeout
    fb = fp.evaluate("[document.getElementById('fbBar').innerText, (window.vaq || []).filter(a => a[0] === 'pageview').map(a => a[1].path), document.querySelector('#fbBar a')?.href || '']")
    check('  il voto conta in Analytics come /feedback/up/bolts e mostra il grazie', '/feedback/up/bolts' in fb[1] and 'Grazie' in fb[0], str(fb[:2]))
    check('  senza Tally resta il link al modulo con voto, modulo e lingua', 'tally.so/r/Gev5gZ?vote=up&module=bolts&lang=it' in fb[2], fb[2])
    ev2 = fp.evaluate("(() => { const f = (window.vaq || []).find(a => a[0] === 'beforeSend'); return f[1]({ url: location.origin + '/feedback/down/shafts?x=1' }).url; })()")
    check('  il filtro privacy lascia passare /feedback/<voto>/<modulo>', ev2.endswith('/feedback/down/shafts'), ev2)
    fp.evaluate("switchModule('gears')")
    check('  cambiando modulo si può votare di nuovo', fp.evaluate("!!document.querySelector('#fbBar button[data-fb]')"))
    fp.click('#fbBar button[data-fb="down"]')
    asked = fp.evaluate("[document.getElementById('fbBar').innerText, document.querySelectorAll('#fbBar button[data-fb-reason]').length]")
    fp.click('#fbBar button[data-fb-reason="missing"]')
    got = fp.evaluate("[document.getElementById('fbBar').innerText, (window.vaq || []).filter(a => a[0] === 'pageview').map(a => a[1].path), document.querySelector('#fbBar a')?.href || '']")
    ev3 = fp.evaluate("(() => { const f = (window.vaq || []).find(a => a[0] === 'beforeSend'); return f[1]({ url: location.origin + '/feedback/down/gears/missing?x=1' }).url; })()")
    check('  ✕: quattro risposte rapide, poi il motivo conta in Analytics, grazie e link facoltativo al modulo',
          'Cosa non è andato?' in asked[0] and asked[1] == 4 and '/feedback/down/gears/missing' in got[1] and '/feedback/down/gears' in got[1]
          and 'Grazie' in got[0] and 'vote=down&module=gears' in got[2] and ev3.endswith('/feedback/down/gears/missing'), str(asked) + str(got) + ev3)
    fp.click('#reportBtn')
    with ctx.expect_page() as frp:
        fp.click('#reportMenuThis')
    fr = frp.value; fr.wait_for_load_state(); fr.wait_for_function("document.querySelector('.page') !== null")
    links = fr.evaluate("[...document.querySelectorAll('.toolbar a.fb')].map(a => a.href)")
    check('  la relazione ha 👍/👎 nella barra, con il modulo', len(links) == 2 and 'vote=up&module=gears' in links[0] and 'vote=down' in links[1], str(links)); fr.close(); fp.close()

    # --- summary band (B3): status line and four readouts above every module
    sp = new_page(); sp.goto(BASE + '?demo=shaftExam&lang=it'); settle(sp); sp.evaluate("sumRender()")
    sb = sp.evaluate("[document.getElementById('sumStatus').innerText, document.querySelectorAll('#sumBar .sum-card').length, document.getElementById('sumBar').innerText]")
    check('riepilogo: albero d\'esame verificato, 4 riquadri, d = 65 e X fatica 1,87', 'S-04' in sb[0] and 'VERIFICATO' in sb[0] and sb[1] == 4 and '65' in sb[2] and '1,87' in sb[2], str(sb))
    sp.evaluate("document.getElementById('shaftX').value = '2.5'; document.getElementById('shaftX').dispatchEvent(new Event('input', {bubbles: true}))"); sp.wait_for_timeout(500); sp.evaluate("sumRender()")
    check('  con X richiesto più alto il diametro cresce e resta verificato', 'VERIFICATO' in sp.evaluate("document.getElementById('sumStatus').innerText") and '65' not in sp.evaluate("document.querySelector('#sumBar .sum-val').innerText"))
    sp.goto(BASE + '?demo=boltsExam&lang=it'); settle(sp); sp.wait_for_timeout(300); sp.evaluate("sumRender()")
    bs = sp.evaluate("[document.getElementById('sumStatus').innerText, document.getElementById('sumBar').innerText]")
    check('  bulloni d\'esame: 10 × M30 verificato (arrotondamento per difetto ammesso)', 'J-06' in bs[0] and 'NON' not in bs[0] and '10 × M30' in bs[1], str(bs))
    sp.goto(BASE + '?lang=it'); settle(sp); sp.evaluate("sumRender()")
    check('  accoppiamenti: H7/g6 Ø25 con gioco', 'GIOCO' in sp.evaluate("document.getElementById('sumStatus').innerText"))
    sp.goto(BASE + '?demo=frames&lang=en'); settle(sp); sp.wait_for_timeout(1500); sp.evaluate("sumRender()")
    fs = sp.evaluate("[document.getElementById('sumStatus').innerText, document.getElementById('sumBar').innerText]")
    check('  strutture in inglese: T-05 VERIFIED con peso e utilizzo', 'T-05' in fs[0] and 'VERIFIED' in fs[0] and 'kg' in fs[1] and '%' in fs[1], str(fs)); sp.close()

    # --- shaft step 1: the summary follows the beam (not the step-2 fields)
    sv = new_page(); sv.goto(BASE + '?m=shafts&lang=it'); settle(sv); sv.evaluate("sumRender()")
    d30 = sv.evaluate("document.querySelector('#sumBar .sum-val').innerText")
    set_val(sv, 'shaftPower', 60); sv.wait_for_timeout(500); sv.evaluate("sumRender()")
    d60 = sv.evaluate("document.querySelector('#sumBar .sum-val').innerText")
    check('albero, passo 1: con più potenza sulla trave il diametro del riepilogo cresce', d30 != d60 and float(d60.split('mm')[0]) > float(d30.split('mm')[0]), f'{d30} → {d60}')
    silent = sv.evaluate("document.getElementById('sumBar').innerText"); sv.evaluate("shaftGoToCritical(); shaftUseSection()"); sv.wait_for_timeout(500); sv.evaluate("sumRender()")
    check('  il riepilogo al passo 1 coincide con "usa questa sezione" al passo 2', silent.split('\n')[:4] == sv.evaluate("document.getElementById('sumBar').innerText").split('\n')[:4])
    sv.close()

    # --- invalid inputs: marked, no verdict, no report, no transfer; everything back once fixed
    iv = new_page(); iv.goto(BASE + '?m=belts&lang=it'); settle(iv)
    set_val(iv, 'pulleyZ2', -5); iv.wait_for_timeout(400); iv.evaluate("sumRender(); linkRender('belts')")
    st = iv.evaluate("[document.getElementById('pulleyZ2').classList.contains('val-bad'), document.querySelector('#pulleyZ2').parentElement.parentElement.innerText, document.getElementById('sumStatus').innerText, !!document.getElementById('valBanner_belts'), document.getElementById('linkBar_belts').innerText]")
    check('dati non validi: z₂ = −5 evidenziato, messaggio, riepilogo DATI NON VALIDI, banner, collegamenti bloccati',
          st[0] and 'Almeno 10 denti' in st[1] and 'DATI NON VALIDI' in st[2] and st[3] and 'Correggi prima' in st[4], str(st))
    npages = len(ctx.pages); iv.evaluate("openReport()"); iv.wait_for_timeout(500)
    check('  la relazione non si apre con dati non validi', len(ctx.pages) == npages)
    for v, ok in [('', False), ('abc', False), ('4.5', False), ('30', True)]:
        set_val(iv, 'pulleyZ2', v); iv.wait_for_timeout(300)
        if (iv.evaluate("valCheck('belts').length") == 0) != ok: check(f'  z₂ = "{v}"', False); break
    else: check('  vuoto, testo e decimali rifiutati; 30 denti accettato', True)
    iv.evaluate("sumRender()")
    check('  corretto il campo, tornano verdetto e collegamenti', 'NON VALIDI' not in iv.evaluate("document.getElementById('sumStatus').innerText") and not iv.evaluate("!!document.getElementById('valBanner_belts')"))
    for d in ['bearingFit', 'boltsExam', 'frames', 'shaftExam', 'transmission']:
        iv.goto(BASE + f'?demo={d}'); settle(iv)
        bad = iv.evaluate("['fits','belts','gears','shafts','frames','bolts'].flatMap(m => valCheck(m).map(b => m + ':' + (b.el.id || b.el.dataset.f)))")
        if bad: check(f'  demo {d} senza campi non validi', False, str(bad)); break
    else: check('  nessuna demo ha campi non validi', True)
    iv.close()

    # --- report → PDF in the browser (popups do not load scripts here: the report is opened as a normal page)
    pp = new_page(); pp.goto(BASE + '?demo=boltsExam&lang=it'); settle(pp)
    html = pp.evaluate("reportLoadKatex().then(() => buildBoltReportHtml())")
    pr = ctx.new_page(); pr.on('pageerror', lambda e: errors.append(str(e)))
    pr.goto(HOME + 'index.html'); pr.set_content(html); pr.wait_for_timeout(500)
    pdf_ok = False
    try:
        with pr.expect_download(timeout=90000) as dl:
            pr.click('.toolbar button')
        path = dl.value.path(); data = open(path, 'rb').read()
        last = pr.evaluate("window.__torsioPdfLast")
        pdf_ok = data[:5] == b'%PDF-' and data.rstrip().endswith(b'%%EOF') and last['pages'] >= 2 and data.count(b'/Type /Page ') == last['pages'] and dl.value.suggested_filename.endswith('.pdf')
        detail = f"{last['pages']} pagine, {len(data) // 1024} kB, {dl.value.suggested_filename}"
    except Exception as e:
        detail = str(e)[:200]
    check('relazione → "Scarica PDF": file PDF A4 a più pagine, scaricato', pdf_ok, detail)
    pr.close(); pp.close()

    # --- frames: the "Bar" tool draws a member hinged at both ends (truss bar, axial force only)
    fb = new_page(); fb.goto(BASE + '?m=frames&lang=it'); settle(fb)
    fb.click('#frTools button[data-tool="bar"]')
    r = fb.evaluate("(() => { frModel = { nodes: [], members: [], supports: [], loads: [], dloads: [] }; frAddMember({x: 0, y: 0}, {x: 2000, y: 0}); frAddMember({x: 2000, y: 0}, {x: 1000, y: 1500}); frAddMember({x: 1000, y: 1500}, {x: 0, y: 0}); frModel.supports.push({node: 0, type: 'pin'}, {node: 1, type: 'rollerX'}); frModel.loads.push({node: 2, Fx: 0, Fy: -20000, M: 0}); frRenderTables(); calculateFrames(); return [frModel.members.every(m => m.relStart && m.relEnd), document.getElementById('frMembersTbl').textContent.includes('asta')]; })()")
    fb.wait_for_timeout(1500)
    check('strutture: lo strumento Asta crea aste incernierate ai due estremi, segnate "asta" nella tabella', r[0] and r[1], str(r))
    fb.close()

    # --- landing pages for search (tools/mkguides.py): load, formulas, hreflang pair, links to real modules and demos
    lp = new_page()
    pairs = [('shaft-calculator/', 'it/dimensionamento-albero/', 'shafts', 'shaftExam'), ('bolted-joint-calculator/', 'it/calcolo-bulloni/', 'bolts', 'boltsExam'), ('frame-truss-calculator/', 'it/calcolo-telaio-traliccio/', 'frames', 'frames')]
    bad = []
    LP_JS = """([o, m, d, l]) => { const hrefs = [...document.querySelectorAll('a')].map(a => a.getAttribute('href'));
      return [document.documentElement.lang === l, document.querySelectorAll('.katex').length >= 2,
        [...document.querySelectorAll('link[hreflang]')].some(k => k.href.endsWith('/' + o)),
        hrefs.includes('/app.html?m=' + m + '&lang=' + l), hrefs.includes('/app.html?demo=' + d + '&lang=' + l),
        JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent).length === 2]; }"""
    for en, it, mod, demo in pairs:
        for path, other, lang in ((en, it, 'en'), (it, en, 'it')):
            lp.goto(HOME + path); lp.wait_for_timeout(500)
            r = lp.evaluate(LP_JS, [other, mod, demo, lang])
            if not all(r): bad.append(path + ' ' + str(r))
    check('pagine per Google: sei pagine con formule, coppia di lingue, link al modulo e alla demo, dati strutturati', not bad, '; '.join(bad))
    lp.goto(HOME + 'index.html'); lp.evaluate("setLang('en')")
    check('  la home linka le pagine dei calcolatori nella lingua scelta', lp.evaluate("[...document.querySelectorAll('.calcs a')].map(a => a.getAttribute('href')).join()") == '/shaft-calculator/,/bolted-joint-calculator/,/frame-truss-calculator/')
    lp.close()

    # --- start screen: only for a bare calculator link, closed by any choice
    sctx = browser.new_context(); sctx.route('**/*', router)
    sp = sctx.new_page(); sp.on('pageerror', lambda e: errors.append(str(e)))
    sp.goto(BASE + '?lang=it'); settle(sp)
    st = sp.evaluate("[document.body.classList.contains('start-on'), document.querySelectorAll('#startView [data-start]').length, document.getElementById('moduleTitle').textContent, getComputedStyle(document.getElementById('moduleFitsSection')).display]")
    check('schermata iniziale: sei stazioni, titolo, moduli nascosti', st[0] and st[1] == 6 and 'stazione' in st[2] and st[3] == 'none', str(st))
    sp.click('#startView [data-start="shafts"]'); settle(sp)
    check('  scegliendo una stazione si apre il modulo', sp.evaluate("!document.body.classList.contains('start-on') && activeModule === 'shafts' && !document.getElementById('startView')"))
    sp.goto(BASE + '?lang=it'); settle(sp); sp.click('#startView [data-start-demo="transmission"]'); settle(sp)
    check('  "Apri la demo" carica la trasmissione', sp.evaluate("!document.body.classList.contains('start-on') && activeModule === 'shafts' && document.getElementById('motorPower').value === '7.5'"))
    sp.goto(BASE + '?m=gears'); settle(sp)
    check('  un link con il modulo apre subito il modulo', sp.evaluate("!document.body.classList.contains('start-on') && activeModule === 'gears'"))
    sctx.close()

    # --- transfers between modules only on request, and undoable
    lu = new_page(); lu.goto(BASE + '?m=shafts&lang=it'); settle(lu)
    set_val(lu, 'shaftPower', 7); lu.evaluate("switchModule('gears')"); settle(lu)
    check('  aprire un altro modulo non cambia l\'albero', lu.evaluate("document.getElementById('shaftPower').value") == '7')
    lu.click('#linkBar_gears button[data-arg="pinion"]'); settle(lu)
    moved = lu.evaluate("[activeModule, document.getElementById('shaftPower').value]")
    lu.click('#linkBanner [data-link-undo]'); settle(lu)
    back = lu.evaluate("[activeModule, document.getElementById('shaftPower').value, document.getElementById('shaftEl1D').value]")
    check('collegamenti: ruote → albero copia i dati, "Annulla" rimette quelli di prima', moved[0] == 'shafts' and moved[1] != '7' and back[1] == '7' and back[2] == '210', f'{moved} {back}')
    lu.close()

    check('nessun errore JS in tutto il test', not errors, '; '.join(errors[:3]))
    browser.close()
srv.shutdown()
print(f'\n{"TUTTO OK" if not failures else str(len(failures)) + " FALLITI: " + ", ".join(failures)}')
sys.exit(1 if failures else 0)

# Builds the calculator landing pages (one per module, English and Italian) for people arriving from search:
#   /shaft-calculator/  /bolted-joint-calculator/  /frame-truss-calculator/  /gear-calculator/  /iso-fits-calculator/
#   /it/dimensionamento-albero/  /it/calcolo-bulloni/  /it/calcolo-telaio-traliccio/  /it/calcolo-ruote-dentate/
#   /it/tolleranze-accoppiamenti-iso/
# The ISO 286 tables of the fits pages come from modules/core/fits-core.js through tools/fits-data.js (needs node).
# Each page: what the module calculates, the method with its formulas, a worked exam example with the numbers the
# calculator gives (checked in tests/browser_test.py), what you get, limits, FAQ, links. Run from the repo root:
#   python3 tools/mkguides.py
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://torsio.app'
TALLY = 'https://tally.so/r/Gev5gZ'
metodo = open(os.path.join(ROOT, 'tools', 'site-src', 'metodo.html')).read()
STYLE = metodo[metodo.index('  <style>'):metodo.index('  </style>')]
GEAR = re.search(r'<svg class="gear-o".*?</svg>', metodo, re.S).group(0)
STYLE += '''    .guide section { padding: 44px 0; }
    .guide h2 { margin-top: 0; }
    .guide ul { max-width: var(--measure); padding-left: 20px; } .guide li { margin-bottom: 6px; }
    .acts { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
    .btn.plain { background: var(--sheet); color: var(--ink); }
    .ex { width: 100%; max-width: 46rem; border-collapse: collapse; background: var(--sheet); border: 1px solid var(--line); font-size: 15.5px; }
    .ex th, .ex td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
    .ex th { width: 46%; font-weight: 500; color: var(--ink-2); }
    .ex tr.r td, .ex tr.r th { background: #eef3f9; } .ex tr.r td { font-weight: 700; color: var(--blue); }
    .ex caption { text-align: left; font-size: 13px; color: var(--ink-2); padding: 0 0 8px; }
    .faq dt { font-weight: 700; margin-top: 18px; } .faq dd { margin: 4px 0 0; max-width: var(--measure); color: var(--ink-2); }
    .others { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; max-width: 54rem; }
    .others a { display: block; background: var(--sheet); border: 1px solid var(--line); border-top: 3px solid var(--ink); padding: 14px 16px; text-decoration: none; color: var(--ink); font-weight: 700; }
    .others a span { display: block; font-weight: 400; font-size: 14px; color: var(--ink-2); margin-top: 4px; }
    .others a:hover { border-top-color: var(--signal); }
    .iso { border-collapse: collapse; background: var(--sheet); border: 1px solid var(--line); font-size: 14.5px; font-variant-numeric: tabular-nums; }
    .cap { font-size: 13px; color: var(--ink-2); margin: 0 0 8px; max-width: var(--measure); }
    .iso thead th:first-child, .iso tbody th { position: sticky; left: 0; background: var(--sheet); }
    .iso th, .iso td { padding: 7px 10px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
    .iso thead th { font-weight: 700; color: var(--ink); border-bottom: 2px solid var(--ink); }
    .iso tbody th { text-align: left; font-weight: 500; color: var(--ink-2); }
    .iso td.k { text-align: left; } .iso tr.r td, .iso tr.r th { background: #eef3f9; } .scroll { overflow-x: auto; }
    .iso .c { color: var(--blue); } .iso .t { color: #8a6408; } .iso .i { color: #b42318; }
    .guide h3 { margin: 30px 0 10px; font-size: 19px; }
    @media (max-width: 760px) { .others { grid-template-columns: 1fr; } .ex th { width: 50%; } }
'''

def eq(tex): return f'<div class="eq" data-tex="{tex}"></div>'
def ul(items): return '<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'
def table(caption, rows):
    h = f'<table class="ex"><caption>{caption}</caption><tbody>'
    for r in rows:
        cls = ' class="r"' if r[0].startswith('!') else ''
        h += f'<tr{cls}><th>{r[0].lstrip("!")}</th><td>{r[1]}</td></tr>'
    return h + '</tbody></table>'

# ------------------------------------------------------------------ texts
L = {
 'en': dict(home='Home', method='Method', open='Open the calculator', example='Try the exam example', more='Other calculators',
            by='a project by Luigi Frassi', news="What's new", privacy='Privacy', contact='Contact', src='Source code',
            free='Free, no sign-up, runs in your browser: your data never leaves your computer.', got='What you get',
            lim='Limits and next step', faq='Questions', how='Method', ex='Worked example', what='What it calculates', langname='Italiano'),
 'it': dict(home='Home', method='Metodo', open='Apri il calcolatore', example="Prova l'esempio d'esame", more='Altri calcolatori',
            by='un progetto di Luigi Frassi', news='Novità', privacy='Privacy', contact='Contatti', src='Codice sorgente',
            free='Gratuito, senza registrazione, gira nel browser: i dati restano sul tuo computer.', got='Cosa ottieni',
            lim='Limiti e passo successivo', faq='Domande', how='Metodo', ex='Esempio svolto', what='Cosa calcola', langname='English'),
}
GOT = {
 'en': ['A calculation report you can download as PDF: every formula with your numbers substituted, diagrams, an ISO 7200 title block you can fill in.',
        'A shareable link that reopens exactly the same calculation, and a project file with all the modules.',
        'Results you can pass, only when you ask, to the next module (for example gears → shaft → bolts).'],
 'it': ['Una relazione di calcolo da scaricare in PDF: ogni formula con i tuoi numeri sostituiti, i diagrammi, un cartiglio ISO 7200 da compilare.',
        'Un link condivisibile che riapre lo stesso identico calcolo, e un file di progetto con tutti i moduli.',
        'Risultati da passare, solo quando lo chiedi tu, al modulo successivo (per esempio ruote → albero → bulloni).'],
}

PAGES = [
 # ------------------------------------------------------------ shafts
 dict(key='shafts', mod='shafts', demo='shaftExam',
  en=dict(path='shaft-calculator/', title='Shaft design calculator: fatigue diameter with Goodman, with report',
   short='Shaft design calculator', card='Fatigue diameter, reactions, DXF',
   desc='Free shaft design calculator: bearing reactions, bending and torque diagrams, critical section and minimum diameter for fatigue (Goodman) and yield, with PDF calculation report and DXF profile.',
   h1='Shaft design calculator', lead='From the loads on the shaft to the diameter of every section: bearing reactions, bending and torque diagrams, the critical section and the minimum diameter for fatigue and yield, with the full calculation report.',
   what=['Bearing reactions and bending moments in two planes, with gear, pulley and coupling forces in their real direction (spur and helical gears).',
         'The critical section and its actions: bending moment, torque, axial force.',
         'Minimum diameter for fatigue (Goodman line) and yield, rounded to the next standard bearing bore, with the safety factors you get.',
         'Notch effects: shoulders (Kt from D/d and r/d, notch sensitivity q), keyways, size and surface finish factors.',
         'Finite life (Wöhler, Miner), bearing life L₁₀, and EN 10083 quenched and tempered steels by diameter range.'],
   how='The method is the one taught in machine design courses: a beam model gives the moments, then the stresses at the critical section are combined with von Mises and checked against the Goodman line, with the notch factor applied to the alternating part.',
   eqs=[r'M_t = \dfrac{P}{\omega} \qquad \sigma_f = \dfrac{32\,M_f}{\pi d^3} \qquad \tau_t = \dfrac{16\,M_t}{\pi d^3}',
        r'K_e = 1 + q\,(K_t - 1) \qquad \dfrac{1}{X} = \dfrac{\sigma_{a,eq}}{b_1\, b_2\, \sigma_N} + \dfrac{\sigma_{m,eq}}{\sigma_R}'],
   excap='Exam problem of 11 April 2003: shaft with two gears on two bearings.',
   exrows=[('Power and speed','30 kW at 200 rpm → M<sub>t</sub> = 1432 N·m'), ('Bearings','A at x = 0, D at x = 240 mm; shaft length 320 mm'),
           ('Steel','σ<sub>R</sub> = 1080 MPa, σ<sub>s</sub> = 800 MPa, σ<sub>LF</sub> = 520 MPa'), ('Shoulder and required factor','D/d = 1.17, r = 2 mm, X ≥ 1.75'),
           ('Bearing reactions','R<sub>A</sub> = 6.71 kN, R<sub>D</sub> = 40.11 kN'), ('Critical section','bearing D: M<sub>f</sub> = 1887 N·m, M<sub>t</sub> = 1432 N·m'),
           ('Minimum diameter','63.3 mm (fatigue governs)'), ('!Chosen diameter','d = 65 mm, D = 77 mm'), ('!Safety factors','fatigue X = 1.87, yield X = 4.64')],
   exnote='The calculator reproduces 283 checks from 13 hand-solved exam problems like this one.',
   lim='Preliminary sizing: it does not calculate deflection, critical speed or the DIN 743 checks. For the final design use DIN 743 (or FKM) and the bearing manufacturer\'s data.',
   faq=[('Which method does it follow?','The classic machine design method: beam model, critical section, Goodman line with notch, size and surface factors read from the standard charts. It is the method of university machine design courses, not DIN 743.'),
        ('Can I export the shaft to CAD?','Yes. It proposes a stepped shaft profile with shoulders, keyways and bearing seats that you can edit, and exports it as a DXF drawing with a title block.'),
        ('Can I check an existing shaft instead of designing one?','Yes: step 3 checks a given diameter and returns the safety factors for fatigue and yield, also at several sections at once.'),
        ('Is it free?','Yes, free and without sign-up. Everything runs in your browser.')]),
  it=dict(path='it/dimensionamento-albero/', title='Dimensionamento albero a fatica online: diametro con Goodman e relazione',
   short='Dimensionamento alberi', card='Diametro a fatica, reazioni, DXF',
   desc='Calcolatore gratuito per il dimensionamento degli alberi: reazioni dei cuscinetti, diagrammi dei momenti, sezione critica e diametro minimo a fatica (Goodman) e a snervamento, con relazione di calcolo in PDF e profilo DXF.',
   h1='Dimensionamento alberi a fatica', lead='Dai carichi sull\'albero al diametro di ogni sezione: reazioni dei cuscinetti, diagrammi di flessione e torsione, sezione critica e diametro minimo a fatica e a snervamento, con la relazione di calcolo completa.',
   what=['Reazioni dei cuscinetti e momenti flettenti nei due piani, con le forze di ruote, pulegge e giunti nella loro direzione reale (denti diritti ed elicoidali).',
         'La sezione critica e le sue sollecitazioni: momento flettente, momento torcente, sforzo assiale.',
         'Diametro minimo a fatica (retta di Goodman) e a snervamento, arrotondato al primo foro di cuscinetto unificato, con i coefficienti di sicurezza ottenuti.',
         'Effetto d\'intaglio: spallamenti (Kt da D/d e r/d, sensibilità q), linguette, coefficienti dimensionale e di finitura.',
         'Vita finita (Wöhler, Miner), durata dei cuscinetti L₁₀ e acciai da bonifica EN 10083 per fascia di diametro.'],
   how='Il metodo è quello del corso di Costruzione di Macchine: un modello a trave dà i momenti, poi le tensioni nella sezione critica si combinano con von Mises e si verificano con la retta di Goodman, applicando il fattore d\'intaglio alla parte alternata.',
   eqs=[r'M_t = \dfrac{P}{\omega} \qquad \sigma_f = \dfrac{32\,M_f}{\pi d^3} \qquad \tau_t = \dfrac{16\,M_t}{\pi d^3}',
        r'K_e = 1 + q\,(K_t - 1) \qquad \dfrac{1}{X} = \dfrac{\sigma_{a,eq}}{b_1\, b_2\, \sigma_N} + \dfrac{\sigma_{m,eq}}{\sigma_R}'],
   excap='Tema d\'esame dell\'11 aprile 2003: albero con due ruote dentate su due cuscinetti.',
   exrows=[('Potenza e velocità','30 kW a 200 giri/min → M<sub>t</sub> = 1432 N·m'), ('Cuscinetti','A in x = 0, D in x = 240 mm; lunghezza 320 mm'),
           ('Acciaio','σ<sub>R</sub> = 1080 MPa, σ<sub>s</sub> = 800 MPa, σ<sub>LF</sub> = 520 MPa'), ('Spallamento e coefficiente richiesto','D/d = 1,17, r = 2 mm, X ≥ 1,75'),
           ('Reazioni dei cuscinetti','R<sub>A</sub> = 6,71 kN, R<sub>D</sub> = 40,11 kN'), ('Sezione critica','cuscinetto D: M<sub>f</sub> = 1887 N·m, M<sub>t</sub> = 1432 N·m'),
           ('Diametro minimo','63,3 mm (governa la fatica)'), ('!Diametro scelto','d = 65 mm, D = 77 mm'), ('!Coefficienti di sicurezza','fatica X = 1,87, snervamento X = 4,64')],
   exnote='Il calcolatore riproduce 283 controlli presi da 13 temi d\'esame svolti a mano come questo.',
   lim='Dimensionamento di massima: non calcola deformata, velocità critica né le verifiche della DIN 743. Per il progetto esecutivo servono la DIN 743 (o la FKM) e i dati del produttore dei cuscinetti.',
   faq=[('Che metodo usa?','Il metodo classico della Costruzione di Macchine: modello a trave, sezione critica, retta di Goodman con i coefficienti d\'intaglio, dimensionale e di finitura letti dai diagrammi. È il metodo dei corsi universitari, non la DIN 743.'),
        ('Posso portare l\'albero nel CAD?','Sì. Propone un profilo a gradini con spallamenti, linguette e sedi dei cuscinetti, modificabile, e lo esporta in DXF con il cartiglio.'),
        ('Posso verificare un albero esistente invece di dimensionarlo?','Sì: il passo 3 verifica un diametro dato e restituisce i coefficienti di sicurezza a fatica e a snervamento, anche su più sezioni insieme.'),
        ('È gratuito?','Sì, gratuito e senza registrazione. Tutto gira nel tuo browser.')])),
 # ------------------------------------------------------------ bolts
 dict(key='bolts', mod='bolts', demo='boltsExam',
  en=dict(path='bolted-joint-calculator/', title='Bolted joint calculator: number of bolts, preload and tightening torque',
   short='Bolted joint calculator', card='Bolts, preload, tightening torque',
   desc='Free bolted joint calculator: number of bolts for a friction joint or flange coupling, preload, tightening torque with thread and under-head friction, external axial load, joint separation and power screws, with PDF report.',
   h1='Bolted joint calculator', lead='How many bolts, which size, how much preload and which tightening torque: friction joints and flange couplings, external axial loads with the joint diagram, and power screws, with the calculation report.',
   what=['Friction joints and flange couplings: shear force or torque on a bolt circle → required preload, number of bolts, size and strength class (4.6 to 12.9).',
         'Tightening torque with thread friction and under-head friction, and the von Mises check of the bolt during tightening.',
         'External axial load: bolt and member stiffness, load increase in the bolt, joint separation, optimal preload, tightening diagram.',
         'Check from a given tightening torque: the load the joint can transmit.',
         'Power screws (square, trapezoidal, ISO thread): torque, efficiency, self-locking.'],
   how='The friction joint transmits the load through the friction between the plates: the preload comes from the required safety factor, the bolt size from the allowable stress on the resisting area, and the tightening torque from the thread geometry with the friction under the head.',
   eqs=[r'T = \dfrac{F}{m_b\, m_{int}} \qquad N = \dfrac{T\,X}{f} \qquad \dfrac{N}{A_{res}} = \dfrac{\sigma_s}{X}',
        r'M_s = N\,\dfrac{d_m}{2}\,\dfrac{\cos\beta\sin\alpha + f\cos\alpha}{\cos\beta\cos\alpha - f\sin\alpha} + \dfrac{N}{2}\,D_m\,f'],
   excap='Exam problem of 2 February 2021: flange coupling transmitting a torque by friction.',
   exrows=[('Torque','M<sub>t</sub> = 32 kN·m on a bolt circle of 210 mm'), ('Friction','f = 0.14 between the flanges and in the thread, 1 friction surface'),
           ('Safety factor and class','X = 1.5, class 12.9'), ('Bolt size','M30 (A<sub>res</sub> = 452 mm²); at most 14 fit on the circle'),
           ('!Number of bolts','10 × M30 12.9'), ('!Preload per bolt','326.5 kN'), ('!Tightening torque','1769 N·m per bolt'),
           ('Bolt safety factor','1.50: 10.02 bolts are needed, rounded down to 10 because the factor drops by less than 0.5 %, as in the hand solution')],
   exnote='The calculator reproduces 30 checks from hand-solved exercises: flanges, a pressure vessel cover, a vise screw.',
   lim='Preliminary sizing: bolt fatigue and thermal effects are not included. For the final design use VDI 2230 and the friction values of your bolts.',
   faq=[('Which friction coefficient should I use?','Use the values of your parts if you have them. As an order of magnitude, lightly oiled steel threads are often around 0.10–0.16 and untreated dry steel plates around 0.2; the exam example uses 0.14.'),
        ('Does it handle an external axial load?','Yes: it computes the bolt and member stiffness, how much of the load goes into the bolt, whether the joint opens, and the optimal preload, with the tightening diagram.'),
        ('Can I start from the torque on a flange coupling?','Yes: enter the torque and the bolt circle diameter, it converts them into the force on the bolts and checks how many bolts fit on the circle.'),
        ('Is it free?','Yes, free and without sign-up. Everything runs in your browser.')]),
  it=dict(path='it/calcolo-bulloni/', title='Dimensionamento e verifica bulloni online: numero di viti, precarico e coppia di serraggio',
   short='Dimensionamento e verifica bulloni', card='Viti, precarico, coppia di serraggio',
   desc='Dimensionamento e verifica dei bulloni online, gratis: numero di viti per giunzioni ad attrito e giunti a flange, precarico, coppia di serraggio, resistenza della vite sull\'area resistente, carico esterno assiale e viti di manovra, con relazione di calcolo in PDF.',
   h1='Dimensionamento e verifica dei bulloni', lead='Quante viti, di che misura, con quale precarico e quale coppia di serraggio: giunzioni ad attrito e giunti a flange, carico esterno assiale con il diagramma di serraggio e viti di manovra, con la relazione di calcolo.',
   what=['Giunzioni ad attrito e giunti a flange: forza di taglio o momento su una corona → precarico richiesto, numero di viti, misura e classe di resistenza (da 4.6 a 12.9).',
         'Coppia di serraggio con attrito nel filetto e sotto la testa, e verifica di von Mises della vite durante il serraggio.',
         'Carico esterno assiale: rigidezze di vite e piastre, incremento di carico nella vite, apertura del giunto, precarico ottimale, diagramma di serraggio.',
         'Verifica da coppia di serraggio data: il carico che il giunto può trasmettere.',
         'Viti di manovra (filetto rettangolare, trapezoidale, ISO): coppia, rendimento, autobloccaggio.'],
   how='La giunzione ad attrito trasmette il carico con l\'attrito tra le piastre: il precarico viene dal coefficiente di sicurezza richiesto, la misura della vite dalla tensione ammissibile sull\'area resistente, la coppia di serraggio dalla geometria del filetto con l\'attrito sotto la testa.',
   eqs=[r'T = \dfrac{F}{m_{viti}\, m_{int}} \qquad N = \dfrac{T\,X}{f} \qquad \dfrac{N}{A_{res}} = \dfrac{\sigma_s}{X}',
        r'M_s = N\,\dfrac{d_m}{2}\,\dfrac{\cos\beta\sin\alpha + f\cos\alpha}{\cos\beta\cos\alpha - f\sin\alpha} + \dfrac{N}{2}\,D_m\,f'],
   excap='Tema d\'esame del 2 febbraio 2021: giunto a flange che trasmette un momento per attrito.',
   exrows=[('Momento','M<sub>t</sub> = 32 kN·m su una corona di 210 mm'), ('Attrito','f = 0,14 tra le flange e nel filetto, 1 superficie d\'attrito'),
           ('Coefficiente di sicurezza e classe','X = 1,5, classe 12.9'), ('Misura della vite','M30 (A<sub>res</sub> = 452 mm²); sulla corona ne stanno al massimo 14'),
           ('!Numero di viti','10 × M30 12.9'), ('!Precarico per vite','326,5 kN'), ('!Coppia di serraggio','1769 N·m per vite'),
           ('Coefficiente della vite','1,50: servirebbero 10,02 viti, arrotondate per difetto a 10 perché il coefficiente cala meno dello 0,5 %, come nella soluzione a mano')],
   exnote='Il calcolatore riproduce 30 controlli presi da esercizi svolti a mano: flange, coperchio di un serbatoio, vite di una morsa.',
   lim='Dimensionamento di massima: fatica della vite ed effetti termici non sono inclusi. Per il progetto esecutivo servono la VDI 2230 e i coefficienti d\'attrito delle tue viti.',
   faq=[('Che coefficiente d\'attrito uso?','Se hai i valori dei tuoi componenti, usa quelli. Come ordine di grandezza, i filetti in acciaio leggermente oliati stanno spesso intorno a 0,10–0,16 e le piastre d\'acciaio a secco non trattate intorno a 0,2; l\'esempio d\'esame usa 0,14.'),
        ('Gestisce un carico esterno assiale?','Sì: calcola le rigidezze di vite e piastre, quanta parte del carico va nella vite, se il giunto si apre e il precarico ottimale, con il diagramma di serraggio.'),
        ('Posso partire dal momento su un giunto a flange?','Sì: inserisci il momento e il diametro della corona, lo trasforma nella forza sulle viti e controlla quante viti ci stanno sulla corona.'),
        ('Posso solo verificare un collegamento esistente?','Sì: nella scheda «Verifica da coppia di serraggio» inserisci viti, classe e coppia applicata, e ottieni il precarico, il carico che il giunto trasmette e il coefficiente di sicurezza della vite.'),
        ('Verifica la resistenza della filettatura?','Verifica la vite sull\'area resistente A_res = π(0,8d)²/4, a trazione e con von Mises durante il serraggio, come nel metodo del corso. Lo strappamento dei filetti (taglio dei filetti di vite e madrevite) non è calcolato: dipende dall\'altezza della madrevite o dalla lunghezza d\'avvitamento, e con dadi unificati della stessa classe non è di solito il limite.'),
        ('È gratuito?','Sì, gratuito e senza registrazione. Tutto gira nel tuo browser.')])),
 # ------------------------------------------------------------ frames
 dict(key='frames', mod='frames', demo='frames',
  en=dict(path='frame-truss-calculator/', title='2D frame and truss calculator (FEM) with section sizing',
   short='2D frame and truss calculator', card='FEM, N/V/M diagrams, sections',
   desc='Free online 2D frame and truss calculator: draw beams and bars, add supports and loads, get reactions, N, V, M diagrams and deflection with the finite element method, then the lightest section in six families with Euler buckling.',
   h1='2D frame and truss calculator', lead='Draw beams and bars on a grid, add supports and loads with a click, and get reactions, axial force, shear and bending moment diagrams and the deflected shape. Then Torsio picks the lightest section in six families, checking strength, Euler buckling and deflection.',
   what=['Plane frames, continuous beams, portals and trusses with the direct stiffness method (Euler–Bernoulli beam elements).',
         'Beams and bars: a bar is hinged at both ends and carries axial force only; internal hinges anywhere.',
         'Supports (pin, rollers, fixed, guide), nodal forces and moments, distributed loads.',
         'Reactions, N, V, M diagrams, deflected shape, utilisation of every member.',
         'Section sizing in six families (solid round, tube, rectangle, box, IPE, HEA): fully stressed design with strength, Euler buckling and a deflection limit.'],
   how='Each member is a beam element with axial and bending stiffness; the global system K·u = F is solved for the node displacements, then the end forces give the internal actions. Members are checked point by point and compressed members against Euler buckling.',
   eqs=[r'\mathbf{K}\,\mathbf{u} = \mathbf{F} \qquad \sigma = \dfrac{|N|}{A} + \dfrac{|M|}{W} \le \dfrac{\sigma_s}{X}',
        r'\sigma_{cr} = \dfrac{\pi^2 E\, I_{min}}{(\beta L)^2 A} \qquad \dfrac{\sigma_{cr}}{|\sigma_N|} \ge X_b'],
   excap='Example: a 20 m radio tower, 20 aluminium bars, four horizontal loads of 60 kN.',
   exrows=[('Geometry','10 nodes, 20 bars hinged at both ends, pinned at the base, 20 m tall'), ('Loads','60 kN horizontal at four levels'),
           ('Safety factors','strength X = 1.5, buckling X<sub>b</sub> = 2'),
           ('Solid round','1990 kg'), ('Rectangle','2849 kg'), ('Box section','565 kg'), ('HEA','1036 kg'), ('IPE','not possible: Euler buckling'),
           ('!Lightest','round tube: 525 kg, utilisation 98 %')],
   exnote='A continuous-area optimisation without buckling would reach 285 kg, but with buckling the bars need about 1471 kg as solid rounds: buckling decides the design. The FEM is checked on 26 cases.',
   lim='Plane frames only, small displacements. Shear is not checked, self-weight is neglected and there are no Eurocode load combinations: for the final design use Eurocode 3 and a complete FEM.',
   faq=[('What is the difference between a beam and a bar?','A beam carries axial force, shear and bending and is rigidly connected at its ends. A bar is hinged at both ends and carries only axial force, as in a truss: put its loads on the nodes.'),
        ('Can I use my own section?','The sizing chooses from catalogue families; the material (steel, aluminium or your own E, σs, density) and the safety factors are yours.'),
        ('Can I get the forces on the supports for the bolts?','Yes: each support reaction can be passed, on request, to the bolted joint calculator.'),
        ('Is it free?','Yes, free and without sign-up. Everything runs in your browser.')]),
  it=dict(path='it/calcolo-telaio-traliccio/', title='Calcolo telai e tralicci online (FEM) con dimensionamento delle sezioni',
   short='Calcolo telai e tralicci (FEM)', card='FEM, diagrammi N/T/M, sezioni',
   desc='Calcolatore gratuito di telai e tralicci piani: disegni travi e aste, metti vincoli e carichi, ottieni reazioni, diagrammi N, T, M e deformata con gli elementi finiti, poi la sezione più leggera in sei famiglie con l\'instabilità di Eulero.',
   h1='Calcolo telai e tralicci (FEM)', lead='Disegni travi e aste sulla griglia, metti vincoli e carichi con un clic e ottieni reazioni, diagrammi di sforzo normale, taglio e momento e la deformata. Poi Torsio sceglie la sezione più leggera in sei famiglie, verificando resistenza, instabilità di Eulero e freccia.',
   what=['Telai piani, travi continue, portali e tralicci con il metodo degli spostamenti (elementi trave di Eulero-Bernoulli).',
         'Travi e aste: l\'asta è incernierata ai due estremi e porta solo sforzo normale; cerniere interne dove servono.',
         'Vincoli (cerniera, carrelli, incastro, pattino), forze e momenti nei nodi, carichi distribuiti.',
         'Reazioni, diagrammi N, T, M, deformata, utilizzo di ogni elemento.',
         'Dimensionamento in sei famiglie di sezioni (tondo pieno, tubo, rettangolare, scatolato, IPE, HEA): fully stressed design con resistenza, instabilità di Eulero e limite di freccia.'],
   how='Ogni elemento è una trave con rigidezza assiale e flessionale; si risolve il sistema K·u = F negli spostamenti dei nodi, poi le forze di estremità danno le sollecitazioni. Gli elementi si verificano punto per punto e quelli compressi anche all\'instabilità di Eulero.',
   eqs=[r'\mathbf{K}\,\mathbf{u} = \mathbf{F} \qquad \sigma = \dfrac{|N|}{A} + \dfrac{|M|}{W} \le \dfrac{\sigma_s}{X}',
        r'\sigma_{cr} = \dfrac{\pi^2 E\, I_{min}}{(\beta L)^2 A} \qquad \dfrac{\sigma_{cr}}{|\sigma_N|} \ge X_b'],
   excap='Esempio: torre radio di 20 m, 20 aste in alluminio, quattro carichi orizzontali da 60 kN.',
   exrows=[('Geometria','10 nodi, 20 aste incernierate ai due estremi, base con cerniere, altezza 20 m'), ('Carichi','60 kN orizzontali su quattro livelli'),
           ('Coefficienti di sicurezza','resistenza X = 1,5, instabilità X<sub>b</sub> = 2'),
           ('Tondo pieno','1990 kg'), ('Rettangolare','2849 kg'), ('Scatolato','565 kg'), ('HEA','1036 kg'), ('IPE','non basta: instabilità di Eulero'),
           ('!La più leggera','tubo tondo: 525 kg, utilizzo 98 %')],
   exnote='Un\'ottimizzazione ad aree continue senza instabilità arriverebbe a 285 kg, ma con l\'instabilità le aste a tondo pieno richiedono circa 1471 kg: decide l\'instabilità. Il FEM è controllato su 26 casi.',
   lim='Solo strutture piane, piccoli spostamenti. Il taglio non è verificato, il peso proprio è trascurato e non ci sono le combinazioni di carico dell\'Eurocodice: per il progetto esecutivo servono l\'Eurocodice 3 e un FEM completo.',
   faq=[('Che differenza c\'è tra trave e asta?','La trave porta sforzo normale, taglio e flessione ed è collegata rigidamente agli estremi. L\'asta è incernierata ai due estremi e porta solo sforzo normale, come nei tralicci: i suoi carichi vanno messi nei nodi.'),
        ('Posso usare una sezione mia?','Il dimensionamento sceglie dalle famiglie a catalogo; il materiale (acciaio, alluminio o E, σs e densità tuoi) e i coefficienti di sicurezza li decidi tu.'),
        ('Posso passare le reazioni ai bulloni?','Sì: ogni reazione vincolare si può passare, quando lo chiedi, al calcolatore dei collegamenti bullonati.'),
        ('È gratuito?','Sì, gratuito e senza registrazione. Tutto gira nel tuo browser.')])),
]

# ------------------------------------------------------------------ ISO 286 tables (fits pages), computed by the calculator's own core
ISO = json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'fits-data.js')], capture_output=True, text=True, check=True).stdout)

def num(v, lang, sign=True):
    t = (f'{v:+g}' if sign and v else f'{v:g}').replace('-', '−')
    return t.replace('.', ',') if lang == 'it' else t

KIND = {'en': {'clearance': 'clearance', 'transition': 'transition', 'interference': 'interference'},
        'it': {'clearance': 'gioco', 'transition': 'incerto', 'interference': 'interferenza'}}
KCLS = {'clearance': 'c', 'transition': 't', 'interference': 'i'}

def fits_at30(lang):
    hd = {'en': ('Fit', 'Max clearance', 'Min clearance', 'Type'), 'it': ('Accoppiamento', 'Gioco massimo', 'Gioco minimo', 'Tipo')}[lang]
    cap = {'en': 'Hole-basis fits on a 30 mm diameter, in µm (negative clearance = interference). Computed by Torsio.',
           'it': 'Accoppiamenti foro base su un diametro di 30 mm, in µm (gioco negativo = interferenza). Calcolati da Torsio.'}[lang]
    rows = ''.join(f'<tr{" class=\"r\"" if f == "H7/k6" else ""}><th>{f}</th><td>{num(gmax, lang)}</td><td>{num(gmin, lang)}</td>'
                   f'<td class="k {KCLS[k]}">{KIND[lang][k]}</td></tr>' for f, gmax, gmin, k in ISO['at30'])
    return (f'<p class="cap">{cap}</p><div class="scroll"><table class="iso"><thead><tr><th style="text-align:left">{hd[0]}</th>'
            f'<th>{hd[1]}</th><th>{hd[2]}</th><th style="text-align:left">{hd[3]}</th></tr></thead><tbody>{rows}</tbody></table></div>')

def fits_devs(lang):
    over, upto = ('over', 'up to') if lang == 'en' else ('oltre', 'fino a')
    cap = {'en': 'Upper / lower deviation in µm, ISO 286-2, for the most used tolerance classes. Holes in capitals, shafts in lower case.',
           'it': 'Scostamento superiore / inferiore in µm, ISO 286-2, per le classi di tolleranza più usate. Fori in maiuscolo, alberi in minuscolo.'}[lang]
    head = '<th style="text-align:left">' + ('Size [mm]' if lang == 'en' else 'Diametro [mm]') + '</th>' + ''.join(f'<th>{c}</th>' for c in ISO['classes'])
    body = ''
    for st, row in zip(ISO['steps'], ISO['dev']):
        lab = f'{upto} {st["max"]}' if st['min'] == 0 else f'{over} {st["min"]} {upto} {st["max"]}'
        cells = ''.join(f'<td>{"±" + num(hi, lang, False) if hi == -lo else num(hi, lang) + " / " + num(lo, lang)}</td>' for hi, lo in row)
        body += f'<tr><th>{lab}</th>{cells}</tr>'
    return f'<p class="cap">{cap}</p><div class="scroll"><table class="iso"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'

def fits_extra(lang):
    if lang == 'en':
        return ('<section><div class="wrap"><h2>ISO fit tables</h2><h3>Common fits at 30 mm</h3>' + fits_at30(lang) +
                '<h3>Deviations by diameter range</h3>' + fits_devs(lang) +
                '<p class="muted" style="margin-top:14px">For any other size, letter or grade (IT5–IT11, holes C–S, shafts c–s, up to 500 mm) open the calculator: it also gives the drawing callout and works backwards from the clearance you want.</p></div></section>')
    return ('<section><div class="wrap"><h2>Tabelle ISO degli accoppiamenti</h2><h3>Accoppiamenti più usati su 30 mm</h3>' + fits_at30(lang) +
            '<h3>Scostamenti per scaglione di diametro</h3>' + fits_devs(lang) +
            '<p class="muted" style="margin-top:14px">Per qualsiasi altro diametro, lettera o grado (IT5–IT11, fori C–S, alberi c–s, fino a 500 mm) apri il calcolatore: dà anche la quota da disegno e funziona al contrario, dal gioco che vuoi all\'accoppiamento.</p></div></section>')

PAGES += [
 # ------------------------------------------------------------ gears
 dict(key='gears', mod='gears', demo='helical50kw',
  en=dict(path='gear-calculator/', title='Spur and helical gear calculator: module and face width with Hertz and Lewis',
   short='Gear calculator', card='Module, face width, Hertz, Lewis',
   desc='Free spur and helical gear calculator: module, number of teeth and face width from the Hertz contact pressure, Lewis bending check, best tooth combinations for a ratio and centre distance, maximum power of an existing pair, with PDF calculation report.',
   h1='Spur and helical gear calculator', lead='From power, speed and ratio to the module, the number of teeth and the face width: Hertz contact pressure, Lewis bending check and the maximum power of an existing pair, for spur and helical gears, with the calculation report.',
   what=['Design of a gear pair from power and speed (or torque) and the ratio: standard module, teeth and face width at the Hertz limit.',
         'Automatic search of the best tooth combinations for a target ratio, with a tolerance, or for a given centre distance (the helix angle is adjusted to fit it).',
         'Lewis bending stress with the Lewis factor y from the course chart; for helical gears the factors Φ, Ψ and Γₜ.',
         'Maximum power an existing pair can transmit (Hertz and Lewis), from module, face width and teeth.',
         'Profile shift of the pinion, and the results passed on request to the shaft calculator.'],
   how='The face width comes from the Hertz contact pressure between the two pitch cylinders at the pitch point; the tooth root is then checked in bending with Lewis. For helical gears the course factors Φ (Hertz), Ψ (Lewis) and Γₜ (curvature) correct the spur formulas.',
   eqs=[r'W_H = \dfrac{\sigma_H^2\, L\, \omega_1 \sin 2\vartheta\; m_t^2 z_1^2}{8\, K_e\,(1+\tau)}\,\dfrac{\Gamma_t}{\Phi}',
        r'F_c = \dfrac{2 M_1}{d_{p1}} \qquad \sigma_L = \dfrac{F_c}{L\, m_n\, y}\,\dfrac{\Psi}{\Gamma_t}'],
   excap='Exam problem of 7 January 2019, second stage of a coaxial reducer: helical pair on a 182 mm centre distance.',
   exrows=[('Power and speed','50 kW at 369.75 rpm (1500 rpm after the 18/73 first stage) → M<sub>1</sub> = 1291 N·m'),
           ('Ratio and centre distance','τ ≈ 0.245, i = 182 mm'), ('Material','σ<sub>H,lim</sub> = 1160 MPa, K<sub>e</sub> = 35 GPa (steel on steel)'),
           ('!Teeth and module','z<sub>1</sub> = 19, z<sub>2</sub> = 78, m<sub>n</sub> = 3.5 mm, helix angle 21.1°'),
           ('Pitch diameters','d<sub>p1</sub> = 71.3 mm, d<sub>p2</sub> = 292.7 mm'),
           ('!Face width','L = 59.9 mm (φ = L/d<sub>p1</sub> = 0.84)'), ('Tangential force','F<sub>c</sub> = 36 223 N'),
           ('!Lewis stress','σ<sub>L</sub> = 311 MPa (y = 0.370, Ψ = 1.017)')],
   exnote='The hand solution finds the same pair (z 19/78, m<sub>n</sub> 3.5, about 21°) and L = 60.6 mm: the 1 % gap comes from reading Φ and Γₜ off the chart. The calculator reproduces 108 checks from 15 exam papers (2015–2024).',
   lim='Preliminary sizing with the course method: no dynamic, load distribution or lubrication factors, and the allowable Hertz pressure is entered already corrected for the required life. For the final design use ISO 6336.',
   faq=[('Can it check an existing gear pair?','Yes: the "Inverse Check (Max Power W_max)" mode takes module, face width and teeth and returns the power the pair can transmit at the Hertz and Lewis limits.'),
        ('Does it handle helical gears?','Yes: normal and transverse module, helix angle, and the factors Φ, Ψ and Γₜ from the course chart. With a given centre distance it also finds the helix angle that fits it.'),
        ('Which Lewis factor does it use?','The y of the course chart as a function of the number of teeth (and of the profile shift), digitised; the value used is written in the report.'),
        ('Is it the same as ISO 6336?','No. It is the textbook method (Hertz and Lewis) taught in machine design courses, good for preliminary sizing and for exams. ISO 6336 adds dynamic, load distribution and life factors.'),
        ('Is it free?','Yes, free and without sign-up. Everything runs in your browser.')]),
  it=dict(path='it/calcolo-ruote-dentate/', title='Calcolo ruote dentate online: modulo e fascia con Hertz e Lewis, denti diritti ed elicoidali',
   short='Calcolo ruote dentate', card='Modulo, fascia, Hertz, Lewis',
   desc='Calcolatore gratuito di ruote dentate a denti diritti ed elicoidali: modulo, numero di denti e larghezza di fascia dalla pressione di Hertz, verifica a flessione di Lewis, combinazioni di denti per un rapporto e un interasse, potenza massima di una coppia esistente, con relazione di calcolo in PDF.',
   h1='Calcolo ruote dentate', lead='Da potenza, giri e rapporto al modulo, ai denti e alla larghezza di fascia: pressione di contatto di Hertz, verifica a flessione di Lewis e potenza massima di una coppia esistente, a denti diritti ed elicoidali, con la relazione di calcolo.',
   what=['Progetto di una coppia di ruote da potenza e giri (o coppia) e rapporto: modulo unificato, denti e larghezza di fascia al limite di Hertz.',
         'Ricerca automatica delle combinazioni di denti migliori per un rapporto voluto, con tolleranza, o per un interasse dato (l\'angolo d\'elica si adatta all\'interasse).',
         'Tensione di Lewis al piede del dente con il fattore y del diagramma del corso; per le elicoidali i fattori Φ, Ψ e Γₜ.',
         'Potenza massima trasmissibile da una coppia esistente (Hertz e Lewis), da modulo, fascia e denti.',
         'Spostamento di profilo del pignone, e risultati da passare, quando lo chiedi tu, al calcolatore degli alberi.'],
   how='La larghezza di fascia viene dalla pressione di contatto di Hertz tra i due cilindri primitivi nel punto di contatto; poi il piede del dente si verifica a flessione con Lewis. Per le ruote elicoidali i fattori del corso Φ (Hertz), Ψ (Lewis) e Γₜ (curvatura) correggono le formule dei denti diritti.',
   eqs=[r'W_H = \dfrac{\sigma_H^2\, L\, \omega_1 \sin 2\vartheta\; m_t^2 z_1^2}{8\, K_e\,(1+\tau)}\,\dfrac{\Gamma_t}{\Phi}',
        r'F_c = \dfrac{2 M_1}{d_{p1}} \qquad \sigma_L = \dfrac{F_c}{L\, m_n\, y}\,\dfrac{\Psi}{\Gamma_t}'],
   excap='Tema d\'esame del 7 gennaio 2019, secondo stadio di un riduttore coassiale: coppia elicoidale su un interasse di 182 mm.',
   exrows=[('Potenza e velocità','50 kW a 369,75 giri/min (1500 giri/min dopo il primo stadio 18/73) → M<sub>1</sub> = 1291 N·m'),
           ('Rapporto e interasse','τ ≈ 0,245, i = 182 mm'), ('Materiale','σ<sub>H,lim</sub> = 1160 MPa, K<sub>e</sub> = 35 GPa (acciaio su acciaio)'),
           ('!Denti e modulo','z<sub>1</sub> = 19, z<sub>2</sub> = 78, m<sub>n</sub> = 3,5 mm, angolo d\'elica 21,1°'),
           ('Diametri primitivi','d<sub>p1</sub> = 71,3 mm, d<sub>p2</sub> = 292,7 mm'),
           ('!Larghezza di fascia','L = 59,9 mm (φ = L/d<sub>p1</sub> = 0,84)'), ('Forza tangenziale','F<sub>c</sub> = 36 223 N'),
           ('!Tensione di Lewis','σ<sub>L</sub> = 311 MPa (y = 0,370, Ψ = 1,017)')],
   exnote='La soluzione a mano trova la stessa coppia (z 19/78, m<sub>n</sub> 3,5, circa 21°) e L = 60,6 mm: l\'1 % di differenza viene dalla lettura di Φ e Γₜ sul diagramma. Il calcolatore riproduce 108 controlli presi da 15 temi d\'esame (2015–2024).',
   lim='Dimensionamento di massima con il metodo del corso: niente fattori dinamici, di distribuzione del carico o di lubrificazione, e la pressione di Hertz ammissibile va inserita già corretta per la durata richiesta. Per il progetto esecutivo serve la ISO 6336.',
   faq=[('Posso verificare una coppia di ruote esistente?','Sì: la modalità «Verifica potenza max» prende modulo, fascia e denti e restituisce la potenza trasmissibile al limite di Hertz e di Lewis.'),
        ('Gestisce le ruote elicoidali?','Sì: modulo normale e trasversale, angolo d\'elica, fattori Φ, Ψ e Γₜ dal diagramma del corso. Con un interasse dato trova anche l\'angolo d\'elica che lo rispetta.'),
        ('Che fattore di Lewis usa?','L\'y del diagramma del corso in funzione del numero di denti (e dello spostamento di profilo), digitalizzato; il valore usato è scritto nella relazione.'),
        ('È la stessa cosa della ISO 6336?','No. È il metodo dei libri di testo (Hertz e Lewis) dei corsi di Costruzione di Macchine, adatto al dimensionamento di massima e agli esami. La ISO 6336 aggiunge i fattori dinamici, di distribuzione del carico e di durata.'),
        ('È gratuito?','Sì, gratuito e senza registrazione. Tutto gira nel tuo browser.')])),
 # ------------------------------------------------------------ fits
 dict(key='fits', mod='fits', demo='bearingFit', extra=fits_extra, exlabel={'en': 'Open the example', 'it': "Apri l'esempio"},
  en=dict(path='iso-fits-calculator/', title='ISO 286 fits and tolerances calculator: H7/g6, H7/k6, H7/p6 clearance and interference',
   short='ISO fits calculator', card='Tolerances, clearance, interference',
   desc='Free ISO 286 fits calculator: hole and shaft deviations, maximum and minimum clearance or interference for H7/g6, H7/h6, H7/k6, H7/p6 and any combination from IT5 to IT11 up to 500 mm, with tables, drawing callout and PDF report.',
   h1='ISO fits and tolerances calculator', lead='Pick a diameter and a fit (H7/g6, H7/k6, H7/p6 or any ISO combination) and get the hole and shaft deviations, the limits of size, the maximum and minimum clearance and whether it is a clearance, transition or interference fit. Or start from the clearance you want and find the fit.',
   what=['Hole and shaft deviations (ES, EI, es, ei) and limits of size, ISO 286-1 and 286-2.',
         'Maximum and minimum clearance, or interference, and the type of fit: clearance, transition, interference.',
         '13 recommended hole-basis fits and 8 shaft-basis fits, or any combination: holes C–S, shafts c–s, grades IT5–IT11, sizes up to 500 mm.',
         'Reverse search: from the clearance you want to the fits that give it, hole basis or shaft basis.',
         'Suggested machining and roughness Ra, the drawing callout, and a comparison table of the fits of the same system.'],
   how='The hole and the shaft each have a tolerance zone: its width is the standard tolerance IT of the grade, its position is the fundamental deviation of the letter for the diameter range. The clearance is the hole size minus the shaft size: its maximum and minimum follow from the deviations.',
   eqs=[r'g_{max} = ES - ei \qquad g_{min} = EI - es',
        r'\text{H: } EI = 0 \qquad \text{K–S (holes): } ES = -ei + \Delta, \quad \Delta = IT_n - IT_{n-1}'],
   excap='Example: a hub on a 30 mm shaft with an H7/k6 fit (light press fit, with a key).',
   exrows=[('Diameter range','over 18 up to 30 mm'), ('Hole H7','+21 / 0 µm → 30.000 … 30.021 mm'), ('Shaft k6','+15 / +2 µm → 30.002 … 30.015 mm'),
           ('!Maximum clearance','+19 µm (largest hole, smallest shaft)'), ('!Maximum interference','15 µm (smallest hole, largest shaft)'),
           ('!Type of fit','transition: it can come out loose or tight')],
   exnote='The ISO 286 tables in the calculator are checked by 904 tests: about 50 published deviations, the Δ rule on every range and the growth of IT with grade.',
   lim='Letters a, b, j and t…zc and the isolated exceptions of the standard are not handled. The pressure and the transmissible torque of an interference fit (Lamé) are calculated in the shrink fit station D-07, where the fit can be passed with one click.',
   faq=[('How do I read H7/g6?','The capital letter and number are the hole, the lower case ones the shaft. The letter sets the position of the tolerance zone (H: lower deviation zero, g: a little below the nominal size), the number is the IT grade, i.e. the width of the zone.'),
        ('Hole basis or shaft basis?','Hole basis (H…) is the usual choice because holes are made with fixed-size tools (reamers, gauges); shaft basis (…h) is used when one drawn shaft carries several parts with different fits.'),
        ('Which fit for a bearing, a gear hub, a sliding pin?','As a first orientation: sliding pins and guides H7/g6 or H7/h6, hubs with a key H7/k6, press fits H7/p6 to H7/s6. For rolling bearings follow the bearing manufacturer\'s tables, because the bearing bore has its own tolerance.'),
        ('Can it calculate the force or pressure of a press fit?','Not in this station: the interference fit can be passed to the shrink fit station D-07, which gives the contact pressure, the transmissible torque and the stresses.'),
        ('Is it free?','Yes, free and without sign-up. Everything runs in your browser.')]),
  it=dict(path='it/tolleranze-accoppiamenti-iso/', title='Tolleranze e accoppiamenti ISO 286 online: H7/g6, H7/k6, H7/p6, giochi e interferenze',
   short='Tolleranze e accoppiamenti ISO', card='Scostamenti, giochi, interferenze',
   desc='Calcolatore gratuito di tolleranze e accoppiamenti ISO 286: scostamenti di foro e albero, gioco massimo e minimo o interferenza per H7/g6, H7/h6, H7/k6, H7/p6 e qualsiasi combinazione da IT5 a IT11 fino a 500 mm, con tabelle, quota da disegno e relazione in PDF.',
   h1='Tolleranze e accoppiamenti ISO', lead='Scegli un diametro e un accoppiamento (H7/g6, H7/k6, H7/p6 o qualsiasi combinazione ISO) e ottieni gli scostamenti di foro e albero, le dimensioni limite, il gioco massimo e minimo e se l\'accoppiamento è con gioco, incerto o con interferenza. Oppure parti dal gioco che vuoi e trova l\'accoppiamento.',
   what=['Scostamenti di foro e albero (ES, EI, es, ei) e dimensioni limite, ISO 286-1 e 286-2.',
         'Gioco massimo e minimo, o interferenza, e il tipo di accoppiamento: con gioco, incerto, con interferenza.',
         '13 accoppiamenti raccomandati foro base e 8 albero base, oppure qualsiasi combinazione: fori C–S, alberi c–s, gradi IT5–IT11, diametri fino a 500 mm.',
         'Ricerca inversa: dal gioco voluto agli accoppiamenti che lo danno, foro base o albero base.',
         'Lavorazione e rugosità Ra indicative, quota da disegno e tabella comparativa degli accoppiamenti dello stesso sistema.'],
   how='Foro e albero hanno ciascuno una zona di tolleranza: la sua ampiezza è la tolleranza fondamentale IT del grado, la sua posizione è lo scostamento fondamentale della lettera per lo scaglione di diametro. Il gioco è la misura del foro meno quella dell\'albero: il massimo e il minimo vengono dagli scostamenti.',
   eqs=[r'g_{max} = ES - ei \qquad g_{min} = EI - es',
        r'\text{H: } EI = 0 \qquad \text{K–S (fori): } ES = -ei + \Delta, \quad \Delta = IT_n - IT_{n-1}'],
   excap='Esempio: mozzo su un albero da 30 mm con accoppiamento H7/k6 (leggermente forzato, con linguetta).',
   exrows=[('Scaglione','oltre 18 fino a 30 mm'), ('Foro H7','+21 / 0 µm → 30,000 … 30,021 mm'), ('Albero k6','+15 / +2 µm → 30,002 … 30,015 mm'),
           ('!Gioco massimo','+19 µm (foro più grande, albero più piccolo)'), ('!Interferenza massima','15 µm (foro più piccolo, albero più grande)'),
           ('!Tipo di accoppiamento','incerto: può venire con gioco o con interferenza')],
   exnote='Le tabelle ISO 286 del calcolatore sono controllate da 904 test: una cinquantina di scostamenti pubblicati, la regola del Δ su ogni scaglione e la crescita di IT con il grado.',
   lim='Le lettere a, b, j e t…zc e le eccezioni puntuali della norma non sono gestite. La pressione e la coppia trasmissibile di un accoppiamento forzato (Lamé) si calcolano nella stazione D-07 dei calettamenti, dove l\'accoppiamento si passa con un clic.',
   faq=[('Come si legge H7/g6?','Lettera maiuscola e numero sono il foro, quelli minuscoli l\'albero. La lettera fissa la posizione della zona di tolleranza (H: scostamento inferiore nullo, g: poco sotto la quota nominale), il numero è il grado IT, cioè l\'ampiezza della zona.'),
        ('Foro base o albero base?','Il foro base (H…) è la scelta abituale perché i fori si fanno con utensili e calibri a misura fissa (alesatori, tamponi); l\'albero base (…h) si usa quando un albero trafilato porta più pezzi con accoppiamenti diversi.'),
        ('Che accoppiamento per un perno scorrevole, un mozzo, un forzamento?','Come primo orientamento: perni e guide scorrevoli H7/g6 o H7/h6, mozzi con linguetta H7/k6, forzamenti da H7/p6 a H7/s6. Per i cuscinetti volventi segui le tabelle del produttore, perché il foro del cuscinetto ha una tolleranza sua.'),
        ('Calcola la forza o la pressione di un forzamento?','Non in questa stazione: l\'accoppiamento con interferenza si passa alla stazione D-07 dei calettamenti, che dà la pressione di contatto, la coppia trasmissibile e le tensioni.'),
        ('È gratuito?','Sì, gratuito e senza registrazione. Tutto gira nel tuo browser.')])),
]

def page(P, lang):
    d, t, other = P[lang], L[lang], P['it' if lang == 'en' else 'en']
    url, alt = SITE + '/' + d['path'], SITE + '/' + other['path']
    url_en = SITE + '/' + P['en']['path']
    app = f'/app.html?m={P["mod"]}&lang={lang}'
    demo = f'/app.html?demo={P["demo"]}&lang={lang}'
    if P.get('exlabel'): t = dict(t, example=P['exlabel'][lang])
    ld = [{'@context': 'https://schema.org', '@type': 'WebApplication', 'name': d['short'] + ' — Torsio Engineering', 'url': url,
           'applicationCategory': 'EngineeringApplication', 'operatingSystem': 'Any (web browser)', 'inLanguage': lang, 'description': d['desc'],
           'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'}, 'author': {'@type': 'Person', 'name': 'Luigi Frassi'}},
          {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in d['faq']]}]
    others = ''.join(f'<a href="/{Q[lang]["path"]}">{Q[lang]["short"]}<span>{Q[lang]["card"]}</span></a>' for Q in PAGES if Q is not P)
    others += f'<a href="{"/metodo.html" if lang == "en" else "/it/metodo.html"}">{t["method"]}<span>{"544 hand-worked test cases" if lang == "en" else "544 casi di prova svolti a mano"}</span></a>'
    h = f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{d['title']} — Torsio</title>
  <meta name="description" content="{d['desc']}">
  <link rel="canonical" href="{url}">
  <link rel="alternate" hreflang="{lang}" href="{url}">
  <link rel="alternate" hreflang="{'it' if lang == 'en' else 'en'}" href="{alt}">
  <link rel="alternate" hreflang="x-default" href="{url_en}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Torsio Engineering">
  <meta property="og:title" content="{d['title']}">
  <meta property="og:description" content="{d['desc']}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}/vendor/brand/og-image.png">
  <meta property="og:locale" content="{'en_US' if lang == 'en' else 'it_IT'}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/vendor/brand/torsio-mark.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#f1efea">
  <link rel="stylesheet" href="/vendor/fonts/fonts.css">
  <link rel="stylesheet" href="/vendor/katex/katex.min.css">
{STYLE}  </style>
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body class="guide">
  <div class="wrap">
    <div class="top">
      <a class="brand" href="{"/" if lang == "en" else "/it/"}"><img src="/vendor/brand/torsio-mark.svg" alt=""><b><span class="wm-sr">Torsio</span><span aria-hidden="true">T{GEAR}rsio</span></b><span>Engineering</span></a>
      <nav class="nav" aria-label="{'Navigation' if lang == 'en' else 'Navigazione'}">
        <span class="links"><a href="{"/" if lang == "en" else "/it/"}">{t['home']}</a><a href="{"/metodo.html" if lang == "en" else "/it/metodo.html"}">{t['method']}</a><a href="/{other['path']}" hreflang="{'it' if lang == 'en' else 'en'}">{t['langname']}</a></span>
        <a class="btn go small" href="{app}">{t['open']}</a>
      </nav>
    </div>
    <header class="page-head">
      <h1>{d['h1']}</h1>
      <p class="lead">{d['lead']}</p>
      <div class="acts"><a class="btn go" href="{app}">{t['open']} →</a><a class="btn plain" href="{demo}">{t['example']}</a></div>
      <p class="muted" style="margin-top:16px;font-size:15px">{t['free']}</p>
    </header>
  </div>
  <section><div class="wrap"><h2>{t['what']}</h2>{ul(d['what'])}</div></section>
  <section><div class="wrap"><h2>{t['how']}</h2><p>{d['how']}</p>{''.join(eq(e) for e in d['eqs'])}</div></section>
  <section><div class="wrap"><h2>{t['ex']}</h2><div class="scroll">{table(d['excap'], d['exrows'])}</div><p class="muted" style="margin-top:14px">{d['exnote']}</p>
    <div class="acts"><a class="btn go" href="{demo}">{t['example']} →</a></div></div></section>
  {P['extra'](lang) if P.get('extra') else ''}
  <section><div class="wrap"><h2>{t['got']}</h2>{ul(GOT[lang])}</div></section>
  <section><div class="wrap"><h2>{t['lim']}</h2><p>{d['lim']}</p></div></section>
  <section><div class="wrap"><h2>{t['faq']}</h2><dl class="faq">{''.join(f'<dt>{q}</dt><dd>{a}</dd>' for q, a in d['faq'])}</dl></div></section>
  <section><div class="wrap"><h2>{t['more']}</h2><div class="others">{others}</div></div></section>
  <div class="wrap">
    <footer>
      <span>Torsio Engineering · {t['by']}</span>
      <span><a href="{"/metodo.html" if lang == "en" else "/it/metodo.html"}">{t['method']}</a> · <a href="{"/novita.html" if lang == "en" else "/it/novita.html"}">{t['news']}</a> · <a href="{"/privacy.html" if lang == "en" else "/it/privacy.html"}">{t['privacy']}</a> · <a href="{TALLY}?module=contact&lang={lang}" target="_blank" rel="noopener">{t['contact']}</a> · <a href="mailto:info@torsio.app">info@torsio.app</a> · <a href="https://github.com/Luigi-Frassi/torsio-engineering" target="_blank" rel="noopener">{t['src']}</a></span>
    </footer>
  </div>
  <script>
    (function () {{
      function draw() {{ document.querySelectorAll('[data-tex]').forEach(function (el) {{ try {{ window.katex.render(el.getAttribute('data-tex'), el, {{ displayMode: true, throwOnError: false }}); }} catch (e) {{ el.textContent = el.getAttribute('data-tex'); }} }}); }}
      var s = document.createElement('script'); s.src = '/vendor/katex/katex.min.js'; s.onload = draw; document.head.appendChild(s);
      try {{ localStorage.setItem('torsioLang', '{lang}'); }} catch (e) {{ /* private mode */ }}
    }})();
  </script>
  <script>window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};</script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
'''
    out = os.path.join(ROOT, d['path'], 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w').write(h)
    return d['path']

if __name__ == '__main__':
    made = [page(P, lang) for P in PAGES for lang in ('en', 'it')]
    print('\n'.join(made))

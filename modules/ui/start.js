// ============================================================================
// START SCREEN — the calculator opened without a module (app.html, app.html?lang=it)
// Shows the six stations with what each one does, the complete-drive demo and the exam examples, instead of
// dropping the visitor into the first module. Choosing anything (a card, the sidebar, a demo, a project) calls
// switchModule, which closes it. Links with a module, a demo or shared values open that module directly.
// ============================================================================

const START_TXT = {
  it: {
    title: 'Scegli una stazione', sub: 'Sei moduli indipendenti: ognuno calcola da solo e, se vuoi, passa i risultati al successivo. Ogni calcolo ha la sua relazione in PDF.',
    open: 'Apri', example: 'Esempio', txT: 'Trasmissione completa', txS: 'Cinghia → ruote dentate → albero: un esempio già impostato, con la relazione completa.', txB: 'Apri la demo',
    m: {
      fits: ['Tolleranze e accoppiamenti', 'Foro H7 e albero: giochi e interferenze ISO 286, ricerca per gioco desiderato.'],
      belts: ['Cinghie dentate', 'Pulegge, lunghezza della cinghia e interasse esatto; larghezza dalla potenza.'],
      gears: ['Ruote dentate', 'Modulo e larghezza di fascia da Hertz, verifica a flessione di Lewis.'],
      shafts: ['Alberi', 'Carichi, reazioni e momenti; diametro a fatica e snervamento; profilo per il CAD.'],
      frames: ['Strutture (FEM)', 'Telai e tralicci piani: sforzi, frecce, instabilità; sezione più leggera a catalogo.'],
      bolts: ['Collegamenti bullonati', 'Numero di viti, precarico e coppia di serraggio; carico esterno e vite di manovra.']
    }
  },
  en: {
    title: 'Choose a station', sub: 'Six independent modules: each one calculates on its own and, if you want, passes its results to the next. Every calculation has its PDF report.',
    open: 'Open', example: 'Example', txT: 'Complete drive', txS: 'Belt → gears → shaft: a ready-made example, with the complete report.', txB: 'Open the demo',
    m: {
      fits: ['Tolerances and fits', 'H7 hole and shaft: ISO 286 clearances and interferences, search by target clearance.'],
      belts: ['Timing belts', 'Pulleys, belt length and exact centre distance; width from the power.'],
      gears: ['Gears', 'Module and face width from Hertz, Lewis bending check.'],
      shafts: ['Shafts', 'Loads, reactions and moments; diameter for fatigue and yield; profile for CAD.'],
      frames: ['Structures (FEM)', 'Plane frames and trusses: forces, deflections, buckling; lightest catalogue section.'],
      bolts: ['Bolted joints', 'Number of bolts, preload and tightening torque; external load and power screw.']
    }
  }
};
const START_MODS = [['fits', 'F-01', 'bearingFit'], ['belts', 'B-02', null], ['gears', 'G-03', 'helical50kw'], ['shafts', 'S-04', 'shaftExam'], ['frames', 'T-05', 'frames'], ['bolts', 'J-06', 'boltsExam']];

let startOn = false;

function startT() { return START_TXT[typeof currentLang !== 'undefined' ? currentLang : 'en'] || START_TXT.en; }

function startRender() {
  const box = document.getElementById('startView');
  if (!box) return;
  const t = startT();
  box.innerHTML = `<div class="start-grid">` + START_MODS.map(([m, code, demo]) => `
      <div class="start-card"><button type="button" class="start-main" data-start="${m}">
        <span class="st-code">${code}</span><span class="start-name">${t.m[m][0]}</span><span class="start-desc">${t.m[m][1]}</span>
        <span class="start-go">${t.open} →</span></button>
        ${demo ? `<button type="button" class="start-ex" data-start-demo="${demo}">${t.example}</button>` : ''}</div>`).join('') + `</div>
    <div class="start-tx"><div><p class="start-name">${t.txT}</p><p class="start-desc">${t.txS}</p></div>
      <button type="button" class="start-tx-btn" data-start-demo="transmission">${t.txB} →</button></div>`;
  const h = document.getElementById('moduleTitle'), s = document.getElementById('moduleSubtitle');
  if (h) h.textContent = t.title;
  if (s) s.textContent = t.sub;
}

function startShow() {
  const main = document.querySelector('main'), header = main && main.querySelector('header');
  if (!header) return;
  let box = document.getElementById('startView');
  if (!box) {
    box = document.createElement('section');
    box.id = 'startView'; box.setAttribute('aria-label', 'Stations');
    header.insertAdjacentElement('afterend', box);
    box.addEventListener('click', ev => {
      const d = ev.target.closest('[data-start-demo]'), m = ev.target.closest('[data-start]');
      if (d && typeof loadDemoPreset === 'function') { loadDemoPreset(d.dataset.startDemo); if (startOn) startHide(); }
      else if (m && typeof switchModule === 'function') switchModule(m.dataset.start);
    });
  }
  startOn = true;
  document.body.classList.add('start-on');
  document.querySelectorAll('.station-on').forEach(b => b.classList.remove('station-on'));
  document.querySelectorAll('.m-station-on').forEach(b => b.classList.remove('m-station-on'));
  startRender();
}

function startHide() {
  startOn = false;
  document.body.classList.remove('start-on');
  document.getElementById('startView')?.remove();
}

(function startInstall() {
  const sw = window.switchModule;
  if (typeof sw === 'function') window.switchModule = function () { if (startOn) startHide(); return sw.apply(this, arguments); };
  const ul = window.updateLanguage;
  if (typeof ul === 'function') window.updateLanguage = function () { const r = ul.apply(this, arguments); if (startOn) startRender(); return r; };
  // only for a bare calculator link: any module, demo, project or shared value opens the module directly
  const q = new URLSearchParams(location.search);
  const bare = [...q.keys()].every(k => k === 'lang' || k.startsWith('utm_') || k === 'ref');
  let skip = false;
  try { skip = localStorage.getItem('torsioNoStart') === '1'; } catch (e) { /* private mode */ }
  if (bare && !skip) startShow();
})();

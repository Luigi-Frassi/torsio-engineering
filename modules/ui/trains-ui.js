// ============================================================================
// GEAR TRAINS — UI (tab 1: epicyclic train, tab 2: ordinary train). Core: core/trains-core.js
// Everything follows the Meccanica Applicata alle Macchine notes (§7.4–7.6) and what is derived from them.
// ============================================================================

const TR_TXT = {
  it: {
    tabs: { epi: '1 · Treno epicicloidale', ord: '2 · Rotismo ordinario' },
    intro: 'Sole (S), portatreno (SP) e corona (R) coassiali; i satelliti (P) ingranano fra sole e corona e girano con il portatreno. Due gradi di libertà: blocchi un albero, oppure imponi la velocità di due.',
    ex: 'Carica un esempio…', exs: { red: 'Riduttore: corona bloccata, 1500 giri/min, 10 kW', rev: 'Inversore: portatreno bloccato', over: 'Moltiplicatore: sole bloccato', diff: 'Due alberi imposti (differenziale)', gear2: 'Cambio a 2 marce: marcia lenta' },
    wheels: 'Ruote', zS: 'Denti del sole z_S', zR: 'Denti della corona z_R', zP: 'Denti dei satelliti z_P', m: 'Modulo m', N: 'Numero di satelliti', NHint: 'divide la forza sui denti fra i satelliti',
    zPbad: 'z_R − z_S deve essere pari e positivo: z_R = z_S + 2 z_P (R_R = 2R_P + R_S).',
    op: 'Funzionamento', mode: 'Modo', modes: { fixed: 'un albero bloccato', two: 'due velocità imposte' }, fixed: 'Albero bloccato', input: 'Albero motore (ingresso)', nIn: 'Velocità dell\'ingresso', load: 'Dato', loads: { P: 'potenza P', M: 'coppia M' }, P: 'Potenza', Min: 'Coppia sull\'ingresso',
    unknown: 'Velocità da trovare', nS: 'n sole', nSP: 'n portatreno', nR: 'n corona', knownM: 'Coppia nota su', Mk: 'Coppia nota',
    brake: 'Freno o frizione sull\'albero bloccato (facoltativo)', brOn: 'Calcola la pressione per tenere fermo l\'albero', f: 'Attrito f', A: 'Area di attrito A', RD: 'Raggio medio R_D',
    sh: { S: 'Sole', SP: 'Portatreno', R: 'Corona' }, role: { in: 'motore', out: 'utilizzatore', fix: 'bloccato (reazione)', free: '' },
    res: 'Risultato', tau: 'Rapporto di trasmissione', nOut: 'Velocità di uscita', Mout: 'Coppia di uscita', Mfix: 'Reazione sull\'albero bloccato', planet: 'Satellite', planetSub: 'rispetto al portatreno', T: 'Forza sui denti', perPlanet: 'per satellite', pBrake: 'Pressione sul freno', same: 'stesso verso', opp: 'verso opposto',
    shafts: 'Alberi', colSh: 'Albero', colN: 'n [giri/min]', colW: 'ω [rad/s]', colM: 'M [N·m]', colP: 'P [kW]', colRole: 'Ruolo', powerNote: 'Coppie applicate dall\'esterno; P > 0 entra nel treno, P < 0 esce. Senza perdite la somma è zero.',
    all: 'Tutti i rapporti (un albero bloccato)', colFix: 'Bloccato', colIO: 'Ingresso → uscita', colTau: 'τ', colUse: '', use: { red: 'riduce', mult: 'moltiplica', inv: 'inverte' },
    drawing: 'Schema (vista frontale)', steps: 'Passaggi del calcolo',
    ord: 'Coppie di ruote in serie', z1: 'z motrice', z2: 'z condotta', internal: 'interna', addSt: '+ Aggiungi una coppia', rm: 'Rimuovi', ordRes: 'Risultato', stage: 'Coppia',
    method: 'Metodo degli appunti di Meccanica Applicata alle Macchine (§7.4–7.6): rotolamento senza strisciamento ai contatti, R = m·z/2, equilibrio dei momenti e bilancio di potenza senza perdite; M_F = 2 f P A R_D per il freno.'
  },
  en: {
    tabs: { epi: '1 · Epicyclic train', ord: '2 · Ordinary train' },
    intro: 'Sun (S), carrier (SP) and ring (R) are coaxial; the planets (P) mesh between sun and ring and turn with the carrier. Two degrees of freedom: hold one shaft, or set the speed of two.',
    ex: 'Load an example…', exs: { red: 'Reducer: ring held, 1500 rpm, 10 kW', rev: 'Reverser: carrier held', over: 'Overdrive: sun held', diff: 'Two shafts driven (differential)', gear2: '2-speed gearbox: low gear' },
    wheels: 'Wheels', zS: 'Sun teeth z_S', zR: 'Ring teeth z_R', zP: 'Planet teeth z_P', m: 'Module m', N: 'Number of planets', NHint: 'shares the tooth force among the planets',
    zPbad: 'z_R − z_S must be even and positive: z_R = z_S + 2 z_P (R_R = 2R_P + R_S).',
    op: 'Operation', mode: 'Mode', modes: { fixed: 'one shaft held', two: 'two speeds given' }, fixed: 'Shaft held', input: 'Driving shaft (input)', nIn: 'Input speed', load: 'Given', loads: { P: 'power P', M: 'torque M' }, P: 'Power', Min: 'Input torque',
    unknown: 'Speed to find', nS: 'n sun', nSP: 'n carrier', nR: 'n ring', knownM: 'Known torque on', Mk: 'Known torque',
    brake: 'Brake or clutch on the held shaft (optional)', brOn: 'Find the pressure that holds the shaft', f: 'Friction f', A: 'Friction area A', RD: 'Mean radius R_D',
    sh: { S: 'Sun', SP: 'Carrier', R: 'Ring' }, role: { in: 'driver', out: 'driven', fix: 'held (reaction)', free: '' },
    res: 'Result', tau: 'Transmission ratio', nOut: 'Output speed', Mout: 'Output torque', Mfix: 'Reaction on the held shaft', planet: 'Planet', planetSub: 'relative to the carrier', T: 'Tooth force', perPlanet: 'per planet', pBrake: 'Brake pressure', same: 'same direction', opp: 'opposite direction',
    shafts: 'Shafts', colSh: 'Shaft', colN: 'n [rpm]', colW: 'ω [rad/s]', colM: 'M [N·m]', colP: 'P [kW]', colRole: 'Role', powerNote: 'Torques applied from outside; P > 0 enters the train, P < 0 leaves it. Without losses they add up to zero.',
    all: 'All ratios (one shaft held)', colFix: 'Held', colIO: 'Input → output', colTau: 'τ', colUse: '', use: { red: 'reduces', mult: 'steps up', inv: 'reverses' },
    drawing: 'Layout (front view)', steps: 'Calculation steps',
    ord: 'Gear pairs in series', z1: 'z driver', z2: 'z driven', internal: 'internal', addSt: '+ Add a pair', rm: 'Remove', ordRes: 'Result', stage: 'Pair',
    method: 'Method of the Applied Mechanics notes (§7.4–7.6): rolling without slip at the contacts, R = m·z/2, moment equilibrium and power balance without losses; M_F = 2 f P A R_D for the brake.'
  }
};
function trT() { return TR_TXT[currentLang] || TR_TXT.en; }
function trEl(id) { return document.getElementById(id); }
function trNum(x, n = 2) { if (!Number.isFinite(x)) return '—'; if (Math.abs(x) < 0.5 * Math.pow(10, -n)) x = 0; return x.toLocaleString(currentLang === 'it' ? 'it-IT' : 'en-GB', { minimumFractionDigits: n, maximumFractionDigits: n }); }

function trDefault() {
  return { tab: 'epi', zS: 20, zR: 80, m: 2, N: 4, mode: 'fixed', fixed: 'R', input: 'S', nIn: 1500, load: 'P', P: 10, Min: 50,
    unknown: 'SP', n: { S: 1000, SP: 0, R: -200 }, knownM: 'S', M: 20, brOn: false, f: 0.3, A: 3000, RD: 90,
    ord: { stages: [{ z1: 20, z2: 60, internal: false }, { z1: 15, z2: 45, internal: false }], nIn: 1450, load: 'P', P: 5, Min: 30 } };
}
const TR_PRESETS = {
  red: () => ({ ...trDefault() }),
  rev: () => ({ ...trDefault(), zS: 30, zR: 90, fixed: 'SP', input: 'S', nIn: 1000 }),
  over: () => ({ ...trDefault(), zS: 30, zR: 72, fixed: 'S', input: 'SP', nIn: 1000 }),
  diff: () => ({ ...trDefault(), mode: 'two', unknown: 'SP', n: { S: 1000, SP: 0, R: -200 }, knownM: 'S', M: 20 }),
  gear2: () => ({ ...trDefault(), zS: 24, zR: 72, fixed: 'R', input: 'S', nIn: 3000, load: 'P', P: 15, brOn: true, f: 0.3, A: 3000, RD: 90 })
};
let trModel = trDefault();
let lastTrainState = null;

function trEncode() { try { return btoa(unescape(encodeURIComponent(JSON.stringify(trModel)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch (e) { return ''; } }
function trDecode(s) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/'))))), M = trDefault(), num = (v, d) => (Number.isFinite(+v) ? +v : d);
    for (const k of ['zS', 'zR', 'm', 'N', 'nIn', 'P', 'Min', 'M', 'f', 'A', 'RD']) M[k] = num(o[k], M[k]);
    M.tab = o.tab === 'ord' ? 'ord' : 'epi'; M.mode = o.mode === 'two' ? 'two' : 'fixed';
    for (const k of ['fixed', 'input', 'unknown', 'knownM']) if (TR_SHAFTS.includes(o[k])) M[k] = o[k];
    M.load = o.load === 'M' ? 'M' : 'P'; M.brOn = !!o.brOn;
    if (o.n) for (const s of TR_SHAFTS) M.n[s] = num(o.n[s], 0);
    if (o.ord && Array.isArray(o.ord.stages)) M.ord = { stages: o.ord.stages.slice(0, 6).map(x => ({ z1: num(x.z1, 20), z2: num(x.z2, 40), internal: !!x.internal })), nIn: num(o.ord.nIn, 1450), load: o.ord.load === 'M' ? 'M' : 'P', P: num(o.ord.P, 5), Min: num(o.ord.Min, 30) };
    return M;
  } catch (e) { return null; }
}
function trLoad(M) { if (!M) return; trModel = M; trFill(); calculateTrains(); }

const TR_IN = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
const TR_LBL = 'block text-xs font-semibold text-slate-300 tracking-wide mb-1.5';
const TR_CARD = 'bg-slate-800/60 p-5 rounded-xl border border-slate-700/60 mb-4';
function trInput(id, unit, attrs = '') { return `<div class="relative"><input type="number" id="${id}" step="any" ${attrs} class="${TR_IN}">${unit ? `<span class="absolute right-3 top-2 text-slate-400 font-medium text-xs pointer-events-none">${unit}</span>` : ''}</div>`; }
function trField(id, lbl, inner, wrap = '') { return `<div ${wrap}><label class="${TR_LBL}" for="${id}" data-tr="${lbl}"></label>${inner}</div>`; }
const trSel = id => `<select id="${id}" class="${TR_IN}"></select>`;

function trBuild() {
  const sec = trEl('moduleTrainsSection');
  if (!sec || sec.dataset.built) return;
  sec.dataset.built = '1';
  sec.innerHTML = `
  <div class="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3" id="trTabs"></div>
  <div id="trEpi">
    <div class="${TR_CARD}"><div class="flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-slate-400 max-w-2xl" data-tr="intro"></p><select id="trPreset" class="${TR_IN} !w-auto max-w-full" aria-label="Example"></select></div></div>
    <div class="${TR_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-tr="wheels"></h3>
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4"><div class="grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
        ${trField('tr_zS', 'zS', trInput('tr_zS', '', 'min="3" step="1"'))}${trField('tr_zR', 'zR', trInput('tr_zR', '', 'min="3" step="1"'))}
        <div><label class="${TR_LBL}" data-tr="zP"></label><div class="text-lg font-bold text-white py-1.5" id="tr_zPv"></div></div>
        ${trField('tr_m', 'm', trInput('tr_m', 'mm', 'min="0"'))}${trField('tr_N', 'N', trInput('tr_N', '', 'min="1" step="1"'))}
        <p class="text-[11px] text-slate-500 col-span-2 md:col-span-3" id="trZmsg"></p>
      </div><div class="rounded-lg bg-slate-950/70 border border-slate-800 p-2 max-w-[300px] w-full self-start"><svg id="trSketch" viewBox="0 0 300 300" class="w-full h-auto" font-family="Archivo, Arial, sans-serif" role="img" aria-label="Epicyclic train"></svg></div></div>
    </div>
    <div class="${TR_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-tr="op"></h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${trField('tr_mode', 'mode', trSel('tr_mode'), 'class="col-span-2"')}
        ${trField('tr_fixed', 'fixed', trSel('tr_fixed'), 'class="trF"')}${trField('tr_input', 'input', trSel('tr_input'), 'class="trF"')}
        ${trField('tr_nIn', 'nIn', trInput('tr_nIn', 'rpm'), 'class="trF"')}${trField('tr_load', 'load', trSel('tr_load'), 'class="trF"')}
        ${trField('tr_P', 'P', trInput('tr_P', 'kW'), 'class="trF" id="trPCol"')}${trField('tr_Min', 'Min', trInput('tr_Min', 'N·m'), 'class="trF" id="trMCol"')}
        ${trField('tr_unknown', 'unknown', trSel('tr_unknown'), 'class="trT"')}
        ${trField('tr_nS', 'nS', trInput('tr_nS', 'rpm'), 'class="trT" id="trnSCol"')}${trField('tr_nSP', 'nSP', trInput('tr_nSP', 'rpm'), 'class="trT" id="trnSPCol"')}${trField('tr_nR', 'nR', trInput('tr_nR', 'rpm'), 'class="trT" id="trnRCol"')}
        ${trField('tr_knownM', 'knownM', trSel('tr_knownM'), 'class="trT"')}${trField('tr_M', 'Mk', trInput('tr_M', 'N·m'), 'class="trT"')}
      </div>
      <div class="mt-4 trF"><label class="flex items-center gap-2 text-xs text-slate-300 mb-2"><input type="checkbox" id="tr_brOn" class="w-4 h-4"> <span data-tr="brOn"></span></label>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="trBrBox">${trField('tr_f', 'f', trInput('tr_f', '', 'min="0"'))}${trField('tr_A', 'A', trInput('tr_A', 'mm²', 'min="0"'))}${trField('tr_RD', 'RD', trInput('tr_RD', 'mm', 'min="0"'))}</div></div>
    </div>
    <div class="${TR_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-tr="res"></h3><div id="trRes"></div></div>
    <div class="${TR_CARD} overflow-x-auto"><h3 class="text-sm font-semibold text-white mb-3" data-tr="shafts"></h3><div id="trShafts"></div></div>
    <div class="${TR_CARD} overflow-x-auto"><h3 class="text-sm font-semibold text-white mb-3" data-tr="all"></h3><div id="trAll"></div></div>
    <div class="${TR_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-tr="steps"></h3><div id="trSteps" class="ds-steps"></div></div>
  </div>
  <div id="trOrd" class="hidden">
    <div class="${TR_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-tr="ord"></h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">${trField('to_nIn', 'nIn', trInput('to_nIn', 'rpm'))}${trField('to_load', 'load', trSel('to_load'))}${trField('to_P', 'P', trInput('to_P', 'kW'), 'id="toPCol"')}${trField('to_Min', 'Min', trInput('to_Min', 'N·m'), 'id="toMCol"')}</div>
      <div class="overflow-x-auto"><table class="w-full text-xs text-left min-w-[420px]" id="toTable"></table></div>
      <button type="button" id="toAdd" class="mt-2 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white" data-tr="addSt"></button>
    </div>
    <div class="${TR_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-tr="ordRes"></h3><div id="toRes"></div></div>
    <div class="${TR_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-tr="steps"></h3><div id="toSteps" class="ds-steps"></div></div>
  </div>
  <p class="text-[11px] text-slate-500 -mt-1 mb-6" data-tr="method"></p>`;
  trEl('trTabs').addEventListener('click', ev => { const b = ev.target.closest('button[data-tab]'); if (b) setTrainTab(b.dataset.tab); });
  trEl('trPreset').addEventListener('change', ev => { const k = ev.target.value; ev.target.value = ''; if (TR_PRESETS[k]) { trLoad(TR_PRESETS[k]()); if (typeof syncShareUrl === 'function') syncShareUrl(); } });
  trEl('toAdd').addEventListener('click', () => { if (trModel.ord.stages.length < 6) { trModel.ord.stages.push({ z1: 20, z2: 40, internal: false }); trFill(); calculateTrains(); } });
  trEl('toTable').addEventListener('click', ev => { const b = ev.target.closest('button[data-rm]'); if (b && trModel.ord.stages.length > 1) { trModel.ord.stages.splice(+b.dataset.rm, 1); trFill(); calculateTrains(); } });
  sec.addEventListener('input', trOnInput); sec.addEventListener('change', trOnInput);
  trFill();
}

let trLang = null;
function trFill() {
  if (!trEl('trTabs')) return;
  const t = trT(), M = trModel;
  document.querySelectorAll('#moduleTrainsSection [data-tr]').forEach(el => { const v = t[el.dataset.tr]; if (typeof v === 'string') el.textContent = v; });
  const opts = (id, obj, cur) => { const s = trEl(id); if (s) s.innerHTML = Object.keys(obj).map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${obj[k]}</option>`).join(''); };
  trEl('trPreset').innerHTML = `<option value="">${t.ex}</option>` + Object.keys(TR_PRESETS).map(k => `<option value="${k}">${t.exs[k]}</option>`).join('');
  opts('tr_mode', t.modes, M.mode); opts('tr_fixed', t.sh, M.fixed); opts('tr_load', t.loads, M.load); opts('tr_unknown', t.sh, M.unknown); opts('tr_knownM', t.sh, M.knownM); opts('to_load', t.loads, M.ord.load);
  const ins = {}; TR_SHAFTS.filter(s => s !== M.fixed).forEach(s => { ins[s] = t.sh[s]; });
  if (M.input === M.fixed) M.input = Object.keys(ins)[0];
  opts('tr_input', ins, M.input);
  const set = (id, v) => { const e = trEl(id); if (!e) return; if (e.type === 'checkbox') e.checked = !!v; else e.value = v; };
  for (const k of ['zS', 'zR', 'm', 'N', 'nIn', 'P', 'Min', 'M', 'f', 'A', 'RD']) set('tr_' + k, M[k]);
  set('tr_brOn', M.brOn); for (const s of TR_SHAFTS) set('tr_n' + s, M.n[s]);
  set('to_nIn', M.ord.nIn); set('to_P', M.ord.P); set('to_Min', M.ord.Min);
  trEl('toTable').innerHTML = `<thead><tr class="text-slate-400"><th class="pb-1 pr-2">#</th><th class="pr-2">${t.z1}</th><th class="pr-2">${t.z2}</th><th class="pr-2">${t.internal}</th><th></th></tr></thead><tbody>` +
    M.ord.stages.map((s, k) => `<tr data-k="${k}" class="border-t border-slate-700/50"><td class="py-1.5 pr-2 font-mono text-slate-400">${k + 1}</td>
      <td class="pr-2"><input type="number" step="1" min="1" id="to_z1_${k}" value="${s.z1}" class="${TR_IN} !py-1.5 w-24"></td><td class="pr-2"><input type="number" step="1" min="1" id="to_z2_${k}" value="${s.z2}" class="${TR_IN} !py-1.5 w-24"></td>
      <td class="pr-2"><input type="checkbox" id="to_int_${k}" ${s.internal ? 'checked' : ''} class="w-4 h-4"></td><td>${M.ord.stages.length > 1 ? `<button type="button" data-rm="${k}" aria-label="${t.rm}" class="px-2 py-1 text-slate-400 hover:text-rose-400">✕</button>` : ''}</td></tr>`).join('') + '</tbody>';
  trTabsDraw(); trLang = currentLang;
}
function trTabsDraw() {
  const t = trT(), on = 'px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 transition-all', off = 'px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white border border-transparent transition-all';
  trEl('trTabs').innerHTML = Object.keys(t.tabs).map(k => `<button type="button" data-tab="${k}" class="${k === trModel.tab ? on : off}">${t.tabs[k]}</button>`).join('');
}
function setTrainTab(tab) { trModel.tab = tab === 'ord' ? 'ord' : 'epi'; trBuild(); trTabsDraw(); calculateTrains(); if (typeof syncShareUrl === 'function') syncShareUrl(); }

function trOnInput(ev) {
  const e = ev.target; if (!e || !e.id || e.id === 'trPreset') return;
  const M = trModel, v = e.type === 'checkbox' ? e.checked : e.value, num = x => (x === '' ? '' : +x);
  let m;
  if ((m = /^to_(z1|z2|int)_(\d+)$/.exec(e.id))) { const s = M.ord.stages[+m[2]]; if (m[1] === 'int') s.internal = v; else s[m[1]] = num(v); }
  else if ((m = /^tr_n(S|SP|R)$/.exec(e.id))) M.n[m[1]] = num(v);
  else if (e.id.startsWith('to_')) { const k = e.id.slice(3); M.ord[k] = k === 'load' ? v : num(v); }
  else if (e.id.startsWith('tr_')) {
    const k = e.id.slice(3);
    M[k] = ['mode', 'fixed', 'input', 'load', 'unknown', 'knownM'].includes(k) ? v : k === 'brOn' ? v : num(v);
    if (k === 'fixed') trFill();
  }
  clearTimeout(trTimer); trTimer = setTimeout(calculateTrains, 60);
}
let trTimer = null;

// ---- calculation ------------------------------------------------------------------------------------------------
function calculateTrains() {
  trBuild();
  if (trLang !== currentLang) trFill();
  const M = trModel, t = trT();
  trEl('trEpi').classList.toggle('hidden', M.tab !== 'epi');
  trEl('trOrd').classList.toggle('hidden', M.tab !== 'ord');
  if (M.tab === 'ord') return calculateOrdinary();
  document.querySelectorAll('#trEpi .trF').forEach(el => el.classList.toggle('hidden', M.mode !== 'fixed'));
  document.querySelectorAll('#trEpi .trT').forEach(el => el.classList.toggle('hidden', M.mode !== 'two'));
  if (M.mode === 'fixed') { trEl('trPCol').classList.toggle('hidden', M.load !== 'P'); trEl('trMCol').classList.toggle('hidden', M.load !== 'M'); trEl('trBrBox').classList.toggle('hidden', !M.brOn); }
  else for (const s of TR_SHAFTS) trEl('trn' + s + 'Col').classList.toggle('hidden', s === M.unknown);
  const zS = +M.zS, zR = +M.zR, zP = (zR - zS) / 2;
  trEl('tr_zPv').textContent = Number.isInteger(zP) && zP > 0 ? String(zP) : '—';
  const okZ = Number.isInteger(zS) && Number.isInteger(zR) && zS >= 3 && Number.isInteger(zP) && zP > 0 && +M.m > 0;
  trEl('trZmsg').innerHTML = okZ ? `R_S = ${trNum(+M.m * zS / 2, 1)} · R_P = ${trNum(+M.m * zP / 2, 1)} · R_R = ${trNum(+M.m * zR / 2, 1)} mm` : `<span class="text-rose-400">${t.zPbad}</span>`;
  if (!okZ) { ['trRes', 'trShafts', 'trAll', 'trSteps'].forEach(id => { trEl(id).innerHTML = ''; }); trEl('trSketch').innerHTML = ''; lastTrainState = null; return; }
  const r = epiSolve({ zS, zR, m: +M.m, N: +M.N || 1, mode: M.mode, fixed: M.fixed, input: M.input, nIn: +M.nIn || 0, load: M.load, P: +M.P || 0, Min: +M.Min || 0,
    unknown: M.unknown, n: { S: +M.n.S || 0, SP: +M.n.SP || 0, R: +M.n.R || 0 }, knownM: M.knownM, M: +M.M || 0, brake: M.brOn ? { f: +M.f, A: +M.A, RD: +M.RD } : null });
  lastTrainState = { tab: 'epi', M: JSON.parse(JSON.stringify(M)), r };
  trRender(r, M, t);
}

function trRole(r, M, s) {
  if (M.mode === 'fixed') return s === M.fixed ? 'fix' : s === M.input ? 'in' : 'out';
  return r.P[s] > 1e-9 ? 'in' : r.P[s] < -1e-9 ? 'out' : 'free';
}

function trRender(r, M, t) {
  const cards = [], card = (k, v, sub, tone = 'k') => cards.push(`<div class="ds-kpi ds-${tone}"><div class="ds-k">${k}</div><div class="ds-v">${v}</div>${sub ? `<div class="ds-s">${sub}</div>` : ''}</div>`);
  if (M.mode === 'fixed') {
    card(t.tau, trNum(r.tau, 4), `${t.sh[M.input]} → ${t.sh[r.out]} · ${r.tau >= 0 ? t.same : t.opp} · 1/τ = ${trNum(1 / r.tau, 3)}`, 'y');
    card(t.nOut, `${trNum(r.n[r.out], 1)} rpm`, t.sh[r.out], 'b');
    card(t.Mout, `${trNum(Math.abs(r.M[r.out]), 1)} N·m`, `${t.sh[r.out]} · M_in ${trNum(Math.abs(r.M[M.input]), 1)} N·m`, 'b');
    card(t.Mfix, `${trNum(Math.abs(r.M[M.fixed]), 1)} N·m`, t.sh[M.fixed], 'k');
    if (r.brake) card(t.pBrake, `${trNum(r.brake.p, 2)} MPa`, `${trNum(r.brake.p * 10, 1)} bar · M_F = ${trNum(r.brake.MF, 1)} N·m`, 'k');
  } else {
    card(`n ${t.sh[M.unknown]}`, `${trNum(r.n[M.unknown], 1)} rpm`, `ω = ${trNum(r.w[M.unknown], 2)} rad/s`, 'y');
    for (const s of TR_SHAFTS) if (s !== M.knownM) card(`M ${t.sh[s]}`, `${trNum(r.M[s], 1)} N·m`, `P ${trNum(r.P[s] / 1000, 2)} kW`, 'b');
  }
  card(t.planet, `${trNum(r.planet.nRel, 1)} rpm`, `${t.planetSub} · ${currentLang === 'it' ? 'assoluta' : 'absolute'} ${trNum(r.planet.n, 1)} rpm`, 'k');
  card(t.T, `${trNum(Math.abs(r.Ttot), 0)} N`, `${trNum(Math.abs(r.Tplanet), 0)} N ${t.perPlanet} (N = ${r.N})`, 'k');
  trEl('trRes').innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${cards.join('')}</div>`;
  trEl('trShafts').innerHTML = `<table class="w-full text-xs text-left min-w-[520px]"><thead><tr class="text-slate-400"><th class="pb-1 pr-2">${t.colSh}</th><th class="pr-2">z</th><th class="pr-2">${t.colN}</th><th class="pr-2">${t.colW}</th><th class="pr-2">${t.colM}</th><th class="pr-2">${t.colP}</th><th class="pr-2">${t.colRole}</th></tr></thead><tbody>` +
    TR_SHAFTS.map(s => `<tr class="border-t border-slate-700/40"><td class="py-1 pr-2 text-white font-semibold">${t.sh[s]}</td><td class="pr-2 font-mono">${s === 'S' ? r.g.zS : s === 'R' ? r.g.zR : '—'}</td><td class="pr-2 font-mono">${trNum(r.n[s], 1)}</td><td class="pr-2 font-mono">${trNum(r.w[s], 2)}</td><td class="pr-2 font-mono">${trNum(r.M[s], 2)}</td><td class="pr-2 font-mono">${trNum(r.P[s] / 1000, 3)}</td><td class="pr-2 text-slate-300">${t.role[trRole(r, M, s)]}</td></tr>`).join('') +
    `<tr class="border-t border-slate-700/40"><td class="py-1 pr-2 text-slate-400" colspan="5">Σ P</td><td class="pr-2 font-mono">${trNum(r.sumP / 1000, 3)}</td><td></td></tr></tbody></table><p class="text-[11px] text-slate-500 mt-2">${t.powerNote}</p>`;
  trEl('trAll').innerHTML = `<table class="w-full text-xs text-left min-w-[420px]"><thead><tr class="text-slate-400"><th class="pb-1 pr-2">${t.colFix}</th><th class="pr-2">${t.colIO}</th><th class="pr-2">${t.colTau}</th><th></th></tr></thead><tbody>` +
    r.ratios.map(x => { const sel = M.mode === 'fixed' && x.fixed === M.fixed && x.inp === M.input; const use = [Math.abs(x.tau) < 1 ? t.use.red : t.use.mult].concat(x.tau < 0 ? [t.use.inv] : []).join(', ');
      return `<tr class="border-t border-slate-700/40 ${sel ? 'bg-blue-600/15' : ''}"><td class="py-1 pr-2">${t.sh[x.fixed]}</td><td class="pr-2">${t.sh[x.inp]} → ${t.sh[x.out]}</td><td class="pr-2 font-mono text-white">${trNum(x.tau, 4)}</td><td class="pr-2 text-slate-400">${use}</td></tr>`; }).join('') + '</tbody></table>';
  trSketch(r, M);
  trSteps(r, M);
}

// front view: ring (annulus), planets on the carrier circle, sun; arrows with the direction of every member
function trSketch(r, M) {
  const svg = trEl('trSketch'); if (!svg) return;
  const g = r.g, c = 150, sc = 118 / (g.RR + 0.18 * g.RR), N = Math.min(Math.max(1, Math.round(+M.N || 1)), 8);
  const RS = g.RS * sc, RP = g.RP * sc, RR = g.RR * sc, Ra = (g.RS + g.RP) * sc;
  const fix = M.mode === 'fixed' ? M.fixed : null;
  let s = `<defs><pattern id="trH" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#22211f" stroke-width="0.8" opacity="0.5"/></pattern></defs>`;
  s += `<circle cx="${c}" cy="${c}" r="${RR * 1.16}" fill="#a7b4c4" stroke="#22211f"/><circle cx="${c}" cy="${c}" r="${RR}" fill="#fbfaf7" stroke="#22211f"/>`;
  if (fix === 'R') s += `<circle cx="${c}" cy="${c}" r="${RR * 1.16}" fill="url(#trH)" stroke="none"/><circle cx="${c}" cy="${c}" r="${RR}" fill="#fbfaf7" stroke="#22211f"/>`;
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / N, x = c + Ra * Math.cos(a), y = c + Ra * Math.sin(a);
    s += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#b7791f" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${RP}" fill="#c9b98f" stroke="#22211f"/><circle cx="${x}" cy="${y}" r="2.5" fill="#22211f"/>`;
  }
  s += `<circle cx="${c}" cy="${c}" r="${RS}" fill="#8a9bb0" stroke="#22211f"/>`;
  if (fix === 'S') s += `<circle cx="${c}" cy="${c}" r="${RS}" fill="url(#trH)"/>`;
  if (fix === 'SP') s += `<circle cx="${c}" cy="${c}" r="${Ra}" fill="none" stroke="#b7791f" stroke-dasharray="3 3"/>`;
  // rotation arrows: + = counterclockwise
  const arrow = (rad, w, col, lab) => {
    if (Math.abs(w) < 1e-9) return `<text x="${c + rad * 0.72}" y="${c - rad * 0.72}" font-size="10" fill="${col}" text-anchor="middle">${lab} 0</text>`;
    const ccw = w > 0, a0 = ccw ? -0.35 : -1.25, a1 = ccw ? -1.25 : -0.35, x0 = c + rad * Math.cos(a0), y0 = c + rad * Math.sin(a0), x1 = c + rad * Math.cos(a1), y1 = c + rad * Math.sin(a1);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    return `<path d="M${x0} ${y0} A${rad} ${rad} 0 0 ${ccw ? 0 : 1} ${x1} ${y1}" fill="none" stroke="${col}" stroke-width="2"/>` +
      `<path d="M${x1} ${y1} l${-7 * Math.cos(ang - 0.45)} ${-7 * Math.sin(ang - 0.45)} M${x1} ${y1} l${-7 * Math.cos(ang + 0.45)} ${-7 * Math.sin(ang + 0.45)}" stroke="${col}" stroke-width="2"/>` +
      `<text x="${c + (rad + 10) * Math.cos(-0.8)}" y="${c + (rad + 10) * Math.sin(-0.8)}" font-size="10.5" font-weight="700" fill="${col}">${lab}</text>`;
  };
  s += arrow(RR * 1.08, r.w.R, '#2f66b3', 'R') + arrow(Ra, r.w.SP, '#b7791f', 'SP') + arrow(RS * 0.6, r.w.S, '#c0392b', 'S');
  s += `<text x="${c}" y="296" font-size="10" fill="#6f6a62" text-anchor="middle">${currentLang === 'it' ? 'frecce: verso di rotazione' : 'arrows: direction of rotation'}</text>`;
  svg.innerHTML = s;
}

function trStepsData(r, M) {
  const T = texNum, it = currentLang === 'it', g = r.g, out = [];
  out.push({ h: it ? 'Geometria' : 'Geometry', eq: [
    `R = \\frac{m\\,z}{2}:\\quad R_S = ${T(g.RS, 2)},\\ R_P = ${T(g.RP, 2)},\\ R_R = ${T(g.RR, 2)}\\ \\text{mm}`,
    `R_R = 2R_P + R_S \\;\\Rightarrow\\; z_P = \\frac{z_R - z_S}{2} = \\frac{${g.zR} - ${g.zS}}{2} = ${g.zP}`] });
  out.push({ h: it ? 'Vincolo cinematico (Willis)' : 'Kinematic constraint (Willis)', eq: [
    `\\omega_S R_S + \\omega_R (2R_P + R_S) = 2\\,\\omega_{SP}(R_S + R_P) \\;\\Leftrightarrow\\; z_S\\,\\omega_S + z_R\\,\\omega_R = (z_S + z_R)\\,\\omega_{SP}`,
    `A\\,\\omega_R + B\\,\\omega_{SP} + C\\,\\omega_S = 0:\\quad A = R_R = ${T(g.A, 2)},\\ B = -2(R_S + R_P) = ${T(g.B, 2)},\\ C = R_S = ${T(g.C, 2)}`] });
  const key = { R: 'R', SP: 'SP', S: 'S' }, cf = { R: 'A', SP: 'B', S: 'C' }, w = s => `\\omega_{${key[s]}}`;
  if (M.mode === 'fixed') {
    out.push({ h: it ? 'Rapporto con un albero bloccato' : 'Ratio with one shaft held', eq: [
      `${w(M.fixed)} = 0 \\;\\Rightarrow\\; \\tau = \\frac{${w(r.out)}}{${w(M.input)}} = -\\frac{${cf[M.input]}}{${cf[r.out]}} = -\\frac{${T(epiCoef(g, M.input), 2)}}{${T(epiCoef(g, r.out), 2)}} = ${T(r.tau, 4)}`,
      `n_{${key[r.out]}} = \\tau\\,n_{${key[M.input]}} = ${T(r.tau, 4)} \\cdot ${T(r.n[M.input], 1)} = ${T(r.n[r.out], 1)}\\ \\text{rpm}`] });
  } else {
    const [a, b] = TR_SHAFTS.filter(s => s !== M.unknown);
    out.push({ h: it ? 'Terza velocità' : 'Third speed', eq: [
      `${w(M.unknown)} = -\\frac{${cf[a]}\\,${w(a)} + ${cf[b]}\\,${w(b)}}{${cf[M.unknown]}} = -\\frac{${T(epiCoef(g, a), 2)} \\cdot ${T(r.w[a], 2)} + (${T(epiCoef(g, b), 2)}) \\cdot ${T(r.w[b], 2)}}{${T(epiCoef(g, M.unknown), 2)}} = ${T(r.w[M.unknown], 2)}\\ \\text{rad/s}`] });
  }
  out.push({ h: it ? 'Coppie e potenze' : 'Torques and powers', eq: [
    `M_R = T\\,R_R,\\quad M_{SP} = -2T(R_S + R_P),\\quad M_S = T\\,R_S`,
    `T = \\frac{M_{${key[r.known]}}}{${cf[r.known]}} = \\frac{${T(r.Mk, 2)}}{${T(epiCoef(g, r.known), 2)}} = ${T(r.T * 1000, 1)}\\ \\text{N}` + (r.N > 1 ? `\\quad (${T(r.T * 1000 / r.N, 1)}\\ \\text{N}\\ ${it ? '\\text{per satellite}' : '\\text{per planet}'})` : ''),
    `M_S = ${T(r.M.S, 2)},\\ M_{SP} = ${T(r.M.SP, 2)},\\ M_R = ${T(r.M.R, 2)}\\ \\text{N m}`,
    `\\textstyle\\sum M\\,\\omega = ${T(r.P.S, 1)} + (${T(r.P.SP, 1)}) + (${T(r.P.R, 1)}) = ${T(r.sumP, 1)}\\ \\text{W}`] ,
    txt: [it ? 'Le coppie sono quelle applicate dall\'esterno ai tre alberi; il segno meno sul portatreno viene dal bilancio di potenza senza perdite.' : 'The torques are those applied from outside to the three shafts; the minus sign on the carrier comes from the power balance without losses.'] });
  out.push({ h: it ? 'Satellite' : 'Planet', eq: [
    `\\omega_S R_S = \\omega_{SP}(R_S + R_P) - \\omega_P R_P \\;\\Rightarrow\\; \\omega_P = \\frac{\\omega_{SP}(R_S + R_P) - \\omega_S R_S}{R_P} = ${T(r.planet.wP, 2)}\\ \\text{rad/s}`,
    `\\omega_P - \\omega_{SP} = ${T(r.planet.wRel, 2)}\\ \\text{rad/s} = ${T(r.planet.nRel, 1)}\\ \\text{rpm}`] });
  if (r.brake) out.push({ h: it ? 'Freno sull\'albero bloccato' : 'Brake on the held shaft', eq: [
    `M_F = 2 f P A R_D \\;\\Rightarrow\\; P = \\frac{M_F}{2 f A R_D} = \\frac{${T(r.brake.MF * 1000, 0)}}{2 \\cdot ${T(+M.f, 2)} \\cdot ${T(+M.A, 0)} \\cdot ${T(+M.RD, 1)}} = ${T(r.brake.p, 3)}\\ \\text{MPa}`] });
  return out;
}
function trDrawSteps(boxId, data) {
  const box = trEl(boxId);
  const draw = () => { box.innerHTML = data().map((s, i) => `<div class="ds-step"><div class="ds-step-h"><span>${i + 1}</span>${s.h}</div>` + s.eq.map(l => `<div class="ds-eq">${trTex(l)}</div>`).join('') + (s.txt || []).map(x => `<p class="ds-note">${x}</p>`).join('') + '</div>').join(''); };
  draw();
  if (!window.katex && typeof reportLoadKatex === 'function') {
    if (!document.querySelector('link[href*="katex.min.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vendor/katex/katex.min.css'; document.head.appendChild(l); }
    reportLoadKatex().then(ok => { if (ok) draw(); });
  }
}
function trTex(tex) { if (window.katex) { try { return window.katex.renderToString(tex, { displayMode: true, throwOnError: false, output: 'html' }); } catch (e) { /* plain */ } } return `<code class="text-[11px]">${tex.replace(/</g, '&lt;')}</code>`; }
function trSteps(r, M) { trDrawSteps('trSteps', () => trStepsData(r, M)); }

// ---- tab 2: ordinary train --------------------------------------------------------------------------------------------
function calculateOrdinary() {
  const t = trT(), O = trModel.ord;
  trEl('toPCol').classList.toggle('hidden', O.load !== 'P'); trEl('toMCol').classList.toggle('hidden', O.load !== 'M');
  const st = O.stages.map(s => ({ z1: +s.z1, z2: +s.z2, internal: !!s.internal }));
  if (!st.every(s => s.z1 > 0 && s.z2 > 0)) { trEl('toRes').innerHTML = ''; lastTrainState = null; return; }
  const r = ordSolve({ stages: st, nIn: +O.nIn || 0, load: O.load, P: +O.P || 0, Min: +O.Min || 0 });
  lastTrainState = { tab: 'ord', M: JSON.parse(JSON.stringify(trModel)), r };
  trEl('toRes').innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">` +
    `<div class="ds-kpi ds-y"><div class="ds-k">${t.tau}</div><div class="ds-v">${trNum(r.tau, 4)}</div><div class="ds-s">${r.tau >= 0 ? t.same : t.opp} · 1/τ = ${trNum(1 / r.tau, 3)}</div></div>` +
    `<div class="ds-kpi ds-b"><div class="ds-k">${t.nOut}</div><div class="ds-v">${trNum(r.nOut, 1)} rpm</div></div>` +
    `<div class="ds-kpi ds-b"><div class="ds-k">${t.Mout}</div><div class="ds-v">${trNum(r.Mout, 1)} N·m</div><div class="ds-s">M_in ${trNum(r.Min, 2)} N·m · ${trNum(r.P, 2)} kW</div></div></div>` +
    `<div class="overflow-x-auto"><table class="w-full text-xs text-left min-w-[480px]"><thead><tr class="text-slate-400"><th class="pb-1 pr-2">${t.stage}</th><th class="pr-2">z₁/z₂</th><th class="pr-2">τ</th><th class="pr-2">n in → out</th><th class="pr-2">M in → out [N·m]</th></tr></thead><tbody>` +
    r.rows.map((x, k) => `<tr class="border-t border-slate-700/40"><td class="py-1 pr-2">${k + 1}${x.internal ? ' (int.)' : ''}</td><td class="pr-2 font-mono">${x.z1}/${x.z2}</td><td class="pr-2 font-mono">${trNum(x.tau, 4)}</td><td class="pr-2 font-mono">${trNum(x.nIn, 1)} → ${trNum(x.nOut, 1)}</td><td class="pr-2 font-mono">${trNum(x.Min, 2)} → ${trNum(x.Mout, 2)}</td></tr>`).join('') + '</tbody></table></div>';
  const T = texNum, it = currentLang === 'it';
  trDrawSteps('toSteps', () => [
    { h: it ? 'Rapporto di ogni coppia' : 'Ratio of each pair', eq: r.rows.map((x, k) => `\\tau_{${k + 1}} = ${x.internal ? '+' : '-'}\\frac{R_1}{R_2} = ${x.internal ? '+' : '-'}\\frac{z_1}{z_2} = ${x.internal ? '' : '-'}\\frac{${x.z1}}{${x.z2}} = ${T(x.tau, 4)}`),
      txt: [it ? 'Ruote di frizione o dentate: uguale velocità periferica, ω₁R₁ = ω₂R₂; ingranamento esterno: verso opposto (−), interno: stesso verso (+).' : 'Friction or toothed wheels: equal peripheral speed, ω₁R₁ = ω₂R₂; external mesh: opposite direction (−), internal: same direction (+).'] },
    { h: it ? 'Rapporto totale, velocità e coppie' : 'Total ratio, speeds and torques', eq: [
      `\\tau = \\prod \\tau_i = ${r.rows.map(x => T(x.tau, 3)).join(' \\cdot ')} = ${T(r.tau, 4)}`,
      `n_{out} = \\tau\\, n_{in} = ${T(r.nOut, 1)}\\ \\text{rpm},\\qquad M_m\\,\\omega_m = M_u\\,\\omega_u \\;\\Rightarrow\\; M_u = \\frac{M_m}{|\\tau|} = ${T(r.Mout, 2)}\\ \\text{N m}`] }
  ]);
}

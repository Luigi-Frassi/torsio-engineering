// ============================================================================
// DISCS MODULE, tab 2: THIN TUBES, PLATES AND JUNCTIONS (core: core/shells-core.js)
// One junction ring at the tube radius R: a tube to the left, a tube to the right and a disc or plate, each
// optional. Welded or shrink-fitted, with pressure, rotation, temperature and a spinning incoherent material.
// The model lives in dsModel.jn and is shared with the rest of the module (link, project, report).
// ============================================================================

const JN_TXT = {
  it: {
    intro: 'Una giunzione al raggio R del tubo: un tubo a sinistra, un tubo a destra e un disco o una piastra, ognuno facoltativo. Tubi sottili semi-infiniti con effetti di bordo, dischi e piastre assialsimmetrici. Il calcolo trova forza Q₀ e momento M₀ alla giunzione dalla congruenza di spostamenti e rotazioni.',
    ex: { welded: 'Due tubi di spessore diverso saldati, p = 40 bar', vessel: 'Serbatoio con fondelli piani forzati, scarico', vesselP: 'Serbatoio con fondelli piani a 2 bar', centrifuge: 'Centrifuga: mantello su disco rigido, materiale incoerente (esame 12/1/2016)',
      rotor: 'Rotore di dischi e distanziali a 3000 giri/min (esame 6/6/2015)', septa: 'Setti d\'alluminio forzati in un tubo d\'acciaio', septaHot: '… scaldati di 50 °C e a 2000 giri/min', twoTemp: 'Tubo con due temperature (metà immersa)' },
    common: 'Giunzione e carichi', R: 'Raggio medio del tubo R', p: 'Pressione interna p', closed: 'Estremità chiuse (σa = pR/2h)', n: 'Velocità n', dT: 'ΔT comune', inc: 'Materiale incoerente in rotazione', rhoInc: 'Densità ρ_i', rInc: 'riempie da r =', Xreq: 'Coefficiente di sicurezza X',
    tubeL: 'Tubo a sinistra', tubeR: 'Tubo a destra', disc: 'Disco o piastra', on: 'presente', h: 'Spessore h', mat: 'Materiale', E: 'E [GPa]', nu: 'ν', rho: 'ρ [kg/m³]', alpha: 'α [10⁻⁶/°C]', sy: 'σs [MPa]', dTown: 'ΔT proprio', dTownHint: 'vuoto = comune',
    pos: 'Posizione', posIn: 'dentro il tubo (fondello, setto, disco del rotore)', posOut: 'fuori dal tubo (flangia, disco col foro al tubo)', rOther: 'Altro raggio del disco', rOtherHint: 'dentro: raggio del foro (0 = pieno) · fuori: raggio esterno',
    link: 'Collegamento al tubo', links: { weld: 'saldato: piastra che si flette', rigid: 'disco rigido a flessione (φ = 0)', free: 'forzato, sottile: niente momento (M₀ = 0)' }, iRad: 'Interferenza radiale i', iHint: 'disco più grande del tubo di i (forzamento)',
    face: 'Pressione sulla faccia', faces: { p: 'sì (fondello di un recipiente)', none: 'no' },
    res: 'Risultato', Q0: 'Forza alla giunzione Q₀', M0: 'Momento alla giunzione M₀', w: 'Spostamento radiale', phi: 'Rotazione', crit: 'σeq massima', at: 'in', wmax: 'Velocità massima ammissibile', wmaxNone: 'nessun elemento con σs',
    chartT: 'Tubi: tensioni lungo l\'asse', dashT: 'σa della stessa fibra', dashD: 'σr della stessa faccia', chartW: 'Deformata del tubo', wLbl: 'spostamento radiale w [µm], + verso l\'esterno', undeformed: 'indeformato', deformed: 'deformato (amplificato)', wFree: 'senza la giunzione', chartD: 'Disco o piastra: tensioni lungo il raggio', inner: 'fibra interna', outer: 'fibra esterna', faceA: 'faccia lato tubo', faceB: 'faccia opposta',
    table: 'Punti significativi', colPt: 'Punto', colSa: 'σa / σr', colSc: 'σc', colSeq: 'σeq', far: 'lontano dal bordo', edge: 'al bordo', bore: 'al foro / centro', rim: 'alla giunzione', maxAt: 'massimo, x =',
    steps: 'Passaggi del calcolo', ok: 'VERIFICATO', ko: 'NON VERIFICATO', noSy: 'σs non indicata: tensioni senza verifica', need2: 'Servono almeno due elementi alla giunzione.',
    note: 'Convenzioni: Q₀ positiva verso l\'esterno sul tubo, w positivo verso l\'esterno, fibra interna = lato interno del tubo. Per un disco forzato e sottile il momento non passa; per un disco spesso o saldato sì.'
  },
  en: {
    intro: 'One junction at the tube radius R: a tube to the left, a tube to the right and a disc or plate, each optional. Semi-infinite thin tubes with edge effects, axisymmetric discs and plates. The calculation finds the force Q₀ and the moment M₀ at the junction from the congruence of displacements and rotations.',
    ex: { welded: 'Two welded tubes of different thickness, p = 40 bar', vessel: 'Vessel with flat end plates press-fitted, empty', vesselP: 'Vessel with flat end plates at 2 bar', centrifuge: 'Centrifuge: shell on a rigid disc, incoherent material (exam 12/1/2016)',
      rotor: 'Rotor of discs and spacers at 3000 rpm (exam 6/6/2015)', septa: 'Aluminium septa press-fitted in a steel tube', septaHot: '… heated by 50 °C and at 2000 rpm', twoTemp: 'Tube at two temperatures (half immersed)' },
    common: 'Junction and loads', R: 'Mean tube radius R', p: 'Inner pressure p', closed: 'Closed ends (σa = pR/2h)', n: 'Speed n', dT: 'Common ΔT', inc: 'Incoherent material spinning inside', rhoInc: 'Density ρ_i', rInc: 'fills from r =', Xreq: 'Safety factor X',
    tubeL: 'Tube on the left', tubeR: 'Tube on the right', disc: 'Disc or plate', on: 'present', h: 'Thickness h', mat: 'Material', E: 'E [GPa]', nu: 'ν', rho: 'ρ [kg/m³]', alpha: 'α [10⁻⁶/°C]', sy: 'σy [MPa]', dTown: 'Own ΔT', dTownHint: 'empty = common',
    pos: 'Position', posIn: 'inside the tube (end plate, septum, rotor disc)', posOut: 'outside the tube (flange, disc with its bore on the tube)', rOther: 'Other radius of the disc', rOtherHint: 'inside: bore radius (0 = solid) · outside: outer radius',
    link: 'Connection to the tube', links: { weld: 'welded: plate that bends', rigid: 'disc rigid in bending (φ = 0)', free: 'press-fitted, thin: no moment (M₀ = 0)' }, iRad: 'Radial interference i', iHint: 'disc larger than the tube by i (press fit)',
    face: 'Pressure on the face', faces: { p: 'yes (end plate of a vessel)', none: 'no' },
    res: 'Result', Q0: 'Junction force Q₀', M0: 'Junction moment M₀', w: 'Radial displacement', phi: 'Rotation', crit: 'Max σeq', at: 'at', wmax: 'Maximum allowable speed', wmaxNone: 'no element with σy',
    chartT: 'Tubes: stresses along the axis', dashT: 'σa of the same fibre', dashD: 'σr of the same face', chartW: 'Deformed tube', wLbl: 'radial displacement w [µm], + outwards', undeformed: 'undeformed', deformed: 'deformed (magnified)', wFree: 'without the junction', chartD: 'Disc or plate: stresses along the radius', inner: 'inner fibre', outer: 'outer fibre', faceA: 'tube-side face', faceB: 'opposite face',
    table: 'Significant points', colPt: 'Point', colSa: 'σa / σr', colSc: 'σc', colSeq: 'σeq', far: 'far from the edge', edge: 'at the edge', bore: 'at the bore / centre', rim: 'at the junction', maxAt: 'maximum, x =',
    steps: 'Calculation steps', ok: 'VERIFIED', ko: 'NOT VERIFIED', noSy: 'σy not given: stresses without check', need2: 'At least two elements are needed at the junction.',
    note: 'Conventions: Q₀ positive outwards on the tube, w positive outwards, inner fibre = inner side of the tube. A thin press-fitted disc takes no moment; a thick or welded one does.'
  }
};
function jnT() { return JN_TXT[currentLang] || JN_TXT.en; }

function jnMat(mat, extra = {}) { const m = DISC_MATERIALS[mat] || DISC_MATERIALS.steel; return { mat, E: m.E / 1000, nu: m.nu, rho: m.rho, alpha: Math.round(m.alpha * 1e7) / 10, sy: m.sy, ...extra }; }
function jnDefault() {
  return { R: 150, p: 4, closed: true, n: 0, dT: 0, inc: false, rhoInc: 2000, rInc: 0, Xreq: 1.5,
    tL: { on: true, h: 10, dT: '', ...jnMat('steel') }, tR: { on: true, h: 5, dT: '', ...jnMat('steel') },
    d: { on: false, pos: 'in', rOther: 0, h: 10, link: 'weld', face: 'p', i: 0, dT: '', ...jnMat('steel') } };
}
const JN_PRESETS = {
  welded: () => ({ ...jnDefault(), tL: { on: true, h: 10, dT: '', ...jnMat('steel', { sy: 280 }) }, tR: { on: true, h: 5, dT: '', ...jnMat('steel', { sy: 280 }) } }),
  vessel: () => ({ ...jnDefault(), R: 250, p: 0, closed: true, tL: { ...jnDefault().tL, on: false }, tR: { on: true, h: 10, dT: '', ...jnMat('alu', { alpha: 23, sy: 0 }) },
    d: { on: true, pos: 'in', rOther: 0, h: 8, link: 'weld', face: 'p', i: 500, dT: '', ...jnMat('alu', { alpha: 23, sy: 0 }) } }),
  vesselP: () => ({ ...JN_PRESETS.vessel(), p: 0.2 }),
  centrifuge: () => ({ ...jnDefault(), R: 350, p: 0, closed: false, n: 305 * 60 / (2 * Math.PI), inc: true, rhoInc: 2000, rInc: 50, Xreq: 1,
    tL: { ...jnDefault().tL, on: false }, tR: { on: true, h: 8, dT: '', ...jnMat('steel', { sy: 600 }) }, d: { on: true, pos: 'in', rOther: 50, h: 40, link: 'rigid', face: 'none', i: 0, dT: '', ...jnMat('steel', { sy: 0 }) } }),
  rotor: () => ({ ...jnDefault(), R: 150, p: 0, closed: false, n: 3000, tL: { on: true, h: 10, dT: '', ...jnMat('steel', { sy: 0 }) }, tR: { on: true, h: 10, dT: '', ...jnMat('steel', { sy: 0 }) },
    d: { on: true, pos: 'out', rOther: 450, h: 40, link: 'rigid', face: 'none', i: 0, dT: '', ...jnMat('steel', { sy: 0 }) } }),
  septa: () => ({ ...jnDefault(), R: 250, p: 0, closed: false, n: 0, tL: { on: true, h: 5, dT: '', ...jnMat('steel', { sy: 0 }) }, tR: { on: true, h: 5, dT: '', ...jnMat('steel', { sy: 0 }) },
    d: { on: true, pos: 'in', rOther: 100, h: 8, link: 'free', face: 'none', i: 375, dT: '', ...jnMat('alu', { alpha: 24, sy: 0 }) } }),
  septaHot: () => ({ ...JN_PRESETS.septa(), n: 2000, dT: 50 }),
  twoTemp: () => ({ ...jnDefault(), R: 125, p: 0, closed: false, tL: { on: true, h: 10, dT: 0, ...jnMat('steel', { sy: 0 }) }, tR: { on: true, h: 10, dT: 30, ...jnMat('steel', { sy: 0 }) } })
};
function jnSanitize(o) {
  const J = jnDefault(), num = (v, d) => (v === '' ? '' : Number.isFinite(+v) ? +v : d);
  if (!o || typeof o !== 'object') return J;
  for (const k of ['R', 'p', 'n', 'dT', 'rhoInc', 'rInc', 'Xreq']) J[k] = num(o[k], J[k]);
  J.closed = !!o.closed; J.inc = !!o.inc;
  for (const k of ['tL', 'tR', 'd']) {
    const src = o[k] || {}, dst = J[k];
    dst.on = !!src.on;
    for (const f of ['h', 'E', 'nu', 'rho', 'alpha', 'sy', 'rOther', 'i']) if (f in dst) dst[f] = num(src[f], dst[f]);
    dst.dT = src.dT === '' || src.dT === undefined || src.dT === null ? '' : num(src.dT, '');
    if (DS_MAT_KEYS.includes(src.mat)) dst.mat = src.mat;
    if (k === 'd') { dst.pos = src.pos === 'out' ? 'out' : 'in'; dst.link = ['weld', 'rigid', 'free'].includes(src.link) ? src.link : 'weld'; dst.face = src.face === 'none' ? 'none' : 'p'; }
  }
  return J;
}
function jnModel() { if (!dsModel.jn) dsModel.jn = jnDefault(); return dsModel.jn; }

// core input from the model
function jnMembers(J = jnModel()) {
  const mk = (x, extra) => ({ R: +J.R, h: +x.h, E: +x.E * 1000, nu: +x.nu, rho: +x.rho, alpha: +x.alpha * 1e-6, sy: +x.sy || 0, dT: x.dT === '' ? undefined : +x.dT, ...extra });
  const m = [];
  if (J.tL.on) m.push({ id: 'tL', kind: 'tube', side: 'L', ...mk(J.tL) });
  if (J.tR.on) m.push({ id: 'tR', kind: 'tube', side: 'R', ...mk(J.tR) });
  if (J.d.on) {
    const d = J.d, side = J.tR.on ? 'R' : 'L';
    m.push({ id: 'd', kind: 'disc', pos: d.pos === 'out' ? 'outside' : 'inside', rOther: +d.rOther || 0, bend: d.link === 'weld', momentLink: d.link !== 'free', tubeSide: side,
      q: d.face === 'p' && d.pos !== 'out' && !(+d.rOther > 0) ? +J.p : 0, i: (+d.i || 0) / 1000, ...mk(d) });
  }
  return m;
}
function jnState(J = jnModel(), omega) {
  return { p: +J.p || 0, closed: !!J.closed, omega: omega !== undefined ? omega : rpmToRad(+J.n || 0), dT: +J.dT || 0, rhoInc: J.inc ? +J.rhoInc : 0, rInc: +J.rInc || 0 };
}
function jnValid(m, J) {
  if (m.length < 2) return false;
  return +J.R > 0 && m.every(x => x.h > 0 && x.E > 0 && x.nu >= 0 && x.nu < 0.5 && x.h < x.R) &&
    m.filter(x => x.kind === 'disc').every(x => x.pos === 'inside' ? x.rOther >= 0 && x.rOther < x.R : x.rOther > x.R);
}

// ---- page -----------------------------------------------------------------------------------------------------
function jnShow(on) {
  const sec = dsEl('moduleDiscsSection'); if (!sec) return;
  let box = dsEl('dsJn');
  if (!box && on) {
    box = document.createElement('div'); box.id = 'dsJn';
    dsEl('dsUni').insertAdjacentElement('beforebegin', box);
    jnBuild(box);
  }
  if (box) box.classList.toggle('hidden', !on);
}

function jnMemberCard(key) {
  const inp = (id, unit, attrs = '') => dsInput(id, '', unit, attrs);
  const sel = id => `<select id="${id}" class="${DS_IN}"></select>`;
  const f = (id, lbl, inner, wrap = '') => `<div ${wrap}><label class="${DS_LBL}" for="${id}" data-jn="${lbl}"></label>${inner}</div>`;
  const disc = key === 'd';
  return `<div class="${DS_CARD}" id="jnCard_${key}">
    <div class="flex items-center justify-between gap-3 mb-3"><h3 class="text-sm font-semibold text-white" data-jn="${key === 'tL' ? 'tubeL' : key === 'tR' ? 'tubeR' : 'disc'}"></h3>
      <label class="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" id="jn_${key}_on" class="w-4 h-4"> <span data-jn="on"></span></label></div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="jnBody_${key}">
      ${disc ? f(`jn_${key}_pos`, 'pos', sel(`jn_${key}_pos`), 'class="col-span-2"') + f(`jn_${key}_rOther`, 'rOther', inp(`jn_${key}_rOther`, 'mm', 'min="0"'), 'class="col-span-2"') : ''}
      ${f(`jn_${key}_h`, 'h', inp(`jn_${key}_h`, 'mm', 'min="0"'))}
      ${f(`jn_${key}_mat`, 'mat', sel(`jn_${key}_mat`))}
      ${f(`jn_${key}_E`, 'E', inp(`jn_${key}_E`, ''))}
      ${f(`jn_${key}_nu`, 'nu', inp(`jn_${key}_nu`, ''))}
      ${f(`jn_${key}_rho`, 'rho', inp(`jn_${key}_rho`, ''))}
      ${f(`jn_${key}_alpha`, 'alpha', inp(`jn_${key}_alpha`, ''))}
      ${f(`jn_${key}_sy`, 'sy', inp(`jn_${key}_sy`, ''))}
      ${f(`jn_${key}_dT`, 'dTown', inp(`jn_${key}_dT`, '°C', 'data-optional="1"'))}
      ${disc ? f(`jn_${key}_link`, 'link', sel(`jn_${key}_link`), 'class="col-span-2"') + f(`jn_${key}_i`, 'iRad', inp(`jn_${key}_i`, 'µm'), '') + f(`jn_${key}_face`, 'face', sel(`jn_${key}_face`), 'id="jnFaceCol"') : ''}
    </div>${disc ? '<p class="text-[11px] text-slate-500 mt-2"><span data-jn="rOtherHint"></span> · <span data-jn="iHint"></span></p>' : '<p class="text-[11px] text-slate-500 mt-2" data-jn="dTownHint"></p>'}</div>`;
}

function jnBuild(box) {
  const inp = (id, unit, attrs = '') => dsInput(id, '', unit, attrs);
  const f = (id, lbl, inner, wrap = '') => `<div ${wrap}><label class="${DS_LBL}" for="${id}" data-jn="${lbl}"></label>${inner}</div>`;
  box.innerHTML = `
    <div class="${DS_CARD}"><div class="flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-slate-400 max-w-2xl" data-jn="intro"></p><select id="jnPreset" class="${DS_IN} !w-auto max-w-full" aria-label="Example"></select></div></div>
    <div class="${DS_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-jn="common"></h3>
      <div class="grid grid-cols-1 2xl:grid-cols-[1fr_300px] gap-4"><div class="grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
        ${f('jn_R', 'R', inp('jn_R', 'mm', 'min="0"'))}${f('jn_p', 'p', inp('jn_p', 'MPa'))}${f('jn_n', 'n', inp('jn_n', 'rpm', 'min="0"'))}
        ${f('jn_dT', 'dT', inp('jn_dT', '°C'))}${f('jn_Xreq', 'Xreq', inp('jn_Xreq', '', 'min="1"'))}
        <label class="flex items-center gap-2 text-xs text-slate-300 col-span-2 md:col-span-3"><input type="checkbox" id="jn_closed" class="w-4 h-4"> <span data-jn="closed"></span></label>
        <label class="flex items-center gap-2 text-xs text-slate-300 col-span-2 md:col-span-3"><input type="checkbox" id="jn_inc" class="w-4 h-4"> <span data-jn="inc"></span></label>
        ${f('jn_rhoInc', 'rhoInc', inp('jn_rhoInc', 'kg/m³', 'min="0"'), 'id="jnIncA"')}${f('jn_rInc', 'rInc', inp('jn_rInc', 'mm', 'min="0"'), 'id="jnIncB"')}
      </div><div class="rounded-lg bg-slate-950/70 border border-slate-800 p-2 self-start max-w-[320px] w-full"><svg id="jnSketch" viewBox="0 0 300 200" class="w-full h-auto" font-family="Archivo, Arial, sans-serif" role="img" aria-label="Junction"></svg></div></div></div>
    ${jnMemberCard('tL')}${jnMemberCard('tR')}${jnMemberCard('d')}
    <div class="${DS_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-jn="res"></h3><div id="jnRes"></div></div>
    <div class="${DS_CARD}" id="jnChartTCard"><h3 class="text-sm font-semibold text-white mb-2" data-jn="chartT"></h3><div class="rounded-lg bg-slate-950/70 border border-slate-800 p-2"><svg id="jnChartT" viewBox="0 0 640 300" class="w-full h-auto" font-family="Archivo, Arial, sans-serif"></svg></div></div>
    <div class="${DS_CARD}" id="jnChartWCard"><h3 class="text-sm font-semibold text-white mb-2" data-jn="chartW"></h3><div class="rounded-lg bg-slate-950/70 border border-slate-800 p-2"><svg id="jnChartW" viewBox="0 0 640 300" class="w-full h-auto" font-family="Archivo, Arial, sans-serif"></svg></div></div>
    <div class="${DS_CARD}" id="jnChartDCard"><h3 class="text-sm font-semibold text-white mb-2" data-jn="chartD"></h3><div class="rounded-lg bg-slate-950/70 border border-slate-800 p-2"><svg id="jnChartD" viewBox="0 0 640 300" class="w-full h-auto" font-family="Archivo, Arial, sans-serif"></svg></div></div>
    <div class="${DS_CARD} overflow-x-auto"><h3 class="text-sm font-semibold text-white mb-3" data-jn="table"></h3><div id="jnTable"></div></div>
    <div class="${DS_CARD}"><h3 class="text-sm font-semibold text-white mb-3" data-jn="steps"></h3><div id="jnSteps" class="ds-steps"></div><p class="text-[11px] text-slate-500 mt-2" data-jn="note"></p></div>`;
  box.addEventListener('input', jnOnInput); box.addEventListener('change', jnOnInput);
  dsEl('jnPreset').addEventListener('change', ev => { const k = ev.target.value; ev.target.value = ''; if (JN_PRESETS[k]) { dsModel.jn = JN_PRESETS[k](); jnFill(); calculateDiscs(); if (typeof syncShareUrl === 'function') syncShareUrl(); } });
  jnFill();
}

let jnLang = null;
function jnFill() {
  const J = jnModel(), t = jnT(), dt = dsT();
  document.querySelectorAll('#dsJn [data-jn]').forEach(el => { const v = t[el.dataset.jn]; if (typeof v === 'string') el.textContent = v; });
  const opts = (id, obj, cur) => { const s = dsEl(id); if (s) { s.innerHTML = Object.keys(obj).map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${obj[k]}</option>`).join(''); } };
  dsEl('jnPreset').innerHTML = `<option value="">${dt.exPick}</option>` + Object.keys(JN_PRESETS).map(k => `<option value="${k}">${t.ex[k]}</option>`).join('');
  const set = (id, v) => { const e = dsEl(id); if (!e) return; if (e.type === 'checkbox') e.checked = !!v; else e.value = v; };
  for (const k of ['R', 'p', 'n', 'dT', 'rhoInc', 'rInc', 'Xreq']) set('jn_' + k, k === 'n' ? +(+J.n).toFixed(2) : J[k]);
  set('jn_closed', J.closed); set('jn_inc', J.inc);
  for (const key of ['tL', 'tR', 'd']) {
    const x = J[key];
    set(`jn_${key}_on`, x.on);
    opts(`jn_${key}_mat`, dt.mats, x.mat);
    for (const f of ['h', 'E', 'nu', 'rho', 'alpha', 'sy', 'dT', 'rOther', 'i']) set(`jn_${key}_${f}`, x[f] === undefined ? '' : x[f]);
  }
  opts('jn_d_pos', { in: t.posIn, out: t.posOut }, J.d.pos); opts('jn_d_link', t.links, J.d.link); opts('jn_d_face', t.faces, J.d.face);
  jnLang = currentLang;
}

function jnOnInput(ev) {
  const e = ev.target; if (!e || !e.id || !e.id.startsWith('jn_')) return;
  const J = jnModel(), v = e.type === 'checkbox' ? e.checked : e.value, parts = e.id.split('_');
  const num = x => (x === '' ? '' : isNaN(+x) ? x : +x);
  if (parts.length === 2) J[parts[1]] = typeof v === 'boolean' ? v : num(v);
  else {
    const x = J[parts[1]], f = parts[2];
    if (f === 'on') x.on = v;
    else if (f === 'mat') { x.mat = v; if (DISC_MATERIALS[v]) { Object.assign(x, jnMat(v)); jnFill(); } }
    else if (['pos', 'link', 'face'].includes(f)) x[f] = v;
    else {
      x[f] = num(v);
      if (['E', 'nu', 'rho', 'alpha', 'sy'].includes(f) && x.mat !== 'custom' && ev.type === 'input') { x.mat = 'custom'; const s = dsEl(`jn_${parts[1]}_mat`); if (s) s.value = 'custom'; }
    }
  }
}

// ---- calculation ------------------------------------------------------------------------------------------------
function calculateJunction() {
  jnShow(true);
  if (jnLang !== currentLang) jnFill();
  const t = jnT(), J = jnModel(), m = jnMembers(J), st = jnState(J);
  ['tL', 'tR', 'd'].forEach(k => dsEl('jnBody_' + k).classList.toggle('hidden', !J[k].on));
  dsEl('jnIncA').classList.toggle('hidden', !J.inc); dsEl('jnIncB').classList.toggle('hidden', !J.inc);
  dsEl('jnFaceCol').classList.toggle('hidden', !(J.d.pos === 'in' && !(+J.d.rOther > 0) && J.d.link === 'weld'));
  jnSketch(J, m);
  if (!jnValid(m, J)) {
    dsEl('jnRes').innerHTML = `<p class="text-sm text-rose-400">${m.length < 2 ? t.need2 : dsT().invalid}</p>`;
    ['jnTable', 'jnSteps'].forEach(id => { dsEl(id).innerHTML = ''; }); dsEl('jnChartT').innerHTML = ''; dsEl('jnChartD').innerHTML = '';
    lastDiscState = null; return;
  }
  const a = junctionAnalyze(m, st);
  const anySy = m.some(x => x.sy > 0), X = +J.Xreq || 1;
  const wmax = anySy && (st.omega > 0 || J.inc) ? junctionMaxSpeed(m, st, X) : null;
  lastDiscState = { jn: true, J: JSON.parse(JSON.stringify(J)), m, st, a, anySy, X, wmax, ok: anySy ? a.res.every(r => r.X >= X - 1e-9) : null };
  jnRenderResult(lastDiscState); jnCharts(lastDiscState); jnTable(lastDiscState); jnSteps(lastDiscState);
}

function jnName(mb) { const t = jnT(); return mb.id === 'tL' ? t.tubeL : mb.id === 'tR' ? t.tubeR : t.disc; }

function jnRenderResult(S) {
  const t = jnT(), cards = [], card = (k, v, sub, tone = 'k') => cards.push(`<div class="ds-kpi ds-${tone}"><div class="ds-k">${k}</div><div class="ds-v">${v}</div>${sub ? `<div class="ds-s">${sub}</div>` : ''}</div>`);
  const tube = S.a.res.find(r => r.mb.kind === 'tube');
  card(t.Q0, `${dsNum(tube.F * 1000, 0)} N/m`, `${jnName(tube.mb)} · ${dsNum(tube.F, 2)} N/mm`, 'y');
  card(t.M0, `${dsNum(tube.M, 1)} N·m/m`, jnName(tube.mb), 'y');
  card(t.w, `${dsNum(S.a.J.uJ * 1000, 2)} µm`, `${t.phi} ${dsSig(S.a.J.phiJ * 1000, 3)}·10⁻³ rad`, 'k');
  S.a.res.forEach(r => {
    const c = r.crit, where = r.mb.kind === 'tube' ? `x = ${dsNum(c.x, 1)} mm · ${c.fibre === 'inner' ? t.inner : t.outer}` : `r = ${dsNum(c.r, 1)} mm · ${c.fibre === 'a' ? t.faceA : t.faceB}`;
    card(`${t.crit} · ${jnName(r.mb)}`, `${dsNum(c.seq, 1)} MPa`, where + (r.mb.sy > 0 ? ` · X ${dsNum(r.X, 2)}` : ''), r.mb.sy > 0 ? (r.X >= S.X - 1e-9 ? 'b' : 'r') : 'k');
  });
  if (S.anySy) card(t.wmax, S.wmax === null ? '—' : `${dsNum(S.wmax, 0)} rad/s`, S.wmax === null ? '' : `${dsNum(S.wmax * 60 / (2 * Math.PI), 0)} rpm · X ${dsNum(S.X, 2)}`, 'k');
  dsEl('jnRes').innerHTML = `<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">` +
    (S.anySy ? `<span class="${S.ok ? 'text-emerald-400' : 'text-amber-300'} text-sm font-semibold">${S.ok ? t.ok : t.ko}</span><span class="text-xs text-slate-400">X ≥ ${dsNum(S.X, 2)}</span>` : `<span class="text-xs text-slate-400">${t.noSy}</span>`) +
    `</div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${cards.join('')}</div>`;
}

// sketch: half section above the axis, tube at R, disc in the middle
function jnSketch(J, m) {
  const svg = dsEl('jnSketch'); if (!svg) return;
  const R = +J.R || 1, d = J.d, rOut = d.on && d.pos === 'out' ? Math.max(+d.rOther || R, R) : R;
  const top = Math.max(R + (+J.tL.h || 0), rOut) * 1.1, Y0 = 185, sy = 160 / top, xc = 150;
  const y = r => Y0 - r * sy;
  let g = `<line x1="5" y1="${Y0}" x2="295" y2="${Y0}" stroke="#8a857c" stroke-dasharray="8 3 2 3"/>`;
  g += `<defs><pattern id="jnHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#22211f" stroke-width="0.7" opacity="0.35"/></pattern></defs>`;
  const rect = (x, yT, w, h, fill) => `<rect x="${x}" y="${yT}" width="${w}" height="${Math.max(h, 2)}" fill="${fill}" stroke="#22211f"/><rect x="${x}" y="${yT}" width="${w}" height="${Math.max(h, 2)}" fill="url(#jnHatch)"/>`;
  const dw = d.on ? Math.max(Math.min(+d.h * sy, 40), 5) : 0;
  const ht = h => Math.max(h * sy, 3);
  if (J.tL.on) g += rect(10, y(R + J.tL.h / 2), xc - dw / 2 - 10, ht(+J.tL.h), '#8a9bb0');
  if (J.tR.on) g += rect(xc + dw / 2, y(R + J.tR.h / 2), 290 - xc - dw / 2, ht(+J.tR.h), '#8a9bb0');
  if (d.on) {
    const r1 = d.pos === 'out' ? R : +d.rOther || 0, r2 = d.pos === 'out' ? +d.rOther : R;
    g += rect(xc - dw / 2, y(r2), dw, (r2 - r1) * sy, d.mat === 'alu' ? '#c9b98f' : '#a7b4c4');
  }
  if (+J.p) for (let i = 0; i < 4; i++) g += `<path d="M${40 + i * 70} ${y(R) + 16} l0 -12 m-3 4 l3 -4 l3 4" stroke="#2f66b3" fill="none" stroke-width="1.4"/>`;
  if (J.inc) g += `<rect x="12" y="${y(R - 4)}" width="276" height="${Math.max((R - (+J.rInc || 0) - 4) * sy, 2)}" fill="#e8b321" opacity="0.18"/>`;
  if (+J.n > 0) g += `<text x="12" y="${Y0 - 6}" font-size="12" fill="#b7791f" font-weight="600">ω</text>`;
  g += `<text x="${xc}" y="14" text-anchor="middle" font-size="10.5" fill="#6f6a62">R ${dsNum(R, 0)} mm</text>`;
  svg.innerHTML = g;
}

function jnCharts(S) {
  const t = jnT();
  // tubes: x from −L (left tube) to +L (right tube); σeq and σa, σc of both fibres
  const tubes = S.a.res.filter(r => r.mb.kind === 'tube');
  const L = Math.max(...tubes.map(r => r.field.pts[r.field.pts.length - 1].x));
  const series = [];
  tubes.forEach(r => { const s = r.mb.side === 'L' ? -1 : 1; for (const f of ['inner', 'outer']) series.push({ f, pts: r.field.pts.map(p => ({ x: s * p.x, v: p[f].seq, sa: p[f].sa, sc: p[f].sc })) }); });
  jnPlot(dsEl('jnChartT'), series, -(tubes.some(r => r.mb.side === 'L') ? L : 0), tubes.some(r => r.mb.side === 'R') ? L : 0, 'x [mm]', t);
  jnDeformed(S, tubes, L);
  const disc = S.a.res.find(r => r.mb.kind === 'disc');
  dsEl('jnChartDCard').classList.toggle('hidden', !disc);
  if (disc) {
    const ds = ['a', 'b'].map(f => ({ f: f === 'a' ? 'inner' : 'outer', pts: disc.field.prof.map(p => ({ x: p.r, v: p[f].seq, sa: p[f].sr, sc: p[f].sc })) }));
    const rs = disc.field.prof.map(p => p.r);
    jnPlot(dsEl('jnChartD'), ds, Math.min(...rs), Math.max(...rs), 'r [mm]', t, true);
  }
}
function jnPlot(svg, series, x0, x1, xl, t, disc = false) {
  if (!svg) return;
  const all = series.flatMap(s => s.pts.flatMap(p => [p.v, p.sa, p.sc]));
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all); if (hi - lo < 1) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const X0 = 58, X1 = 620, Y0 = 250, Y1 = 18, x = v => X0 + (v - x0) / Math.max(x1 - x0, 1e-9) * (X1 - X0), y = v => Y0 - (v - lo) / (hi - lo) * (Y0 - Y1);
  let g = '';
  const st = dsNiceStep((hi - lo) / 6);
  for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) g += `<line x1="${X0}" y1="${y(v)}" x2="${X1}" y2="${y(v)}" stroke="#ddd8cd" stroke-width="${Math.abs(v) < 1e-9 ? 1.4 : 0.6}"/><text x="${X0 - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#6f6a62">${dsNum(v, 0)}</text>`;
  const xs = dsNiceStep((x1 - x0) / 6);
  for (let v = Math.ceil(x0 / xs) * xs; v <= x1 + 1e-9; v += xs) g += `<text x="${x(v)}" y="${Y0 + 16}" text-anchor="middle" font-size="10" fill="#6f6a62">${dsNum(v, 0)}</text>`;
  if (!disc && x0 < 0 && x1 > 0) g += `<line x1="${x(0)}" y1="${Y1}" x2="${x(0)}" y2="${Y0}" stroke="#8a857c" stroke-dasharray="4 3"/>`;
  g += `<text x="${X1}" y="${Y0 + 32}" text-anchor="end" font-size="10.5" fill="#6f6a62">${xl}</text><text x="${X0 - 6}" y="${Y1 - 4}" text-anchor="end" font-size="10.5" fill="#6f6a62">MPa</text>`;
  const col = { inner: '#c0392b', outer: '#2f66b3' };
  series.forEach(s => {
    g += `<polyline fill="none" stroke="${col[s.f]}" stroke-width="2.2" points="${s.pts.map(p => `${x(p.x).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>`;
    g += `<polyline fill="none" stroke="${col[s.f]}" stroke-width="1" stroke-dasharray="4 3" opacity="0.7" points="${s.pts.map(p => `${x(p.x).toFixed(1)},${y(p.sa).toFixed(1)}`).join(' ')}"/>`;
  });
  const L1 = disc ? t.faceA : t.inner, L2 = disc ? t.faceB : t.outer;
  g += `<g transform="translate(${X0 + 6},${Y0 + 28})"><line x1="0" y1="0" x2="18" y2="0" stroke="#c0392b" stroke-width="2.4"/><text x="23" y="4" font-size="10.5" fill="#22211f">σeq ${L1}</text></g>` +
    `<g transform="translate(${X0 + 190},${Y0 + 28})"><line x1="0" y1="0" x2="18" y2="0" stroke="#2f66b3" stroke-width="2.4"/><text x="23" y="4" font-size="10.5" fill="#22211f">σeq ${L2}</text></g>` +
    `<g transform="translate(${X0 + 360},${Y0 + 28})"><line x1="0" y1="0" x2="9" y2="0" stroke="#c0392b" stroke-width="1.2" stroke-dasharray="3 2"/><line x1="9" y1="0" x2="18" y2="0" stroke="#2f66b3" stroke-width="1.2" stroke-dasharray="3 2"/><text x="23" y="4" font-size="10.5" fill="#22211f">${disc ? t.dashD : t.dashT}</text></g>`;
  svg.innerHTML = g;
}

function jnTable(S) {
  const t = jnT(), rows = [];
  S.a.res.forEach(r => {
    const nm = jnName(r.mb), F = r.field;
    if (r.mb.kind === 'tube') {
      rows.push([nm, `${t.edge}, ${t.inner}`, F.edge.inner]); rows.push(['', `${t.edge}, ${t.outer}`, F.edge.outer]);
      rows.push(['', `${t.maxAt} ${dsNum(F.crit.x, 1)}, ${F.crit.fibre === 'inner' ? t.inner : t.outer}`, F.crit]); rows.push(['', t.far, F.far]);
    } else {
      const P = F.prof, rim = r.mb.pos === 'inside' ? P[P.length - 1] : P[0], bore = r.mb.pos === 'inside' ? P[0] : P[P.length - 1];
      rows.push([nm, `${t.rim}, ${t.faceA}`, { sa: rim.a.sr, sc: rim.a.sc, seq: rim.a.seq }]); rows.push(['', `${t.rim}, ${t.faceB}`, { sa: rim.b.sr, sc: rim.b.sc, seq: rim.b.seq }]);
      rows.push(['', `${t.bore}, ${t.faceA}`, { sa: bore.a.sr, sc: bore.a.sc, seq: bore.a.seq }]); rows.push(['', `${t.bore}, ${t.faceB}`, { sa: bore.b.sr, sc: bore.b.sc, seq: bore.b.seq }]);
    }
  });
  dsEl('jnTable').innerHTML = `<table class="w-full text-xs text-left min-w-[520px]"><thead><tr class="text-slate-400"><th class="pb-1 pr-2"></th><th class="pr-2">${t.colPt}</th><th class="pr-2">${t.colSa}</th><th class="pr-2">${t.colSc}</th><th class="pr-2">${t.colSeq}</th></tr></thead><tbody>` +
    rows.map(([a, b, p]) => `<tr class="border-t border-slate-700/40"><td class="py-1 pr-2 text-white font-semibold">${a}</td><td class="pr-2 text-slate-300">${b}</td><td class="pr-2 font-mono">${dsNum(p.sa, 1)}</td><td class="pr-2 font-mono">${dsNum(p.sc, 1)}</td><td class="pr-2 font-mono text-white">${dsNum(p.seq, 1)}</td></tr>`).join('') +
    '</tbody></table><p class="text-[11px] text-slate-500 mt-2">MPa</p>';
}

// steps (TeX): constants, coefficients of every member, congruence system, solution, stresses at the edge
function jnStepsData(S) {
  const T = texNum, it = currentLang === 'it', out = [], r = S.a.res;
  const Sci = (x, d = 3) => { if (!Number.isFinite(x) || x === 0) return T(x, 0); const e = Math.floor(Math.log10(Math.abs(x))); return `${T(x / Math.pow(10, e), d - 1)}\\cdot 10^{${e}}`; };
  const nm = mb => (mb.id === 'tL' ? (it ? '\\text{tubo sx}' : '\\text{left tube}') : mb.id === 'tR' ? (it ? '\\text{tubo dx}' : '\\text{right tube}') : (it ? '\\text{disco}' : '\\text{disc}'));
  const eq1 = [];
  r.filter(x => x.mb.kind === 'tube').forEach(x => {
    const mb = x.mb, k = tubeConst(mb), m0 = x.r.m0;
    eq1.push(`${nm(mb)}:\\ D = \\frac{E h^3}{12(1-\\nu^2)} = ${T(k.D / 1000, 0)}\\ \\text{N m},\\quad \\lambda = \\sqrt[4]{\\frac{3(1-\\nu^2)}{R^2 h^2}} = ${T(k.lam * 1000, 2)}\\ \\text{m}^{-1}`);
    eq1.push(`\\quad w^{0} = w^{p} + w^{\\omega} + w^{inc} + w^{\\Delta T} = ${T(m0.wP * 1000, 2)} + ${T(m0.wW * 1000, 2)} + ${T(m0.wI * 1000, 2)} + ${T(m0.wT * 1000, 2)} = ${T(m0.w * 1000, 2)}\\ \\mu\\text{m}` + (m0.pInc ? `,\\quad p_{inc} = \\frac{\\rho_i\\omega^2(R^3 - r_i^3)}{3R} = ${T(m0.pInc, 3)}\\ \\text{MPa}` : ''));
  });
  out.push({ h: it ? 'Costanti dei tubi e stato lontano dal bordo' : 'Tube constants and state far from the edge', eq: eq1, txt: [it ? 'Mariotte per la pressione ($\\sigma_c = pR/h$), $\\sigma_c = \\rho\\omega^2R^2$ per la rotazione, $w = R\\,\\varepsilon_c$.' : 'Mariotte for the pressure ($\\sigma_c = pR/h$), $\\sigma_c = \\rho\\omega^2R^2$ for rotation, $w = R\\,\\varepsilon_c$.'] });
  const eq2 = [];
  r.forEach(x => {
    const c = x.r, mb = x.mb;
    if (mb.kind === 'tube') eq2.push(`${nm(mb)}:\\ w = \\frac{Q}{2D\\lambda^3} ${mb.side === 'L' ? '-' : '+'} \\frac{M}{2D\\lambda^2} + w^0 = ${Sci(c.cwF * 1e-6)}\\,Q ${c.cwM >= 0 ? '+' : '-'} ${Sci(Math.abs(c.cwM) * 1e-3)}\\,M + ${Sci(c.w0 / 1000)},\\quad \\varphi = ${Sci(c.cpF * 1e-3)}\\,Q ${c.cpM >= 0 ? '+' : '-'} ${Sci(Math.abs(c.cpM))}\\,M`);
    else eq2.push(`${nm(mb)}:\\ u(R) = ${Sci(c.cwF * 1e-6)}\\,Q + ${Sci(c.w0 / 1000)}` + (mb.momentLink === false ? `,\\quad M = 0` : mb.bend ? `,\\quad \\varphi = ${Sci(c.cpM)}\\,M ${c.p0 >= 0 ? '+' : '-'} ${Sci(Math.abs(c.p0))}\\ (\\text{${it ? 'piastra' : 'plate'}})` : `,\\quad \\varphi = 0\\ (\\text{${it ? 'rigido' : 'rigid'}})`) + (mb.i ? `,\\quad i = ${T(mb.i * 1000, 1)}\\ \\mu\\text{m}` : ''));
  });
  out.push({ h: it ? 'Coefficienti di ogni elemento (m, N/m, N·m/m)' : 'Coefficients of each element (m, N/m, N·m/m)', eq: eq2, txt: [it ? 'Disco nel suo piano con la soluzione dei dischi ($Q$ come pressione $Q/h$ al bordo); piastra: $\\varphi(R) = \\frac{M R}{D(1+\\nu)} + \\frac{qR^3}{8D(1+\\nu)}$.' : 'Disc in its plane with the disc solution ($Q$ as a pressure $Q/h$ on the edge); plate: $\\varphi(R) = \\frac{M R}{D(1+\\nu)} + \\frac{qR^3}{8D(1+\\nu)}$.'] });
  out.push({ h: it ? 'Congruenza ed equilibrio alla giunzione' : 'Congruence and equilibrium at the junction', eq: [
    `w_k = u_J - i_k,\\quad \\varphi_k = \\varphi_J,\\qquad \\textstyle\\sum Q_k = 0,\\ \\sum M_k = 0`,
    ...r.map(x => `${nm(x.mb)}:\\ Q = ${T(x.F * 1000, 0)}\\ \\text{N/m},\\ M = ${T(x.M, 1)}\\ \\text{N m/m},\\ w = ${T(x.w * 1000, 2)}\\ \\mu\\text{m}`),
    `u_J = ${T(S.a.J.uJ * 1000, 2)}\\ \\mu\\text{m},\\qquad \\varphi_J = ${Sci(S.a.J.phiJ)}\\ \\text{rad}`] , txt: [] });
  const eq4 = [];
  r.forEach(x => {
    const F = x.field, mb = x.mb;
    if (mb.kind === 'tube') {
      const e = F.edge;
      eq4.push(`${nm(mb)},\\ x=0:\\ \\sigma_a = \\pm\\frac{6 M}{h^2} + \\sigma_a^0 = ${T(e.inner.sa, 1)} / ${T(e.outer.sa, 1)},\\quad \\sigma_c = \\frac{E w}{R} \\pm \\nu\\frac{6M}{h^2} + \\sigma_c^0 = ${T(e.inner.sc, 1)} / ${T(e.outer.sc, 1)}\\ \\Rightarrow\\ \\sigma_{eq} = ${T(e.inner.seq, 1)} / ${T(e.outer.seq, 1)}\\ \\text{MPa}`);
      eq4.push(`\\quad \\sigma_{eq,max} = ${T(F.crit.seq, 1)}\\ \\text{MPa}\\ (x = ${T(F.crit.x, 1)}\\ \\text{mm}),\\quad ${it ? '\\text{lontano}' : '\\text{far}'}:\\ ${T(F.far.seq, 1)}\\ \\text{MPa}` + (mb.sy > 0 ? `,\\ X = ${T(x.X, 2)}` : ''));
    } else eq4.push(`${nm(mb)}:\\ \\sigma_{eq,max} = ${T(F.crit.seq, 1)}\\ \\text{MPa}\\ (r = ${T(F.crit.r, 1)}\\ \\text{mm})` + (mb.sy > 0 ? `,\\ X = ${T(x.X, 2)}` : ''));
  });
  out.push({ h: it ? 'Tensioni (fibra interna / esterna)' : 'Stresses (inner / outer fibre)', eq: eq4, txt: [it ? 'Nel tubo: $m(x) = \\frac{Q}{\\lambda}e^{-\\lambda x}\\sin\\lambda x + \\sqrt2 M e^{-\\lambda x}\\sin(\\lambda x + \\pi/4)$; il massimo può cadere a qualche centimetro dal bordo.' : 'In the tube: $m(x) = \\frac{Q}{\\lambda}e^{-\\lambda x}\\sin\\lambda x + \\sqrt2 M e^{-\\lambda x}\\sin(\\lambda x + \\pi/4)$; the maximum can lie a few centimetres from the edge.'] });
  if (S.wmax) out.push({ h: it ? 'Velocità massima' : 'Maximum speed', eq: [`\\max \\sigma_{eq}(\\omega) = \\frac{\\sigma_s}{X} \\;\\Rightarrow\\; \\omega_{max} = ${T(S.wmax, 1)}\\ \\text{rad/s} = ${T(S.wmax * 60 / (2 * Math.PI), 0)}\\ \\text{rpm}`], txt: [] });
  return out;
}
function jnSteps(S) {
  const box = dsEl('jnSteps');
  const draw = () => { if (lastDiscState !== S) return; box.innerHTML = jnStepsData(S).map((s, i) => `<div class="ds-step"><div class="ds-step-h"><span>${i + 1}</span>${s.h}</div>` + s.eq.map(l => `<div class="ds-eq">${dsTex(l)}</div>`).join('') + s.txt.map(x => `<p class="ds-note">${dsTexify(x)}</p>`).join('') + '</div>').join(''); };
  draw();
  if (!window.katex && typeof reportLoadKatex === 'function') {
    if (!dsKatexCss) { dsKatexCss = true; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vendor/katex/katex.min.css'; document.head.appendChild(l); }
    reportLoadKatex().then(ok => { if (ok) draw(); });
  }
}

// deformed shape of the tubes: total radial displacement w(x) (edge effect + membrane), the wall drawn
// magnified around its undeformed position, and the displacement each tube would have without the junction
function jnDeformed(S, tubes, L) {
  const svg = dsEl('jnChartW'); if (!svg) return;
  const t = jnT();
  const lines = tubes.map(r => { const s = r.mb.side === 'L' ? -1 : 1, w0 = r.field.m0.w; return { r, s, w0, pts: r.field.pts.map(p => ({ x: s * p.x, w: (p.w + w0) * 1000 })) }; });
  const all = lines.flatMap(l => l.pts.map(p => p.w).concat([l.w0 * 1000]));
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all); if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const x0 = lines.some(l => l.s < 0) ? -L : 0, x1 = lines.some(l => l.s > 0) ? L : 0;
  const X0 = 58, X1 = 620, Y0 = 250, Y1 = 18, x = v => X0 + (v - x0) / Math.max(x1 - x0, 1e-9) * (X1 - X0), y = v => Y0 - (v - lo) / (hi - lo) * (Y0 - Y1);
  let g = '';
  const st = dsNiceStep((hi - lo) / 6);
  for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) g += `<line x1="${X0}" y1="${y(v)}" x2="${X1}" y2="${y(v)}" stroke="#ddd8cd" stroke-width="0.6"/><text x="${X0 - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#6f6a62">${dsNum(v, Math.abs(st) < 1 ? 1 : 0)}</text>`;
  const xs = dsNiceStep((x1 - x0) / 6);
  for (let v = Math.ceil(x0 / xs) * xs; v <= x1 + 1e-9; v += xs) g += `<text x="${x(v)}" y="${Y0 + 16}" text-anchor="middle" font-size="10" fill="#6f6a62">${dsNum(v, 0)}</text>`;
  // undeformed wall (w = 0) and the wall thickness drawn around the deformed line
  const hpx = 7;
  g += `<rect x="${X0}" y="${y(0) - hpx / 2}" width="${X1 - X0}" height="${hpx}" fill="#b5afa3" opacity="0.35"/><line x1="${X0}" y1="${y(0)}" x2="${X1}" y2="${y(0)}" stroke="#8a857c" stroke-dasharray="6 4"/>`;
  lines.forEach(l => {
    const top = l.pts.map(p => `${x(p.x).toFixed(1)},${(y(p.w) - hpx / 2).toFixed(1)}`), bot = l.pts.slice().reverse().map(p => `${x(p.x).toFixed(1)},${(y(p.w) + hpx / 2).toFixed(1)}`);
    g += `<polygon points="${top.concat(bot).join(' ')}" fill="#8a9bb0" stroke="#22211f" stroke-width="0.8"/>`;
    g += `<line x1="${x(l.pts[0].x)}" y1="${y(l.w0 * 1000)}" x2="${x(l.pts[l.pts.length - 1].x)}" y2="${y(l.w0 * 1000)}" stroke="#b7791f" stroke-width="1.2" stroke-dasharray="3 3"/>`;
  });
  if (x0 < 0 && x1 > 0) g += `<line x1="${x(0)}" y1="${Y1}" x2="${x(0)}" y2="${Y0}" stroke="#8a857c" stroke-dasharray="4 3"/>`;
  const wJ = S.a.J.uJ * 1000;
  g += `<circle cx="${x(0)}" cy="${y(wJ)}" r="4" fill="#c0392b"/><text x="${x(0) + 8}" y="${y(wJ) - 8}" font-size="11" font-weight="600" fill="#c0392b">w = ${dsNum(wJ, 1)} µm</text>`;
  g += `<text x="${X1}" y="${Y0 + 32}" text-anchor="end" font-size="10.5" fill="#6f6a62">x [mm]</text><text x="${X0 - 6}" y="${Y1 - 4}" text-anchor="end" font-size="10.5" fill="#6f6a62">µm</text>`;
  g += `<g transform="translate(${X0 + 6},${Y0 + 28})"><rect x="0" y="-4" width="18" height="8" fill="#8a9bb0" stroke="#22211f" stroke-width="0.6"/><text x="23" y="4" font-size="10.5" fill="#22211f">${t.deformed}</text></g>` +
    `<g transform="translate(${X0 + 190},${Y0 + 28})"><line x1="0" y1="0" x2="18" y2="0" stroke="#8a857c" stroke-dasharray="6 4"/><text x="23" y="4" font-size="10.5" fill="#22211f">${t.undeformed}</text></g>` +
    `<g transform="translate(${X0 + 330},${Y0 + 28})"><line x1="0" y1="0" x2="18" y2="0" stroke="#b7791f" stroke-width="1.2" stroke-dasharray="3 3"/><text x="23" y="4" font-size="10.5" fill="#22211f">${t.wFree}</text></g>`;
  svg.innerHTML = g;
}

// ============================================================================
// DISCS, THICK TUBES AND SHRINK FITS — UI (two tabs: stack of concentric discs, disc of uniform strength)
// Inputs in mm (diameters or radii), GPa, MPa, kg/m³, 10⁻⁶/°C, rpm, N·m, kW; the core works in mm, MPa, N.
// The model lives in dsModel; the inputs are drawn from it and write back into it on every change.
// ============================================================================

const DS_TXT = {
  it: {
    tabs: { stack: '1 · Dischi, tubi e calettamenti', uni: '2 · Disco a uniforme resistenza' },
    intro: 'Elementi concentrici dall\'interno verso l\'esterno: albero, mozzo, anelli. Ogni elemento è un disco di spessore costante (stato piano di tensione). Un solo elemento = disco rotante o tubo spesso in pressione.',
    example: 'Esempio', exPick: 'Carica un esempio…',
    ex: { ex2015: 'Due dischi calettati, distacco in rotazione (esame 11/7/2015)', ex2017: 'Disco d\'alluminio su albero d\'acciaio (esame 10/2/2017)', ex2017b: '… con fascia di composito pretesa (esame 10/2/2017)',
      cl1: 'Albero cavo e mozzo: interferenza per 500 kW (esercizio in classe)', cl2: 'Mozzo d\'acciaio e anello d\'alluminio di spessore diverso: interferenza massima (esercizio in classe)',
      oral: 'Forzamento albero Ø50 in mozzo Ø100 (domanda d\'orale)', vessel: 'Serbatoio a forte spessore con fondelli (Lamé)', flywheel: 'Volano: disco forato in rotazione' },
    geo: 'Elementi e materiali', dims: 'Quote', dimD: 'diametri Ø', dimR: 'raggi R', r0: 'interno del primo elemento', r0Hint: '0 = albero pieno',
    col: { name: 'Elemento', out: 'esterno', h: 'Spessore h', mat: 'Materiale', E: 'E [GPa]', nu: 'ν', rho: 'ρ [kg/m³]', alpha: 'α [10⁻⁶/°C]', sy: 'σs [MPa]', noI: 'senza inerzia' },
    noIHint: 'Spunta "senza inerzia" per trascurare la forza centrifuga di un elemento (come l\'albero negli esercizi).', syHint: 'σs = 0: elemento non verificato.',
    mats: { steel: 'Acciaio', alu: 'Alluminio', castIron: 'Ghisa sferoidale', bronze: 'Bronzo', titanium: 'Titanio Ti6Al4V', composite: 'Composito (carbonio)', custom: 'Personalizzato' },
    add: '+ Aggiungi un anello esterno', remove: 'Rimuovi', names: ['Albero', 'Mozzo', 'Anello', 'Anello esterno'],
    fits: 'Calettamenti (interferenza)', between: (a, b, d) => `Tra ${a} e ${b} · ${d}`, iMode: { iR: 'relativa i_R = i/R [m/m]', rad: 'radiale i [µm]', dia: 'diametrale δ [µm]', iso: 'accoppiamento ISO' },
    which: { max: 'interferenza massima', mean: 'media', min: 'minima' }, isoClear: 'Questo accoppiamento ha gioco: nessun calettamento con questi valori.', isoBad: 'Accoppiamento non valido (es. H7/s6).',
    loads: 'Esercizio', n: 'Velocità di rotazione n', dT: 'Variazione di temperatura ΔT', Pi: 'Pressione interna p_i', ext: 'Carico sul bordo esterno',
    exts: { none: 'nessuno', p: 'pressione esterna p_e', band: 'fascia sottile pretesa', blades: 'pale (forza centrifuga)' }, Pe: 'Pressione esterna p_e', bandS: 'Tensione di pretensionamento σ', bandT: 'Spessore della fascia t',
    bladeF: 'Forza centrifuga totale delle pale', closed: 'Tubo con fondelli (estremità chiuse): σa = p_i·Ri²/(Re²−Ri²)', Xreq: 'Coefficiente di sicurezza richiesto X',
    torque: 'Coppia da trasmettere (facoltativo)', tqOn: 'Calcola l\'interferenza per trasmettere una coppia', tqIf: 'Superficie di calettamento', tqMode: 'Dato', tqT: 'Coppia T', tqP: 'Potenza P', f: 'Attrito f', Xt: 'Sicurezza sulla coppia X',
    res: 'Risultato', rest: 'A fermo (montaggio)', service: 'In esercizio', pc: 'Pressione di calettamento', open: 'staccati', sep: 'Velocità di distacco', noSep: 'non si staccano (la pressione cresce con la velocità)', sepAtRest: 'già staccati da fermi',
    seqMax: 'σeq massima (von Mises)', at: 'in', ok: 'VERIFICATO', ko: 'NON VERIFICATO', noSy: 'σs non indicata: tensioni senza verifica', Xmin: 'X minimo',
    chart: 'Tensioni lungo il raggio', legend: { sr: 'σr radiale', sc: 'σc circonferenziale', seq: 'σeq von Mises', sa: 'σa assiale' },
    table: 'Tensioni nei punti significativi', colEl: 'Elemento', colR: 'r [mm]', colSr: 'σr', colSc: 'σc', colSa: 'σa', colSeq: 'σeq', colU: 'u [µm]', colX: 'X',
    steps: 'Passaggi del calcolo', stepsHint: 'Le formule degli appunti con i numeri di questo calcolo, nell\'ordine in cui si risolve a mano.',
    design: 'Calettamento: coppia, limiti e montaggio', Trest: 'Coppia trasmissibile a fermo', Tserv: 'Coppia trasmissibile in esercizio', need: 'Interferenza necessaria per la coppia',
    iMax: 'Interferenza massima (tutto elastico, a fermo)', iMaxRing: 'governa', heat: 'Riscaldamento del pezzo esterno per il montaggio', heatHint: 'ΔT = i/(R·α), più un gioco di montaggio a piacere',
    invalid: 'Controlla le quote: ogni elemento deve avere il raggio esterno maggiore di quello interno, spessori e moduli elastici positivi.',
    method: 'Metodo degli appunti di Costruzione di Macchine: dischi di spessore costante in stato piano di tensione, soluzione B₁ + B₂/r² con il termine centrifugo, congruenza u_e − u_i = i all\'interfaccia, von Mises. Fra elementi di spessore diverso si conserva la forza radiale per unità di circonferenza (p·h).',
    uni: 'Disco a uniforme resistenza', uniIntro: 'Profilo con σr = σc = σa in ogni punto: h(r) = h_e · exp(ρω²(Re² − r²)/(2σa)). Il disco porta al bordo il carico delle pale; vale solo a questa velocità.',
    uRe: 'Diametro esterno', uSa: 'Tensione ammissibile σa', uN: 'Velocità n', uRho: 'Densità ρ', uLoad: 'Al bordo', uLoads: { F: 'forza delle pale', he: 'spessore al bordo h_e' }, uF: 'Forza centrifuga totale delle pale', uHe: 'Spessore al bordo h_e',
    uH0: 'Spessore al centro h(0)', uHe2: 'Spessore al bordo h_e', uMass: 'Massa del disco', uRatio: 'Rapporto h(0)/h_e', uProfile: 'Profilo del disco (sezione)'
  },
  en: {
    tabs: { stack: '1 · Discs, tubes and shrink fits', uni: '2 · Disc of uniform strength' },
    intro: 'Concentric elements from the inside out: shaft, hub, rings. Each element is a disc of constant thickness (plane stress). A single element = rotating disc or thick tube under pressure.',
    example: 'Example', exPick: 'Load an example…',
    ex: { ex2015: 'Two shrink-fitted discs, separation when spinning (exam 11/7/2015)', ex2017: 'Aluminium disc on a steel shaft (exam 10/2/2017)', ex2017b: '… with a prestressed composite band (exam 10/2/2017)',
      cl1: 'Hollow shaft and hub: interference for 500 kW (class exercise)', cl2: 'Steel hub and aluminium ring of different thickness: maximum interference (class exercise)',
      oral: 'Press fit of a Ø50 shaft in a Ø100 hub (oral exam question)', vessel: 'Thick-walled vessel with end caps (Lamé)', flywheel: 'Flywheel: rotating disc with a bore' },
    geo: 'Elements and materials', dims: 'Dimensions', dimD: 'diameters Ø', dimR: 'radii R', r0: 'inner of the first element', r0Hint: '0 = solid shaft',
    col: { name: 'Element', out: 'outer', h: 'Thickness h', mat: 'Material', E: 'E [GPa]', nu: 'ν', rho: 'ρ [kg/m³]', alpha: 'α [10⁻⁶/°C]', sy: 'σy [MPa]', noI: 'no inertia' },
    noIHint: 'Tick "no inertia" to neglect the centrifugal force of an element (as the shaft in the exercises).', syHint: 'σy = 0: element not checked.',
    mats: { steel: 'Steel', alu: 'Aluminium', castIron: 'Ductile iron', bronze: 'Bronze', titanium: 'Titanium Ti6Al4V', composite: 'Composite (carbon)', custom: 'Custom' },
    add: '+ Add an outer ring', remove: 'Remove', names: ['Shaft', 'Hub', 'Ring', 'Outer ring'],
    fits: 'Shrink fits (interference)', between: (a, b, d) => `Between ${a} and ${b} · ${d}`, iMode: { iR: 'relative i_R = i/R [m/m]', rad: 'radial i [µm]', dia: 'diametral δ [µm]', iso: 'ISO fit' },
    which: { max: 'maximum interference', mean: 'mean', min: 'minimum' }, isoClear: 'This fit has clearance: no shrink fit with these values.', isoBad: 'Invalid fit (e.g. H7/s6).',
    loads: 'Service', n: 'Rotational speed n', dT: 'Temperature change ΔT', Pi: 'Inner pressure p_i', ext: 'Load on the outer rim',
    exts: { none: 'none', p: 'outer pressure p_e', band: 'thin prestressed band', blades: 'blades (centrifugal force)' }, Pe: 'Outer pressure p_e', bandS: 'Prestress σ', bandT: 'Band thickness t',
    bladeF: 'Total centrifugal force of the blades', closed: 'Tube with end caps (closed ends): σa = p_i·Ri²/(Re²−Ri²)', Xreq: 'Required safety factor X',
    torque: 'Torque to transmit (optional)', tqOn: 'Find the interference to transmit a torque', tqIf: 'Fit surface', tqMode: 'Given', tqT: 'Torque T', tqP: 'Power P', f: 'Friction f', Xt: 'Safety on the torque X',
    res: 'Result', rest: 'At rest (assembly)', service: 'In service', pc: 'Contact pressure', open: 'separated', sep: 'Separation speed', noSep: 'they do not separate (the pressure grows with speed)', sepAtRest: 'already separated at rest',
    seqMax: 'Max σeq (von Mises)', at: 'at', ok: 'VERIFIED', ko: 'NOT VERIFIED', noSy: 'σy not given: stresses without check', Xmin: 'Min X',
    chart: 'Stresses along the radius', legend: { sr: 'σr radial', sc: 'σc hoop', seq: 'σeq von Mises', sa: 'σa axial' },
    table: 'Stresses at the significant points', colEl: 'Element', colR: 'r [mm]', colSr: 'σr', colSc: 'σc', colSa: 'σa', colSeq: 'σeq', colU: 'u [µm]', colX: 'X',
    steps: 'Calculation steps', stepsHint: 'The formulas of the notes with the numbers of this calculation, in the order you solve it by hand.',
    design: 'Shrink fit: torque, limits and assembly', Trest: 'Transmissible torque at rest', Tserv: 'Transmissible torque in service', need: 'Interference needed for the torque',
    iMax: 'Maximum interference (all elastic, at rest)', iMaxRing: 'governed by', heat: 'Heating of the outer part for assembly', heatHint: 'ΔT = i/(R·α), plus an assembly clearance if wanted',
    invalid: 'Check the dimensions: each element needs an outer radius larger than its inner one, positive thicknesses and Young\'s moduli.',
    method: 'Method of the Machine Design notes: discs of constant thickness in plane stress, solution B₁ + B₂/r² with the centrifugal term, congruence u_e − u_i = i at the interface, von Mises. Between elements of different thickness the radial force per unit circumference (p·h) is the same.',
    uni: 'Disc of uniform strength', uniIntro: 'Profile with σr = σc = σa everywhere: h(r) = h_e · exp(ρω²(Re² − r²)/(2σa)). The disc carries the blade load at the rim; it holds only at this speed.',
    uRe: 'Outer diameter', uSa: 'Allowable stress σa', uN: 'Speed n', uRho: 'Density ρ', uLoad: 'At the rim', uLoads: { F: 'blade force', he: 'rim thickness h_e' }, uF: 'Total centrifugal force of the blades', uHe: 'Rim thickness h_e',
    uH0: 'Thickness at the centre h(0)', uHe2: 'Rim thickness h_e', uMass: 'Disc mass', uRatio: 'Ratio h(0)/h_e', uProfile: 'Disc profile (section)'
  }
};
function dsT() { return DS_TXT[currentLang] || DS_TXT.en; }
function dsEl(id) { return document.getElementById(id); }
function dsNum(x, n = 2) { if (!Number.isFinite(x)) return x === Infinity ? '∞' : '—'; if (Math.abs(x) < 0.5 * Math.pow(10, -n)) x = 0; return x.toLocaleString(currentLang === 'it' ? 'it-IT' : 'en-GB', { minimumFractionDigits: n, maximumFractionDigits: n }); }
function dsSig(x, s = 4) { if (!Number.isFinite(x) || x === 0) return dsNum(x, 0); const n = Math.max(0, s - 1 - Math.floor(Math.log10(Math.abs(x)))); return dsNum(x, Math.min(n, 8)); }

// ---- model -------------------------------------------------------------------------------------------------
const DS_MAT_KEYS = ['steel', 'alu', 'castIron', 'bronze', 'titanium', 'composite', 'custom'];
function dsRingFrom(mat, Re, h, extra = {}) {
  const m = DISC_MATERIALS[mat] || DISC_MATERIALS.steel;
  return { name: '', Re, h, mat, E: m.E / 1000, nu: m.nu, rho: m.rho, alpha: m.alpha * 1e6, sy: m.sy, noI: false, ...extra };
}
function dsDefaultModel() {
  return {
    dim: 'd', r0: 0,
    rings: [dsRingFrom('steel', 50, 60, { noI: true }), dsRingFrom('steel', 150, 60)],
    ifs: [{ mode: 'iR', v: 0.001, fit: 'H7/s6', which: 'max' }],
    n: 3000, dT: 0, Pi: 0, ext: 'none', Pe: 0, bandS: 500, bandT: 20, bladeF: 100, closed: false, Xreq: 1.5,
    tq: { on: false, k: 0, mode: 'T', T: 2000, P: 50, f: 0.15, X: 2 },
    uni: { D: 800, sa: 200, n: 6000, rho: 7800, load: 'F', F: 500, he: 20 }
  };
}
// names of the example elements, in the language of the page when they are loaded
function dsNm(k) {
  const it = { inner: 'disco interno', outer: 'disco esterno', shaft: 'albero', disc: 'disco', hollow: 'albero cavo', hub: 'mozzo', steelHub: 'mozzo in acciaio', aluRing: 'anello in alluminio', tube: 'tubo', flywheel: 'volano' };
  const en = { inner: 'inner disc', outer: 'outer disc', shaft: 'shaft', disc: 'disc', hollow: 'hollow shaft', hub: 'hub', steelHub: 'steel hub', aluRing: 'aluminium ring', tube: 'tube', flywheel: 'flywheel' };
  return (typeof currentLang !== 'undefined' && currentLang === 'it' ? it : en)[k];
}
const DS_PRESETS = {
  ex2015: () => ({ ...dsDefaultModel(), dim: 'r', r0: 250, rings: [dsRingFrom('steel', 380, 50, { sy: 0, name: dsNm('inner') }), dsRingFrom('steel', 540, 50, { sy: 0, name: dsNm('outer') })], ifs: [{ mode: 'iR', v: 0.0012, fit: 'H7/s6', which: 'max' }], n: 5000, Xreq: 1 }),
  ex2017: () => ({ ...dsDefaultModel(), dim: 'd', r0: 0, rings: [dsRingFrom('steel', 100, 50, { noI: true, sy: 0, name: dsNm('shaft') }), dsRingFrom('alu', 300, 50, { sy: 0, name: dsNm('disc') })], ifs: [{ mode: 'iR', v: 0.001, fit: 'H7/s6', which: 'max' }], n: 3000, Xreq: 1 }),
  ex2017b: () => ({ ...DS_PRESETS.ex2017(), ext: 'band', bandS: 500, bandT: 20 }),
  cl1: () => ({ ...dsDefaultModel(), dim: 'r', r0: 100, rings: [dsRingFrom('steel', 200, 60, { sy: 0, name: dsNm('hollow') }), dsRingFrom('steel', 600, 60, { sy: 0, name: dsNm('hub') })], ifs: [{ mode: 'iR', v: 2.18e-4, fit: 'H7/s6', which: 'max' }], n: 1000, Xreq: 1,
    tq: { on: true, k: 0, mode: 'P', T: 4775, P: 500, f: 0.15, X: 3 } }),
  cl2: () => ({ ...dsDefaultModel(), dim: 'r', r0: 150, rings: [dsRingFrom('steel', 230, 60, { E: 210, sy: 460, name: dsNm('steelHub') }), dsRingFrom('alu', 290, 80, { sy: 280, name: dsNm('aluRing') })], ifs: [{ mode: 'iR', v: 0.0046, fit: 'H7/s6', which: 'max' }], n: 0, Xreq: 1 }),
  oral: () => ({ ...dsDefaultModel(), dim: 'd', r0: 0, rings: [dsRingFrom('steel', 50, 68.6, { sy: 340, name: dsNm('shaft') }), dsRingFrom('steel', 100, 68.6, { sy: 340, name: dsNm('hub') })], ifs: [{ mode: 'iR', v: 9.33e-4, fit: 'H7/s6', which: 'max' }], n: 0, Xreq: 1,
    tq: { on: true, k: 0, mode: 'T', T: 2830, P: 50, f: 0.15, X: 1 } }),
  vessel: () => ({ ...dsDefaultModel(), dim: 'd', r0: 200, rings: [dsRingFrom('steel', 300, 100, { name: dsNm('tube') })], ifs: [], n: 0, Pi: 100, closed: true, Xreq: 1.5 }),
  flywheel: () => ({ ...dsDefaultModel(), dim: 'd', r0: 100, rings: [dsRingFrom('steel', 800, 80, { name: dsNm('flywheel') })], ifs: [], n: 3000, Xreq: 1.5 })
};
let dsModel = dsDefaultModel();
let dsMode = 'stack', dsView = 'service';
let lastDiscState = null;

// radii (mm) from the model
function dsRadii(M = dsModel) {
  const k = M.dim === 'd' ? 0.5 : 1;
  return { r0: Math.max(0, (+M.r0 || 0) * k), Re: M.rings.map(r => (+r.Re || 0) * k) };
}

// interference of interface k as radial i [mm]; info for the label
function dsInterference(k, M = dsModel) {
  const f = M.ifs[k] || { mode: 'iR', v: 0 }, R = dsRadii(M).Re[k];
  if (f.mode === 'iR') return { i: (+f.v || 0) * R };
  if (f.mode === 'rad') return { i: (+f.v || 0) / 1000 };
  if (f.mode === 'dia') return { i: (+f.v || 0) / 2000 };
  // ISO fit on the diameter 2R: interference = − clearance
  if (typeof parseFit !== 'function' || !parseFit(f.fit)) return { i: 0, err: 'bad' };
  const a = analyzeFit(findIsoStep(2 * R), f.fit);
  const delta = f.which === 'min' ? -a.maxPlay : f.which === 'mean' ? -(a.maxPlay + a.minPlay) / 2 : -a.minPlay;   // µm, diametral
  return { i: Math.max(0, delta) / 2000, iso: a, delta, err: delta <= 0 ? 'clear' : null };
}

// input of the core
function dsCoreInput(M = dsModel) {
  const { r0, Re } = dsRadii(M);
  const rings = M.rings.map((r, k) => ({
    Ri: k === 0 ? r0 : Re[k - 1], Re: Re[k], h: +r.h || 0, E: (+r.E || 0) * 1000, nu: +r.nu || 0, rho: +r.rho || 0,
    alpha: (+r.alpha || 0) * 1e-6, sy: +r.sy || 0, noInertia: !!r.noI
  }));
  const iRad = M.ifs.slice(0, rings.length - 1).map((f, k) => dsInterference(k, M).i);
  const omega = rpmToRad(+M.n || 0);
  let torque = null;
  if (M.tq.on && rings.length > 1) {
    const T = M.tq.mode === 'P' ? (omega > 0 ? (+M.tq.P || 0) * 1e3 / omega * 1e3 : 0) : (+M.tq.T || 0) * 1e3;
    torque = { k: Math.min(+M.tq.k || 0, rings.length - 2), T, f: +M.tq.f || 0, X: +M.tq.X || 1 };
  }
  return {
    rings, iRad, n: +M.n || 0, dT: +M.dT || 0, Pi: r0 > 0 ? (+M.Pi || 0) : 0,
    Pe: M.ext === 'p' ? (+M.Pe || 0) : 0, band: M.ext === 'band' ? { sigma: +M.bandS || 0, t: +M.bandT || 0 } : null,
    bladeF: M.ext === 'blades' ? (+M.bladeF || 0) * 1000 : 0, closedEnds: r0 > 0 && !!M.closed, torque, Xreq: +M.Xreq || 1
  };
}

function dsValid(inp) {
  return inp.rings.length > 0 && inp.rings.every(r => r.Re > r.Ri + 1e-9 && r.h > 0 && r.E > 0 && r.nu >= 0 && r.nu < 0.5 && r.rho >= 0);
}

// ---- share / project encoding (one parameter) ------------------------------------------------------------------
function dsEncode() {
  const M = dsModel;
  const o = { d: M.dim, r0: M.r0, R: M.rings.map(r => [r.name || '', r.Re, r.h, r.mat, r.E, r.nu, r.rho, r.alpha, r.sy, r.noI ? 1 : 0]),
    I: M.ifs.slice(0, M.rings.length - 1).map(f => [f.mode, f.v, f.fit, f.which]), n: M.n, dT: M.dT, Pi: M.Pi, x: M.ext, Pe: M.Pe, bS: M.bandS, bT: M.bandT, bF: M.bladeF, c: M.closed ? 1 : 0, X: M.Xreq,
    t: [M.tq.on ? 1 : 0, M.tq.k, M.tq.mode, M.tq.T, M.tq.P, M.tq.f, M.tq.X], u: [M.uni.D, M.uni.sa, M.uni.n, M.uni.rho, M.uni.load, M.uni.F, M.uni.he] };
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch (e) { return ''; }
}
function dsDecode(s) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')))));
    const M = dsDefaultModel(), num = (v, d) => (Number.isFinite(+v) ? +v : d);
    M.dim = o.d === 'r' ? 'r' : 'd'; M.r0 = num(o.r0, 0);
    if (Array.isArray(o.R) && o.R.length) M.rings = o.R.slice(0, 4).map(a => ({ name: String(a[0] || '').slice(0, 40), Re: num(a[1], 100), h: num(a[2], 50), mat: DS_MAT_KEYS.includes(a[3]) ? a[3] : 'custom', E: num(a[4], 200), nu: num(a[5], 0.3), rho: num(a[6], 7800), alpha: num(a[7], 12), sy: num(a[8], 0), noI: !!a[9] }));
    M.ifs = (o.I || []).map(a => ({ mode: ['iR', 'rad', 'dia', 'iso'].includes(a[0]) ? a[0] : 'iR', v: num(a[1], 0), fit: String(a[2] || 'H7/s6').slice(0, 12), which: ['max', 'mean', 'min'].includes(a[3]) ? a[3] : 'max' }));
    while (M.ifs.length < M.rings.length - 1) M.ifs.push({ mode: 'iR', v: 0.001, fit: 'H7/s6', which: 'max' });
    Object.assign(M, { n: num(o.n, 0), dT: num(o.dT, 0), Pi: num(o.Pi, 0), ext: ['none', 'p', 'band', 'blades'].includes(o.x) ? o.x : 'none', Pe: num(o.Pe, 0), bandS: num(o.bS, 500), bandT: num(o.bT, 20), bladeF: num(o.bF, 100), closed: !!o.c, Xreq: num(o.X, 1.5) });
    if (Array.isArray(o.t)) M.tq = { on: !!o.t[0], k: num(o.t[1], 0), mode: o.t[2] === 'P' ? 'P' : 'T', T: num(o.t[3], 1000), P: num(o.t[4], 50), f: num(o.t[5], 0.15), X: num(o.t[6], 2) };
    if (Array.isArray(o.u)) M.uni = { D: num(o.u[0], 800), sa: num(o.u[1], 200), n: num(o.u[2], 6000), rho: num(o.u[3], 7800), load: o.u[4] === 'he' ? 'he' : 'F', F: num(o.u[5], 500), he: num(o.u[6], 20) };
    return M;
  } catch (e) { return null; }
}
function dsLoad(M) { if (!M) return; dsModel = M; dsRenderInputs(); calculateDiscs(); }

// ---- building the page ---------------------------------------------------------------------------------------
const DS_IN = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
const DS_IN_S = 'w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-white text-[13px] focus:ring-2 focus:ring-blue-500 focus:outline-none';
const DS_LBL = 'block text-xs font-semibold text-slate-300 tracking-wide mb-1.5';
const DS_CARD = 'bg-slate-800/60 p-5 rounded-xl border border-slate-700/60 mb-4';
function dsInput(id, val, unit, attrs = '') { return `<div class="relative"><input type="number" id="${id}" value="${val}" step="any" ${attrs} class="${DS_IN}">${unit ? `<span class="absolute right-3 top-2 text-slate-400 font-medium text-xs pointer-events-none">${unit}</span>` : ''}</div>`; }
function dsField(id, lbl, inner, wrap = '') { return `<div ${wrap}><label class="${DS_LBL}" for="${id}" data-ds="${lbl}"></label>${inner}</div>`; }

function dsBuild() {
  const sec = dsEl('moduleDiscsSection');
  if (!sec || sec.dataset.built) return;
  sec.dataset.built = '1';
  sec.innerHTML = `
  <div class="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3" id="dsTabs"></div>
  <div id="dsStack">
    <div class="${DS_CARD}">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
        <p class="text-xs text-slate-400 max-w-2xl" data-ds="intro"></p>
        <select id="dsPreset" class="${DS_IN} !w-auto max-w-full" aria-label="Example"></select>
      </div>
    </div>
    <div class="${DS_CARD}">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-3">
        <h3 class="text-sm font-semibold text-white" data-ds="geo"></h3>
        <div class="flex flex-wrap items-end gap-3">
          <div><label class="${DS_LBL}" data-ds="dims"></label><select id="dsDim" class="${DS_IN_S}"><option value="d"></option><option value="r"></option></select></div>
          <div class="w-40"><label class="${DS_LBL}" id="dsR0Lbl"></label>${dsInput('dsR0', 0, 'mm', 'min="0"')}<p class="text-[11px] text-slate-500 mt-1" data-ds="r0Hint"></p></div>
        </div>
      </div>
      <div class="grid grid-cols-1 2xl:grid-cols-[1fr_260px] gap-4">
        <div class="overflow-x-auto"><table class="w-full text-xs text-left min-w-[760px]" id="dsRingTable"></table>
          <button type="button" id="dsAdd" class="mt-2 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:border-blue-500/60" data-ds="add"></button>
          <p class="text-[11px] text-slate-500 mt-2"><span data-ds="noIHint"></span> <span data-ds="syHint"></span></p></div>
        <div class="rounded-lg bg-slate-950/70 border border-slate-800 p-2 max-w-[320px] w-full self-start"><svg id="dsSketch" viewBox="0 0 260 230" class="w-full h-auto" font-family="Archivo, Arial, sans-serif" role="img" aria-label="Section"></svg></div>
      </div>
    </div>
    <div class="${DS_CARD}" id="dsFitsCard"><h3 class="text-sm font-semibold text-white mb-3" data-ds="fits"></h3><div id="dsFits" class="space-y-3"></div></div>
    <div class="${DS_CARD}">
      <h3 class="text-sm font-semibold text-white mb-3" data-ds="loads"></h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${dsField('dsN', 'n', dsInput('dsN', 0, 'rpm', 'min="0"'))}
        ${dsField('dsDT', 'dT', dsInput('dsDT', 0, '°C'))}
        ${dsField('dsPi', 'Pi', dsInput('dsPi', 0, 'MPa'), 'id="dsPiCol"')}
        ${dsField('dsExt', 'ext', `<select id="dsExt" class="${DS_IN}"><option value="none"></option><option value="p"></option><option value="band"></option><option value="blades"></option></select>`)}
        ${dsField('dsPe', 'Pe', dsInput('dsPe', 0, 'MPa'), 'id="dsPeCol"')}
        ${dsField('dsBandS', 'bandS', dsInput('dsBandS', 500, 'MPa', 'min="0"'), 'id="dsBandSCol"')}
        ${dsField('dsBandT', 'bandT', dsInput('dsBandT', 20, 'mm', 'min="0"'), 'id="dsBandTCol"')}
        ${dsField('dsBladeF', 'bladeF', dsInput('dsBladeF', 100, 'kN', 'min="0"'), 'id="dsBladeCol"')}
        ${dsField('dsXreq', 'Xreq', dsInput('dsXreq', 1.5, '', 'min="1"'))}
      </div>
      <label class="flex items-center gap-2 mt-3 text-xs text-slate-300" id="dsClosedCol"><input type="checkbox" id="dsClosed" class="w-4 h-4"> <span data-ds="closed"></span></label>
    </div>
    <div class="${DS_CARD}" id="dsTqCard">
      <h3 class="text-sm font-semibold text-white mb-2" data-ds="torque"></h3>
      <label class="flex items-center gap-2 mb-3 text-xs text-slate-300"><input type="checkbox" id="dsTqOn" class="w-4 h-4"> <span data-ds="tqOn"></span></label>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3" id="dsTqBox">
        ${dsField('dsTqK', 'tqIf', `<select id="dsTqK" class="${DS_IN}"></select>`, 'id="dsTqKCol"')}
        ${dsField('dsTqMode', 'tqMode', `<select id="dsTqMode" class="${DS_IN}"><option value="T"></option><option value="P"></option></select>`)}
        ${dsField('dsTqT', 'tqT', dsInput('dsTqT', 1000, 'N·m', 'min="0"'), 'id="dsTqTCol"')}
        ${dsField('dsTqP', 'tqP', dsInput('dsTqP', 50, 'kW', 'min="0"'), 'id="dsTqPCol"')}
        ${dsField('dsTqF', 'f', dsInput('dsTqF', 0.15, '', 'min="0"'))}
        ${dsField('dsTqX', 'Xt', dsInput('dsTqX', 2, '', 'min="1"'))}
      </div>
    </div>
    <div class="${DS_CARD}" id="dsResCard"><h3 class="text-sm font-semibold text-white mb-3" data-ds="res"></h3><div id="dsRes"></div></div>
    <div class="${DS_CARD}" id="dsChartCard">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-2"><h3 class="text-sm font-semibold text-white" data-ds="chart"></h3><div id="dsViewBtns" class="flex gap-1"></div></div>
      <div class="rounded-lg bg-slate-950/70 border border-slate-800 p-2"><svg id="dsChart" viewBox="0 0 640 300" class="w-full h-auto" font-family="Archivo, Arial, sans-serif" role="img" aria-label="Stresses"></svg></div>
    </div>
    <div class="${DS_CARD} overflow-x-auto" id="dsTableCard"><h3 class="text-sm font-semibold text-white mb-3" data-ds="table"></h3><div id="dsTable"></div></div>
    <div class="${DS_CARD}" id="dsDesignCard"><h3 class="text-sm font-semibold text-white mb-3" data-ds="design"></h3><div id="dsDesign"></div></div>
    <div class="${DS_CARD}" id="dsStepsCard"><h3 class="text-sm font-semibold text-white mb-1" data-ds="steps"></h3><p class="text-[11px] text-slate-500 mb-3" data-ds="stepsHint"></p><div id="dsSteps" class="ds-steps"></div></div>
  </div>
  <div id="dsUni" class="hidden">
    <div class="${DS_CARD}">
      <h3 class="text-sm font-semibold text-white mb-1" data-ds="uni"></h3><p class="text-xs text-slate-400 mb-3" data-ds="uniIntro"></p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${dsField('duD', 'uRe', dsInput('duD', 800, 'mm', 'min="1"'))}
        ${dsField('duSa', 'uSa', dsInput('duSa', 200, 'MPa', 'min="1"'))}
        ${dsField('duN', 'uN', dsInput('duN', 6000, 'rpm', 'min="0"'))}
        ${dsField('duRho', 'uRho', dsInput('duRho', 7800, 'kg/m³', 'min="0"'))}
        ${dsField('duLoad', 'uLoad', `<select id="duLoad" class="${DS_IN}"><option value="F"></option><option value="he"></option></select>`)}
        ${dsField('duF', 'uF', dsInput('duF', 500, 'kN', 'min="0"'), 'id="duFCol"')}
        ${dsField('duHe', 'uHe', dsInput('duHe', 20, 'mm', 'min="0"'), 'id="duHeCol"')}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4"><div id="duRes" class="text-xs"></div>
        <div class="rounded-lg bg-slate-950/70 border border-slate-800 p-2"><svg id="duChart" viewBox="0 0 420 240" class="w-full h-auto" font-family="Archivo, Arial, sans-serif"></svg></div></div>
      <div id="duSteps" class="ds-steps mt-4"></div>
    </div>
  </div>
  <p class="text-[11px] text-slate-500 -mt-1 mb-6" data-ds="method"></p>`;
  dsEl('dsTabs').addEventListener('click', ev => { const b = ev.target.closest('button[data-mode]'); if (b) setDiscMode(b.dataset.mode); });
  dsEl('dsViewBtns').addEventListener('click', ev => { const b = ev.target.closest('button[data-view]'); if (b) { dsView = b.dataset.view; calculateDiscs(); } });
  dsEl('dsPreset').addEventListener('change', ev => { const k = ev.target.value; ev.target.value = ''; if (DS_PRESETS[k]) { dsLoad(DS_PRESETS[k]()); if (typeof syncShareUrl === 'function') syncShareUrl(); } });
  dsEl('dsAdd').addEventListener('click', () => {
    if (dsModel.rings.length >= 4) return;
    const last = dsModel.rings[dsModel.rings.length - 1];
    dsModel.rings.push(dsRingFrom('steel', Math.round((+last.Re || 100) * 1.3), +last.h || 50));
    while (dsModel.ifs.length < dsModel.rings.length - 1) dsModel.ifs.push({ mode: 'iR', v: 0.001, fit: 'H7/s6', which: 'max' });
    dsRenderInputs(); calculateDiscs();
  });
  dsEl('dsRingTable').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-rm]'); if (!b) return;
    const k = +b.dataset.rm; if (dsModel.rings.length <= 1) return;
    dsModel.rings.splice(k, 1); dsModel.ifs.splice(Math.min(k, dsModel.ifs.length - 1), 1);
    dsRenderInputs(); calculateDiscs();
  });
  sec.addEventListener('input', dsOnInput);
  sec.addEventListener('change', dsOnInput);
  dsRenderInputs();
}

// the ring table and the interface rows (redrawn only when their number or the language changes)
function dsRenderInputs() {
  if (!dsEl('dsRingTable')) return;
  const t = dsT(), M = dsModel, c = t.col;
  const o = (v, txt, sel) => `<option value="${v}" ${sel ? 'selected' : ''}>${txt}</option>`;
  const dimL = M.dim === 'd' ? 'Ø' : 'R';
  dsEl('dsRingTable').innerHTML = `<thead><tr class="text-slate-400"><th class="pb-1 pr-2">#</th><th class="pr-2">${c.name}</th><th class="pr-2">${dimL} ${c.out} [mm]</th><th class="pr-2">${c.h} [mm]</th><th class="pr-2">${c.mat}</th><th class="pr-2">${c.E}</th><th class="pr-2">${c.nu}</th><th class="pr-2">${c.rho}</th><th class="pr-2">${c.alpha}</th><th class="pr-2">${c.sy}</th><th class="pr-2 text-center">${c.noI}</th><th></th></tr></thead><tbody>` +
    M.rings.map((r, k) => `<tr data-k="${k}" class="border-t border-slate-700/50">
      <td class="py-1.5 pr-2 font-mono text-slate-400">${k + 1}</td>
      <td class="pr-2"><input type="text" id="dsName${k}" data-f="name" value="${(r.name || '').replace(/"/g, '&quot;')}" placeholder="${t.names[Math.min(k, 3)]}" class="${DS_IN_S} min-w-[90px]"></td>
      <td class="pr-2"><input type="number" step="any" min="0" id="dsRe${k}" data-f="Re" value="${r.Re}" class="${DS_IN_S} w-20"></td>
      <td class="pr-2"><input type="number" step="any" min="0" id="dsH${k}" data-f="h" value="${r.h}" class="${DS_IN_S} w-20"></td>
      <td class="pr-2"><select id="dsMat${k}" data-f="mat" class="${DS_IN_S} min-w-[110px]">${DS_MAT_KEYS.map(m => o(m, t.mats[m], m === r.mat)).join('')}</select></td>
      <td class="pr-2"><input type="number" step="any" min="0" id="dsE${k}" data-f="E" value="${r.E}" class="${DS_IN_S} w-16"></td>
      <td class="pr-2"><input type="number" step="any" min="0" max="0.5" id="dsNu${k}" data-f="nu" value="${r.nu}" class="${DS_IN_S} w-14"></td>
      <td class="pr-2"><input type="number" step="any" min="0" id="dsRho${k}" data-f="rho" value="${r.rho}" class="${DS_IN_S} w-20"></td>
      <td class="pr-2"><input type="number" step="any" id="dsAl${k}" data-f="alpha" value="${r.alpha}" class="${DS_IN_S} w-16"></td>
      <td class="pr-2"><input type="number" step="any" min="0" id="dsSy${k}" data-f="sy" value="${+r.sy || 0}" class="${DS_IN_S} w-16"></td>
      <td class="pr-2 text-center"><input type="checkbox" id="dsNoI${k}" data-f="noI" ${r.noI ? 'checked' : ''} class="w-4 h-4"></td>
      <td>${M.rings.length > 1 ? `<button type="button" data-rm="${k}" title="${t.remove}" aria-label="${t.remove}" class="px-2 py-1 text-slate-400 hover:text-rose-400">✕</button>` : ''}</td></tr>`).join('') + '</tbody>';
  dsEl('dsAdd').classList.toggle('hidden', M.rings.length >= 4);
  // interfaces
  const { Re } = dsRadii(M);
  const nm = k => (M.rings[k].name || t.names[Math.min(k, 3)]);
  dsEl('dsFits').innerHTML = M.rings.slice(0, -1).map((r, k) => {
    const f = M.ifs[k] || (M.ifs[k] = { mode: 'iR', v: 0.001, fit: 'H7/s6', which: 'max' });
    return `<div class="grid grid-cols-2 md:grid-cols-4 gap-3 items-end" data-if="${k}">
      <div class="col-span-2 md:col-span-4 text-xs font-semibold text-slate-300">${t.between(`${k + 1} ${nm(k)}`, `${k + 2} ${nm(k + 1)}`, `Ø ${dsNum(2 * Re[k], 1)} mm`)}</div>
      <div><select id="dsIfMode${k}" data-g="mode" class="${DS_IN}">${['iR', 'rad', 'dia', 'iso'].map(m => o(m, t.iMode[m], m === f.mode)).join('')}</select></div>
      <div class="${f.mode === 'iso' ? 'hidden' : ''}"><input type="number" step="any" id="dsIfV${k}" data-g="v" value="${f.v}" class="${DS_IN}" aria-label="i"></div>
      <div class="${f.mode === 'iso' ? '' : 'hidden'}"><input type="text" id="dsIfFit${k}" data-g="fit" value="${f.fit}" class="${DS_IN}" aria-label="ISO" placeholder="H7/s6"></div>
      <div class="${f.mode === 'iso' ? '' : 'hidden'}"><select id="dsIfWhich${k}" data-g="which" class="${DS_IN}">${['max', 'mean', 'min'].map(w => o(w, t.which[w], w === f.which)).join('')}</select></div>
      <div class="col-span-2 md:col-span-4 text-[11px] font-mono text-slate-400" id="dsIfInfo${k}"></div></div>`;
  }).join('');
  dsEl('dsFitsCard').classList.toggle('hidden', M.rings.length < 2);
  // plain inputs
  const set = (id, v) => { const e = dsEl(id); if (!e) return; if (e.type === 'checkbox') e.checked = !!v; else e.value = v; };
  set('dsDim', M.dim); set('dsR0', M.r0); set('dsN', M.n); set('dsDT', M.dT); set('dsPi', M.Pi); set('dsExt', M.ext); set('dsPe', M.Pe); set('dsBandS', M.bandS); set('dsBandT', M.bandT);
  set('dsBladeF', M.bladeF); set('dsXreq', M.Xreq); set('dsClosed', M.closed);
  set('dsTqOn', M.tq.on); set('dsTqMode', M.tq.mode); set('dsTqT', M.tq.T); set('dsTqP', M.tq.P); set('dsTqF', M.tq.f); set('dsTqX', M.tq.X);
  dsEl('dsTqK').innerHTML = M.rings.slice(0, -1).map((r, k) => o(k, `${k + 1} / ${k + 2} · Ø ${dsNum(2 * Re[k], 1)}`, k === +M.tq.k)).join('');
  set('duD', M.uni.D); set('duSa', M.uni.sa); set('duN', M.uni.n); set('duRho', M.uni.rho); set('duLoad', M.uni.load); set('duF', M.uni.F); set('duHe', M.uni.he);
  dsInputsLang = currentLang;
  dsLabelLang = null; dsRelabel();
}
let dsInputsLang = null;

// one input changed: write it into the model
function dsOnInput(ev) {
  const e = ev.target; if (!e || !e.id || e.id === 'dsPreset') return;
  const M = dsModel, v = e.type === 'checkbox' ? e.checked : e.value;
  const tr = e.closest('tr[data-k]'), fi = e.closest('[data-if]');
  let redraw = false;
  if (tr && e.dataset.f) {
    const r = M.rings[+tr.dataset.k], f = e.dataset.f;
    if (f === 'name') r.name = v;
    else if (f === 'noI') r.noI = !!v;
    else if (f === 'mat') {
      r.mat = v;
      if (DISC_MATERIALS[v]) { const m = DISC_MATERIALS[v]; Object.assign(r, { E: m.E / 1000, nu: m.nu, rho: m.rho, alpha: Math.round(m.alpha * 1e7) / 10, sy: m.sy }); redraw = true; }
    } else {
      r[f] = v === '' ? '' : +v;
      if (['E', 'nu', 'rho', 'alpha', 'sy'].includes(f) && r.mat !== 'custom' && ev.type === 'input') { r.mat = 'custom'; const s = dsEl('dsMat' + tr.dataset.k); if (s) s.value = 'custom'; }
      if (f === 'Re' && ev.type === 'change') redraw = true;   // labels of the interfaces
    }
  } else if (fi && e.dataset.g) {
    const f = M.ifs[+fi.dataset.if], g = e.dataset.g;
    if (g === 'mode') {
      // keep the same interference when the way of giving it changes
      const k = +fi.dataset.if, i = dsInterference(k).i, R = dsRadii().Re[k];
      f.mode = v; f.v = v === 'iR' ? +(i / R).toPrecision(4) : v === 'rad' ? +(i * 1000).toPrecision(4) : v === 'dia' ? +(i * 2000).toPrecision(4) : f.v;
      redraw = true;
    } else if (g === 'v') f.v = v === '' ? '' : +v; else f[g] = v;
  } else {
    const map = { dsDim: 'dim', dsR0: 'r0', dsN: 'n', dsDT: 'dT', dsPi: 'Pi', dsExt: 'ext', dsPe: 'Pe', dsBandS: 'bandS', dsBandT: 'bandT', dsBladeF: 'bladeF', dsXreq: 'Xreq', dsClosed: 'closed' };
    const tq = { dsTqOn: 'on', dsTqK: 'k', dsTqMode: 'mode', dsTqT: 'T', dsTqP: 'P', dsTqF: 'f', dsTqX: 'X' };
    const un = { duD: 'D', duSa: 'sa', duN: 'n', duRho: 'rho', duLoad: 'load', duF: 'F', duHe: 'he' };
    const num = x => (x === '' ? '' : (typeof x === 'boolean' ? x : (isNaN(+x) ? x : +x)));
    if (e.id === 'dsDim' && v !== M.dim) {
      // same geometry, other way of writing it
      const f = v === 'd' ? 2 : 0.5;
      M.r0 = +(M.r0 * f).toFixed(4); M.rings.forEach(r => { r.Re = +((+r.Re || 0) * f).toFixed(4); });
      M.dim = v; redraw = true;
    } else if (map[e.id]) M[map[e.id]] = ['dsExt', 'dsDim'].includes(e.id) ? v : num(v);
    else if (tq[e.id]) M.tq[tq[e.id]] = e.id === 'dsTqMode' ? v : num(v);
    else if (un[e.id]) M.uni[un[e.id]] = e.id === 'duLoad' ? v : num(v);
    if (e.id === 'dsR0' && ev.type === 'change') redraw = true;
  }
  if (redraw) dsRenderInputs();
  clearTimeout(dsTimer); dsTimer = setTimeout(calculateDiscs, 60);
}
let dsTimer = null;

let dsLabelLang = null;
function dsRelabel() {
  if (dsLabelLang === currentLang) return;
  dsLabelLang = currentLang;
  const t = dsT();
  document.querySelectorAll('#moduleDiscsSection [data-ds]').forEach(el => { const v = t[el.dataset.ds]; if (typeof v === 'string') el.textContent = v; });
  const opts = (id, obj) => { const s = dsEl(id); if (s) [...s.options].forEach(op => { if (obj[op.value]) op.textContent = obj[op.value]; }); };
  opts('dsExt', t.exts); opts('duLoad', t.uLoads); opts('dsTqMode', { T: t.tqT, P: t.tqP }); opts('dsDim', { d: t.dimD, r: t.dimR });
  dsEl('dsPreset').innerHTML = `<option value="">${t.exPick}</option>` + Object.keys(DS_PRESETS).map(k => `<option value="${k}">${t.ex[k]}</option>`).join('');
  dsTabs();
}
function dsTabs() {
  const t = dsT(), on = 'px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 transition-all', off = 'px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white border border-transparent transition-all';
  dsEl('dsTabs').innerHTML = Object.keys(t.tabs).map(k => `<button type="button" data-mode="${k}" id="dsMode_${k}" class="${k === dsMode ? on : off}">${t.tabs[k]}</button>`).join('');
}
function setDiscMode(mode) {
  dsMode = mode === 'uni' ? 'uni' : 'stack';
  dsBuild(); dsTabs(); calculateDiscs();
  if (typeof syncShareUrl === 'function') syncShareUrl();
}

// ---- calculation and output -----------------------------------------------------------------------------------
function calculateDiscs() {
  dsBuild();
  if (dsInputsLang !== currentLang) dsRenderInputs();
  dsRelabel();
  const t = dsT(), M = dsModel;
  dsEl('dsStack').classList.toggle('hidden', dsMode !== 'stack');
  dsEl('dsUni').classList.toggle('hidden', dsMode !== 'uni');
  if (dsMode === 'uni') return calculateDiscUniform();
  const inp = dsCoreInput();
  const { r0 } = dsRadii();
  dsEl('dsR0Lbl').textContent = `${M.dim === 'd' ? 'Ø' : 'R'} ${t.r0}`;
  // visibility of the load fields
  const hollow = r0 > 0;
  dsEl('dsPiCol').classList.toggle('hidden', !hollow);
  dsEl('dsClosedCol').classList.toggle('hidden', !hollow);
  dsEl('dsPeCol').classList.toggle('hidden', M.ext !== 'p');
  dsEl('dsBandSCol').classList.toggle('hidden', M.ext !== 'band');
  dsEl('dsBandTCol').classList.toggle('hidden', M.ext !== 'band');
  dsEl('dsBladeCol').classList.toggle('hidden', M.ext !== 'blades');
  dsEl('dsTqCard').classList.toggle('hidden', M.rings.length < 2);
  dsEl('dsTqBox').classList.toggle('hidden', !M.tq.on);
  dsEl('dsTqKCol').classList.toggle('hidden', M.rings.length < 3);
  dsEl('dsTqTCol').classList.toggle('hidden', M.tq.mode !== 'T');
  dsEl('dsTqPCol').classList.toggle('hidden', M.tq.mode !== 'P');
  // interference read-outs
  M.rings.slice(0, -1).forEach((r, k) => {
    const el = dsEl('dsIfInfo' + k); if (!el) return;
    const d = dsInterference(k), R = dsRadii().Re[k];
    if (d.err === 'bad') { el.innerHTML = `<span class="text-amber-300">${t.isoBad}</span>`; return; }
    const base = `i = ${dsSig(d.i * 1000, 4)} µm · δ = ${dsSig(d.i * 2000, 4)} µm · i_R = ${dsSig(d.i / R, 4)}`;
    el.innerHTML = d.iso ? `${f2(d)} → ${base}${d.err === 'clear' ? ` <span class="text-amber-300">${t.isoClear}</span>` : ''}` : base;
    function f2(x) { const a = x.iso; return `${M.ifs[k].fit} Ø${dsNum(2 * R, 0)}: ${a.holeClass} ${a.ES_H > 0 ? '+' : ''}${a.ES_H}/${a.EI_H > 0 ? '+' : ''}${a.EI_H}, ${a.shaftClass} ${a.devs.es > 0 ? '+' : ''}${a.devs.es}/${a.devs.ei > 0 ? '+' : ''}${a.devs.ei} µm`; }
  });
  dsSketch(inp);
  if (!dsValid(inp)) {
    dsEl('dsRes').innerHTML = `<p class="text-sm text-rose-400">${t.invalid}</p>`;
    ['dsChartCard', 'dsTableCard', 'dsDesignCard', 'dsStepsCard'].forEach(id => dsEl(id).classList.add('hidden'));
    lastDiscState = null;
    return;
  }
  ['dsChartCard', 'dsTableCard', 'dsStepsCard'].forEach(id => dsEl(id).classList.remove('hidden'));
  const res = discsAnalyze(inp);
  const multi = inp.rings.length > 1;
  const showRest = multi || inp.band;
  const hasService = (inp.n > 0) || inp.dT || inp.Pi || inp.Pe || inp.bladeF;
  if (!showRest) dsView = 'service';
  if (!hasService && showRest) dsView = 'rest';
  lastDiscState = { inp, res, multi, showRest, hasService, model: JSON.parse(JSON.stringify(M)) };
  dsRenderResult(lastDiscState);
  dsRenderViewBtns(lastDiscState);
  dsDrawChart(lastDiscState);
  dsRenderTable(lastDiscState);
  dsRenderDesign(lastDiscState);
  dsRenderSteps(lastDiscState);
}

function dsRow(k, v) { return `<div class="flex justify-between gap-3 py-1 border-b border-slate-700/40"><span class="text-slate-400">${k}</span><span class="text-white font-semibold text-right">${v}</span></div>`; }
function dsName(st, k) { const t = dsT(), n = st.model.rings[k].name; return `${k + 1} ${n || t.names[Math.min(k, 3)]}`; }

function dsRenderResult(st) {
  const t = dsT(), { inp, res } = st;
  const cards = [];
  const card = (k, v, sub, tone = 'k') => cards.push(`<div class="ds-kpi ds-${tone}"><div class="ds-k">${k}</div><div class="ds-v">${v}</div>${sub ? `<div class="ds-s">${sub}</div>` : ''}</div>`);
  if (st.multi) {
    res.rest.pairs.forEach((p, k) => {
      const lbl = res.rest.pairs.length > 1 ? ` ${k + 1}/${k + 2}` : '';
      card(`${t.pc}${lbl} · ${t.rest}`, p.open ? t.open : `${dsNum(p.pOut, 1)} MPa`, Math.abs(inp.rings[k].h - inp.rings[k + 1].h) > 1e-9 && !p.open ? `${dsName(st, k)}: ${dsNum(p.pIn, 1)} MPa` : '', 'y');
      if (st.hasService) { const q = res.service.pairs[k]; card(`${t.pc}${lbl} · ${t.service}`, q.open ? t.open : `${dsNum(q.pOut, 1)} MPa`, `n = ${dsNum(inp.n, 0)} rpm${inp.dT ? ` · ΔT ${dsNum(inp.dT, 0)} °C` : ''}`, q.open ? 'r' : 'b'); }
      const s = res.sep[k];
      if (s) card(`${t.sep}${lbl}`, s.omega === null ? '—' : s.omega === 0 ? '0' : `${dsNum(s.omega, 0)} rad/s`, s.omega === null ? t.noSep : s.omega === 0 ? t.sepAtRest : `${dsNum(s.rpm, 0)} rpm`, s.omega !== null && inp.n > 0 && s.rpm < inp.n ? 'r' : 'k');
    });
  }
  const states = [st.showRest ? ['rest', res.rest] : null, st.hasService || !st.showRest ? ['service', res.service] : null].filter(Boolean);
  const anySy = inp.rings.some(r => r.sy > 0);
  let ok = true;
  states.forEach(([key, S]) => {
    const c = S.crit;
    const X = S.Xmin;
    if (anySy && X < inp.Xreq - 1e-9) ok = false;
    card(`${t.seqMax} · ${t[key]}`, `${dsNum(c.seq, 1)} MPa`, `${dsName(st, c.k)} ${t.at} r = ${dsNum(c.r, 1)} mm${anySy ? ` · ${t.Xmin} ${dsNum(X, 2)}` : ''}`, anySy ? (X >= inp.Xreq - 1e-9 ? 'b' : 'r') : 'k');
  });
  dsEl('dsRes').innerHTML = `<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">` +
    (anySy ? `<span class="${ok ? 'text-emerald-400' : 'text-amber-300'} text-sm font-semibold">${ok ? t.ok : t.ko}</span><span class="text-xs text-slate-400">X ≥ ${dsNum(inp.Xreq, 2)}</span>` : `<span class="text-xs text-slate-400">${t.noSy}</span>`) +
    `</div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${cards.join('')}</div>`;
  st.ok = anySy ? ok : null;
}

function dsRenderViewBtns(st) {
  const t = dsT(), on = 'px-3 py-1 rounded-md text-[11px] font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30', off = 'px-3 py-1 rounded-md text-[11px] font-semibold text-slate-400 hover:text-white border border-slate-700';
  const v = [st.showRest ? 'rest' : null, st.hasService || !st.showRest ? 'service' : null].filter(Boolean);
  dsEl('dsViewBtns').innerHTML = v.length > 1 ? v.map(k => `<button type="button" data-view="${k}" class="${k === dsView ? on : off}">${t[k]}</button>`).join('') : `<span class="text-[11px] text-slate-400">${t[v[0]]}</span>`;
}

// half section of the stack: axis at the bottom, each element a rectangle of height Re − Ri and width h
function dsSketch(inp) {
  const svg = dsEl('dsSketch'); if (!svg) return;
  const R = inp.rings, Rmax = Math.max(...R.map(r => r.Re), 1), hmax = Math.max(...R.map(r => r.h), 1);
  const Y0 = 205, Y1 = 22, sy = (Y0 - Y1) / Rmax, W = Math.min(150 / hmax, sy * 2.2), xc = 105;
  const cols = { steel: '#8a9bb0', alu: '#c9b98f', castIron: '#7d7a73', bronze: '#c08a4c', titanium: '#9aa7a0', composite: '#4a4a4a', custom: '#a0a0b8' };
  let g = `<line x1="8" y1="${Y0}" x2="252" y2="${Y0}" stroke="#8a857c" stroke-dasharray="8 3 2 3"/>`;
  g += `<defs><pattern id="dsHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#22211f" stroke-width="0.7" opacity="0.35"/></pattern></defs>`;
  R.forEach((r, k) => {
    const yT = Y0 - r.Re * sy, yB = Y0 - r.Ri * sy, w = Math.max(r.h * W, 6);
    const mat = (dsModel.rings[k] || {}).mat || 'custom';
    g += `<rect x="${xc - w / 2}" y="${yT}" width="${w}" height="${Math.max(yB - yT, 1)}" fill="${cols[mat] || '#a0a0b8'}" stroke="#22211f" stroke-width="1"/>`;
    g += `<rect x="${xc - w / 2}" y="${yT}" width="${w}" height="${Math.max(yB - yT, 1)}" fill="url(#dsHatch)"/>`;
    g += `<text x="${xc}" y="${(yT + yB) / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#22211f">${k + 1}</text>`;
    g += `<line x1="${xc + w / 2 + 2}" y1="${yT}" x2="${200}" y2="${yT}" stroke="#b5afa3" stroke-width="0.6"/><text x="${203}" y="${yT + 4}" font-size="10" fill="#6f6a62">${dsModel.dim === 'd' ? 'Ø' : 'R'} ${dsNum(dsModel.dim === 'd' ? 2 * r.Re : r.Re, 0)}</text>`;
  });
  if (R[0].Ri > 0) {
    const y = Y0 - R[0].Ri * sy; g += `<text x="${203}" y="${y + 4}" font-size="10" fill="#6f6a62">${dsModel.dim === 'd' ? 'Ø' : 'R'} ${dsNum(dsModel.dim === 'd' ? 2 * R[0].Ri : R[0].Ri, 0)}</text>`;
    if (inp.Pi) for (let i = -1; i <= 1; i++) g += `<path d="M${xc + i * 12} ${y + 14} l0 -10 m-3 4 l3 -4 l3 4" stroke="#2f66b3" fill="none" stroke-width="1.4"/>`;
  }
  const yt = Y0 - R[R.length - 1].Re * sy, wl = Math.max(R[R.length - 1].h * W, 6);
  if (inp.band) g += `<rect x="${xc - wl / 2}" y="${yt - 5}" width="${wl}" height="5" fill="#22211f"/>`;
  if (inp.Pe) for (let i = -1; i <= 1; i++) g += `<path d="M${xc + i * 12} ${yt - 14} l0 10 m-3 -4 l3 4 l3 -4" stroke="#2f66b3" fill="none" stroke-width="1.4"/>`;
  if (inp.bladeF) for (let i = -1; i <= 1; i++) g += `<path d="M${xc + i * 12} ${yt - 3} l0 -11 m-3 4 l3 -4 l3 4" stroke="#c0392b" fill="none" stroke-width="1.4"/>`;
  if (inp.n > 0) g += `<path d="M22 ${Y0 - 18} a10 10 0 1 1 0 20" fill="none" stroke="#b7791f" stroke-width="1.5"/><path d="M22 ${Y0 + 2} l5 -3 m-5 3 l4 4" stroke="#b7791f" stroke-width="1.5"/><text x="36" y="${Y0 - 8}" font-size="11" fill="#b7791f" font-weight="600">ω</text>`;
  svg.innerHTML = g;
}

// σr, σc, σeq along the radius, for the chosen state
function dsDrawChart(st) {
  const svg = dsEl('dsChart'); if (!svg) return;
  const t = dsT(), S = dsView === 'rest' ? st.res.rest : st.res.service;
  const pts = S.rings.flatMap(r => r.prof);
  const Rmax = Math.max(...pts.map(p => p.r)), Rmin = Math.min(...pts.map(p => p.r));
  const vals = pts.flatMap(p => [p.sr, p.sc, p.seq, p.sa]);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const X0 = 58, X1 = 620, Y0 = 262, Y1 = 22;
  const x = r => X0 + (r - Rmin) / Math.max(Rmax - Rmin, 1e-9) * (X1 - X0), y = v => Y0 - (v - lo) / (hi - lo) * (Y0 - Y1);
  let g = '';
  // grid
  const step = dsNiceStep((hi - lo) / 6);
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) g += `<line x1="${X0}" y1="${y(v)}" x2="${X1}" y2="${y(v)}" stroke="#ddd8cd" stroke-width="${Math.abs(v) < 1e-9 ? 1.4 : 0.6}"/><text x="${X0 - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#6f6a62">${dsNum(v, 0)}</text>`;
  const rs = dsNiceStep((Rmax - Rmin) / 6);
  for (let r = Math.ceil(Rmin / rs) * rs; r <= Rmax + 1e-9; r += rs) g += `<text x="${x(r)}" y="${Y0 + 16}" text-anchor="middle" font-size="10" fill="#6f6a62">${dsNum(r, 0)}</text>`;
  g += `<text x="${X1}" y="${Y0 + 32}" text-anchor="end" font-size="10.5" fill="#6f6a62">r [mm]</text><text x="${X0 - 6}" y="${Y1 - 8}" text-anchor="end" font-size="10.5" fill="#6f6a62">MPa</text>`;
  S.rings.forEach((r, k) => { if (k) g += `<line x1="${x(r.el.Ri)}" y1="${Y1}" x2="${x(r.el.Ri)}" y2="${Y0}" stroke="#8a857c" stroke-dasharray="4 3"/>`; g += `<text x="${(x(r.el.Ri) + x(r.el.Re)) / 2}" y="${Y1 + 2}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6f6a62">${k + 1}</text>`; });
  const line = (key, col, w = 2, dash = '') => S.rings.map(r => `<polyline fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} points="${r.prof.map(p => `${x(p.r).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')}"/>`).join('');
  g += line('sr', '#2f66b3') + line('sc', '#3f8f5a') + (S.sa ? line('sa', '#7a4fb3', 1.6, '5 3') : '') + line('seq', '#c0392b', 2.4);
  const c = S.crit;
  g += `<circle cx="${x(c.r)}" cy="${y(c.seq)}" r="4.5" fill="#c0392b"/><text x="${x(c.r) + (x(c.r) > 480 ? -8 : 8)}" y="${y(c.seq) - 8}" text-anchor="${x(c.r) > 480 ? 'end' : 'start'}" font-size="11" font-weight="600" fill="#c0392b">σeq ${dsNum(c.seq, 1)} MPa</text>`;
  const L = [['sr', '#2f66b3'], ['sc', '#3f8f5a'], ['seq', '#c0392b']].concat(S.sa ? [['sa', '#7a4fb3']] : []);
  g += L.map(([k, col], i) => `<g transform="translate(${X0 + 8 + i * 140},${Y0 + 26})"><line x1="0" y1="0" x2="18" y2="0" stroke="${col}" stroke-width="2.4"/><text x="23" y="4" font-size="10.5" fill="#22211f">${t.legend[k]}</text></g>`).join('');
  svg.setAttribute('viewBox', '0 0 640 300');
  svg.innerHTML = g;
}
function dsNiceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1e-9)))), m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }

function dsRenderTable(st) {
  const t = dsT(), { inp, res } = st;
  const states = [st.showRest ? ['rest', res.rest] : null, st.hasService || !st.showRest ? ['service', res.service] : null].filter(Boolean);
  const anySa = states.some(([, S]) => S.sa);
  let h = `<table class="w-full text-xs text-left min-w-[560px]"><thead><tr class="text-slate-400"><th class="pb-1 pr-2">${t.colEl}</th><th class="pr-2">${t.colR}</th>` +
    states.map(([k]) => `<th class="pr-2 border-l border-slate-700/60 pl-2" colspan="${anySa ? 5 : 4}">${t[k]}</th>`).join('') + `</tr><tr class="text-slate-500"><th></th><th></th>` +
    states.map(() => `<th class="pr-2 border-l border-slate-700/60 pl-2">${t.colSr}</th><th class="pr-2">${t.colSc}</th>${anySa ? `<th class="pr-2">${t.colSa}</th>` : ''}<th class="pr-2">${t.colSeq}</th><th class="pr-2">${t.colU}</th>`).join('') + `</tr></thead><tbody>`;
  inp.rings.forEach((el, k) => {
    [['inner', el.Ri], ['outer', el.Re]].forEach(([w, r], j) => {
      h += `<tr class="border-t border-slate-700/40"><td class="py-1 pr-2 ${j ? 'text-slate-500' : 'text-white font-semibold'}">${j ? '' : dsName(st, k)}</td><td class="pr-2 font-mono">${dsNum(r, 1)}</td>` +
        states.map(([, S]) => { const p = S.rings[k][w], hl = S.crit.k === k && Math.abs(S.crit.r - p.r) < 1e-9; return `<td class="pr-2 font-mono border-l border-slate-700/60 pl-2">${dsNum(p.sr, 1)}</td><td class="pr-2 font-mono">${dsNum(p.sc, 1)}</td>${anySa ? `<td class="pr-2 font-mono">${dsNum(p.sa, 1)}</td>` : ''}<td class="pr-2 font-mono ${hl ? 'text-rose-400 font-bold' : 'text-white'}">${dsNum(p.seq, 1)}</td><td class="pr-2 font-mono">${dsNum(p.u * 1000, 1)}</td>`; }).join('') + '</tr>';
    });
  });
  h += '</tbody></table><p class="text-[11px] text-slate-500 mt-2">MPa · u = ' + (currentLang === 'it' ? 'spostamento radiale' : 'radial displacement') + '</p>';
  dsEl('dsTable').innerHTML = h;
}

function dsRenderDesign(st) {
  const t = dsT(), { inp, res } = st, card = dsEl('dsDesignCard');
  card.classList.toggle('hidden', !st.multi);
  if (!st.multi) return;
  let h = '<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 text-xs">';
  const f = inp.torque ? inp.torque.f : (+dsModel.tq.f || 0.15);
  res.rest.pairs.forEach((p, k) => {
    const lbl = res.rest.pairs.length > 1 ? ` (${k + 1}/${k + 2})` : '';
    h += dsRow(`${t.Trest}${lbl} · f = ${dsNum(f, 2)}`, `${dsNum(res.torqueAt(res.rest, k, f) / 1000, 0)} N·m`);
    if (st.hasService) h += dsRow(`${t.Tserv}${lbl}`, `${dsNum(res.torqueAt(res.service, k, f) / 1000, 0)} N·m`);
    const im = res.iMax[k];
    if (im) h += dsRow(`${t.iMax}${lbl}`, im.already ? '0' : `i_R ${dsSig(im.iR, 3)} · i ${dsSig(im.i * 1000, 3)} µm · p ${dsNum(im.pOut, 1)} MPa <span class="text-slate-400 font-normal">(${t.iMaxRing} ${dsName(st, im.ring)}, X ${dsNum(inp.Xreq, 2)})</span>`);
    const dT = res.heat[k];
    if (dT !== null && inp.iRad[k] > 0) h += dsRow(`${t.heat}${lbl}`, `ΔT = ${dsNum(dT, 0)} °C <span class="text-slate-400 font-normal">${t.heatHint}</span>`);
  });
  if (res.design) {
    const d = res.design;
    h += dsRow(`${t.need} (${dsNum(d.T / 1000, 0)} N·m × X ${dsNum(d.X, 2)})`, `i_R ${dsSig(d.iRNeed, 3)} · i ${dsSig(d.iNeed * 1000, 3)} µm · δ ${dsSig(d.iNeed * 2000, 3)} µm`);
    h += dsRow(currentLang === 'it' ? 'Pressione necessaria in esercizio · a fermo' : 'Pressure needed in service · at rest', `${dsNum(d.pReqOut, 2)} · ${dsNum(d.pRestNeedOut, 2)} MPa`);
  }
  dsEl('dsDesign').innerHTML = h + '</div>';
}

// ---- calculation steps (TeX), shared with the report --------------------------------------------------------------
function dsStepsData(st) {
  const T = texNum, t = dsT(), it = currentLang === 'it', { inp, res } = st;
  // number in scientific notation for TeX: 7,722·10⁻⁴
  const Sci = (x, d = 4) => { if (!Number.isFinite(x) || x === 0) return T(x, 0); const e = Math.floor(Math.log10(Math.abs(x))); return `${T(x / Math.pow(10, e), d - 1)}\\cdot 10^{${e}}`; };
  const out = [];
  const R = inp.rings, n = R.length;
  const w = res.omega;
  // 1. data
  const kRho = el => (el.noInertia ? 0 : discKRho(el.rho, w));
  out.push({ h: it ? 'Dati e ipotesi' : 'Data and assumptions', eq: inp.n > 0 ? [
    `\\omega = \\frac{2\\pi n}{60} = \\frac{2\\pi \\cdot ${T(inp.n, 0)}}{60} = ${T(w, 2)}\\ \\text{rad/s}`
  ] : [], txt: [it ? 'Dischi di spessore costante, stato piano di tensione ($\\sigma_a = 0$), carichi assialsimmetrici, moto stazionario. Unità: mm, MPa.' : 'Discs of constant thickness, plane stress ($\\sigma_a = 0$), axisymmetric loads, steady motion. Units: mm, MPa.'] });
  // 2. general solution
  out.push({ h: it ? 'Soluzione del disco' : 'Disc solution', eq: [
    `\\sigma_r(r) = B_1 + \\frac{B_2}{r^2} - \\frac{3+\\nu}{8}\\rho\\omega^2 r^2 \\qquad \\sigma_c(r) = B_1 - \\frac{B_2}{r^2} - \\frac{1+3\\nu}{8}\\rho\\omega^2 r^2`,
    `u(r) = \\frac{r}{E}\\left(\\sigma_c - \\nu\\,\\sigma_r\\right) + \\alpha\\,\\Delta T\\, r \\qquad ${it ? '\\text{disco pieno: } B_2 = 0' : '\\text{solid disc: } B_2 = 0'}`
  ], txt: [] });
  // 3. interfaces
  if (n === 2) {
    const a = R[0], b = R[1], Rc = a.Re;
    const Kin = a.Ri > 0 ? Rc / a.E * ((Rc * Rc + a.Ri * a.Ri) / (Rc * Rc - a.Ri * a.Ri) - a.nu) : Rc / a.E * (1 - a.nu);
    const Kout = Rc / b.E * ((b.Re * b.Re + Rc * Rc) / (b.Re * b.Re - Rc * Rc) + b.nu);
    const hr = b.h / a.h;
    const eqs = [
      `u_e^{p} = \\frac{R_o}{E_e}\\left(\\frac{R_e^2 + R_o^2}{R_e^2 - R_o^2} + \\nu_e\\right) p = \\frac{${T(Rc, 1)}}{${T(b.E, 0)}}\\left(\\frac{${T(b.Re, 1)}^2 + ${T(Rc, 1)}^2}{${T(b.Re, 1)}^2 - ${T(Rc, 1)}^2} + ${T(b.nu, 2)}\\right) p = ${T(Kout * 1000, 4)}\\ \\tfrac{\\mu\\text{m}}{\\text{MPa}}\\cdot p`,
      a.Ri > 0 ? `u_i^{p} = -\\frac{R_o}{E_i}\\left(\\frac{R_o^2 + R_i^2}{R_o^2 - R_i^2} - \\nu_i\\right) p_i = -${T(Kin * 1000, 4)}\\ \\tfrac{\\mu\\text{m}}{\\text{MPa}}\\cdot p_i`
        : `u_i^{p} = -\\frac{R_o}{E_i}\\left(1 - \\nu_i\\right) p_i = -${T(Kin * 1000, 4)}\\ \\tfrac{\\mu\\text{m}}{\\text{MPa}}\\cdot p_i`
    ];
    if (Math.abs(hr - 1) > 1e-9) eqs.push(`p_i\\,h_i = p\\,h_e \\;\\Rightarrow\\; p_i = p\\,\\frac{h_e}{h_i} = ${T(hr, 3)}\\, p`);
    const i = inp.iRad[0];
    const solveLine = (S, label) => {
      const p = S.pairs[0];
      // displacement difference from the other loads with p = 0
      const free = discStackSolve({ rings: R, iRad: [ -1e6 ] }, label === 'rest' ? { omega: 0, Pe: res.PeBand } : { omega: w, dT: inp.dT, Pi: inp.Pi, Pe: (inp.Pe || 0) + res.PeBand + res.bladeP, closedEnds: inp.closedEnds });
      const u0 = free.rings[1].inner.u - free.rings[0].outer.u;
      return { p, u0 };
    };
    const rS = solveLine(res.rest, 'rest');
    const restLoads = res.PeBand ? (it ? ' (con la fascia)' : ' (with the band)') : '';
    eqs.push(`u_e - u_i = i \\;\\Rightarrow\\; p = \\frac{i - \\Delta u^0}{${T(Kout * 1000, 4)} + ${T(Kin * hr * 1000, 4)}},\\qquad i = ${T(i * 1000, 2)}\\ \\mu\\text{m}`);
    eqs.push(`${it ? '\\text{a fermo}' : '\\text{at rest}'}${restLoads ? '' : ''}:\\ \\Delta u^0 = ${T(rS.u0 * 1000, 2)}\\ \\mu\\text{m} \\;\\Rightarrow\\; p = ${rS.p.open ? (it ? '0\\ (\\text{staccati})' : '0\\ (\\text{separated})') : T(rS.p.pOut, 2) + '\\ \\text{MPa}'}`);
    if (st.hasService) {
      const sS = solveLine(res.service, 'service');
      eqs.push(`${it ? '\\text{in esercizio}' : '\\text{in service}'}:\\ \\Delta u^0 = u_e^{0}(R_o) - u_i^{0}(R_o) = ${T(sS.u0 * 1000, 2)}\\ \\mu\\text{m} \\;\\Rightarrow\\; p = ${sS.p.open ? (it ? '0\\ (\\text{staccati})' : '0\\ (\\text{separated})') : T(sS.p.pOut, 2) + '\\ \\text{MPa}'}`);
    }
    const txt = [it ? '$\\Delta u^0$ = spostamenti all\'interfaccia dovuti ai soli altri carichi (rotazione, temperatura, pressioni, fascia, pale) con $p = 0$.' : '$\\Delta u^0$ = displacements at the interface from the other loads only (rotation, temperature, pressures, band, blades) with $p = 0$.'];
    if (res.PeBand) eqs.unshift(`p_e = \\frac{\\sigma\\, t}{R_e} = \\frac{${T(inp.band.sigma, 0)} \\cdot ${T(inp.band.t, 1)}}{${T(b.Re, 1)}} = ${T(res.PeBand, 2)}\\ \\text{MPa}`);
    out.push({ h: it ? 'Congruenza all\'interfaccia: pressione di calettamento' : 'Congruence at the interface: contact pressure', eq: eqs, txt });
    // separation
    const s = res.sep[0];
    if (s) {
      const slope = -s.slope / b.h, p0 = s.q0 / b.h;
      out.push({ h: it ? 'Velocità di distacco' : 'Separation speed', eq: s.omega === null ? [`p(\\omega) = ${T(p0, 2)} + ${Sci(-slope)}\\,\\omega^2`] : [
        `p(\\omega) = p_0 - k\\,\\omega^2 = ${T(p0, 2)} - ${Sci(slope)}\\,\\omega^2`,
        `p(\\omega_{sep}) = 0 \\;\\Rightarrow\\; \\omega_{sep} = \\sqrt{\\frac{p_0}{k}} = ${T(s.omega, 1)}\\ \\text{rad/s} = ${T(s.rpm, 0)}\\ \\text{rpm}`
      ], txt: [s.omega === null ? t.noSep : (it ? 'Con i dischi a contatto la pressione è lineare in $\\omega^2$ (gli altri carichi di esercizio restano quelli dati).' : 'With the discs in contact the pressure is linear in $\\omega^2$ (the other service loads stay as given).')] });
    }
  } else if (n > 2) {
    out.push({ h: it ? 'Congruenza alle interfacce' : 'Congruence at the interfaces', eq: res.rest.pairs.map((p, k) => `u_{${k + 2}}(R_{${k + 1}}) - u_{${k + 1}}(R_{${k + 1}}) = i_{${k + 1}} = ${T(inp.iRad[k] * 1000, 2)}\\ \\mu\\text{m} \\;\\Rightarrow\\; p_{${k + 1}} = ${p.open ? '0' : T(p.pOut, 2)}\\ \\text{MPa}\\ ${it ? '(fermo)' : '(rest)'}` + (st.hasService ? `,\\ ${res.service.pairs[k].open ? '0' : T(res.service.pairs[k].pOut, 2)}\\ \\text{MPa}\\ ${it ? '(esercizio)' : '(service)'}` : '')),
      txt: [it ? 'Un\'equazione per interfaccia, con le pressioni incognite: il sistema lineare si risolve insieme.' : 'One equation per interface, with the pressures as unknowns: the linear system is solved together.'] });
    const sp = res.sep.filter(s => s.omega);
    if (sp.length) out.push({ h: it ? 'Velocità di distacco' : 'Separation speed', eq: sp.map(s => `\\omega_{sep,${s.k + 1}} = ${T(s.omega, 1)}\\ \\text{rad/s} = ${T(s.rpm, 0)}\\ \\text{rpm}`), txt: [] });
  }
  // 4. stresses of each element in the state shown
  const states = [st.showRest ? ['rest', res.rest] : null, st.hasService || !st.showRest ? ['service', res.service] : null].filter(Boolean);
  states.forEach(([key, S]) => {
    const eq = [];
    S.rings.forEach((r, k) => {
      const el = r.el, A = r.c.A, C = r.c.C;
      const head = `\\textbf{${k + 1}}:\\ `;
      const bc = el.Ri > 0 ? `\\sigma_r(${T(el.Ri, 1)}) = ${T(-r.pI, 2)},\\ \\sigma_r(${T(el.Re, 1)}) = ${T(-r.pE, 2)}` : `\\sigma_r(${T(el.Re, 1)}) = ${T(-r.pE, 2)},\\ B_2 = 0`;
      eq.push(`${head}${bc} \\;\\Rightarrow\\; B_1 = ${T(r.c.B1, 3)},\\ B_2 = ${T(r.c.B2, 1)}` + (A ? `,\\ \\tfrac{3+\\nu}{8}\\rho\\omega^2 = ${Sci(A)}` : ''));
      const pt = r.crit;
      const saTxt = S.sa ? `,\\ \\sigma_a = ${T(S.sa, 2)}` : '';
      eq.push(`\\quad r = ${T(pt.r, 1)}:\\ \\sigma_r = ${T(pt.sr, 2)},\\ \\sigma_c = ${T(pt.sc, 2)}${saTxt} \\;\\Rightarrow\\; \\sigma_{eq} = ${S.sa ? '\\sqrt{\\tfrac12\\left[(\\sigma_r-\\sigma_c)^2 + (\\sigma_c-\\sigma_a)^2 + (\\sigma_a-\\sigma_r)^2\\right]}' : '\\sqrt{\\sigma_r^2 + \\sigma_c^2 - \\sigma_r\\sigma_c}'} = ${T(pt.seq, 2)}\\ \\text{MPa}` + (el.sy > 0 ? `,\\ X = \\frac{${T(el.sy, 0)}}{${T(pt.seq, 1)}} = ${T(el.sy / pt.seq, 2)}` : ''));
      void C;
    });
    const sat = S.sa ? [`\\sigma_a = \\frac{p_i R_i^2}{R_e^2 - R_i^2} = ${T(S.sa, 2)}\\ \\text{MPa}\\ \\ \\text{${it ? '(fondelli)' : '(end caps)'}}`] : [];
    out.push({ h: `${it ? 'Tensioni' : 'Stresses'} · ${t[key]}`, eq: sat.concat(eq), txt: [it ? 'Per ogni elemento: costanti dalle condizioni al contorno e punto più sollecitato (σeq massima).' : 'For each element: constants from the boundary conditions and most stressed point (largest σeq).'] });
  });
  // 5. torque, design, heating
  if (n > 1) {
    const k = res.design ? res.design.k : 0, Rc = R[k].Re, hh = R[k + 1].h, f = res.design ? res.design.f : (+dsModel.tq.f || 0.15);
    const eq = [`T = f\\, p\\, (2\\pi R_o h)\\, R_o = ${T(f, 2)} \\cdot p \\cdot 2\\pi \\cdot ${T(Rc, 1)}^2 \\cdot ${T(hh, 1)}`,
      `T_{${it ? 'fermo' : 'rest'}} = ${T(res.torqueAt(res.rest, k, f) / 1000, 0)}\\ \\text{N}\\cdot\\text{m}` + (st.hasService ? `,\\qquad T_{${it ? 'eserc.' : 'serv.'}} = ${T(res.torqueAt(res.service, k, f) / 1000, 0)}\\ \\text{N}\\cdot\\text{m}` : '')];
    if (res.design) {
      const d = res.design;
      eq.push(`p_{nec}^{\\omega} = \\frac{X\\, T}{2\\pi R_o^2 h f} = \\frac{${T(d.X, 2)} \\cdot ${T(d.T, 0)}\\ \\text{N mm}}{2\\pi \\cdot ${T(Rc, 1)}^2 \\cdot ${T(hh, 1)} \\cdot ${T(f, 2)}} = ${T(d.pReqOut, 3)}\\ \\text{MPa}`);
      eq.push(`p_{nec} = p_{nec}^{\\omega} + \\Delta p^{\\omega} = ${T(d.pReqOut, 3)} + ${T(d.loss / hh, 3)} = ${T(d.pRestNeedOut, 3)}\\ \\text{MPa} \\;\\Rightarrow\\; i_R = ${Sci(d.iRNeed, 4)}`);
    }
    const dT = res.heat[k];
    if (dT !== null && inp.iRad[k] > 0) eq.push(`\\Delta T_{${it ? 'montaggio' : 'assembly'}} = \\frac{i}{R_o\\,\\alpha_e} = \\frac{${T(inp.iRad[k] * 1000, 2)}\\cdot 10^{-3}}{${T(Rc, 1)} \\cdot ${T(R[k + 1].alpha * 1e6, 1)}\\cdot 10^{-6}} = ${T(dT, 0)}\\ ^\\circ\\text{C}`);
    const im = res.iMax[k];
    if (im && !im.already) eq.push(`\\sigma_{eq,max} = \\frac{\\sigma_s}{X} \\;\\Rightarrow\\; i_{R,max} = ${Sci(im.iR, 4)},\\ p = ${T(im.pOut, 2)}\\ \\text{MPa}`);
    out.push({ h: it ? 'Coppia trasmissibile e montaggio' : 'Transmissible torque and assembly', eq, txt: res.design && res.design.loss ? [it ? '$\\Delta p^{\\omega}$ = pressione persa in esercizio (rotazione, temperatura, altri carichi).' : '$\\Delta p^{\\omega}$ = pressure lost in service (rotation, temperature, other loads).'] : [] });
  }
  return out;
}

let dsKatexCss = false;
function dsRenderSteps(st) {
  const box = dsEl('dsSteps'); if (!box) return;
  const draw = () => {
    if (!lastDiscState || lastDiscState !== st) return;
    const steps = dsStepsData(st);
    box.innerHTML = steps.map((s, i) => `<div class="ds-step"><div class="ds-step-h"><span>${i + 1}</span>${s.h}</div>` +
      s.eq.map(l => `<div class="ds-eq">${dsTex(l)}</div>`).join('') + s.txt.map(x => `<p class="ds-note">${dsTexify(x)}</p>`).join('') + `</div>`).join('');
  };
  draw();
  if (!window.katex && typeof reportLoadKatex === 'function') {
    if (!dsKatexCss) { dsKatexCss = true; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vendor/katex/katex.min.css'; document.head.appendChild(l); }
    reportLoadKatex().then(ok => { if (ok) draw(); });
  }
}
function dsTex(tex) {
  if (window.katex) { try { return window.katex.renderToString(tex, { displayMode: true, throwOnError: false, output: 'html' }); } catch (e) { /* plain */ } }
  return `<code class="text-[11px]">${tex.replace(/</g, '&lt;')}</code>`;
}
function dsTexify(s) { return String(s).split(/\$([^$]+)\$/).map((p, i) => (i % 2 ? (window.katex ? window.katex.renderToString(p, { throwOnError: false }) : p) : p)).join(''); }

// ---- tab 2: disc of uniform strength ---------------------------------------------------------------------------
function calculateDiscUniform() {
  const t = dsT(), U = dsModel.uni;
  dsEl('duFCol').classList.toggle('hidden', U.load !== 'F');
  dsEl('duHeCol').classList.toggle('hidden', U.load !== 'he');
  const Re = (+U.D || 0) / 2, r = discUniform({ Re, sa: +U.sa || 1, n: +U.n || 0, rho: +U.rho || 0, F: U.load === 'F' ? (+U.F || 0) * 1000 : 0, he: U.load === 'he' ? +U.he || 0 : 0 });
  lastDiscState = { uni: true, U, r, Re };
  dsEl('duRes').innerHTML = dsRow(t.uHe2, `${dsNum(r.hE, 2)} mm`) + dsRow(t.uH0, `${dsNum(r.h0, 2)} mm`) + dsRow(t.uRatio, dsNum(r.hE > 0 ? r.h0 / r.hE : 0, 3)) + dsRow(t.uMass, `${dsNum(r.mass, 1)} kg`) + dsRow('ω', `${dsNum(r.omega, 1)} rad/s`);
  // profile: symmetric section, radius vertical
  const svg = dsEl('duChart'), hmax = Math.max(r.h0, 1);
  const X0 = 40, X1 = 400, Yc = 120, sy = 95 / hmax / 2 * 2, sx = (X1 - X0) / Math.max(Re, 1);
  const top = r.pts.map(p => `${(X0 + p.r * sx).toFixed(1)},${(Yc - p.h * sy / 2).toFixed(1)}`), bot = r.pts.slice().reverse().map(p => `${(X0 + p.r * sx).toFixed(1)},${(Yc + p.h * sy / 2).toFixed(1)}`);
  svg.innerHTML = `<line x1="${X0}" y1="10" x2="${X0}" y2="230" stroke="#8a857c" stroke-dasharray="8 3 2 3"/><polygon points="${top.concat(bot).join(' ')}" fill="#8a9bb0" stroke="#22211f"/>` +
    `<text x="${X0 + 6}" y="${Yc - r.h0 * sy / 2 - 6}" font-size="11" fill="#22211f">h(0) ${dsNum(r.h0, 1)}</text><text x="${X1}" y="${Yc - r.hE * sy / 2 - 6}" text-anchor="end" font-size="11" fill="#22211f">h_e ${dsNum(r.hE, 1)}</text>` +
    `<text x="${X1}" y="232" text-anchor="end" font-size="10.5" fill="#6f6a62">r → R_e = ${dsNum(Re, 0)} mm · ${t.uProfile}</text>`;
  const T = texNum, it = currentLang === 'it';
  const eq = [
    U.load === 'F' ? `h_e = \\frac{F}{2\\pi R_e\\,\\sigma_a} = \\frac{${T((+U.F || 0) * 1000, 0)}}{2\\pi \\cdot ${T(Re, 1)} \\cdot ${T(+U.sa, 0)}} = ${T(r.hE, 2)}\\ \\text{mm}` : `h_e = ${T(r.hE, 2)}\\ \\text{mm}`,
    `h(r) = h_e\\, e^{\\frac{\\rho\\omega^2}{2\\sigma_a}(R_e^2 - r^2)},\\qquad \\frac{\\rho\\omega^2 R_e^2}{2\\sigma_a} = ${T(r.expo, 4)} \\;\\Rightarrow\\; h(0) = ${T(r.h0, 2)}\\ \\text{mm}`
  ];
  dsEl('duSteps').innerHTML = eq.map(l => `<div class="ds-eq">${dsTex(l)}</div>`).join('') + `<p class="ds-note">${it ? 'Ipotesi: disco sottile e pieno, σr = σc = σa costante, nessuna variazione di temperatura.' : 'Assumptions: thin solid disc, σr = σc = σa constant, no temperature change.'}</p>`;
  if (!window.katex && typeof reportLoadKatex === 'function') reportLoadKatex().then(ok => { if (ok && dsMode === 'uni') calculateDiscUniform(); });
}

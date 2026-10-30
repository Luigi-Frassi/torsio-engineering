// ============================================================================
// INPUT VALIDATION — every module on its own
// Each numeric field has a physical rule (positive, whole number, range…). A field that breaks it is marked in
// red with the reason under it; the module then shows a banner, the summary band says "INVALID INPUT" instead
// of a verdict, and reports, DXF and the "Continue with" links refuse to use the numbers until they are fixed.
// Only real impossibilities are errors (a negative power, a gear with 4.5 teeth, a safety factor below 1);
// unusual but possible values are left to the modules' own warnings.
// Fields without a rule only need to be a number. Hidden fields (other modes, other tabs) are ignored.
// ============================================================================

const VAL_TXT = {
  it: {
    empty: 'Inserisci un valore', gt: v => `Deve essere maggiore di ${v}`, min: v => `Minimo ${v}`, max: v => `Massimo ${v}`,
    range: (a, b) => `Tra ${a} e ${b}`, int: 'Serve un numero intero',
    banner: n => n === 1 ? 'Un campo ha un valore non valido (evidenziato in rosso): i risultati qui sotto non valgono finché non lo correggi.'
      : `${n} campi hanno valori non validi (evidenziati in rosso): i risultati qui sotto non valgono finché non li correggi.`,
    status: 'DATI NON VALIDI', card: 'Da correggere', more: n => `e altri ${n}`, go: 'Vai al campo',
    blocked: 'Correggi prima i campi in rosso', blockedIn: m => `Dati non validi in: ${m}`,
    sX: 'Un coefficiente di sicurezza sotto 1 non ha senso', fr: 'Coefficiente d\'attrito tra 0 e 1',
    fitRange: 'Campo coperto dalla ISO 286: 1–500 mm', gearZ: 'Almeno 9 denti', helix: 'Angolo d\'elica tra 0° e 45°',
    pressure: 'Angolo di pressione tra 10° e 30°', share: 'Quota della coppia tra 0 e 100 %', cyc: 'Vita a termine: tra 10³ e 10⁶ cicli',
    beltZ: 'Almeno 10 denti', dd: 'D/d deve essere almeno 1', notInShaft: 'Fuori dall\'albero (0 … L)', sameBearings: 'I due cuscinetti non possono coincidere',
    pitch: 'Il passo deve essere minore del diametro', table: 'tabella'
  },
  en: {
    empty: 'Enter a value', gt: v => `Must be greater than ${v}`, min: v => `Minimum ${v}`, max: v => `Maximum ${v}`,
    range: (a, b) => `Between ${a} and ${b}`, int: 'Must be a whole number',
    banner: n => n === 1 ? 'One field has an invalid value (marked in red): the results below are not valid until you fix it.'
      : `${n} fields have invalid values (marked in red): the results below are not valid until you fix them.`,
    status: 'INVALID INPUT', card: 'To fix', more: n => `and ${n} more`, go: 'Go to the field',
    blocked: 'Fix the fields in red first', blockedIn: m => `Invalid input in: ${m}`,
    sX: 'A safety factor below 1 makes no sense', fr: 'Friction coefficient between 0 and 1',
    fitRange: 'Range covered by ISO 286: 1–500 mm', gearZ: 'At least 9 teeth', helix: 'Helix angle between 0° and 45°',
    pressure: 'Pressure angle between 10° and 30°', share: 'Torque share between 0 and 100 %', cyc: 'Finite life: between 10³ and 10⁶ cycles',
    beltZ: 'At least 10 teeth', dd: 'D/d must be at least 1', notInShaft: 'Outside the shaft (0 … L)', sameBearings: 'The two bearings cannot coincide',
    pitch: 'The pitch must be smaller than the diameter', table: 'table'
  }
};
function valT() { return VAL_TXT[typeof currentLang !== 'undefined' ? currentLang : 'en'] || VAL_TXT.en; }

// rule: { gt, min, max, int, msg }  (gt = strictly greater; msg = key of a custom message)
const POS = { gt: 0 }, NONNEG = { min: 0 }, SX = { min: 1, msg: 'sX' }, FRIC = { gt: 0, max: 1, msg: 'fr' };
const VAL_RULES = {
  // fits (the nominal diameter has its own rule below: it depends on the unit)
  // belts
  pulleyZ1: { int: true, min: 10, msg: 'beltZ' }, pulleyZ2: { int: true, min: 10, msg: 'beltZ' },
  targetTau: POS, desiredCenter: POS, motorPower: POS, driverSpeed: POS,
  // gears
  gearPower: POS, gearTorqueInput: POS, gearSpeed: POS, gearTargetTau: POS, gearTauTolVal: NONNEG,
  gearLockedMVal: POS, gearLockedLVal: POS, gearTargetCenter: POS, gearKeInput: POS, gearSigmaH: POS,
  gearZ1: { int: true, min: 9, msg: 'gearZ' }, gearZ2: { int: true, min: 9, msg: 'gearZ' },
  gearXr1: { min: -1, max: 1 },
  gwModule: POS, gwFaceWidth: POS, gwSpeed: POS, gwKe: POS, gwSigmaH: POS, gwSigmaL: POS,
  gwZ1: { int: true, min: 9, msg: 'gearZ' }, gwZ2: { int: true, min: 9, msg: 'gearZ' },
  gwAlpha: { min: 0, max: 45, msg: 'helix' }, gwXr1: { min: -1, max: 1 },
  // shafts
  shaftPower: NONNEG, shaftSpeed: POS, shaftMt: NONNEG, shaftLength: POS,
  shaftTheta: { min: 10, max: 30, msg: 'pressure' }, shaftBearingLife: NONNEG, shaftBearingCA: NONNEG, shaftBearingCB: NONNEG,
  shaftMf: NONNEG, shaftSigmaR: POS, shaftSigmaS: POS, shaftSigmaLF: POS,
  shaftCycles: { min: 1000, max: 1e6, msg: 'cyc' }, shaftDcheck: POS, shaftDDcheck: POS, shaftDd: { min: 1, msg: 'dd' }, shaftR: POS,
  shaftKeyKe: { min: 1 }, shaftKeyKeT: { min: 1 }, shaftKe: { min: 1 }, shaftKeT: { min: 1 }, shaftX: SX,
  shaftPh1Mf: NONNEG, shaftPh1Mt: NONNEG, shaftPh1N: NONNEG, shaftPh2Mf: NONNEG, shaftPh2Mt: NONNEG, shaftPh2N: NONNEG,
  // frames
  frGrid: { min: 10 }, frE: POS, frSy: POS, frRho: POS, frX: SX, frXb: SX, frBeta: POS, frDefl: NONNEG,
  // bolts
  btF: POS, btMt: POS, btDc: POS, btMs: POS, btMint: { int: true, min: 1 }, btF0: FRIC, btX: SX, btFt: FRIC,
  btM: { int: true, min: 0 }, btH: POS, btE: POS,   // btPe: any sign (negative = compression)
  bsD: POS, bsP: POS, bsH: NONNEG, bsF: { min: 0, max: 1, msg: 'fr' }, bsN: POS, bsSy: POS
};
for (let i = 1; i <= 4; i++) {
  VAL_RULES['shaftEl' + i + 'D'] = POS;
  VAL_RULES['shaftEl' + i + 'Helix'] = { min: 0, max: 45, msg: 'helix' };
  VAL_RULES['shaftEl' + i + 'Share'] = { min: 0, max: 100, msg: 'share' };
  for (const f of ['X', 'D', 'DD', 'R']) VAL_RULES['shaftRs' + i + f] = NONNEG;
}

const VAL_SECTIONS = { fits: 'moduleFitsSection', belts: 'moduleBeltsSection', gears: 'moduleGearsSection', shafts: 'moduleShaftsSection', frames: 'moduleFramesSection', bolts: 'moduleBoltsSection' };

function valFmt(x) { return typeof x === 'number' ? x.toLocaleString(currentLang === 'it' ? 'it-IT' : 'en-GB', { maximumFractionDigits: 4 }) : x; }

// is the field part of what the user currently sees in its module? (the module section itself may be hidden)
function valRelevant(el, sec) {
  if (el.disabled || el.readOnly || el.type === 'hidden') return false;
  for (let e = el; e && e !== sec; e = e.parentElement) {
    if (e.classList && e.classList.contains('hidden')) return false;
    if (e.style && e.style.display === 'none') return false;
    if (e.hasAttribute && e.hasAttribute('hidden')) return false;
  }
  return true;
}

// message for one field, or '' when it is fine
function valField(el) {
  const t = valT(), raw = el.value;
  if (raw === '' || raw == null) return t.empty;                    // also "abc": a number input reads it as ''
  const v = Number(raw);
  if (!Number.isFinite(v)) return t.empty;
  if (el.id === 'nominalDiameter') {
    const mm = typeof currentUnit !== 'undefined' && currentUnit !== 'metric' ? v * 25.4 : v;
    return mm >= 1 - 1e-9 && mm <= 500 + 1e-9 ? '' : t.fitRange;
  }
  const r = VAL_RULES[el.id];
  if (!r) return '';
  const bad = (r.gt !== undefined && !(v > r.gt)) || (r.min !== undefined && v < r.min - 1e-12) || (r.max !== undefined && v > r.max + 1e-12);
  if (bad) {
    if (r.msg) return t[r.msg];
    if (r.gt !== undefined && r.max === undefined) return t.gt(valFmt(r.gt));
    if (r.min !== undefined && r.max !== undefined) return t.range(valFmt(r.min), valFmt(r.max));
    if (r.min !== undefined) return t.min(valFmt(r.min));
    if (r.gt !== undefined) return t.range(valFmt(r.gt), valFmt(r.max));
    return t.max(valFmt(r.max));
  }
  if (r.int && Math.abs(v - Math.round(v)) > 1e-9) return t.int;
  return '';
}

// checks that involve more than one field
function valCross(mod, sec, out) {
  const t = valT(), get = id => document.getElementById(id), num = id => parseFloat(get(id)?.value);
  const add = (id, msg) => { const el = get(id); if (el && valRelevant(el, sec) && !out.some(o => o.el === el)) out.push({ el, msg }); };
  if (mod === 'shafts' && typeof currentShaftMode !== 'undefined' && currentShaftMode === 'beam') {
    const L = num('shaftLength');
    if (L > 0) {
      for (const id of ['shaftXA', 'shaftXB', 'shaftSecX']) { const x = num(id); if (Number.isFinite(x) && (x < -1e-9 || x > L + 1e-9)) add(id, t.notInShaft); }
      for (let i = 1; i <= 4; i++) {
        if ((get('shaftEl' + i + 'Type')?.value || 'none') === 'none') continue;
        const x = num('shaftEl' + i + 'X');
        if (Number.isFinite(x) && (x < -1e-9 || x > L + 1e-9)) add('shaftEl' + i + 'X', t.notInShaft);
      }
    }
    if (Number.isFinite(num('shaftXA')) && Math.abs(num('shaftXA') - num('shaftXB')) < 1e-9) add('shaftXB', t.sameBearings);
  }
  if (mod === 'bolts' && num('bsP') >= num('bsD')) add('bsP', t.pitch);
}

// all invalid fields of a module: [{ el, msg }]
function valCheck(mod) {
  const sec = document.getElementById(VAL_SECTIONS[mod]);
  if (!sec) return [];
  const out = [];
  for (const el of sec.querySelectorAll('input[type=number]')) {
    if (!valRelevant(el, sec)) continue;
    const msg = valField(el);
    if (msg) out.push({ el, msg });
  }
  valCross(mod, sec, out);
  return out;
}

function valLabel(el) {
  for (let e = el.parentElement, k = 0; e && k < 4; e = e.parentElement, k++) {
    const l = e.querySelector('label');
    if (l && l.textContent.trim()) return l.textContent.trim().replace(/\s+/g, ' ');
  }
  return el.closest('table') ? valT().table : el.id;
}

// marks the fields, the banner of the module; returns the list
function valApply(mod) {
  const sec = document.getElementById(VAL_SECTIONS[mod]);
  if (!sec) return [];
  const bad = valCheck(mod), badSet = new Set(bad.map(b => b.el));
  for (const el of sec.querySelectorAll('input.val-bad')) if (!badSet.has(el)) { el.classList.remove('val-bad'); el.removeAttribute('aria-invalid'); el.title = ''; }
  for (const m of sec.querySelectorAll('.val-msg')) if (!badSet.has(m._valFor)) m.remove();
  for (const { el, msg } of bad) {
    el.classList.add('val-bad'); el.setAttribute('aria-invalid', 'true'); el.title = msg;
    if (el.closest('table')) continue;                                  // small table cells: red border and tooltip only
    const host = el.parentElement && el.parentElement.classList.contains('relative') ? el.parentElement : el;
    let m = host.nextElementSibling && host.nextElementSibling.classList.contains('val-msg') ? host.nextElementSibling : null;
    if (!m) { m = document.createElement('p'); m.className = 'val-msg'; host.insertAdjacentElement('afterend', m); }
    m._valFor = el;
    if (m.textContent !== msg) m.textContent = msg;
  }
  sec.classList.toggle('val-on', bad.length > 0);
  let ban = document.getElementById('valBanner_' + mod);
  if (bad.length) {
    if (!ban) {
      ban = document.createElement('div'); ban.id = 'valBanner_' + mod; ban.className = 'val-banner'; ban.setAttribute('role', 'alert');
      ban.addEventListener('click', ev => { if (ev.target.closest('[data-val-go]')) valFocusFirst(mod); });
    }
    const lb = document.getElementById('linkBanner');
    const anchor = lb && lb.parentElement === sec ? lb.nextSibling : sec.firstChild;
    if (ban.parentElement !== sec || (anchor !== ban && ban.nextSibling !== anchor)) sec.insertBefore(ban, anchor);
    const html = `<span>${valT().banner(bad.length)}</span><button type="button" data-val-go="1">${valT().go} ↓</button>`;
    if (ban.dataset.html !== html) { ban.innerHTML = html; ban.dataset.html = html; }
  } else if (ban) ban.remove();
  return bad;
}

function valFocusFirst(mod) {
  const bad = valCheck(mod);
  if (!bad.length) return;
  bad[0].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  try { bad[0].el.focus({ preventScroll: true }); } catch (e) { bad[0].el.focus(); }
}

// for the summary band: null when the module is fine, else { status, statusText, cards }
function valSummary(mod) {
  const bad = valCheck(mod);
  if (!bad.length) return null;
  const t = valT(), names = [];
  for (const b of bad) { const n = valLabel(b.el); if (!names.includes(n)) names.push(n); }
  const shown = names.slice(0, 3).join(' · ') + (names.length > 3 ? ' ' + t.more(names.length - 3) : '');
  return { status: 'ko', statusText: t.status, cards: [{ k: t.card, v: String(bad.length), sub: shown, tone: 'r', wide: true }] };
}

// guard for actions that use the results (reports, DXF, links): true = go ahead
function valGuard(mods) {
  const list = (Array.isArray(mods) ? mods : [mods]).filter(m => valCheck(m).length);
  if (!list.length) return true;
  if (typeof activeModule !== 'undefined' && list.includes(activeModule)) { valApply(activeModule); valFocusFirst(activeModule); }
  return false;
}

let valTimer = null;
function valSchedule() {
  clearTimeout(valTimer);
  valTimer = setTimeout(() => { if (typeof activeModule !== 'undefined') valApply(activeModule); }, 120);
}

(function valInstall() {
  for (const evName of ['input', 'change']) document.addEventListener(evName, valSchedule, true);
  document.addEventListener('click', valSchedule, true);                 // mode switches change which fields count
  const sw = window.switchModule;
  if (typeof sw === 'function') window.switchModule = function () { const r = sw.apply(this, arguments); valApply(activeModule); return r; };
  const ul = window.updateLanguage;
  if (typeof ul === 'function') window.updateLanguage = function () { const r = ul.apply(this, arguments); if (typeof activeModule !== 'undefined') valApply(activeModule); return r; };
  window.addEventListener('load', () => setTimeout(() => valApply(activeModule), 300));
  // reports and DXF use the results: not with invalid numbers
  const or = window.openReport;
  if (typeof or === 'function') window.openReport = function () { if (!valGuard(activeModule)) return; return or.apply(this, arguments); };
  const ot = window.openTransmissionReport;
  if (typeof ot === 'function') window.openTransmissionReport = function () {
    const mods = [...document.querySelectorAll('#reportMenuMods input:checked')].map(i => i.value);
    const bad = mods.filter(m => valCheck(m).length);
    if (bad.length) {
      const X = typeof REPORT_TX_TXT !== 'undefined' ? (REPORT_TX_TXT[currentLang] || REPORT_TX_TXT.en) : null;
      const msg = document.getElementById('reportMenuMsg');
      if (msg) msg.textContent = valT().blockedIn(bad.map(m => (X && X.mods[m]) || m).join(', '));
      return;
    }
    return ot.apply(this, arguments);
  };
  const ox = window.exportDxf;
  if (typeof ox === 'function') window.exportDxf = function (mod) { if (!valGuard(mod || activeModule)) return; return ox.apply(this, arguments); };
})();

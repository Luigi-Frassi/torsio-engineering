// ==========================================
// SHAREABLE LINKS
// The current calculation is kept in the page URL (?m=gears&gearPower=11&...),
// so a link reopens the same module, inputs, modes and language.
// Only values that differ from the defaults are written, to keep links short.
// ==========================================

const SHARE_FIELDS = {
  fits: ['nominalDiameter', 'fitType', 'reverseFitNature', 'reverseBasis', 'reverseTargetVal'],
  belts: ['beltProfile', 'pulleyZ1', 'pulleyZ2', 'targetTau', 'desiredCenter', 'motorPower', 'driverSpeed', 'serviceFactor'],
  gears: ['gearToothType', 'gearPower', 'gearTorqueInput', 'gearSpeed', 'gearTargetTau', 'gearTauTolVal',
    'gearLockedMVal', 'gearLockedLVal', 'gearZ1', 'gearZ2', 'gearTargetCenter', 'gearXr1', 'gearKeInput', 'gearSigmaH',
    'gwToothType', 'gwModule', 'gwFaceWidth', 'gwZ1', 'gwZ2', 'gwSpeed', 'gwAlpha', 'gwXr1', 'gwKe', 'gwSigmaH', 'gwSigmaL'],
  shafts: ['shaftMf', 'shaftBendCycle', 'shaftTorqueInput', 'shaftPower', 'shaftSpeed', 'shaftMt', 'shaftTorsionCycle', 'shaftAxial',
    'shaftSecTorque', 'shaftMaterial', 'shaftSigmaR', 'shaftSigmaS', 'shaftSigmaLF', 'shaftLife', 'shaftCycles', 'shaftNotchType', 'shaftDcheck', 'shaftDd', 'shaftDDcheck',
    'shaftR', 'shaftKeyType', 'shaftKeyCond', 'shaftKeyKe', 'shaftKeyKeT', 'shaftKe', 'shaftKeT', 'shaftFinish', 'shaftX', 'shaftPh1Mf', 'shaftPh1Mt', 'shaftPh1N', 'shaftPh2Mf', 'shaftPh2Mt', 'shaftPh2N', 'shaftDamageRule',
    'shaftLength', 'shaftXA', 'shaftXB', 'shaftAxialBearing', 'shaftTheta', 'shaftBearingLife', 'shaftBearingType', 'shaftBearingCA', 'shaftBearingCB', 'shaftRotation', 'shaftSecX',
    ...[1, 2, 3, 4].flatMap(i => ['X', 'D', 'DD', 'R', 'Key'].map(f => 'shaftRs' + i + f)),
    ...[1, 2, 3, 4].flatMap(i => ['Type', 'X', 'D', 'Helix', 'Torque', 'Share', 'DirMode', 'Angle', 'FtDir', 'FrDir', 'FaDir', 'Fv', 'Fh', 'Fa', 'E'].map(f => 'shaftEl' + i + f))],
  frames: ['frMat', 'frE', 'frSy', 'frRho', 'frX', 'frXb', 'frBeta', 'frDefl', 'frMode'],
  bolts: ['btLoad', 'btF', 'btMt', 'btDc', 'btMint', 'btF0', 'btX', 'btCls', 'btSize', 'btFt', 'btM', 'btMs', 'btPe', 'btH', 'btE', 'bsD', 'bsP', 'bsH', 'bsBeta', 'bsF', 'bsN', 'bsSy'],
  discs: [],
  trains: []
};
// Inputs whose value depends on the unit system: always written when the unit is not metric
const SHARE_UNIT_FIELDS = ['nominalDiameter', 'reverseTargetVal', 'desiredCenter'];
const SHARE_TOGGLES = { autoZ: 'toggleAutoZ', lockM: 'toggleLockM', lockL: 'toggleLockL' };

let shareDefaults = null;
let shareSyncEnabled = false;

function shareEl(id) { return document.getElementById(id); }

function shareCheckedRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

// Snapshot of everything a link can carry
function readShareState() {
  const s = { m: activeModule, lang: currentLang, unit: currentUnit };
  for (const id of SHARE_FIELDS[activeModule] || []) {
    const el = shareEl(id);
    if (el) s[id] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : String(el.value);
  }
  if (activeModule === 'fits') {
    s.mode = currentMode;
  } else if (activeModule === 'belts') {
    s.bmode = currentBeltMode;
    s.ratio = currentRatioMethod;
  } else if (activeModule === 'gears') {
    s.gop = currentGearOpMode;
    s.load = shareCheckedRadio('gearLoadMode') || 'power';
    s.geom = shareCheckedRadio('gearGeomMode') || 'tau';
    for (const [k, id] of Object.entries(SHARE_TOGGLES)) s[k] = shareEl(id)?.checked ? '1' : '0';
    s.combo = String(typeof selectedComboIdx !== 'undefined' ? selectedComboIdx : 0);
    s.s3 = (typeof selectedAlternativeModule !== 'undefined' && selectedAlternativeModule) || 'strict';
  } else if (activeModule === 'shafts') {
    s.smode = typeof currentShaftMode !== 'undefined' ? currentShaftMode : 'design';
    s.spf = typeof shaftProfileEncode === 'function' ? shaftProfileEncode() : '';   // shaft profile for CAD, only when edited by hand
  } else if (activeModule === 'frames') {
    s.fs = typeof frEncodeModel === 'function' ? frEncodeModel() : '';   // the whole structure in one parameter
  } else if (activeModule === 'bolts') {
    s.btm = typeof currentBoltMode !== 'undefined' ? currentBoltMode : 'design';
  } else if (activeModule === 'discs') {
    s.dsmode = typeof dsMode !== 'undefined' ? dsMode : 'stack';
    s.dsm = typeof dsEncode === 'function' ? dsEncode() : '';   // the whole model in one parameter
  } else if (activeModule === 'trains') {
    s.trm = typeof trEncode === 'function' ? trEncode() : '';
  }
  return s;
}

function buildShareQuery() {
  const s = readShareState();
  const d = shareDefaults || {};
  const q = new URLSearchParams();
  q.set('m', s.m);
  for (const [k, v] of Object.entries(s)) {
    if (k === 'm') continue;
    const keepForUnit = s.unit !== 'metric' && SHARE_UNIT_FIELDS.includes(k);
    if (keepForUnit || d[k] === undefined || d[k] !== v) q.set(k, v);
  }
  // the selected optimizer row only matters when the optimizer is on
  if (s.m === 'gears' && s.autoZ !== '1') q.delete('combo');
  return q.toString();
}

function shareUrl() {
  const u = new URL(window.location.href);
  u.search = buildShareQuery();
  u.hash = '';
  return u.toString();
}

function syncShareUrl() {
  if (!shareSyncEnabled) return;
  try {
    let qs = buildShareQuery();
    if (qs === 'm=fits') qs = '';   // initial state: keep the address clean
    const next = window.location.pathname + (qs ? '?' + qs : '');
    if (next !== window.location.pathname + window.location.search) history.replaceState(null, '', next);
  } catch (e) { /* URL sync is a convenience: never break the calculator */ }
}

// Apply a state read from the URL. Unknown keys and invalid values are ignored.
function applyShareState(q, quiet = false) {
  const m = q.get('m');
  if (!['fits', 'belts', 'gears', 'shafts', 'frames', 'bolts', 'discs', 'trains'].includes(m)) return false;
  if (m === 'shafts' && typeof shaftSecLink !== 'undefined') shaftSecLink = null;   // decided again from the restored fields

  const lang = q.get('lang');
  if (lang === 'it' || lang === 'en') updateLanguage(lang);
  const unit = q.get('unit');
  if (unit === 'metric' || unit === 'imperial') setUnit(unit);   // converts the defaults first, then values are set

  for (const id of SHARE_FIELDS[m]) {
    if (!q.has(id)) continue;
    const el = shareEl(id), v = q.get(id);
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.checked = v === '1';
    } else if (el.tagName === 'SELECT') {
      if (id === 'fitType' && typeof fitsEnsureOption === 'function') fitsEnsureOption(v);   // any ISO fit, also custom ones
      else if ([...el.options].some(o => o.value === v)) el.value = v;
    } else if (v !== '' && isFinite(Number(v))) {
      el.value = v;
    }
  }

  if (m === 'fits') {
    const mode = q.get('mode');
    if (mode === 'direct' || mode === 'reverse') setMode(mode);
  } else if (m === 'belts') {
    const ratio = q.get('ratio');
    if (ratio === 'teeth' || ratio === 'tau') {
      const radio = shareEl(ratio === 'teeth' ? 'methodTeeth' : 'methodTau');
      if (radio) radio.checked = true;
      setRatioMethod(ratio);
    }
    const bmode = q.get('bmode');
    if (bmode === 'geom' || bmode === 'power') setBeltSubMode(bmode);
  } else if (m === 'gears') {
    // toggles first: the geometry radio handler reads the auto-z toggle
    for (const [k, id] of Object.entries(SHARE_TOGGLES)) {
      if (!q.has(k)) continue;
      const el = shareEl(id);
      if (el) { el.checked = q.get(k) === '1'; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    for (const [k, name] of [['load', 'gearLoadMode'], ['geom', 'gearGeomMode']]) {
      if (!q.has(k)) continue;
      const radio = document.querySelector(`input[name="${name}"][value="${CSS.escape(q.get(k))}"]`);
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    shareEl('gwToothType')?.dispatchEvent(new Event('change', { bubbles: true }));
    const s3 = q.get('s3');
    if (s3 === 'recommended' || s3 === 'strict') selectedAlternativeModule = s3;
    const combo = parseInt(q.get('combo'), 10);
    if (Number.isInteger(combo) && combo >= 0 && combo < 8) selectedComboIdx = combo;
    const gop = q.get('gop');
    if (gop === 'design' || gop === 'wmax') setGearOpMode(gop);
  } else if (m === 'bolts') {
    const bm = q.get('btm');
    if (typeof setBoltMode === 'function') setBoltMode(['design', 'torque', 'screw'].includes(bm) ? bm : 'design');
  } else if (m === 'trains') {
    if (q.get('trm') && typeof trDecode === 'function') { const M = trDecode(q.get('trm')); if (M) { trModel = M; if (typeof trFill === 'function') trFill(); } }
    if (typeof calculateTrains === 'function') calculateTrains();
  } else if (m === 'discs') {
    if (q.get('dsm') && typeof dsDecode === 'function') { const M = dsDecode(q.get('dsm')); if (M) dsModel = M; if (typeof dsRenderInputs === 'function') dsRenderInputs(); }
    if (typeof setDiscMode === 'function') setDiscMode(['uni', 'jn'].includes(q.get('dsmode')) ? q.get('dsmode') : 'stack');
  } else if (m === 'frames') {
    if (q.get('fs') && typeof frDecodeModel === 'function') frDecodeModel(q.get('fs'));
  } else if (m === 'shafts') {
    const smode = q.get('smode');
    if (smode === 'beam' || smode === 'design' || smode === 'check') currentShaftMode = smode;
    if (typeof setShaftMode === 'function') setShaftMode(currentShaftMode);
    if (q.get('spf') && typeof shaftProfileDecode === 'function') shaftProfileDecode(q.get('spf'));
  }

  if (quiet) {   // session restore: recalculate the module without showing it
    const calc = { fits: 'calculateFits', belts: 'calculateBelts', gears: 'calculateGears', shafts: 'calculateShafts', frames: 'calculateFrames', bolts: 'calculateBolts', discs: 'calculateDiscs', trains: 'calculateTrains' }[m];
    if (typeof window[calc] === 'function') window[calc]();
  } else switchModule(m);   // shows the module and recalculates
  return true;
}

function copyShareLink(btn) {
  const url = shareUrl();
  const t = translations[currentLang];
  const done = () => {
    if (!btn) return;
    const label = btn.querySelector('[data-i18n="shareBtn"]');
    if (label) {
      label.innerText = t.shareCopied;
      clearTimeout(btn._shareTimer);
      btn._shareTimer = setTimeout(() => { label.innerText = translations[currentLang].shareBtn; }, 2000);
    }
  };
  // phones: native share sheet; desktop: clipboard
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarse && navigator.share) {
    navigator.share({ title: 'Torsio Engineering', url }).catch(() => {});
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
  } else {
    fallbackCopy(url, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
  document.body.removeChild(ta);
}

// Called once from the boot sequence, after the default calculation
function initShareLinks() {
  shareDefaults = { lang: currentLang, unit: currentUnit, mode: currentMode, bmode: currentBeltMode, ratio: currentRatioMethod, gop: currentGearOpMode,
    smode: typeof currentShaftMode !== 'undefined' ? currentShaftMode : 'beam' };
  const saved = activeModule;
  for (const m of Object.keys(SHARE_FIELDS)) {
    activeModule = m;
    Object.assign(shareDefaults, readShareState());
  }
  activeModule = saved;
  delete shareDefaults.m;

  try {
    const q = new URLSearchParams(window.location.search);
    // the inputs of every module are kept in this browser: a reload (or the address of one module) gives back the
    // others as they were. The module named in the address, and the modules a demo sets, win over the session.
    const demoMods = { transmission: ['belts', 'gears', 'shafts', 'fits'], shaftExam: ['shafts'], helical50kw: ['gears'], spur5kw: ['gears'], bearingFit: ['fits'], frames: ['frames'], boltsExam: ['bolts'], discsExam: ['discs'] };
    sessionRestore([q.get('m'), ...(demoMods[q.get('demo')] || (q.has('demo') ? Object.keys(SHARE_FIELDS) : []))], q.has('demo'));
    if (q.has('m') && !q.has('unit') && currentUnit !== shareDefaults.unit) setUnit(shareDefaults.unit);
    if (q.has('m')) applyShareState(q);
    else {
      // links from the home page: ?lang=it, ?demo=transmission
      const lang = q.get('lang');
      if (lang === 'it' || lang === 'en') updateLanguage(lang);
      const demo = q.get('demo');
      if (demo && typeof loadDemoPreset === 'function' && ['transmission', 'shaftExam', 'helical50kw', 'spur5kw', 'bearingFit', 'frames', 'boltsExam', 'discsExam'].includes(demo)) loadDemoPreset(demo);
    }
  } catch (e) { console.error(e); }

  shareSyncEnabled = true;
  let timer = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { syncShareUrl(); sessionSave(); }, 250); };
  ['input', 'change', 'click'].forEach(ev => document.addEventListener(ev, schedule));
  window.addEventListener('pagehide', sessionSave);
  syncShareUrl();
  sessionSave();

  document.querySelectorAll('.js-share-btn').forEach(btn => btn.addEventListener('click', () => copyShareLink(btn)));
}


// ---- session: the inputs of all the modules, kept in this browser (localStorage) ----------------------------
const SESSION_KEY = 'torsioSession';
let sessionOff = false;
const SESSION_TXT = {
  it: { restored: 'Sessione precedente ripristinata', reset: 'Ricomincia da zero', close: 'Chiudi' },
  en: { restored: 'Restored your last session', reset: 'Start from scratch', close: 'Close' }
};

function sessionDisabled() {
  if (sessionOff) return true;
  try { return localStorage.getItem('torsioNoSession') === '1'; } catch (e) { return true; }
}

function sessionSave() {
  if (sessionDisabled() || !shareSyncEnabled || typeof projectSnapshot !== 'function') return;
  try {
    const snap = projectSnapshot();
    for (const st of Object.values(snap.modules)) { delete st.lang; delete st.m; }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ v: 1, saved: snap.saved, unit: snap.unit, active: snap.active, modules: snap.modules }));
  } catch (e) { /* storage full or blocked: the session is a convenience */ }
}

// applies the saved inputs of every module except those in `skip` (named in the address or set by a demo);
// true if anything differed from the defaults
function sessionRestore(skip, keepUnit = false) {
  if (sessionDisabled()) return false;
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || data.v !== 1 || typeof data.modules !== 'object') return false;
  let changed = false;
  if ((data.unit === 'metric' || data.unit === 'imperial') && data.unit !== currentUnit) {
    if (keepUnit) return false;   // a demo is in metric units: values saved in other units would be read wrongly
    setUnit(data.unit); changed = true;
  }
  for (const [m, st] of Object.entries(data.modules)) {
    if (skip.includes(m) || !SHARE_FIELDS[m] || !st || typeof st !== 'object') continue;
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(st)) {
      if (k === 'lang' || k === 'unit' || !(typeof v === 'string' || typeof v === 'number')) continue;
      q.set(k, String(v));
      if (shareDefaults[k] !== undefined && String(shareDefaults[k]) !== String(v)) changed = true;
    }
    q.set('m', m);
    try { applyShareState(q, true); } catch (e) { console.error(e); }
  }
  if (changed) sessionBanner();
  return changed;
}

function sessionReset() {
  sessionOff = true;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  window.location.href = window.location.pathname;
}

function sessionBanner() {
  const L = SESSION_TXT[currentLang] || SESSION_TXT.en;
  document.getElementById('sessionBanner')?.remove();
  const box = document.createElement('div');
  box.id = 'sessionBanner'; box.setAttribute('role', 'status');
  box.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:60;max-width:calc(100vw - 32px);display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding:10px 14px;background:#22211f;color:#f4f1ea;border-radius:2px;font:500 12px/1.4 "IBM Plex Mono",monospace;box-shadow:0 4px 18px rgba(0,0,0,.25)';
  box.innerHTML = `<span>${L.restored}</span><button type="button" data-s="reset" style="color:#e8b321;text-decoration:underline;text-underline-offset:3px">${L.reset}</button><button type="button" data-s="close" aria-label="${L.close}" style="color:#a9a397;font-size:14px;line-height:1">×</button>`;
  box.addEventListener('click', ev => {
    const b = ev.target.closest('[data-s]');
    if (!b) return;
    if (b.dataset.s === 'reset') sessionReset(); else box.remove();
  });
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 12000);
}

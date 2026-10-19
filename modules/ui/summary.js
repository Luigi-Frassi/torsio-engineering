// ============================================================================
// SUMMARY BAND (style B3 "Banco di comando su carta")
// Above every module: a status line (station code, lamp, VERIFIED / NOT VERIFIED) and four readouts with
// the results that matter, kept up to date while the inputs change. It only reads the modules' last states
// (lastShaftSection, lastShaftBeam, lastGearState, lastBeltState, lastFitState, frResults, lastBoltState).
// ============================================================================

const SUM_CODES = { fits: 'F-01', belts: 'B-02', gears: 'G-03', shafts: 'S-04', frames: 'T-05', bolts: 'J-06' };

const SUM_TXT = {
  it: {
    ok: 'VERIFICATO', ko: 'NON VERIFICATO', info: 'CALCOLATO', na: 'DA COMPLETARE',
    req: 'richiesto', margin: 'margine', min: 'min', none: '—',
    sh: { d: 'Diametro scelto', dCheck: 'Diametro verificato', xf: 'X fatica', xy: 'X snervamento', crit: 'Sezione critica', step2: 'Calcola la sezione al passo 2 o 3', noLoad: 'La sezione scelta non è sollecitata', govF: 'governa la fatica', govY: 'governa lo snervamento', reac: 'R' },
    ge: { m: 'Modulo', L: 'Larghezza di fascia', lewis: 'Lewis σL', a: 'Interasse', P: 'Potenza trasmissibile', M1: 'Momento al pignone', lim: { hertz: 'limita Hertz', lewis: 'limita Lewis' }, und: 'sottotaglio' },
    be: { indic: 'indicativa, da confermare sul catalogo', C: 'Interasse esatto', zb: 'Cinghia', w: 'Larghezza', mesh: 'Denti in presa', teeth: 'denti', geom: 'solo geometria' },
    fi: { hole: 'Foro', shaft: 'Albero', fit: 'Accoppiamento', d: 'Diametro nominale', kinds: { clearance: 'GIOCO', interference: 'INTERFERENZA', transition: 'INCERTO' }, play: 'gioco', inter: 'interferenza' },
    fr: { sec: 'Sezione scelta', mass: 'Peso', util: 'Utilizzo massimo', defl: 'Freccia massima', empty: 'Disegna la struttura', bars: 'aste' },
    bo: { bolts: 'Viti', Ms: 'Coppia di serraggio', X: 'X vite', N: 'Precarico per vite', Fmax: 'Carico trasmissibile', screw: 'Vite di manovra', eta: 'Rendimento', lock: 'autobloccante', nolock: 'non autobloccante', perBolt: 'per vite', sep: 'il giunto si apre' }
  },
  en: {
    ok: 'VERIFIED', ko: 'NOT VERIFIED', info: 'CALCULATED', na: 'TO COMPLETE',
    req: 'required', margin: 'margin', min: 'min', none: '—',
    sh: { d: 'Chosen diameter', dCheck: 'Checked diameter', xf: 'X fatigue', xy: 'X yield', crit: 'Critical section', step2: 'Calculate the section in step 2 or 3', noLoad: 'The chosen section carries no load', govF: 'fatigue governs', govY: 'yield governs', reac: 'R' },
    ge: { m: 'Module', L: 'Face width', lewis: 'Lewis σL', a: 'Centre distance', P: 'Power capacity', M1: 'Pinion torque', lim: { hertz: 'Hertz limits', lewis: 'Lewis limits' }, und: 'undercut' },
    be: { indic: 'indicative, confirm in the catalog', C: 'Exact centre distance', zb: 'Belt', w: 'Width', mesh: 'Teeth in mesh', teeth: 'teeth', geom: 'geometry only' },
    fi: { hole: 'Hole', shaft: 'Shaft', fit: 'Fit', d: 'Nominal diameter', kinds: { clearance: 'CLEARANCE', interference: 'INTERFERENCE', transition: 'TRANSITION' }, play: 'clearance', inter: 'interference' },
    fr: { sec: 'Chosen section', mass: 'Weight', util: 'Maximum utilisation', defl: 'Maximum deflection', empty: 'Draw the structure', bars: 'members' },
    bo: { bolts: 'Bolts', Ms: 'Tightening torque', X: 'Bolt X', N: 'Preload per bolt', Fmax: 'Transmissible load', screw: 'Power screw', eta: 'Efficiency', lock: 'self-locking', nolock: 'not self-locking', perBolt: 'per bolt', sep: 'the joint opens' }
  }
};
function sumT() { return SUM_TXT[typeof currentLang !== 'undefined' ? currentLang : 'en'] || SUM_TXT.en; }
function sumNum(x, n = 2) {
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString(currentLang === 'it' ? 'it-IT' : 'en-GB', { minimumFractionDigits: n, maximumFractionDigits: n });
}
function sumEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// card: { k: label, v: value, u: unit, sub, tone: 'y' | 'b' | 'r' | 'k', bar: { x, req, max } }
function sumCards(mod) {
  const t = sumT();
  try {
    if (mod === 'shafts') return sumShafts(t);
    if (mod === 'gears') return sumGears(t);
    if (mod === 'belts') return sumBelts(t);
    if (mod === 'fits') return sumFits(t);
    if (mod === 'frames') return sumFrames(t);
    if (mod === 'bolts') return sumBolts(t);
  } catch (e) { /* a module without a state yet */ }
  return { status: 'na', cards: [] };
}

function sumShafts(t) {
  const s = typeof lastShaftSection !== 'undefined' ? lastShaftSection : null;
  const b = typeof lastShaftBeam !== 'undefined' ? lastShaftBeam : null;
  const cards = [];
  let status = 'na';
  if (s && s.res) {
    const okF = s.res.Xfatigue >= s.Xreq - 1e-9, okY = s.res.Xyield >= s.Xreq - 1e-9;
    status = okF && okY ? 'ok' : 'ko';
    const sub = [s.D ? `D ${sumNum(s.D, 0)}` : '', s.r ? `r ${sumNum(s.r, 1)}` : '', s.dMin ? `${t.min} ${sumNum(s.dMin, 1)}` : ''].filter(Boolean).join(' · ');
    cards.push({ k: s.mode === 'design' ? t.sh.d : t.sh.dCheck, v: sumNum(s.d, s.mode === 'design' ? 0 : 1), u: 'mm', sub: sub + (s.governing ? ` · ${s.governing === 'yield' ? t.sh.govY : t.sh.govF}` : ''), tone: 'y' });
    cards.push({ k: t.sh.xf, v: sumNum(s.res.Xfatigue, 2), sub: `${t.req} ${sumNum(s.Xreq, 2)} · ${t.margin} ${sumNum((s.res.Xfatigue / s.Xreq - 1) * 100, 0)} %`, tone: okF ? 'b' : 'r', bar: { x: s.res.Xfatigue, req: s.Xreq } });
    cards.push({ k: t.sh.xy, v: sumNum(s.res.Xyield, 2), sub: `${t.req} ${sumNum(s.Xreq, 2)}`, tone: okY ? 'b' : 'r', bar: { x: s.res.Xyield, req: s.Xreq } });
  } else {
    const why = typeof currentShaftMode !== 'undefined' && currentShaftMode === 'beam' && b ? t.sh.noLoad : t.sh.step2;
    cards.push({ k: t.sh.d, v: t.none, sub: why, tone: 'y' });
    cards.push({ k: t.sh.xf, v: t.none, sub: why, tone: 'k' });
    cards.push({ k: t.sh.xy, v: t.none, sub: why, tone: 'k' });
  }
  if (b && b.critical) {
    const c = b.critical, nm = (b.labels.points.find(p => Math.abs(p.x - c.x) < 1e-6) || {}).name;
    const ra = b.RA && b.RA.R, rb = b.RB && b.RB.R;
    cards.push({ k: `${t.sh.crit}${nm ? ' ' + nm : ''} · x ${sumNum(c.x, 0)}`, lines: [`Mf ${sumNum(c.Mf, 0)} N·m`, `Mt ${sumNum(c.T, 0)} N·m`],
      sub: `${t.sh.reac}${b.labels.bearing1} ${sumNum(ra / 1000, 2)} · ${t.sh.reac}${b.labels.bearing2} ${sumNum(rb / 1000, 2)} kN`, tone: 'k' });
  }
  return { status, cards };
}

function sumGears(t) {
  const g = typeof lastGearState !== 'undefined' ? lastGearState : null;
  if (!g || !g.r) return { status: 'na', cards: [] };
  const r = g.r;
  if (g.mode === 'design') {
    const ok = r.lewisOk && r.phiOk && r.undercutOk;
    return { status: ok ? 'ok' : 'ko', cards: [
      { k: t.ge.m, v: sumNum(r.mn, 2), u: 'mm', sub: `z ${g.z1}/${g.z2} · τ ${sumNum(g.tau, 3)}` + ((document.getElementById('gearModuleCategory') || {}).textContent ? ` · ${document.getElementById('gearModuleCategory').textContent}` : ''), tone: 'y' },
      { k: t.ge.L, v: sumNum(r.L_face, 1), u: 'mm', sub: `φ = L/dp₁ = ${sumNum(r.phi, 2)}`, tone: r.phiOk ? 'b' : 'r' },
      { k: t.ge.lewis, v: sumNum(r.sigma_L, 0), u: 'MPa', sub: `≤ 800 MPa${r.undercutOk ? '' : ' · ' + t.ge.und}`, tone: r.lewisOk ? 'b' : 'r', bar: { x: 800 / Math.max(r.sigma_L, 1), req: 1 } },
      { k: t.ge.a, v: sumNum(r.a_center, 1), u: 'mm', sub: `dp₁ ${sumNum(r.dp1, 1)} · dp₂ ${sumNum(r.dp2, 1)}`, tone: 'k' }
    ] };
  }
  const p = g.params || {};
  return { status: r.P_kW_max > 0 ? 'info' : 'na', cards: [
    { k: t.ge.P, v: sumNum(r.P_kW_max, 2), u: 'kW', sub: t.ge.lim[r.limitedBy] || '', tone: 'y' },
    { k: t.ge.M1, v: sumNum(r.M1_max, 0), u: 'N·m', sub: `n₁ ${sumNum(p.n1, 0)} rpm`, tone: 'b' },
    { k: t.ge.m, v: sumNum(p.m_input, 2), u: 'mm', sub: `z ${p.z1}/${p.z2} · L ${sumNum(p.L_mm, 0)} mm`, tone: 'k' },
    { k: t.ge.a, v: sumNum(r.a_center, 1), u: 'mm', sub: `dp₁ ${sumNum(r.dp1, 1)} · dp₂ ${sumNum(r.dp2, 1)}`, tone: 'k' }
  ] };
}

function sumBelts(t) {
  const s = typeof lastBeltState !== 'undefined' ? lastBeltState : null;
  if (!s || !s.r || !s.r.valid) return { status: s ? 'ko' : 'na', cards: [] };
  const r = s.r, ok = r.meshOk && (!s.power || r.widthOk);
  return { status: ok ? 'ok' : 'ko', cards: [
    { k: t.be.C, v: sumNum(r.exactC_mm, 1), u: 'mm', sub: `Δ ${r.cDiff >= 0 ? '+' : ''}${sumNum(r.cDiff, 2)} mm`, tone: 'y' },
    { k: t.be.zb, v: String(r.zb), u: t.be.teeth, sub: `Lp ${sumNum(r.Lp, 0)} mm · z ${s.z1}/${s.z2}`, tone: 'k' },
    s.power ? { k: t.be.w, v: String(r.chosenWidth), u: 'mm', sub: `${t.min} ${sumNum(r.reqWidthMm, 1)} mm · ${t.be.indic}`, tone: r.widthOk ? 'b' : 'r', bar: { x: r.chosenWidth / Math.max(r.reqWidthMm, 0.1), req: 1 } }
            : { k: t.be.w, v: t.none, sub: t.be.geom, tone: 'k' },
    { k: t.be.mesh, v: sumNum(r.z_mesh, 1), sub: '≥ 6', tone: r.meshOk ? 'b' : 'r', bar: { x: r.z_mesh / 6, req: 1 } }
  ] };
}

function sumFits(t) {
  const s = typeof lastFitState !== 'undefined' ? lastFitState : null;
  if (!s) return { status: 'na', cards: [] };
  const a = s.a, f = v => (v > 0 ? '+' : '') + sumNum(v, 0);
  const play = a.kind === 'clearance' ? `${t.fi.play} ${f(a.minPlay)} … ${f(a.maxPlay)} µm`
    : a.kind === 'interference' ? `${t.fi.inter} ${sumNum(Math.abs(a.maxPlay), 0)} … ${sumNum(Math.abs(a.minPlay), 0)} µm`
    : `${t.fi.play} ${f(a.maxPlay)} · ${t.fi.inter} ${sumNum(Math.abs(a.minPlay), 0)} µm`;
  return { status: 'info', statusText: t.fi.kinds[a.kind] || '', cards: [
    { k: t.fi.d, v: sumNum(s.dMm, s.dMm % 1 ? 2 : 0), u: 'mm', sub: s.fit, tone: 'y' },
    { k: `${t.fi.hole} H7`, v: `${f(a.ES_H)} / 0`, u: 'µm', sub: `${sumNum(s.dMm, 3)} … ${sumNum(s.dMm + a.ES_H / 1000, 3)}`, tone: 'b' },
    { k: `${t.fi.shaft} ${a.shaftClass}`, v: `${f(a.devs.es)} / ${f(a.devs.ei)}`, u: 'µm', sub: `${sumNum(s.dMm + a.devs.ei / 1000, 3)} … ${sumNum(s.dMm + a.devs.es / 1000, 3)}`, tone: 'b' },
    { k: t.fi.fit, v: t.fi.kinds[a.kind] || '', sub: play, tone: 'k' }
  ] };
}

function sumFrames(t) {
  const R = typeof frResults !== 'undefined' ? frResults : null;
  if (!R || R.error) return { status: 'na', cards: [{ k: t.fr.sec, v: t.none, sub: t.fr.empty, tone: 'y' }] };
  const fam = (typeof frSelFamily !== 'undefined' && frSelFamily) || R.best;
  const sel = fam && R.byFamily[fam];
  if (!sel || !sel.ev || !sel.ev.ok) return { status: 'ko', cards: [] };
  const ev = sel.ev, util = Math.max(...ev.rows.map(r => r.chk.util));
  const famName = (typeof frT === 'function' && frT().fam && frT().fam[fam]) || fam;
  const deflMax = R.mat && R.mat.deflMax > 0 ? R.mat.deflMax : null;
  return { status: sel.ok ? 'ok' : 'ko', cards: [
    { k: t.fr.sec, v: famName, sub: `${ev.rows.length} ${t.fr.bars}`, tone: 'y', small: true },
    { k: t.fr.mass, v: sumNum(sel.mass, 1), u: 'kg', sub: R.best && R.best !== fam ? `min ${sumNum(R.byFamily[R.best].mass, 1)} kg` : '', tone: 'k' },
    { k: t.fr.util, v: sumNum(util * 100, 0), u: '%', sub: '≤ 100 %', tone: util <= 1 + 1e-9 ? 'b' : 'r', bar: { x: 1 / Math.max(util, 1e-6), req: 1 } },
    { k: t.fr.defl, v: sumNum(ev.dmax, 1), u: 'mm', sub: deflMax ? `≤ ${sumNum(deflMax, 1)} mm` : '', tone: deflMax && ev.dmax > deflMax ? 'r' : 'k' }
  ] };
}

function sumBolts(t) {
  const s = typeof lastBoltState !== 'undefined' ? lastBoltState : null;
  if (!s || !s.r) return { status: 'na', cards: [] };
  const r = s.r;
  if (s.mode === 'screw') {
    const ok = r.X == null || r.X >= 1;
    return { status: ok ? 'ok' : 'ko', cards: [
      { k: t.bo.Ms, v: sumNum(r.Ms / 1000, 1), u: 'N·m', sub: t.bo.screw, tone: 'y' },
      { k: t.bo.eta, v: sumNum(r.eta * 100, 0), u: '%', sub: r.selfLocking ? t.bo.lock : t.bo.nolock, tone: r.selfLocking ? 'b' : 'r' },
      { k: 'σid', v: sumNum(r.sigmaId, 0), u: 'MPa', sub: r.X != null ? `X ${sumNum(r.X, 2)}` : '', tone: 'k' },
      { k: 'α / φ', v: `${sumNum(r.alpha * 180 / Math.PI, 2)}° / ${sumNum(r.phi * 180 / Math.PI, 2)}°`, sub: '', tone: 'k', small: true }
    ] };
  }
  const X = s.inp.X, extOn = s.inp.Pe && s.ex;
  const xBolt = extOn ? Math.min(r.Xbolt, s.ex.Xbolt) : r.Xbolt;
  // like the module (and the hand solutions): a bolt count rounded down may lose up to 0.5 % of X
  const Xok = r.roundedDown ? X * 0.995 : X;
  const okX = xBolt >= Xok - 1e-9;
  const ok = okX && (r.fitsCircle !== false) && !(extOn && s.ex.separated);
  const cards = [{ k: t.bo.bolts, v: `${s.m} × ${s.size.name}`, sub: `${s.cls}${extOn && s.ex.separated ? ' · ' + t.bo.sep : ''}`, tone: 'y' }];
  if (s.mode === 'design') cards.push({ k: t.bo.Ms, v: sumNum(r.Ms / 1000, 0), u: 'N·m', sub: t.bo.perBolt, tone: 'k' });
  else cards.push({ k: t.bo.Fmax, v: r.Mtmax ? sumNum(r.Mtmax / 1e6, 2) : sumNum(r.Fmax / 1000, 1), u: r.Mtmax ? 'kN·m' : 'kN', sub: '', tone: 'k' });
  cards.push({ k: t.bo.X, v: sumNum(xBolt, 2), sub: `${t.req} ${sumNum(X, 2)}${r.roundedDown ? ' · −0,5 %' : ''}`, tone: okX ? 'b' : 'r', bar: { x: xBolt, req: Xok } });
  cards.push({ k: t.bo.N, v: sumNum(s.N / 1000, 1), u: 'kN', sub: `A_res ${sumNum(s.r.g ? s.r.g.Ares : NaN, 0)} mm²`, tone: 'k' });
  return { status: ok ? 'ok' : 'ko', cards };
}

// ---- render --------------------------------------------------------------------------------------------
const SUM_TONE = { y: '#e8b321', b: '#2f66b3', r: '#c0392b', k: '#22211f' };

function sumCardHtml(c) {
  const val = c.lines
    ? c.lines.map(l => `<p class="sum-line">${sumEsc(l)}</p>`).join('')
    : `<p class="sum-val${c.small ? ' sum-val-s' : ''}">${sumEsc(c.v)}${c.u ? `<span class="sum-u">${sumEsc(c.u)}</span>` : ''}</p>`;
  let bar = '';
  if (c.bar && Number.isFinite(c.bar.x) && c.bar.req > 0) {
    const max = Math.max(c.bar.req * 1.6, c.bar.x * 1.05);
    const w = Math.min(100, c.bar.x / max * 100), m = c.bar.req / max * 100;
    bar = `<div class="sum-bar" aria-hidden="true"><div style="width:${w.toFixed(1)}%;background:${c.tone === 'r' ? SUM_TONE.r : SUM_TONE.b}"></div><i style="left:${m.toFixed(1)}%"></i></div>`;
  }
  return `<div class="sum-card${c.wide ? ' sum-card-wide' : ''}" style="border-top-color:${SUM_TONE[c.tone] || SUM_TONE.k}"><p class="sum-k">${sumEsc(c.k)}</p>${val}${bar}${c.sub ? `<p class="sum-sub">${sumEsc(c.sub)}</p>` : ''}</div>`;
}

function sumRender() {
  const mod = typeof activeModule !== 'undefined' ? activeModule : 'fits';
  // invalid inputs come first: no verdict on numbers that make no sense (validate.js)
  const t = sumT(), data = (typeof valSummary === 'function' && valSummary(mod)) || sumCards(mod);
  const st = document.getElementById('sumStatus');
  if (st) {
    const label = data.statusText || (data.status === 'ok' ? t.ok : data.status === 'ko' ? t.ko : data.status === 'info' ? t.info : t.na);
    const html = `<span class="sum-lamp sum-lamp-${data.status}" aria-hidden="true"></span><span>${SUM_CODES[mod] || ''} · ${sumEsc(label)}</span>`;
    if (st.dataset.html !== html) { st.innerHTML = html; st.dataset.html = html; st.className = 'sum-status sum-status-' + data.status; }
  }
  const bar = document.getElementById('sumBar');
  if (bar) {
    const html = data.cards.length ? data.cards.map(sumCardHtml).join('') : '';
    if (bar.dataset.html !== html) { bar.innerHTML = html; bar.dataset.html = html; bar.classList.toggle('hidden', !html); }
  }
}

let sumTimer = null;
function sumSchedule() { clearTimeout(sumTimer); sumTimer = setTimeout(sumRender, 160); }

(function sumInstall() {
  const sw = window.switchModule;
  if (typeof sw === 'function') window.switchModule = function () { const r = sw.apply(this, arguments); sumRender(); return r; };
  const ul = window.updateLanguage;
  if (typeof ul === 'function') window.updateLanguage = function () { const r = ul.apply(this, arguments); sumRender(); return r; };
  for (const evName of ['input', 'change', 'click']) document.addEventListener(evName, sumSchedule, true);
  // modules that calculate on a timer (frames, bolts) or on load: follow them for a few seconds after start
  window.addEventListener('load', () => { sumRender(); setTimeout(sumRender, 600); setTimeout(sumRender, 1500); });
  setInterval(() => { if (!document.hidden) sumRender(); }, 1500);
})();

// ============================================================================
// MODULE 7: DISCS, THICK TUBES AND SHRINK FITS (method of the Costruzione di Macchine notes)
// Core: pure functions, no DOM. Lengths in mm, stresses and pressures in MPa (N/mm²), forces in N,
// line forces q in N/mm, torques in N·mm, ω in rad/s, ρ in kg/m³, E in MPa, α in 1/°C.
//
// Model: a stack of concentric rings (from the inside out), each of constant thickness h, plane stress
// (σa = 0, unless a tube with closed ends), axisymmetric. For every ring
//   σr(r) = B1 + B2/r² − (3+ν)/8 ρω² r²      σc(r) = B1 − B2/r² − (1+3ν)/8 ρω² r²
//   u(r)  = r/E (σc − ν σr) + α ΔT r
// with B1, B2 from σr(Ri) = −pI, σr(Re) = −pE (solid ring: B2 = 0).
// Rings in contact exchange a radial line force q = p·h (same on both sides, so with different thicknesses the
// pressures differ: p_inner·h_inner = p_outer·h_outer). Congruence at each interface: u_out − u_in = i (radial
// interference, i = i_R·R). An interface whose pressure would be negative is open (separated).
// Equivalent stress: von Mises.
// ============================================================================

// Materials (E MPa, ν, ρ kg/m³, α 1/°C, σs MPa: a typical yield, to be checked by the user)
const DISC_MATERIALS = {
  steel: { E: 200000, nu: 0.3, rho: 7800, alpha: 12e-6, sy: 355 },
  alu: { E: 70000, nu: 0.3, rho: 2700, alpha: 23e-6, sy: 250 },
  castIron: { E: 170000, nu: 0.28, rho: 7100, alpha: 11e-6, sy: 320 },
  bronze: { E: 110000, nu: 0.34, rho: 8800, alpha: 18e-6, sy: 250 },
  titanium: { E: 114000, nu: 0.34, rho: 4430, alpha: 8.6e-6, sy: 880 },
  composite: { E: 280000, nu: 0.3, rho: 1800, alpha: 1e-6, sy: 1500 }
};

const rpmToRad = n => n * 2 * Math.PI / 60;

// ρω² in MPa/mm² (ρ in kg/m³, ω in rad/s: ρω²r² with r in mm → MPa)
function discKRho(rho, omega) { return rho * omega * omega * 1e-12; }

// Integration constants of one ring
function discCoeffs(Ri, Re, nu, kRho, pI, pE) {
  const A = (3 + nu) / 8 * kRho, C = (1 + 3 * nu) / 8 * kRho;
  let B1, B2;
  if (!(Ri > 0)) { B2 = 0; B1 = -pE + A * Re * Re; }
  else {
    B2 = (pE - pI + A * (Ri * Ri - Re * Re)) / (1 / (Ri * Ri) - 1 / (Re * Re));
    B1 = -pE + A * Re * Re - B2 / (Re * Re);
  }
  return { B1, B2, A, C };
}

function discSr(c, r) { return c.B1 + (r > 0 ? c.B2 / (r * r) : 0) - c.A * r * r; }
function discSc(c, r) { return c.B1 - (r > 0 ? c.B2 / (r * r) : 0) - c.C * r * r; }
function vonMises(sr, sc, sa = 0) { return Math.sqrt(0.5 * ((sr - sc) ** 2 + (sc - sa) ** 2 + (sa - sr) ** 2)); }

// One ring under its loads: constants, stresses and radial displacement
function discRing(el, pI, pE, omega, dT) {
  const kRho = el.noInertia ? 0 : discKRho(el.rho, omega);
  const c = discCoeffs(el.Ri, el.Re, el.nu, kRho, pI, pE);
  const sr = r => discSr(c, r), sc = r => discSc(c, r);
  const u = r => r / el.E * (sc(r) - el.nu * sr(r)) + el.alpha * dT * r;
  return { c, kRho, pI, pE, sr, sc, u };
}

/**
 * Stack of rings under one load state.
 * model: { rings: [{ Ri, Re, h, E, nu, rho, alpha, sy, noInertia }], iRad: [radial interference per interface, mm] }
 * state: { omega, dT, Pi, Pe, closedEnds }   Pi on the inner surface of the first ring, Pe on the outer surface of the last
 * Returns q (line forces), p (pressures on each side), open interfaces, rings with their solutions.
 */
function discStackSolve(model, state) {
  const R = model.rings, n = R.length, m = n - 1;
  const om = state.omega || 0, dT = state.dT || 0;
  const Pi = state.Pi || 0, Pe = state.Pe || 0;
  // pressures on the free surfaces: given; interface pressures from the line forces
  const loads = q => R.map((el, k) => ({
    pI: k === 0 ? Pi : q[k - 1] / el.h,
    pE: k === n - 1 ? Pe : q[k] / el.h
  }));
  const gaps = q => {
    const L = loads(q), sol = R.map((el, k) => discRing(el, L[k].pI, L[k].pE, om, dT));
    const g = [];
    for (let k = 0; k < m; k++) { const r = R[k].Re; g.push(sol[k + 1].u(r) - sol[k].u(r) - (model.iRad[k] || 0)); }
    return { g, sol, L };
  };
  // active set: interfaces in contact
  let active = Array(m).fill(true), q = Array(m).fill(0);
  for (let it = 0; it < m + 2; it++) {
    const idx = active.map((a, k) => a ? k : -1).filter(k => k >= 0);
    q = Array(m).fill(0);
    if (idx.length) {
      // gap is linear in q: g = g0 + M q
      const g0 = gaps(q).g;
      const M = idx.map(() => Array(idx.length).fill(0));
      idx.forEach((j, cj) => {
        const qq = Array(m).fill(0); qq[j] = 1;
        const gj = gaps(qq).g;
        idx.forEach((k, rk) => { M[rk][cj] = gj[k] - g0[k]; });
      });
      const x = discSolveLinear(M, idx.map(k => -g0[k]));
      idx.forEach((k, ci) => { q[k] = x[ci]; });
    }
    // open the interfaces in tension, close the ones that overlap
    const G = gaps(q).g;
    let changed = false;
    for (let k = 0; k < m; k++) {
      if (active[k] && q[k] < -1e-9) { active[k] = false; changed = true; }
      else if (!active[k] && G[k] < -1e-12) { active[k] = true; changed = true; }
    }
    if (!changed) break;
  }
  q = q.map((v, k) => active[k] ? Math.max(0, v) : 0);
  const { sol, L } = gaps(q);
  // axial stress of a tube with closed ends (uniform, from the inner pressure on the bore)
  const R0 = R[0].Ri, Rn = R[n - 1].Re;
  const sa = state.closedEnds && R0 > 0 ? (Pi * R0 * R0 - Pe * Rn * Rn) / (Rn * Rn - R0 * R0) : 0;
  const rings = R.map((el, k) => {
    const s = sol[k];
    const pts = discSamplePoints(el.Ri, el.Re);
    const prof = pts.map(r => { const a = s.sr(r), b = s.sc(r); return { r, sr: a, sc: b, sa, seq: vonMises(a, b, sa), u: s.u(r) }; });
    const crit = prof.reduce((best, p) => (p.seq > best.seq ? p : best), prof[0]);
    return { el, c: s.c, kRho: s.kRho, pI: L[k].pI, pE: L[k].pE, sa, prof, crit, inner: prof[0], outer: prof[prof.length - 1], X: el.sy > 0 && crit.seq > 0 ? el.sy / crit.seq : Infinity };
  });
  const pairs = q.map((v, k) => ({ q: v, pIn: v / R[k].h, pOut: v / R[k + 1].h, open: !active[k], R: R[k].Re }));
  const crit = rings.reduce((b, r, k) => (r.crit.seq > (b ? b.seq : -1) ? { k, seq: r.crit.seq, r: r.crit.r, X: r.X } : b), null);
  const Xmin = Math.min(...rings.map(r => r.X));
  return { q, pairs, rings, sa, crit, Xmin };
}

// radii where stresses are evaluated: ends plus 40 points (r² spacing near the bore)
function discSamplePoints(Ri, Re) {
  const pts = [], N = 40;
  for (let i = 0; i <= N; i++) pts.push(Ri + (Re - Ri) * i / N);
  return pts;
}

// small dense solver (Gauss with partial pivoting)
function discSolveLinear(A, b) {
  const n = b.length, M = A.map((row, i) => row.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-30;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-30));
}

/**
 * Full calculation: assembly (at rest, ambient, only the prestressed band) and service (ω, ΔT, pressures, blades).
 * inp: { rings, iRad, n (rpm), dT, Pi, Pe, band: {sigma, t} | null, bladeF (N, total at the service speed),
 *        closedEnds, torque: { k, T (N·mm), f, X } | null, Xreq }
 */
function discsAnalyze(inp) {
  const R = inp.rings, n = R.length, last = R[n - 1];
  const omega = rpmToRad(inp.n || 0);
  const PeBand = inp.band && inp.band.sigma > 0 && inp.band.t > 0 ? inp.band.sigma * inp.band.t / last.Re : 0;
  const bladeP = w => inp.bladeF && last.h > 0 ? -inp.bladeF * (omega > 0 ? (w / omega) ** 2 : 0) / (2 * Math.PI * last.Re * last.h) : 0;
  const model = { rings: R, iRad: inp.iRad };
  const restState = { omega: 0, dT: 0, Pi: 0, Pe: PeBand, closedEnds: false };
  const serviceAt = w => ({ omega: w, dT: inp.dT || 0, Pi: inp.Pi || 0, Pe: (inp.Pe || 0) + PeBand + bladeP(w), closedEnds: !!inp.closedEnds });
  const rest = discStackSolve(model, restState);
  const service = discStackSolve(model, serviceAt(omega));
  // separation speed of each interface: with all contacts closed q is linear in ω²
  const sep = [];
  if (n > 1) {
    const full = { rings: R, iRad: inp.iRad };
    const q0 = discLinearQ(full, serviceAt(0)), w1 = omega > 0 ? omega : 100;
    const q1 = discLinearQ(full, serviceAt(w1));
    for (let k = 0; k < n - 1; k++) {
      const slope = (q1[k] - q0[k]) / (w1 * w1);       // dq/dω²
      let w = null;
      if (q0[k] <= 0) w = 0;
      else if (slope < -1e-18) w = Math.sqrt(-q0[k] / slope);
      sep.push({ k, omega: w, rpm: w === null ? null : w * 60 / (2 * Math.PI), q0: q0[k], slope });
    }
  }
  // transmissible torque at each interface: T = 2π R² f q
  const torqueAt = (st, k, f) => 2 * Math.PI * R[k].Re ** 2 * f * st.q[k];
  const out = { omega, PeBand, bladeP: bladeP(omega), rest, service, sep, torqueAt };
  // torque design: interference needed so that the service contact transmits X·T
  if (inp.torque && n > 1) {
    const { k, T, f, X } = inp.torque;
    if (k >= 0 && k < n - 1 && T > 0 && f > 0) {
      const qReq = (X || 1) * T / (2 * Math.PI * R[k].Re ** 2 * f);
      const S = discSensitivity(model, serviceAt(omega), k);
      const qOp = discLinearQ(model, serviceAt(omega))[k];
      const iNeed = (model.iRad[k] || 0) + (qReq - qOp) / S;
      const iModel = { rings: R, iRad: model.iRad.slice() }; iModel.iRad[k] = iNeed;
      const qRestNeed = discLinearQ(iModel, restState)[k];
      out.design = { k, T, f, X: X || 1, qReq, pReqOut: qReq / R[k + 1].h, pReqIn: qReq / R[k].h, iNeed, iRNeed: iNeed / R[k].Re, qRestNeed, pRestNeedOut: qRestNeed / R[k + 1].h, loss: (discLinearQ(model, restState)[k] - qOp), S,
        Tservice: torqueAt(service, k, f), Trest: torqueAt(rest, k, f) };
    }
  }
  // largest interference that keeps every ring elastic at rest (one interface varied, the others as given)
  out.iMax = [];
  for (let k = 0; k < n - 1; k++) out.iMax.push(discMaxInterference(model, restState, k, inp.Xreq || 1));
  // heating of the outer part for assembly: ΔT = i / (R·α)
  out.heat = (model.iRad || []).map((i, k) => (R[k + 1].alpha > 0 ? i / (R[k].Re * R[k + 1].alpha) : null));
  return out;
}

// line forces with every contact closed (no separation check): the linear extrapolation used for ω_sep and design
function discLinearQ(model, state) {
  const R = model.rings, n = R.length, m = n - 1;
  if (!m) return [];
  const Pi = state.Pi || 0, Pe = state.Pe || 0;
  const g = q => {
    const sol = R.map((el, k) => discRing(el, k === 0 ? Pi : q[k - 1] / el.h, k === n - 1 ? Pe : q[k] / el.h, state.omega || 0, state.dT || 0));
    return R.slice(0, m).map((el, k) => sol[k + 1].u(el.Re) - sol[k].u(el.Re) - (model.iRad[k] || 0));
  };
  const z = Array(m).fill(0), g0 = g(z);
  const M = g0.map(() => Array(m).fill(0));
  for (let j = 0; j < m; j++) { const qq = z.slice(); qq[j] = 1; const gj = g(qq); for (let k = 0; k < m; k++) M[k][j] = gj[k] - g0[k]; }
  return discSolveLinear(M, g0.map(v => -v));
}

// dq_k / di_k with all contacts closed
function discSensitivity(model, state, k) {
  const a = discLinearQ(model, state)[k];
  const m2 = { rings: model.rings, iRad: model.iRad.slice() }; m2.iRad[k] = (m2.iRad[k] || 0) + 1e-3;
  return (discLinearQ(m2, state)[k] - a) / 1e-3;
}

// bisection on the interference of interface k: max σeq/σs over all rings = 1/X
function discMaxInterference(model, state, k, X) {
  if (!model.rings.some(r => r.sy > 0)) return null;     // rings without σs are not checked
  const util = i => {
    const m2 = { rings: model.rings, iRad: model.iRad.slice() }; m2.iRad[k] = i;
    const s = discStackSolve(m2, state);
    let worst = 0, ring = 0;
    s.rings.forEach((r, j) => { if (!(r.el.sy > 0)) return; const u = r.crit.seq * X / r.el.sy; if (u > worst) { worst = u; ring = j; } });
    return { worst, ring, s };
  };
  const R = model.rings[k].Re;
  let lo = 0, hi = R * 1e-3;
  if (util(0).worst >= 1) return { i: 0, iR: 0, ring: util(0).ring, already: true };
  while (util(hi).worst < 1 && hi < R) hi *= 2;
  for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (util(mid).worst < 1) lo = mid; else hi = mid; }
  const u = util(lo);
  return { i: lo, iR: lo / R, ring: u.ring, q: u.s.q[k], pOut: u.s.pairs[k].pOut, pIn: u.s.pairs[k].pIn };
}

/**
 * Disc of uniform strength (σr = σc = σa everywhere): h(r) = he · exp(ρω²(Re² − r²) / (2σa)).
 * he from the blade load at the rim: σa = F / (2π Re he), or given directly.
 */
function discUniform({ Re, sa, n, rho, F, he }) {
  const omega = rpmToRad(n), k = discKRho(rho, omega);
  const hE = he > 0 ? he : (F > 0 && sa > 0 ? F / (2 * Math.PI * Re * sa) : 0);
  const h = r => hE * Math.exp(k * (Re * Re - r * r) / (2 * sa));
  const pts = []; for (let i = 0; i <= 50; i++) { const r = Re * i / 50; pts.push({ r, h: h(r) }); }
  // mass: ∫ 2π r h ρ dr (Simpson), kg
  let mass = 0; const N = 200, dr = Re / N;
  for (let i = 0; i <= N; i++) { const r = i * dr, w = i === 0 || i === N ? 1 : (i % 2 ? 4 : 2); mass += w * 2 * Math.PI * r * h(r); }
  mass *= dr / 3 * rho * 1e-9;
  return { omega, hE, h0: h(0), pts, mass, expo: k * Re * Re / (2 * sa) };
}

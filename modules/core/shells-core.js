// ============================================================================
// MODULE 7, phase 2: THIN TUBES WITH EDGE EFFECTS, AXISYMMETRIC PLATES AND THEIR JUNCTIONS
// (method of the Costruzione di Macchine notes). Pure functions, no DOM.
// Units: mm, MPa (N/mm²), N/mm for Q (force per unit circumference), N·mm/mm = N for M, ρ in kg/m³.
//
// One junction ring at radius R joins up to three members:
//   - thin tubes leaving the ring to the right (+x) or to the left (−x), each semi-infinite;
//   - one disc/plate whose edge is at R (the disc lies inside R, or outside with its bore at R).
// Every member gets from the ring a radial force F (outward +) and a moment M, both per unit circumference,
// in one global convention: w outward, φ = dw/dx. Ring equations: ΣF = 0, ΣM = 0; every member has the ring's
// radial displacement (minus its interference) and, if it carries moment, the ring's rotation.
//
// Tube (notes): D = E h³ / (12(1−ν²)), λ = [3(1−ν²)/(R² h²)]^¼, for a tube to the right with edge loads Q, M:
//   w0 = Q/(2Dλ³) + M/(2Dλ²),  φ0 = −Q/(2Dλ²) − M/(Dλ),  m(x) = (Q/λ) e^{−λx} sin λx + √2 M e^{−λx} sin(λx + π/4)
//   σa = ±6m/h² + σa_membrane,  σc = E w/R ± ν 6m/h² + σc_membrane   (+ = inner fibre)
// A tube to the left is the same tube mirrored (Q' = F, M' = −M).
// Plate (notes, cases 1–3): φ(R) = (Me R + q R³/8) / (D(1+ν)) for a solid plate with edge moment Me and pressure q
// (simply supported), m_r = Me + q(3+ν)(R² − r²)/16, m_θ = Me + q[(3+ν)R² − (1+3ν)r²]/16; annular plates with the
// other edge free from the general solution φ = A r + B/r.
// ============================================================================

function tubeConst(t) {
  const D = t.E * t.h ** 3 / (12 * (1 - t.nu * t.nu));
  const lam = Math.pow(3 * (1 - t.nu * t.nu) / (t.R * t.R * t.h * t.h), 0.25);
  return { D, lam };
}

// membrane (no edge) state of a tube: σa, σc and radial displacement w
function tubeMembrane(t, st) {
  const p = st.p || 0, closed = st.closed !== false, w = st.omega || 0;
  // pressure of an incoherent material spinning inside, filling from ri to R: ρ_i ω² (R³ − ri³) / (3R)
  const pInc = st.rhoInc > 0 ? st.rhoInc * 1e-12 * w * w * (t.R ** 3 - Math.min(st.rInc || 0, t.R) ** 3) / (3 * t.R) : 0;
  const sa = closed ? p * t.R / (2 * t.h) : 0;
  const scP = p * t.R / t.h, scW = discKRho(t.rho || 0, w) * t.R * t.R, scI = pInc * t.R / t.h;
  const wP = p * t.R * t.R / (t.E * t.h) * (1 - (closed ? t.nu / 2 : 0));
  const wW = scW * t.R / t.E, wI = scI * t.R / t.E, wT = (t.alpha || 0) * (st.dT || 0) * t.R;
  return { sa, sc: scP + scW + scI, w: wP + wW + wI + wT, wP, wW, wI, wT, scP, scW, scI, pInc };
}

// solid or annular plate: edge rotation and moments for edge moment Me (at R) and pressure q (solid only)
function plateBend(pl, Me, q) {
  const D = pl.E * pl.h ** 3 / (12 * (1 - pl.nu * pl.nu)), nu = pl.nu, R = pl.R, r0 = pl.rOther || 0;
  let A, B;
  if (!(r0 > 0)) { A = Me / (D * (1 + nu)); B = 0; }
  else {
    // m_r = D(A(1+ν) − B(1−ν)/r²): m_r(r0) = 0, m_r(R) = Me
    B = Me / (D * (1 - nu) * (1 / (r0 * r0) - 1 / (R * R)));
    A = B * (1 - nu) / ((1 + nu) * r0 * r0);
  }
  const solidQ = !(r0 > 0) && q;
  const phi = A * R + B / R + (solidQ ? q * R ** 3 / (8 * D * (1 + nu)) : 0);
  const mr = r => D * (A * (1 + nu) - (B ? B * (1 - nu) / (r * r) : 0)) + (solidQ ? q * (3 + nu) * (R * R - r * r) / 16 : 0);
  const mt = r => D * (A * (1 + nu) + (B ? B * (1 - nu) / (r * r) : 0)) + (solidQ ? q * ((3 + nu) * R * R - (1 + 3 * nu) * r * r) / 16 : 0);
  return { D, A, B, phi, mr, mt };
}

/**
 * Member responses at the ring: w (or u) and φ in the global convention, as affine functions of (F, M).
 * Each member: { kind: 'tube', side: 'R'|'L', R, h, E, nu, rho, alpha, momentLink: true }
 *              { kind: 'disc', pos: 'inside'|'outside', R, rOther, h, E, nu, rho, alpha, tubeSide: 'R'|'L',
 *                bend: true|false (plate bending engaged), q (pressure on the face, solid only), i (interference, mm),
 *                shaft: { R, E, nu, rho, alpha, i } (disc shrink-fitted on a solid shaft, inside discs only) }
 * state: { p, closed, omega, dT }
 */
function memberResponse(mb, st) {
  if (mb.dT !== undefined && mb.dT !== null && mb.dT !== '') st = { ...st, dT: +mb.dT };   // member with its own temperature
  if (mb.kind === 'tube') {
    const { D, lam } = tubeConst(mb), m0 = tubeMembrane(mb, st), s = mb.side === 'L' ? -1 : 1;
    // right: w = F/(2Dλ³) + M/(2Dλ²), φ = −F/(2Dλ²) − M/(Dλ); left: M → −M and φ → −φ
    return { cwF: 1 / (2 * D * lam ** 3), cwM: s / (2 * D * lam * lam), w0: m0.w,
      cpF: -s / (2 * D * lam * lam), cpM: -1 / (D * lam), p0: 0, D, lam, m0 };
  }
  // disc in its plane: radial displacement at R from the stack solver (affine in F)
  const u = F => discMemberSolve(mb, st, F).uR;
  const u0 = u(0), cwF = u(1) - u0;
  // plate bending: φ_global = −s φ_local(Me = s·M)
  const s = mb.tubeSide === 'L' ? -1 : 1;
  let cpM = 0, p0 = 0;
  if (mb.bend) {
    const q = mb.q !== undefined ? mb.q : (st.p || 0);
    const b0 = plateBend(mb, 0, q), b1 = plateBend(mb, 1, 0);
    p0 = -s * b0.phi; cpM = -s * s * b1.phi;
  }
  return { cwF, cwM: 0, w0: u0, cpF: 0, cpM, p0 };
}

// disc (with an optional shaft inside) under a radial line force F at R: stresses and displacement
function discMemberSolve(mb, st, F) {
  const ring = { Ri: mb.pos === 'outside' ? mb.R : (mb.rOther || 0), Re: mb.pos === 'outside' ? mb.rOther : mb.R, h: mb.h, E: mb.E, nu: mb.nu, rho: mb.rho || 0, alpha: mb.alpha || 0, sy: 0 };
  const rings = [], iRad = [];
  if (mb.shaft && mb.pos !== 'outside') { rings.push({ Ri: 0, Re: ring.Ri, h: mb.h, E: mb.shaft.E, nu: mb.shaft.nu, rho: mb.shaft.rho || 0, alpha: mb.shaft.alpha || 0, sy: 0, noInertia: !!mb.shaft.noInertia }); iRad.push(mb.shaft.i || 0); }
  rings.push(ring);
  const state = { omega: st.omega || 0, dT: st.dT || 0, Pi: 0, Pe: 0 };
  if (mb.pos === 'outside') state.Pi = F / mb.h; else state.Pe = -F / mb.h;
  const S = discStackSolve({ rings, iRad }, state);
  const dr = S.rings[S.rings.length - 1];
  const uR = mb.pos === 'outside' ? dr.inner.u : dr.outer.u;
  return { S, disc: dr, uR };
}

/**
 * Solve the junction ring.
 * members: list as in memberResponse; each may have i (interference against the ring, mm: member radius bigger
 * than the ring by i, as a disc forced into a tube) and momentLink (false = no moment through the joint, M = 0).
 * Returns per member F, M, w, φ and the ring u, φ.
 */
function junctionSolve(members, st) {
  const n = members.length, resp = members.map(m => memberResponse(m, st));
  // unknowns: F_k, M_k (k = 0..n−1), uJ, φJ  → 2n + 2
  const N = 2 * n + 2, A = Array.from({ length: N }, () => Array(N).fill(0)), b = Array(N).fill(0);
  let row = 0;
  members.forEach((m, k) => {
    const r = resp[k];
    // w_k(F, M) = uJ − i_k   (a disc forced into the tube: its free radius exceeds the tube's by i, so w_tube − u_disc = i)
    A[row][2 * k] = r.cwF; A[row][2 * k + 1] = r.cwM; A[row][2 * n] = -1; b[row] = -(m.i || 0) - r.w0; row++;
    if (m.momentLink === false) { A[row][2 * k + 1] = 1; b[row] = 0; }
    else { A[row][2 * k] = r.cpF; A[row][2 * k + 1] = r.cpM; A[row][2 * n + 1] = -1; b[row] = -r.p0; }
    row++;
  });
  members.forEach((m, k) => { A[row][2 * k] = 1; }); b[row++] = 0;
  members.forEach((m, k) => { A[row][2 * k + 1] = 1; }); b[row++] = 0;
  // a ring where no member takes moment would leave φJ undetermined: pin it
  if (!members.some(m => m.momentLink !== false)) { for (let j = 0; j < N; j++) A[N - 1][j] = 0; A[N - 1][2 * n + 1] = 1; b[N - 1] = 0; }
  const x = discSolveLinear(A, b);
  const out = members.map((m, k) => {
    const r = resp[k], F = x[2 * k], M = x[2 * k + 1];
    return { mb: m, r, F, M, w: r.w0 + r.cwF * F + r.cwM * M, phi: r.p0 + r.cpF * F + r.cpM * M };
  });
  return { members: out, uJ: x[2 * n], phiJ: x[2 * n + 1] };
}

// stresses along a tube from its edge loads (global F, M), both fibres
function tubeField(t, F, Mg, st, xMax) {
  if (t.dT !== undefined && t.dT !== null && t.dT !== '') st = { ...st, dT: +t.dT };
  const { D, lam } = tubeConst(t), m0 = tubeMembrane(t, st);
  const Q = F, M = t.side === 'L' ? -Mg : Mg;   // local edge loads
  const pts = [], L = xMax || 2 * Math.PI / lam, N = 120;
  for (let i = 0; i <= N; i++) {
    const x = L * i / N, e = Math.exp(-lam * x);
    const m = Q / lam * e * Math.sin(lam * x) + Math.SQRT2 * M * e * Math.sin(lam * x + Math.PI / 4);
    const w = Q / (2 * D * lam ** 3) * e * Math.cos(lam * x) + M / (Math.SQRT2 * D * lam * lam) * e * Math.sin(lam * x + 3 * Math.PI / 4);
    const sb = 6 * m / (t.h * t.h);
    const fib = s => { const sa = s * sb + m0.sa, sc = t.E * w / t.R + t.nu * s * sb + m0.sc; return { sa, sc, seq: vonMises(0, sc, sa) }; };
    pts.push({ x, m, w, inner: fib(1), outer: fib(-1) });
  }
  const crit = pts.reduce((b, p) => { for (const f of ['inner', 'outer']) if (p[f].seq > b.seq) b = { seq: p[f].seq, x: p.x, fibre: f, sa: p[f].sa, sc: p[f].sc }; return b; }, { seq: -1 });
  return { D, lam, m0, pts, crit, edge: pts[0], far: { sa: m0.sa, sc: m0.sc, seq: vonMises(0, m0.sc, m0.sa) } };
}

// stresses in a disc/plate member: in-plane (disc solution) plus bending (plate), both fibres
function discField(mb, F, Mg, st) {
  if (mb.dT !== undefined && mb.dT !== null && mb.dT !== '') st = { ...st, dT: +mb.dT };
  const S = discMemberSolve(mb, st, F);
  const s = mb.tubeSide === 'L' ? -1 : 1;
  const q = mb.bend ? (mb.q !== undefined ? mb.q : (st.p || 0)) : 0;
  const pb = mb.bend ? plateBend(mb, s * Mg, q) : null;
  const prof = S.disc.prof.map(p => {
    const r = Math.max(p.r, 1e-9);
    const br = pb ? 6 * pb.mr(r) / (mb.h * mb.h) : 0, bt = pb ? 6 * pb.mt(r) / (mb.h * mb.h) : 0;
    const fib = k => { const sr = p.sr + k * br, sc = p.sc + k * bt; return { sr, sc, seq: vonMises(sr, sc, 0) }; };
    return { r: p.r, u: p.u, mr: pb ? pb.mr(r) : 0, mt: pb ? pb.mt(r) : 0, a: fib(1), b: fib(-1) };
  });
  const crit = prof.reduce((b, p) => { for (const f of ['a', 'b']) if (p[f].seq > b.seq) b = { seq: p[f].seq, r: p.r, fibre: f, sr: p[f].sr, sc: p[f].sc }; return b; }, { seq: -1 });
  return { S, pb, prof, crit, shaft: S.S.rings.length > 1 ? S.S.rings[0] : null };
}

/**
 * Whole junction: solve, then stress fields of every member and the critical point.
 * j: { members, state }  members as above, with id and sy (σs, 0 = not checked)
 */
function junctionAnalyze(members, st) {
  const J = junctionSolve(members, st);
  const res = J.members.map(m => {
    const f = m.mb.kind === 'tube' ? tubeField(m.mb, m.F, m.M, st) : discField(m.mb, m.F, m.M, st);
    return { ...m, field: f, crit: f.crit, X: m.mb.sy > 0 ? m.mb.sy / f.crit.seq : Infinity };
  });
  const worst = res.reduce((b, r, k) => (r.crit.seq > (b ? b.seq : -1) ? { k, seq: r.crit.seq } : b), null);
  return { J, res, worst, Xmin: Math.min(...res.map(r => r.X)) };
}

// largest speed [rad/s] for which member k (or all members, k = null) stays within σs/X; other loads as given
function junctionMaxSpeed(members, st, X, k = null) {
  const util = w => { const a = junctionAnalyze(members, { ...st, omega: w }); return Math.max(...a.res.filter((r, j) => (k === null || j === k) && r.mb.sy > 0).map(r => r.crit.seq * X / r.mb.sy), 0); };
  if (util(0) >= 1) return 0;
  let lo = 0, hi = 100;
  while (util(hi) < 1 && hi < 1e5) { lo = hi; hi *= 2; }
  if (hi >= 1e5) return null;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (util(m) < 1) lo = m; else hi = m; }
  return lo;
}

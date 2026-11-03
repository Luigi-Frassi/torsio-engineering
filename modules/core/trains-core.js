// ============================================================================
// MODULE 8: GEAR TRAINS — epicyclic train and ordinary train (Meccanica Applicata alle Macchine notes, §7.4–7.6)
// Only what is in the notes or follows directly from them. Pure functions, no DOM.
// Units: speeds in rad/s (rpm in the UI), torques in N·m, radii in mm.
//
// Epicyclic train: sun S, carrier (spider) SP, ring R, planets P. Same module m for all wheels: R = m z / 2.
//   Geometry (notes): R_R = 2 R_P + R_S  →  z_R = z_S + 2 z_P
//   Rolling without slip at both contacts, ω_P eliminated (notes):
//     ω_S R_S + ω_R (2R_P + R_S) = 2 ω_SP (R_S + R_P)   i.e.   g·ω = 0,  g = {R_R, −2(R_S + R_P), R_S} on {ω_R, ω_SP, ω_S}
//   With teeth: z_S ω_S + z_R ω_R = (z_S + z_R) ω_SP
//   Torques (notes, tangential force T on the planet teeth): M_R = T R_R, M_S = T R_S, M_SP = 2T(R_S + R_P).
//   With signs, external torques on the three shafts and no losses (power balance Σ M ω = 0 for every admissible ω):
//     {M_R, M_SP, M_S} = T {R_R, −2(R_S + R_P), R_S}
//   Planet speed (from the rolling at the sun contact): ω_P = [ω_SP (R_S + R_P) − ω_S R_S] / R_P
// Ordinary train (notes §7.4–7.5): each pair τ = ω2/ω1 = ∓ R1/R2 (− external mesh, + internal), τ_tot = Π τ_i,
//   no losses: M_out = −M_in / τ_tot.
// Brake on a shaft (notes): M_F = 2 f P A R_D.
// ============================================================================

const TR_SHAFTS = ['S', 'SP', 'R'];

function epiGeom(zS, zR, m = 1) {
  const zP = (zR - zS) / 2;
  const RS = m * zS / 2, RR = m * zR / 2, RP = m * zP / 2;
  return { zS, zR, zP, m, RS, RR, RP, okP: Number.isInteger(zP) && zP > 0, rArm: RS + RP,
    // coefficients of the notes, A ω_R + B ω_SP + C ω_S = 0
    A: RR, B: -2 * (RS + RP), C: RS };
}

const epiCoef = (g, s) => (s === 'R' ? g.A : s === 'SP' ? g.B : g.C);

// ratio ω_out / ω_in with the shaft `fixed` held still (table of the notes)
function epiRatio(g, fixed, inp, out) {
  if (fixed === inp || fixed === out || inp === out) return NaN;
  return -epiCoef(g, inp) / epiCoef(g, out);
}

// all six ratios (three fixed shafts, both directions)
function epiAllRatios(g) {
  const rows = [];
  for (const f of TR_SHAFTS) for (const i of TR_SHAFTS) for (const o of TR_SHAFTS) {
    if (f === i || f === o || i === o) continue;
    rows.push({ fixed: f, inp: i, out: o, tau: epiRatio(g, f, i, o) });
  }
  return rows;
}

// third speed from two (rad/s): unknown = 'S' | 'SP' | 'R'
function epiThirdSpeed(g, w, unknown) {
  const s = TR_SHAFTS.filter(x => x !== unknown).reduce((a, x) => a + epiCoef(g, x) * w[x], 0);
  return -s / epiCoef(g, unknown);
}

// torques on the three shafts from one known torque (N·m) on shaft `known`
function epiTorques(g, known, M) {
  const T = M / epiCoef(g, known);   // T in N·m per mm of radius (consistent with the coefficients)
  return { T, M: { R: T * g.A, SP: T * g.B, S: T * g.C } };
}

// planet speed, absolute and relative to the carrier
function epiPlanet(g, w) {
  const wP = (w.SP * (g.RS + g.RP) - w.S * g.RS) / g.RP;
  return { wP, wRel: wP - w.SP };
}

/**
 * Complete solution.
 * inp: { zS, zR, m, N (planets), mode: 'fixed' | 'two',
 *   fixed, input, nIn (rpm), load: 'P' | 'M', P (kW), Min (N·m)            (mode 'fixed')
 *   unknown, n: { S, SP, R } (rpm), knownM: shaft, M (N·m)                 (mode 'two')
 *   brake: { f, A (mm²), RD (mm) } | null }
 */
function epiSolve(inp) {
  const g = epiGeom(inp.zS, inp.zR, inp.m || 1);
  const rad = n => n * 2 * Math.PI / 60, rpm = w => w * 60 / (2 * Math.PI);
  const w = { S: 0, SP: 0, R: 0 };
  let out = null, tau = null, known, Mk;
  if (inp.mode === 'two') {
    for (const s of TR_SHAFTS) if (s !== inp.unknown) w[s] = rad(inp.n[s] || 0);
    w[inp.unknown] = epiThirdSpeed(g, w, inp.unknown);
    known = inp.knownM; Mk = inp.M || 0;
  } else {
    out = TR_SHAFTS.find(s => s !== inp.fixed && s !== inp.input);
    tau = epiRatio(g, inp.fixed, inp.input, out);
    w[inp.input] = rad(inp.nIn || 0); w[out] = tau * w[inp.input]; w[inp.fixed] = 0;
    known = inp.input;
    Mk = inp.load === 'P' ? (Math.abs(w[inp.input]) > 1e-12 ? (inp.P || 0) * 1000 / w[inp.input] : 0) : (inp.Min || 0);
  }
  const tq = epiTorques(g, known, Mk);
  const P = {}; for (const s of TR_SHAFTS) P[s] = tq.M[s] * w[s];
  const pl = epiPlanet(g, w);
  const N = Math.max(1, Math.round(inp.N || 1));
  // tangential force on the teeth: the notes write one planet; with N equal planets each carries 1/N
  const Ttot = tq.T * 1000;   // N (T is N·m/mm → ×1000 = N)
  let brake = null;
  if (inp.mode !== 'two' && inp.brake && inp.brake.f > 0 && inp.brake.A > 0 && inp.brake.RD > 0) {
    const MF = Math.abs(tq.M[inp.fixed]) * 1000;   // N·mm
    const p = MF / (2 * inp.brake.f * inp.brake.A * inp.brake.RD);   // MPa
    brake = { MF: MF / 1000, p };
  }
  return { g, w, n: { S: rpm(w.S), SP: rpm(w.SP), R: rpm(w.R) }, out, tau, known, Mk, T: tq.T, M: tq.M, P, sumP: P.S + P.SP + P.R,
    planet: { ...pl, n: rpm(pl.wP), nRel: rpm(pl.wRel) }, Ttot, Tplanet: Ttot / N, N, ratios: epiAllRatios(g), brake };
}

/**
 * Ordinary train: stages [{ z1, z2, internal }], input speed (rpm) and power (kW) or torque (N·m).
 */
function ordSolve({ stages, nIn, load, P, Min }) {
  const w0 = nIn * 2 * Math.PI / 60;
  const M0 = load === 'P' ? (Math.abs(w0) > 1e-12 ? P * 1000 / w0 : 0) : Min;   // motor torque (notes: τ = M_m / M_u)
  const rows = [];
  let tau = 1;
  for (const s of stages) {
    const t = (s.internal ? 1 : -1) * s.z1 / s.z2;
    const before = tau;
    tau *= t;
    rows.push({ ...s, tau: t, nIn: nIn * before, nOut: nIn * tau, Min: M0 / Math.abs(before), Mout: M0 / Math.abs(tau) });
  }
  return { rows, tau, nOut: nIn * tau, Min: M0, Mout: M0 / Math.abs(tau), P: M0 * w0 / 1000 };
}

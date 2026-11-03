// Gear trains (Meccanica Applicata alle Macchine notes §7.4–7.6): checks of the formulas of the notes and of what
// follows from them. Not exam cases (the notes give only symbolic results): they do not count in the total of the
// validation suite. Run with:  node tests/trains.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { Math, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'modules', 'core', 'trains-core.js'), 'utf8'), ctx);
const X = vm.runInContext('({ epiGeom, epiRatio, epiAllRatios, epiThirdSpeed, epiSolve, ordSolve })', ctx);
let pass = 0, fail = 0;
const near = (name, got, exp, tol = 1e-9) => { const ok = Math.abs(got - exp) <= tol * Math.max(1, Math.abs(exp)); ok ? pass++ : fail++; if (!ok) console.log(`FAIL  ${name}: ${got} ≠ ${exp}`); };
const yes = (name, c) => { c ? pass++ : fail++; if (!c) console.log('FAIL  ' + name); };

for (const [zS, zR] of [[20, 80], [24, 72], [18, 60], [30, 90], [17, 71]]) {
  const g = X.epiGeom(zS, zR, 2), tag = `z ${zS}/${zR}`;
  near(`${tag} geometria R_R = 2R_P + R_S`, g.RR, 2 * g.RP + g.RS);
  // the three ratios of the table in the notes, written with teeth
  near(`${tag} corona bloccata: ω_SP/ω_S = z_S/(z_S+z_R)`, X.epiRatio(g, 'R', 'S', 'SP'), zS / (zS + zR));
  near(`${tag} portatreno bloccato: ω_R/ω_S = −z_S/z_R`, X.epiRatio(g, 'SP', 'S', 'R'), -zS / zR);
  near(`${tag} sole bloccato: ω_R/ω_SP = (z_S+z_R)/z_R`, X.epiRatio(g, 'S', 'SP', 'R'), (zS + zR) / zR);
  // inverse ratios
  for (const r of X.epiAllRatios(g)) near(`${tag} ${r.inp}→${r.out} inverso di ${r.out}→${r.inp}`, r.tau * X.epiRatio(g, r.fixed, r.out, r.inp), 1);
  // Willis is satisfied by any speeds produced by the solver; the planet rolls on sun and ring
  for (const mode of [{ mode: 'fixed', fixed: 'R', input: 'S', nIn: 1500, load: 'P', P: 10 }, { mode: 'fixed', fixed: 'SP', input: 'R', nIn: 300, load: 'M', Min: 50 },
    { mode: 'two', unknown: 'SP', n: { S: 1000, R: -200 }, knownM: 'S', M: 20 }]) {
    const r = X.epiSolve({ zS, zR, m: 2, N: 3, ...mode });
    near(`${tag} ${mode.mode}: Willis z_S ω_S + z_R ω_R = (z_S+z_R) ω_SP`, zS * r.w.S + zR * r.w.R, (zS + zR) * r.w.SP, 1e-9);
    near(`${tag} ${mode.mode}: equilibrio M_S + M_R + M_SP = 0`, r.M.S + r.M.R + r.M.SP, 0, 1e-9);
    near(`${tag} ${mode.mode}: bilancio di potenza senza perdite`, r.sumP, 0, 1e-9);
    const vS = r.w.SP * (g.RS + g.RP) - r.planet.wP * g.RP, vR = r.w.SP * (g.RS + g.RP) + r.planet.wP * g.RP;
    near(`${tag} ${mode.mode}: satellite che rotola sul sole`, vS, r.w.S * g.RS, 1e-9);
    near(`${tag} ${mode.mode}: satellite che rotola sulla corona`, vR, r.w.R * g.RR, 1e-9);
    near(`${tag} ${mode.mode}: rapporti fra le coppie M_R/M_S = R_R/R_S`, r.M.R / r.M.S, zR / zS, 1e-9);
  }
}
// numeric example: z 20/80, ring fixed, sun at 1500 rpm with 10 kW → carrier at 300 rpm, 318.3 N·m
{
  const r = X.epiSolve({ zS: 20, zR: 80, m: 2, N: 4, mode: 'fixed', fixed: 'R', input: 'S', nIn: 1500, load: 'P', P: 10 });
  near('esempio 20/80: velocità del portatreno [rpm]', r.n.SP, 300);
  near('esempio 20/80: coppia sul sole [N·m]', r.M.S, 10000 / (1500 * Math.PI / 30));
  near('esempio 20/80: coppia sul portatreno = −5 M_S', r.M.SP, -5 * r.M.S);
  near('esempio 20/80: reazione della corona = 4 M_S', r.M.R, 4 * r.M.S);
  near('esempio 20/80: satellite z 30, velocità rispetto al portatreno [rpm]', r.planet.nRel, -(1500 - 300) * 20 / 30);
  const b = X.epiSolve({ zS: 20, zR: 80, m: 2, N: 4, mode: 'fixed', fixed: 'R', input: 'S', nIn: 1500, load: 'P', P: 10, brake: { f: 0.3, A: 2000, RD: 100 } });
  near('esempio 20/80: freno sulla corona, pressione p = M_F/(2 f A R_D) [MPa]', b.brake.p, 4 * r.M.S * 1000 / (2 * 0.3 * 2000 * 100));
}
// ordinary train: two external pairs 20/60 and 15/45 → τ = 1/9, same direction; torque ×9
{
  const o = X.ordSolve({ stages: [{ z1: 20, z2: 60 }, { z1: 15, z2: 45 }], nIn: 900, load: 'M', Min: 10 });
  near('rotismo ordinario: τ totale = prodotto', o.tau, 1 / 9);
  near('rotismo ordinario: velocità di uscita [rpm]', o.nOut, 100);
  near('rotismo ordinario: coppia di uscita = M_m/|τ| [N·m]', o.Mout, 90);
  const i = X.ordSolve({ stages: [{ z1: 20, z2: 60, internal: true }], nIn: 900, load: 'M', Min: 10 });
  yes('rotismo ordinario: ingranaggio interno, stesso verso', i.tau > 0);
}
console.log(`\n${pass}/${pass + fail} controlli sui rotismi superati`);
process.exit(fail ? 1 : 0);

// ISO 286 check for the fits module, without a printed table:
//  1. the values of the first version of the module (IT6, IT7, f7 g6 h6 js6 k6 p6, all steps 3–500 mm)
//  2. limit deviations of commonly published fits (hole and shaft basis, several steps)
//  3. internal rule of the standard: with Δ = IT(n) − IT(n−1) the shaft-basis fit X(n)/h(n−1) has the
//     same clearances as the hole-basis fit H(n)/x(n−1), on every step and for every letter
//  4. IT grows with the step and with the grade
// Run with:  node tests/fits_iso.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { Math, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'modules', 'core', 'fits-core.js'), 'utf8'), ctx);
const X = vm.runInContext('({ findIsoStep, analyzeFit, itValue, shaftDeviations, holeDeviations, reverseLookupFit, ISO_STEPS, ISO_IT, fitKeys, parseFit })', ctx);

let pass = 0, fail = 0;
const eq = (name, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  ok ? pass++ : fail++;
  if (!ok) console.log(`FAIL  ${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(exp)}`);
};
const step = d => X.findIsoStep(d);

// 1. first version of the module (H7 hole basis table, 12 steps 3–500 mm)
const old = [
  [3, 6, 8, 12, -10, -4, 0, 4, 9, 20], [6, 10, 9, 15, -13, -5, 0, 4.5, 10, 24], [10, 18, 11, 18, -16, -6, 0, 5.5, 12, 29],
  [18, 30, 13, 21, -20, -7, 0, 6.5, 15, 35], [30, 50, 16, 25, -25, -9, 0, 8, 18, 42], [50, 80, 19, 30, -30, -10, 0, 9.5, 21, 51],
  [80, 120, 22, 35, -36, -12, 0, 11, 25, 59], [120, 180, 25, 40, -43, -14, 0, 12.5, 28, 68], [180, 250, 29, 46, -50, -15, 0, 14.5, 33, 79],
  [250, 315, 32, 52, -56, -17, 0, 16, 36, 88], [315, 400, 36, 57, -62, -18, 0, 18, 40, 98], [400, 500, 40, 63, -68, -20, 0, 20, 45, 108]];
for (const [mn, mx, it6, it7, f7, g6, h6, js6, k6, p6] of old) {
  for (const d of [mn + 0.01, (mn + mx) / 2, mx]) {
    const s = step(d), tag = `Ø${d}`;
    eq(`${tag} IT6`, X.itValue(s, 6), it6); eq(`${tag} IT7`, X.itValue(s, 7), it7);
    eq(`${tag} f7 es`, X.shaftDeviations(s, 'f', 7).es, f7); eq(`${tag} g6 es`, X.shaftDeviations(s, 'g', 6).es, g6);
    eq(`${tag} h6 es`, X.shaftDeviations(s, 'h', 6).es, h6); eq(`${tag} js6 es`, X.shaftDeviations(s, 'js', 6).es, js6);
    eq(`${tag} k6 es`, X.shaftDeviations(s, 'k', 6).es, k6); eq(`${tag} p6 es`, X.shaftDeviations(s, 'p', 6).es, p6);
  }
}

// 2. published limit deviations [upper, lower] in µm
const known = [
  [2, 'K7', [0, -10]], [2, 'M7', [-2, -12]], [2, 'N7', [-4, -14]], [2, 'P7', [-6, -16]], [2, 'S7', [-14, -24]], [2, 'c11', [-60, -120]],
  [10, 'K7', [5, -10]], [10, 'N7', [-4, -19]], [10, 'P7', [-9, -24]], [10, 'F8', [35, 13]], [10, 'js6', [4.5, -4.5]],
  [25, 'H7', [21, 0]], [25, 'g6', [-7, -20]], [25, 'K7', [6, -15]], [25, 'M7', [0, -21]], [25, 'N7', [-7, -28]], [25, 'P7', [-14, -35]],
  [25, 'S7', [-27, -48]], [25, 'F8', [53, 20]], [25, 'G7', [28, 7]], [25, 'D9', [117, 65]], [25, 'C11', [240, 110]], [25, 'N9', [0, -52]],
  [25, 'K8', [10, -23]], [25, 'K6', [2, -11]], [25, 'r6', [41, 28]], [25, 's6', [48, 35]], [25, 'e8', [-40, -73]], [25, 'd9', [-65, -117]],
  [50, 'H7', [25, 0]], [50, 'm6', [25, 9]], [50, 'n6', [33, 17]], [50, 'r6', [50, 34]], [50, 's6', [59, 43]], [50, 'e8', [-50, -89]],
  [50, 'd9', [-80, -142]], [50, 'c11', [-130, -290]], [40, 'c11', [-120, -280]],
  [100, 'p6', [59, 37]], [100, 'r6', [73, 51]], [100, 's6', [93, 71]], [100, 'K7', [10, -25]], [100, 'M7', [0, -35]], [100, 'N7', [-10, -45]],
  [100, 'P7', [-24, -59]], [100, 'S7', [-58, -93]], [100, 'H11', [220, 0]], [100, 'c11', [-170, -390]],
  [200, 'r6', [106, 77]], [200, 's6', [151, 122]], [200, 'K7', [13, -33]], [200, 'N7', [-14, -60]], [200, 'P7', [-33, -79]]
];
for (const [d, cls, exp] of known) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(cls), s = step(d);
  const got = m[1] === m[1].toUpperCase() ? (h => [h.ES, h.EI])(X.holeDeviations(s, m[1], +m[2])) : (v => [v.es, v.ei])(X.shaftDeviations(s, m[1], +m[2]));
  eq(`Ø${d} ${cls}`, got.map(v => v + 0), exp);
}

// 3. Δ rule: shaft-basis and hole-basis versions of the same fit have the same clearances (above 3 mm)
const sub = [4, 8, 12, 16, 20, 26, 35, 45, 55, 70, 90, 110, 130, 150, 170, 190, 210, 240, 260, 300, 330, 380, 420, 480];
for (const d of sub) {
  for (const l of ['f', 'g', 'k', 'm', 'n', 'p', 'r', 's']) {
    for (const n of (l === 'k' || l === 'm' || l === 'n' || l === 'f' || l === 'g' ? [7, 8] : [6, 7])) {
      const a = X.analyzeFit(step(d), `H${n}/${l}${n - 1}`), b = X.analyzeFit(step(d), `${l.toUpperCase()}${n}/h${n - 1}`);
      eq(`Ø${d} H${n}/${l}${n - 1} = ${l.toUpperCase()}${n}/h${n - 1}`, [b.minPlay, b.maxPlay], [a.minPlay, a.maxPlay]);
    }
  }
}

// 4. IT grows with the step and the grade
for (const g of [5, 6, 7, 8, 9, 10, 11]) for (let i = 1; i < 13; i++) eq(`IT${g} step ${i} grows`, X.ISO_IT[g][i] >= X.ISO_IT[g][i - 1], true);
for (let i = 0; i < 13; i++) for (const g of [6, 7, 8, 9, 10, 11]) eq(`IT${g} > IT${g - 1} step ${i}`, X.ISO_IT[g][i] > X.ISO_IT[g - 1][i], true);

// preferred fits: all valid, of the expected kind at Ø25
const kinds = { 'H11/c11': 'clearance', 'H9/d9': 'clearance', 'H8/f7': 'clearance', 'H7/g6': 'clearance', 'H7/h6': 'clearance', 'H7/js6': 'transition', 'H7/k6': 'transition', 'H7/n6': 'transition', 'H7/p6': 'interference', 'H7/r6': 'interference', 'H7/s6': 'interference', 'G7/h6': 'clearance', 'K7/h6': 'transition', 'N7/h6': 'transition', 'S7/h6': 'interference' };
for (const [f, k] of Object.entries(kinds)) eq(`Ø25 ${f} ${k}`, X.analyzeFit(step(25), f).kind, k);
eq('every preferred fit parses', X.fitKeys.every(f => !!X.parseFit(f)), true);
eq('reverse lookup shaft basis 0 µm → K7/h6', X.reverseLookupFit(step(25), 0, 'shaft').fit, 'K7/h6');

console.log(`\n${pass}/${pass + fail} controlli ISO 286 superati`);
process.exit(fail ? 1 : 0);

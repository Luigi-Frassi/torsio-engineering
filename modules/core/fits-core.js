// ==========================================
// MODULE 1: ISO FITS & TOLERANCES (ISO 286-1 / ISO 286-2)
// Core: tolerance grades, fundamental deviations and the analytical engine. Pure functions, no DOM access.
// Diameters in mm, deviations in µm.
//
// Coverage: nominal sizes up to 500 mm, grades IT5–IT11, shafts c d e f g h js k m n p r s,
// holes C D E F G H JS K M N P R S, any combination (hole basis, shaft basis or mixed).
// Hole deviations follow the ISO 286-1 rules: A–H mirror the shaft (EI = −es); K, M, N up to IT8 and
// P–S up to IT7 take ES = −ei + Δ with Δ = IT(n) − IT(n−1); above those grades ES = −ei (N: ES = 0).
// ==========================================

// Main steps of ISO 286-1 (upper bound of each step, "over … up to …")
const ISO_STEPS = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];

// Standard tolerance grades IT [µm], one value per main step
const ISO_IT = {
  5:  [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
  6:  [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  7:  [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
  8:  [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
  9:  [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
  10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
  11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400]
};
const ISO_GRADES_SHAFT = [5, 6, 7, 8, 9, 10, 11];
const ISO_GRADES_HOLE = [6, 7, 8, 9, 10, 11];

// Intermediate steps, needed by c, r and s (upper bounds)
const ISO_SUBSTEPS = [3, 6, 10, 18, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500];

// Shaft fundamental deviations [µm]: upper deviation es for c–h, lower deviation ei for k–s.
// 'main' rows have one value per main step, 'sub' rows one per intermediate step.
const ISO_SHAFT_FD = {
  c: { sub: [-60, -70, -80, -95, -110, -120, -130, -140, -150, -170, -180, -200, -210, -230, -240, -260, -280, -300, -330, -360, -400, -440, -480] },
  d: { main: [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230] },
  e: { main: [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135] },
  f: { main: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68] },
  g: { main: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20] },
  h: { main: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  k: { main: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5] },          // IT4–IT7; 0 for the other grades
  m: { main: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23] },
  n: { main: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40] },
  p: { main: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68] },
  r: { sub: [10, 15, 19, 23, 28, 34, 34, 41, 43, 51, 54, 63, 65, 68, 77, 80, 84, 94, 98, 108, 114, 126, 132] },
  s: { sub: [14, 19, 23, 28, 35, 43, 43, 53, 59, 71, 79, 92, 100, 108, 122, 130, 140, 158, 170, 190, 208, 232, 252] }
};
const ISO_SHAFT_LETTERS = ['c', 'd', 'e', 'f', 'g', 'h', 'js', 'k', 'm', 'n', 'p', 'r', 's'];
const ISO_HOLE_LETTERS = ISO_SHAFT_LETTERS.map(l => l.toUpperCase());

// Preferred fits shown in the menu (ISO 286-2 / ISO 1829 selection), hole basis first
const fitKeysHole = ['H11/c11', 'H9/d9', 'H8/f7', 'H7/f7', 'H7/g6', 'H7/h6', 'H8/h7', 'H7/js6', 'H7/k6', 'H7/n6', 'H7/p6', 'H7/r6', 'H7/s6'];
const fitKeysShaft = ['C11/h11', 'D9/h9', 'F8/h7', 'G7/h6', 'K7/h6', 'N7/h6', 'P7/h6', 'S7/h6'];
const fitKeys = fitKeysHole.concat(fitKeysShaft);

// Surface roughness indicated for each grade (typical machining practice)
const ISO_RA = {
  5: 'Ra 0.2-0.4 µm / 8-16 µin', 6: 'Ra 0.4-0.8 µm / 16-32 µin', 7: 'Ra 0.8-1.6 µm / 32-63 µin', 8: 'Ra 1.6 µm / 63 µin',
  9: 'Ra 1.6-3.2 µm / 63-125 µin', 10: 'Ra 3.2 µm / 125 µin', 11: 'Ra 3.2-6.3 µm / 125-250 µin'
};
// The six fits with their own, more specific indication (kept from the first version of the module)
const fitsRaSpecific = {
  'H7/f7': { shaftRa: 'Ra 1.6 µm / 63 µin', holeRa: 'Ra 1.6-3.2 µm / 63-125 µin' },
  'H7/g6': { shaftRa: 'Ra 0.8 µm / 32 µin', holeRa: 'Ra 1.6 µm / 63 µin' },
  'H7/h6': { shaftRa: 'Ra 0.8 µm / 32 µin', holeRa: 'Ra 1.6 µm / 63 µin' },
  'H7/js6': { shaftRa: 'Ra 0.8 µm / 32 µin', holeRa: 'Ra 1.6 µm / 63 µin' },
  'H7/k6': { shaftRa: 'Ra 0.8 µm / 32 µin', holeRa: 'Ra 1.6 µm / 63 µin' },
  'H7/p6': { shaftRa: 'Ra 0.4-0.8 µm / 16-32 µin', holeRa: 'Ra 0.8-1.6 µm / 32-63 µin' }
};

// Roughness for any fit: the specific indication when there is one, otherwise from the grades
function fitRa(fit) {
  if (fitsRaSpecific[fit]) return fitsRaSpecific[fit];
  const p = parseFit(fit);
  if (!p) return { shaftRa: '--', holeRa: '--' };
  return { shaftRa: ISO_RA[p.shaft.grade] || '--', holeRa: ISO_RA[p.hole.grade] || '--' };
}

// Nominal size in the range covered (up to 500 mm). ISO 286 starts at "up to 3 mm"; below 1 mm the
// fit has little practical meaning, so 1 mm is the lower limit.
function isFitDiameterValid(dMm) {
  return !(isNaN(dMm) || dMm < 1 || dMm > 500);
}

// Index of the step that contains d ("over min up to max": the upper bound belongs to the step)
function isoStepIndex(bounds, d) {
  const i = bounds.findIndex(b => d <= b);
  return i < 0 ? bounds.length - 1 : i;
}

// ISO 286 step for the nominal size: { min, max, i, d } (i = index of the main step)
function findIsoStep(dMm) {
  const i = isoStepIndex(ISO_STEPS, dMm);
  return { min: i ? ISO_STEPS[i - 1] : 0, max: ISO_STEPS[i], i, d: dMm };
}

// Standard tolerance IT [µm]
function itValue(step, grade) {
  const row = ISO_IT[grade];
  return row ? row[step.i] : NaN;
}

// "H7" → { letter: 'H', grade: 7 }, "js6" → { letter: 'js', grade: 6 }
function parseTolClass(cls) {
  const m = /^([A-Za-z]{1,2})(\d{1,2})$/.exec(String(cls || '').trim());
  return m ? { letter: m[1], grade: Number(m[2]) } : null;
}

// "H7/g6" → { hole: {letter, grade}, shaft: {letter, grade} } or null when it is not a valid ISO fit
function parseFit(fit) {
  const [h, s] = String(fit || '').split('/');
  const hole = parseTolClass(h), shaft = parseTolClass(s);
  if (!hole || !shaft) return null;
  if (!ISO_HOLE_LETTERS.includes(hole.letter) || !ISO_SHAFT_LETTERS.includes(shaft.letter)) return null;
  if (!ISO_GRADES_HOLE.includes(hole.grade) || !ISO_GRADES_SHAFT.includes(shaft.grade)) return null;
  return { hole, shaft };
}
function isValidFit(fit) { return !!parseFit(fit); }

// Fundamental deviation of a shaft letter [µm] (es for c–h, ei for k–s)
function shaftFundamental(step, letter, grade) {
  const row = ISO_SHAFT_FD[letter];
  if (!row) return NaN;
  if (letter === 'k' && (grade < 4 || grade > 7)) return 0;
  return row.main ? row.main[step.i] : row.sub[isoStepIndex(ISO_SUBSTEPS, step.d)];
}

// Upper (es) and lower (ei) deviation of a shaft class [µm]
function shaftDeviations(step, letter, grade) {
  const IT = itValue(step, grade);
  if (letter === 'js') return { es: IT / 2, ei: -IT / 2 };
  const fd = shaftFundamental(step, letter, grade);
  if ('cdefgh'.includes(letter)) return { es: fd, ei: fd - IT };
  return { es: fd + IT, ei: fd };
}

// Δ = IT(n) − IT(n−1) used by the holes K–S; zero up to 3 mm
function isoDelta(step, grade) {
  if (step.i === 0) return 0;
  const a = itValue(step, grade), b = itValue(step, grade - 1);
  return isNaN(b) ? (grade === 5 ? a - [3, 4, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20][step.i] : 0) : a - b;
}

// Upper (ES) and lower (EI) deviation of a hole class [µm], from the shaft of the same letter
function holeDeviations(step, letter, grade) {
  const IT = itValue(step, grade), l = letter.toLowerCase();
  if (l === 'js') return { ES: IT / 2, EI: -IT / 2 };
  if ('cdefgh'.includes(l)) {
    const EI = -shaftFundamental(step, l, grade);
    return { ES: EI + IT, EI };
  }
  let ES;
  if (l === 'k' || l === 'm' || l === 'n') {
    const ei = shaftFundamental(step, l, l === 'k' ? 6 : grade);   // K: the k value for IT4–IT7
    if (grade <= 8) ES = -ei + isoDelta(step, grade);
    else ES = l === 'n' ? 0 : (l === 'k' ? 0 : -ei);
  } else {
    const ei = shaftFundamental(step, l, grade);
    ES = grade <= 7 ? -ei + isoDelta(step, grade) : -ei;
  }
  return { ES, EI: ES - IT };
}

// Old interface, kept for the shaft classes of the first version ('g6', 'k6', …)
function getShaftDevs(step, shaftClass) {
  const p = parseTolClass(shaftClass);
  return p ? shaftDeviations(step, p.letter, p.grade) : { es: 0, ei: 0 };
}

// Kind of fit from the minimum and maximum clearance [µm]
function classifyFit(minPlay, maxPlay) {
  if (minPlay >= 0) return 'clearance';
  if (maxPlay <= 0) return 'interference';
  return 'transition';
}

// Basis of the fit: 'hole' (H…), 'shaft' (…h) or 'mixed'
function fitBasis(fit) {
  const p = parseFit(fit);
  if (!p) return 'mixed';
  if (p.hole.letter === 'H') return 'hole';
  if (p.shaft.letter === 'h') return 'shaft';
  return 'mixed';
}

/**
 * Analysis of any ISO fit ('H7/g6', 'G7/h6', 'F8/k6', …) on an ISO step.
 * Clearance = hole − shaft: Gmax = ES − ei, Gmin = EI − es (negative = interference).
 */
function analyzeFit(step, fit) {
  const p = parseFit(fit) || parseFit('H7/g6');
  if (!step.d && step.d !== 0) step = findIsoStep(step.max);   // a step without the size: its upper bound
  const H = holeDeviations(step, p.hole.letter, p.hole.grade);
  const devs = shaftDeviations(step, p.shaft.letter, p.shaft.grade);
  const r = v => Math.round(v * 10) / 10 + 0;   // + 0 turns −0 into 0
  const ES_H = r(H.ES), EI_H = r(H.EI);
  devs.es = r(devs.es); devs.ei = r(devs.ei);
  const maxPlay = r(ES_H - devs.ei);
  const minPlay = r(EI_H - devs.es);
  return {
    fit: `${p.hole.letter}${p.hole.grade}/${p.shaft.letter}${p.shaft.grade}`,
    holeClass: `${p.hole.letter}${p.hole.grade}`, shaftClass: `${p.shaft.letter}${p.shaft.grade}`,
    holeGrade: p.hole.grade, shaftGrade: p.shaft.grade,
    ES_H, EI_H, devs, maxPlay, minPlay, kind: classifyFit(minPlay, maxPlay)
  };
}

// Mean clearance of the fit [µm] (negative = interference)
function meanPlayOf(step, fit) {
  const a = analyzeFit(step, fit);
  return (a.maxPlay + a.minPlay) / 2;
}

/**
 * Reverse lookup: the preferred fit whose mean clearance is closest to the target.
 * targetMicron: wanted clearance [µm], negative for interference.
 * basis: 'hole' (default, H… fits), 'shaft' (…h fits) or 'all'.
 */
function reverseLookupFit(step, targetMicron, basis = 'hole') {
  const keys = basis === 'shaft' ? fitKeysShaft : basis === 'all' ? fitKeys : fitKeysHole;
  let bestFit = keys[0];
  let minDiff = Infinity;
  keys.forEach(cand => {
    const diff = Math.abs(meanPlayOf(step, cand) - targetMicron);
    if (diff < minDiff - 1e-9) { minDiff = diff; bestFit = cand; }
  });
  return { fit: bestFit, meanPlay: meanPlayOf(step, bestFit) };
}

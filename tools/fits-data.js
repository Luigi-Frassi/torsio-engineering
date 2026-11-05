// Prints the ISO 286 tables used by the fits landing pages (tools/mkguides.py), straight from modules/core/fits-core.js.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { Math }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'modules', 'core', 'fits-core.js'), 'utf8'), ctx);
const out = vm.runInContext(`(() => {
  const steps = ISO_STEPS.map((max, i) => ({ min: i ? ISO_STEPS[i - 1] : 0, max }));
  const classes = ['H7', 'H8', 'f7', 'g6', 'h6', 'js6', 'k6', 'n6', 'p6'];
  const dev = steps.map(s => { const st = findIsoStep(s.max); return classes.map(c => {
    const p = parseTolClass(c);
    if (c[0] === c[0].toUpperCase()) { const d = holeDeviations(st, p.letter, p.grade); return [d.ES, d.EI]; }
    const d = shaftDeviations(st, p.letter, p.grade); return [d.es, d.ei]; }); });
  const at30 = fitKeysHole.map(f => { const a = analyzeFit(findIsoStep(30), f); return [a.fit, a.maxPlay, a.minPlay, classifyFit(a.minPlay, a.maxPlay)]; });
  return { steps, classes, dev, at30 };
})()`, ctx);
console.log(JSON.stringify(out));

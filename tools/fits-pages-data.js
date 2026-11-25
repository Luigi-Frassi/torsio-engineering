// Data for the one-page-per-fit pages (tools/mkfits.py): every recommended fit on every ISO 286 range,
// computed by modules/core/fits-core.js (intermediate ranges where the letter has them: c, r, s).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { Math }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'modules', 'core', 'fits-core.js'), 'utf8'), ctx);
console.log(JSON.stringify(vm.runInContext(`(() => fitKeys.map(fit => {
  const p = parseFit(fit), sub = /[crs]/i.test(p.hole.letter + p.shaft.letter);
  const list = sub ? ISO_SUBSTEPS : ISO_STEPS;
  const rows = list.map((max, i) => { const a = analyzeFit(findIsoStep(max), fit);
    return { min: i ? list[i - 1] : 0, max, ES: a.ES_H, EI: a.EI_H, es: a.devs.es, ei: a.devs.ei, gmax: a.maxPlay, gmin: a.minPlay, kind: a.kind }; });
  const ex = analyzeFit(findIsoStep(30), fit);
  return { fit, basis: fitKeysHole.includes(fit) ? 'hole' : 'shaft', ra: fitRa(fit), rows,
           at30: { ES: ex.ES_H, EI: ex.EI_H, es: ex.devs.es, ei: ex.devs.ei, gmax: ex.maxPlay, gmin: ex.minPlay, kind: ex.kind } };
}))()`, ctx)));

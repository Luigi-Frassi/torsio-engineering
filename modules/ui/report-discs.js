// ============================================================================
// Calculation report of the discs module (discs, thick tubes, shrink fits; disc of uniform strength)
// The steps are the same as in the app (dsStepsData), typeset with KaTeX.
// ============================================================================

const REPORT_DS_TXT = {
  it: {
    title: 'Dischi, tubi spessi e calettamenti', titleUni: 'Disco a uniforme resistenza',
    disclaimer: 'Calcolo con il metodo degli appunti di Costruzione di Macchine: dischi di spessore costante in stato piano di tensione, congruenza all\'interfaccia, von Mises. Non considera concentrazioni di tensione ai bordi del mozzo, effetti di bordo di tubi sottili, plasticizzazione e fatica. Per il progetto esecutivo verificare con DIN 7190 (accoppiamenti forzati) o con un modello agli elementi finiti.',
    s1: 'Dati', s2: 'Sezione e andamento delle tensioni', s3: 'Tensioni nei punti significativi', s4: 'Passaggi del calcolo', s5: 'Ipotesi e note',
    geo: 'Elemento', ri: 'R interno', re: 'R esterno', h: 'Spessore', mat: 'E · ν · ρ · α · σs', loads: 'Esercizio', interf: 'Interferenza',
    hyp: ['Dischi di spessore costante, stato piano di tensione ($\\sigma_a = 0$, salvo i fondelli), carichi assialsimmetrici, moto stazionario, materiale elastico lineare.',
      'All\'interfaccia la forza radiale per unità di circonferenza è la stessa sui due elementi: $p_i h_i = p_e h_e$.',
      'La velocità di distacco si ottiene con la pressione lineare in $\\omega^2$ finché gli elementi sono a contatto.',
      'Tensione equivalente di von Mises; X = σs/σeq negli elementi con σs indicata.']
  },
  en: {
    title: 'Discs, thick tubes and shrink fits', titleUni: 'Disc of uniform strength',
    disclaimer: 'Calculation with the method of the Machine Design notes: discs of constant thickness in plane stress, congruence at the interface, von Mises. Stress concentrations at the hub edges, edge effects of thin tubes, yielding and fatigue are not considered. For the final design check with DIN 7190 (interference fits) or a finite element model.',
    s1: 'Data', s2: 'Section and stress distribution', s3: 'Stresses at the significant points', s4: 'Calculation steps', s5: 'Assumptions and notes',
    geo: 'Element', ri: 'Inner R', re: 'Outer R', h: 'Thickness', mat: 'E · ν · ρ · α · σy', loads: 'Service', interf: 'Interference',
    hyp: ['Discs of constant thickness, plane stress ($\\sigma_a = 0$, except with end caps), axisymmetric loads, steady motion, linear elastic material.',
      'At the interface the radial force per unit circumference is the same on both elements: $p_i h_i = p_e h_e$.',
      'The separation speed follows from the pressure being linear in $\\omega^2$ while the elements are in contact.',
      'Von Mises equivalent stress; X = σy/σeq in the elements with a given σy.']
  }
};

function buildDiscReportHtml() {
  calculateDiscs();
  const st = lastDiscState; if (!st) return null;
  const R_ = REPORT_TXT[currentLang] || REPORT_TXT.en, D = REPORT_DS_TXT[currentLang] || REPORT_DS_TXT.en, t = dsT(), N = reportNum;
  let body = '', sec = 0;
  const H = title => `<h3><span class="n">${++sec}.</span>${title}</h3>`;
  if (st.uni) {
    const U = st.U, r = st.r;
    body += H(D.s1) + reportKV([[t.uRe, `${N(+U.D, 0)} mm`], [t.uSa, `${N(+U.sa, 0)} MPa`], [t.uN, `${N(+U.n, 0)} rpm`], [t.uRho, `${N(+U.rho, 0)} kg/m³`], [t.uLoad, U.load === 'F' ? `${t.uF}: ${N(+U.F, 1)} kN` : `${t.uHe}: ${N(+U.he, 2)} mm`]]);
    const ch = document.getElementById('duChart');
    if (ch) body += `<div class="fig">${reportSvgForPrint(ch.outerHTML)}</div>`;
    body += H(D.s4) + reportEq([
      U.load === 'F' ? `h_e = \\frac{F}{2\\pi R_e\\,\\sigma_a} = ${texNum(r.hE, 2)}\\ \\text{mm}` : `h_e = ${texNum(r.hE, 2)}\\ \\text{mm}`,
      `h(r) = h_e\\, e^{\\frac{\\rho\\omega^2}{2\\sigma_a}(R_e^2 - r^2)} \\;\\Rightarrow\\; h(0) = ${texNum(r.h0, 2)}\\ \\text{mm},\\qquad m = ${texNum(r.mass, 1)}\\ \\text{kg}`]);
    return reportShell(D.titleUni, `h(0) = ${N(r.h0, 1)} mm · h_e = ${N(r.hE, 1)} mm`, body, R_, D.disclaimer);
  }
  const { inp, res } = st;
  // 1. data
  body += H(D.s1) + reportTable([D.geo, D.ri + ' [mm]', D.re + ' [mm]', D.h + ' [mm]', D.mat], inp.rings.map((el, k) => [
    dsName(st, k), N(el.Ri, 1), N(el.Re, 1), N(el.h, 1), `${N(el.E / 1000, 0)} GPa · ${N(el.nu, 2)} · ${N(el.rho, 0)} · ${N(el.alpha * 1e6, 1)}·10⁻⁶ · ${el.sy > 0 ? N(el.sy, 0) + ' MPa' : '—'}${el.noInertia ? (currentLang === 'it' ? ' · senza inerzia' : ' · no inertia') : ''}`]));
  const kv = [[t.n, `${N(inp.n, 0)} rpm (ω = ${N(res.omega, 2)} rad/s)`]];
  if (inp.dT) kv.push([t.dT, `${N(inp.dT, 0)} °C`]);
  if (inp.Pi) kv.push([t.Pi, `${N(inp.Pi, 2)} MPa${inp.closedEnds ? ' · ' + (currentLang === 'it' ? 'con fondelli' : 'with end caps') : ''}`]);
  if (inp.Pe) kv.push([t.Pe, `${N(inp.Pe, 2)} MPa`]);
  if (inp.band) kv.push([t.exts.band, `σ = ${N(inp.band.sigma, 0)} MPa · t = ${N(inp.band.t, 1)} mm → p_e = ${N(res.PeBand, 2)} MPa`]);
  if (inp.bladeF) kv.push([t.bladeF, `${N(inp.bladeF / 1000, 1)} kN → σr(Re) = ${N(-res.bladeP, 2)} MPa`]);
  inp.iRad.forEach((i, k) => kv.push([`${D.interf} ${k + 1}/${k + 2}`, `i = ${N(i * 1000, 2)} µm · δ = ${N(i * 2000, 2)} µm · i_R = ${dsSig(i / inp.rings[k].Re, 4)}`]));
  if (inp.torque) kv.push([t.torque, `T = ${N(inp.torque.T / 1000, 0)} N·m · f = ${N(inp.torque.f, 2)} · X = ${N(inp.torque.X, 2)}`]);
  body += reportKV(kv);
  // 2. figures
  const sk = document.getElementById('dsSketch'), ch = document.getElementById('dsChart');
  const views = [st.showRest ? 'rest' : null, st.hasService || !st.showRest ? 'service' : null].filter(Boolean);
  const keep = dsView;
  let figs = sk ? `<div class="fig" style="max-width:300px">${reportSvgForPrint(sk.outerHTML)}</div>` : '';
  views.forEach(v => { dsView = v; dsDrawChart(st); figs += `<p><b>${t[v]}</b></p><div class="fig">${reportSvgForPrint(document.getElementById('dsChart').outerHTML)}</div>`; });
  dsView = keep; dsDrawChart(st);
  body += H(D.s2) + figs;
  // 3. table
  const anySa = [res.rest, res.service].some(S => S.sa);
  const rows = [];
  views.forEach(v => {
    const S = v === 'rest' ? res.rest : res.service;
    inp.rings.forEach((el, k) => ['inner', 'outer'].forEach(w => {
      const p = S.rings[k][w], hl = S.crit.k === k && Math.abs(S.crit.r - p.r) < 1e-9;
      rows.push({ cls: hl ? 'hl' : '', cells: [t[v], dsName(st, k), N(p.r, 1), N(p.sr, 1), N(p.sc, 1)].concat(anySa ? [N(p.sa, 1)] : [], [N(p.seq, 1), N(p.u * 1000, 1), el.sy > 0 ? N(el.sy / p.seq, 2) : '—']) });
    }));
  });
  body += H(D.s3) + reportTable(['', t.colEl, t.colR, 'σr', 'σc'].concat(anySa ? ['σa'] : [], ['σeq', t.colU, 'X']), rows);
  // 4. steps
  body += H(D.s4) + dsStepsData(st).map(s => `<p><b>${s.h}</b></p>` + reportEq(s.eq) + s.txt.map(x => `<p class="small">${reportTexify(x)}</p>`).join('')).join('');
  // 5. assumptions
  body += H(D.s5) + '<ul>' + D.hyp.map(h => `<li>${reportTexify(h)}</li>`).join('') + '</ul>';
  const head = st.multi ? `p = ${res.rest.pairs[0].open ? t.open : N(res.rest.pairs[0].pOut, 1) + ' MPa'}` + (res.sep[0] && res.sep[0].omega ? ` · ω_sep = ${N(res.sep[0].rpm, 0)} rpm` : '') : `σeq max = ${N(res.service.crit.seq, 1)} MPa`;
  return reportShell(D.title, head, body, R_, D.disclaimer);
}

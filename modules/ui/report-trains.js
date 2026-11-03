// ============================================================================
// Calculation report of the gear trains module (epicyclic and ordinary train)
// ============================================================================
const REPORT_TR_TXT = {
  it: { titleEpi: 'Treno epicicloidale — rapporti, velocità e coppie', titleOrd: 'Rotismo ordinario — rapporto, velocità e coppie', s1: 'Dati', s2: 'Schema', s3: 'Alberi', s4: 'Tutti i rapporti', s5: 'Passaggi del calcolo', s6: 'Ipotesi',
    disclaimer: 'Calcolo cinematico e statico con il metodo degli appunti di Meccanica Applicata alle Macchine: rotolamento senza strisciamento, ruote con lo stesso modulo, nessuna perdita. Non dimensiona le ruote dentate (usare il modulo Ruote dentate) né i cuscinetti.',
    hyp: ['Ruote con lo stesso modulo: $R = m z / 2$.', 'Rotolamento senza strisciamento ai contatti sole–satellite e satellite–corona.', 'Nessuna perdita: la somma delle potenze sui tre alberi è nulla.', 'Con N satelliti uguali la forza sui denti si divide in parti uguali.'] },
  en: { titleEpi: 'Epicyclic train — ratios, speeds and torques', titleOrd: 'Ordinary gear train — ratio, speeds and torques', s1: 'Data', s2: 'Layout', s3: 'Shafts', s4: 'All ratios', s5: 'Calculation steps', s6: 'Assumptions',
    disclaimer: 'Kinematic and static calculation with the method of the Applied Mechanics notes: rolling without slip, wheels with the same module, no losses. It does not size the gears (use the Gears module) nor the bearings.',
    hyp: ['Wheels with the same module: $R = m z / 2$.', 'Rolling without slip at the sun–planet and planet–ring contacts.', 'No losses: the powers on the three shafts add up to zero.', 'With N equal planets the tooth force is shared equally.'] }
};
function buildTrainReportHtml() {
  calculateTrains();
  const st = lastTrainState; if (!st) return null;
  const R_ = REPORT_TXT[currentLang] || REPORT_TXT.en, D = REPORT_TR_TXT[currentLang] || REPORT_TR_TXT.en, t = trT(), N = reportNum;
  let body = '', sec = 0;
  const H = title => `<h3><span class="n">${++sec}.</span>${title}</h3>`;
  const steps = data => data.map(s => `<p><b>${s.h}</b></p>` + reportEq(s.eq) + (s.txt || []).map(x => `<p class="small">${reportTexify(x)}</p>`).join('')).join('');
  if (st.tab === 'ord') {
    const r = st.r;
    body += H(D.s1) + reportTable([t.stage, 'z₁', 'z₂', 'τ', 'n [rpm]', 'M [N·m]'], r.rows.map((x, k) => [k + 1 + (x.internal ? ' (int.)' : ''), x.z1, x.z2, N(x.tau, 4), `${N(x.nIn, 1)} → ${N(x.nOut, 1)}`, `${N(x.Min, 2)} → ${N(x.Mout, 2)}`]));
    body += H(D.s5) + steps([{ h: 'τ', eq: [`\\tau = \\prod \\tau_i = ${texNum(r.tau, 4)},\\quad n_{out} = ${texNum(r.nOut, 1)}\\ \\text{rpm},\\quad M_u = M_m/|\\tau| = ${texNum(r.Mout, 2)}\\ \\text{N m}`] }]);
    return reportShell(D.titleOrd, `τ = ${N(r.tau, 4)}`, body, R_, D.disclaimer);
  }
  const r = st.r, M = st.M;
  body += H(D.s1) + reportKV([[t.zS, r.g.zS], [t.zR, r.g.zR], [t.zP, r.g.zP], [t.m, `${N(r.g.m, 2)} mm`], [t.N, r.N],
    [t.mode, t.modes[M.mode] + (M.mode === 'fixed' ? ` · ${t.fixed}: ${t.sh[M.fixed]} · ${t.input}: ${t.sh[M.input]}` : ` · ${t.unknown}: ${t.sh[M.unknown]}`)]]);
  const sk = document.getElementById('trSketch');
  if (sk) body += H(D.s2) + `<div class="fig" style="max-width:300px">${reportSvgForPrint(sk.outerHTML)}</div>`;
  body += H(D.s3) + reportTable([t.colSh, t.colN, t.colW, t.colM, t.colP, t.colRole], TR_SHAFTS.map(s => [t.sh[s], N(r.n[s], 1), N(r.w[s], 2), N(r.M[s], 2), N(r.P[s] / 1000, 3), t.role[trRole(r, M, s)]]));
  body += H(D.s4) + reportTable([t.colFix, t.colIO, t.colTau], r.ratios.map(x => ({ cls: M.mode === 'fixed' && x.fixed === M.fixed && x.inp === M.input ? 'hl' : '', cells: [t.sh[x.fixed], `${t.sh[x.inp]} → ${t.sh[x.out]}`, N(x.tau, 4)] })));
  body += H(D.s5) + steps(trStepsData(r, M));
  body += H(D.s6) + '<ul>' + D.hyp.map(h => `<li>${reportTexify(h)}</li>`).join('') + '</ul>';
  return reportShell(D.titleEpi, M.mode === 'fixed' ? `τ = ${N(r.tau, 4)} · z ${r.g.zS}/${r.g.zP}/${r.g.zR}` : `z ${r.g.zS}/${r.g.zP}/${r.g.zR}`, body, R_, D.disclaimer);
}

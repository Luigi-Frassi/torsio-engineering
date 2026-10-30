// ============================================================================
// FEEDBACK — "Was this useful? 👍 / 👎" under every module and in the report toolbar.
// The vote opens Luigi's Tally form (Torsio Engineering — Feedback) in a popup on the page, with the
// hidden fields vote, module and lang already filled; the questions in the form are all optional.
// Tally's script is loaded only on the first click (nothing is sent to Tally before), and if it cannot
// be loaded the form opens in a new tab with the same fields in the URL.
// ============================================================================

const FEEDBACK_FORM = 'Gev5gZ';
const FEEDBACK_URL = 'https://tally.so/r/' + FEEDBACK_FORM;

const FB_TXT = {
  it: { ask: 'Questo modulo ti è stato utile?', up: 'Sì', down: 'No', sub: 'Un clic, poi due domande facoltative. Ogni risposta viene letta.', thanks: 'Grazie del riscontro!', open: 'Vuoi aggiungere un commento? Apri il modulo ↗', report: 'Ti è stata utile?', side: 'Lascia un parere o segnala un problema',
    why: 'Cosa non è andato?', reasons: { wrong: 'Risultato sbagliato', missing: 'Manca una funzione', hard: 'Difficile da usare', notwhat: 'Non era quello che cercavo' }, more: 'Vuoi spiegare meglio? Scrivici ↗' },
  en: { ask: 'Was this module useful?', up: 'Yes', down: 'No', sub: 'One click, then two optional questions. Every answer gets read.', thanks: 'Thanks for the feedback!', open: 'Want to add a comment? Open the form ↗', report: 'Was it useful?', side: 'Give feedback or report a problem',
    why: 'What went wrong?', reasons: { wrong: 'Wrong result', missing: 'Missing a feature', hard: 'Hard to use', notwhat: 'Not what I was looking for' }, more: 'Want to tell us more? Write to us ↗' }
};
function fbT() { return FB_TXT[typeof currentLang !== 'undefined' ? currentLang : 'en'] || FB_TXT.en; }

// form URL with the hidden fields (used by the report window and as fallback)
function feedbackUrl(vote, module, lang) {
  const q = new URLSearchParams();
  if (vote) q.set('vote', vote);
  if (module) q.set('module', module);
  if (lang) q.set('lang', lang);
  return FEEDBACK_URL + (q.toString() ? '?' + q.toString() : '');
}

let fbScript = null;   // promise of Tally's embed script
function fbLoadTally() {
  if (window.Tally && typeof window.Tally.openPopup === 'function') return Promise.resolve(window.Tally);
  if (!fbScript) {
    fbScript = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://tally.so/widgets/embed.js';
      s.async = true;
      s.onload = () => (window.Tally ? resolve(window.Tally) : reject(new Error('no Tally')));
      s.onerror = () => { fbScript = null; reject(new Error('Tally blocked')); };
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('Tally timeout')), 6000);
    });
  }
  return fbScript;
}

let fbDone = new Set();   // modules already voted in this visit
let fbAsking = null;      // module waiting for the reason of a ✕ vote
let fbReason = {};        // module → reason chosen after a ✕
let fbFallback = null;    // form URL shown as a link when Tally's script cannot be loaded

// the vote is also counted in Vercel Analytics as a view of /feedback/<up|down>/<module>, so a 👍 counts
// even when the person closes the form without sending it (only the vote and the module name are sent)
function fbCount(vote, module) {
  try { if (vote && typeof window.va === 'function') window.va('pageview', { route: '/feedback/' + vote + '/' + module, path: '/feedback/' + vote + '/' + module }); } catch (e) { /* analytics only */ }
}

// a ✕ first asks why, with four one-click answers counted in Analytics as /feedback/down/<module>/<reason>;
// the form stays available as a link for whoever wants to write more
function fbDown() {
  const module = typeof activeModule !== 'undefined' ? activeModule : '';
  fbAsking = module;
  fbRender();
}
function fbPickReason(reason) {
  const module = fbAsking;
  fbAsking = null;
  if (!module) return;
  fbCount('down', module);
  try { if (typeof window.va === 'function') window.va('pageview', { route: '/feedback/down/' + module + '/' + reason, path: '/feedback/down/' + module + '/' + reason }); } catch (e) { /* analytics only */ }
  fbDone.add(module); fbReason[module] = reason;
  fbFallback = null;
  fbRender();
}

function openFeedback(vote) {
  if (vote === 'down') return fbDown();
  const module = typeof activeModule !== 'undefined' ? activeModule : '';
  const lang = typeof currentLang !== 'undefined' ? currentLang : 'en';
  const hiddenFields = { vote: vote || '', module, lang };
  if (vote) { fbCount(vote, module); fbDone.add(module); }
  fbFallback = null;
  fbRender();
  fbLoadTally().then(T => {
    T.openPopup(FEEDBACK_FORM, { layout: 'modal', width: 520, hideTitle: true, autoClose: 2500, hiddenFields });
  }).catch(() => { fbFallback = feedbackUrl(vote, module, lang); fbRender(); });
}

function fbRender() {
  const box = document.getElementById('fbBar');
  if (!box) return;
  const t = fbT(), module = typeof activeModule !== 'undefined' ? activeModule : '';
  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-amber-400/70 hover:bg-slate-800 text-sm font-semibold text-slate-200 transition-colors';
  const lang = typeof currentLang !== 'undefined' ? currentLang : 'en';
  const html = fbAsking === module
    ? `<p class="text-sm font-semibold text-white mb-2">${t.why}</p><div class="flex flex-wrap gap-2">` +
      Object.entries(t.reasons).map(([k, v]) => `<button type="button" class="${btn}" data-fb-reason="${k}">${v}</button>`).join('') + `</div>`
    : fbDone.has(module)
    ? `<p class="text-sm text-emerald-400 font-semibold">${t.thanks}</p>` + (fbFallback ? `<p class="text-xs mt-1"><a class="text-blue-400 underline" href="${fbFallback}" target="_blank" rel="noopener">${t.open}</a></p>` : '') +
      (fbReason[module] ? `<p class="text-xs mt-1"><a class="text-blue-400 underline" href="${feedbackUrl('down', module, lang)}&reason=${fbReason[module]}" target="_blank" rel="noopener">${t.more}</a></p>` : '')
    : `<div class="flex flex-wrap items-center gap-3"><span class="text-sm font-semibold text-white">${t.ask}</span>
        <button type="button" class="${btn}" data-fb="up"><svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg> ${t.up}</button><button type="button" class="${btn}" data-fb="down"><svg class="ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg> ${t.down}</button></div>
        <p class="text-[11px] text-slate-500 mt-2">${t.sub}</p>`;
  if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }
  const side = document.getElementById('fbSideText');
  if (side) side.textContent = t.side;
}

(function fbInstall() {
  const box = document.getElementById('fbBar');
  if (box) box.addEventListener('click', ev => {
    const r = ev.target.closest('button[data-fb-reason]'); if (r) return fbPickReason(r.dataset.fbReason);
    const b = ev.target.closest('button[data-fb]'); if (b) openFeedback(b.dataset.fb);
  });
  const contact = document.getElementById('contactLink');
  if (contact) contact.addEventListener('click', () => { contact.href = feedbackUrl('', 'contact', typeof currentLang !== 'undefined' ? currentLang : 'en'); });
  const side = document.getElementById('fbSide');
  // the sidebar link opens the form in a new tab, with the module and the language
  if (side) side.addEventListener('click', () => { side.href = feedbackUrl('', typeof activeModule !== 'undefined' ? activeModule : '', typeof currentLang !== 'undefined' ? currentLang : 'en'); });
  const sw = window.switchModule;
  if (typeof sw === 'function') window.switchModule = function () { const r = sw.apply(this, arguments); fbRender(); return r; };
  const ul = window.updateLanguage;
  if (typeof ul === 'function') window.updateLanguage = function () { const r = ul.apply(this, arguments); fbRender(); return r; };
  fbRender();
})();

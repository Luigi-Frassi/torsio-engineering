// ============================================================================
// REPORT → PDF, in the browser (the calculation data never leaves the computer)
// Runs inside the report window. The report is laid out again in a hidden frame at the width of an A4 page
// (182 mm of text between 14 mm margins), split into pages without cutting a table row, a formula, a figure or
// the title block, and keeping titles with what follows; each page is drawn with html2canvas and the pages are
// written into a PDF file with page numbers, the title in the footer and the links still clickable.
// The PDF is an image of the page (sharp at ~240 dpi): the same on every browser and phone.
// ============================================================================

(function () {
  const MM = 96 / 25.4;                       // CSS px per mm
  const PAGE = { w: 595.28, h: 841.89 };      // A4 in pt
  const M = { l: 14, r: 14, t: 14, b: 18 };   // margins in mm
  const CW = Math.round((210 - M.l - M.r) * MM);          // text width in CSS px (688)
  const CH = Math.floor((297 - M.t - M.b) * MM);          // text height in CSS px (994)
  const PT = (210 - M.l - M.r) * 72 / 25.4 / CW;           // pt per CSS px (0.75)
  const SCALE = 2.5;
  const FIT = 1.07;                                        // a page may be shrunk by up to 7 % to avoid a near-empty one                                       // pixels per CSS px in the page images

  // blocks that must not be cut; titles must stay with what follows
  const ATOMIC = 'table, .eq, .fig, .res, .f, .gv, .row, .toc, .cart, header.rep, .rhead, .meta, h1, h2, h3, h4, p, li, .chsub, img, svg';

  function loadScript(win, src) {
    return new Promise((ok, ko) => {
      if (win.html2canvas) return ok();
      const s = win.document.createElement('script');
      s.src = src; s.onload = () => ok(); s.onerror = () => ko(new Error('html2canvas'));
      win.document.head.appendChild(s);
    });
  }

  // the report again, in a frame wide enough for the desktop layout, with the print look and the page width
  async function makeFrame() {
    const html = '<!doctype html>' + document.documentElement.outerHTML;   // with the edits made in the yellow fields
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;left:-20000px;top:0;width:1200px;height:900px;border:0;visibility:hidden';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open(); d.write(html); d.close();
    await new Promise(r => { if (d.readyState === 'complete') r(); else f.contentWindow.addEventListener('load', r); setTimeout(r, 4000); });
    const st = d.createElement('style');
    st.textContent = `.toolbar{display:none!important} body{background:#fff!important;margin:0}
      .page{width:${CW}px!important;max-width:none!important;padding:0!important;margin:0!important}
      .eq,.tscroll{overflow:visible!important} [contenteditable]{background:none!important;padding:0!important}
      section.chapter{margin-top:0!important;border-top:0!important;padding-top:4px!important}
      a{color:inherit}`;
    d.head.appendChild(st);
    try { await d.fonts.ready; } catch (e) { /* fonts not available: the fallback font is used */ }
    await new Promise(r => setTimeout(r, 150));
    return f;
  }

  // page slices [top, bottom] in CSS px from the top of .page
  function paginate(root) {
    const top0 = root.getBoundingClientRect().top;
    const blocks = [];
    const box = el => { const r = el.getBoundingClientRect(); return { top: r.top - top0, bottom: r.bottom - top0 }; };
    (function walk(el) {
      for (const c of el.children) {
        if (!c.getClientRects().length) continue;
        const b = box(c);
        if (c.matches('section.chapter')) { blocks.push({ ...b, forced: true, bottom: b.top }); walk(c); continue; }
        if (c.matches(ATOMIC) && b.bottom - b.top <= CH) { blocks.push({ ...b, heading: /^H[1-4]$/.test(c.tagName) }); continue; }
        if (c.tagName === 'TABLE') { for (const tr of c.querySelectorAll('tr')) blocks.push(box(tr)); continue; }
        if (c.children.length) walk(c); else blocks.push(b);
      }
    })(root);
    const total = root.getBoundingClientRect().height;
    const pages = [];
    let start = 0;
    const cutTall = b => { while (b.bottom - start > CH) { pages.push([start, start + CH]); start += CH; } };
    blocks.forEach((b, i) => {
      if (b.forced) { if (b.top > start + 2) { pages.push([start, b.top]); start = b.top; } return; }
      if (b.bottom - start <= CH) return;
      // a few lines left before a new chapter or the end: shrink this page a little instead of a nearly empty one
      const nxt = blocks[i + 1];
      if ((!nxt || nxt.forced) && b.bottom - start <= CH * FIT) return;
      let cut = b.top;
      for (let j = i - 1; j >= 0 && blocks[j].heading && blocks[j].top > start; j--) cut = blocks[j].top;   // keep titles with their content
      if (cut <= start + 1) cut = b.top;
      if (cut > start + 1) { pages.push([start, cut]); start = cut; }
      cutTall(b);
    });
    if (total - start > 1) pages.push([start, total]);
    return pages;
  }

  // ---- a minimal PDF writer: one JPEG per page, footer text, link annotations ----
  const enc = new TextEncoder();
  function winAnsi(s) {   // text for the standard Helvetica font (Windows-1252), PDF-escaped
    const map = { '€': 128, '‚': 130, '„': 132, '…': 133, '–': 150, '—': 151, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '·': 183 };
    let out = '';
    for (const ch of String(s)) {
      let c = ch.charCodeAt(0);
      if (map[ch]) c = map[ch]; else if (c > 255 || (c >= 128 && c < 160)) c = 63;
      const x = String.fromCharCode(c);
      out += x === '(' || x === ')' || x === '\\' ? '\\' + x : x;
    }
    return out;
  }
  function utf16hex(s) {
    let h = 'FEFF';
    for (let i = 0; i < s.length; i++) h += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
    return '<' + h + '>';
  }
  function latin1Bytes(s) { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; }

  function buildPdf(pages, meta) {
    const parts = [], offsets = [];
    let len = 0;
    const push = b => { if (typeof b === 'string') b = latin1Bytes(b); parts.push(b); len += b.length; };
    const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); for (const x of body) push(x); push('\nendobj\n'); };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const n = pages.length, first = 5;                 // 1 catalog, 2 pages, 3 font, 4 info; then 3 objects per page
    const kids = pages.map((_, i) => `${first + i * 3} 0 R`).join(' ');
    obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`]);
    obj(3, ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']);
    obj(4, [`<< /Title ${utf16hex(meta.title)} /Producer (Torsio Engineering) /Creator (torsio.app) >>`]);
    pages.forEach((p, i) => {
      const pn = first + i * 3, cn = pn + 1, im = pn + 2;
      const x0 = M.l * 72 / 25.4, yTop = PAGE.h - M.t * 72 / 25.4;
      const k = Math.min(1, CH / p.h);                    // pages slightly taller than the text area are shrunk to fit
      const w = CW * PT * k, h = p.h * PT * k, xi = x0 + (CW * PT - w) / 2;
      const foot = M.b * 72 / 25.4 / 2;
      const left = winAnsi(meta.footer), right = winAnsi(meta.pageLabel(i + 1, n));
      const rw = right.length * 4.3;                   // rough width of the page label at 8 pt
      const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${xi.toFixed(2)} ${(yTop - h).toFixed(2)} cm /Im0 Do Q\n` +
        `0.84 0.82 0.78 RG 0.5 w ${x0.toFixed(2)} ${(foot + 11).toFixed(2)} m ${(PAGE.w - x0).toFixed(2)} ${(foot + 11).toFixed(2)} l S\n` +
        `BT /F1 7.5 Tf 0.43 0.42 0.38 rg ${x0.toFixed(2)} ${foot.toFixed(2)} Td (${left}) Tj ET\n` +
        `BT /F1 8 Tf 0.13 0.13 0.12 rg ${(PAGE.w - x0 - rw).toFixed(2)} ${foot.toFixed(2)} Td (${right}) Tj ET`;
      const annots = p.links.map(l => {
        const ax = xi + l.x * PT * k, ay = yTop - (l.y + l.h) * PT * k;
        return `<< /Type /Annot /Subtype /Link /Border [0 0 0] /Rect [${ax.toFixed(2)} ${ay.toFixed(2)} ${(ax + l.w * PT * k).toFixed(2)} ${(ay + l.h * PT * k).toFixed(2)}] /A << /S /URI /URI (${winAnsi(l.href)}) >> >>`;
      });
      obj(pn, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Resources << /XObject << /Im0 ${im} 0 R >> /Font << /F1 3 0 R >> >> /Contents ${cn} 0 R` + (annots.length ? ` /Annots [${annots.join(' ')}]` : '') + ' >>']);
      const cb = latin1Bytes(content);
      obj(cn, [`<< /Length ${cb.length} >>\nstream\n`, cb, '\nendstream']);
      obj(im, [`<< /Type /XObject /Subtype /Image /Width ${p.pw} /Height ${p.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, '\nendstream']);
    });
    const xref = len, total = first + n * 3;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    push(x);
    push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  function dataUrlBytes(u) {
    const b = atob(u.split(',')[1]), a = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }

  window.torsioPdf = async function (btn) {
    if (btn.dataset.busy) return;
    const L = JSON.parse(btn.dataset.lbl || '{}');
    const label = btn.innerHTML;
    btn.dataset.busy = '1'; btn.disabled = true;
    const say = t => { btn.innerHTML = t; };
    let frame = null;
    try {
      say(L.busy || '…');
      await loadScript(window, btn.dataset.lib);
      frame = await makeFrame();
      const fw = frame.contentWindow, root = frame.contentDocument.querySelector('.page');
      const slices = paginate(root);
      const r0 = root.getBoundingClientRect();
      const links = [...root.querySelectorAll('a[href^="http"]')].map(a => { const r = a.getBoundingClientRect(); return { href: a.href, x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height }; });
      const pages = [];
      for (let i = 0; i < slices.length; i++) {
        const [a, b] = slices[i], hh = Math.max(1, Math.ceil(b - a));
        say(`${L.busy || '…'} ${i + 1}/${slices.length}`);
        const canvas = await window.html2canvas(root, {
          scale: SCALE, backgroundColor: '#ffffff', logging: false, useCORS: true,
          x: r0.left + fw.scrollX, y: r0.top + fw.scrollY + a, width: CW, height: hh, windowWidth: 1200, windowHeight: 900
        });
        pages.push({ jpeg: dataUrlBytes(canvas.toDataURL('image/jpeg', 0.9)), pw: canvas.width, ph: canvas.height, h: hh,
          links: links.filter(l => l.y >= a && l.y + l.h <= b).map(l => ({ ...l, y: l.y - a })) });
        canvas.width = canvas.height = 0;
      }
      const blob = buildPdf(pages, { title: btn.dataset.title || document.title, footer: btn.dataset.footer || '', pageLabel: (i, n) => (L.page || '{i} / {n}').replace('{i}', i).replace('{n}', n) });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = btn.dataset.fname || 'torsio.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      window.__torsioPdfLast = { pages: pages.length, bytes: blob.size, slices };   // for the tests
      say(label);
    } catch (e) {
      console.error(e);
      say(label);
      const hint = document.getElementById('pdfFail');
      if (hint) hint.textContent = L.fail || 'PDF error';
    } finally {
      if (frame) frame.remove();
      delete btn.dataset.busy; btn.disabled = false;
    }
  };
})();

/* Ride Bangla Tools — shared invoice/quotation PDF renderer (pdf-lib).
   window.RB_BIZPDF.makeDoc(kind, data) -> Promise<{ bytes, total, money, warnings }>
   kind: 'INVOICE' | 'QUOTATION'
   warnings: string[] — every requested embed that could NOT be placed
   (logo embed/draw failure, QR embed/data failure, watermark draw
   failure). The PDF is still built, never broken by a failed embed —
   but the failure is REPORTED here instead of silently dropped, so the
   caller MUST surface warnings to the user (e.g. alert them after
   download) and must never present the document as complete without
   them. A caller that ignores warnings re-introduces the silent drop.
   Totals rule: each line amount is rounded to the cent FIRST and the
   subtotal is the SUM of the displayed line amounts; discount is taken
   on the subtotal, tax on (subtotal − discount), total = subtotal −
   discount + tax, each step cent-rounded — so the displayed parts
   always add up to the displayed totals. Callers that display their
   own totals should use the same rule, or a preview and its PDF can
   differ by a cent in rounding edge cases. No content is silently
   truncated: notes and addresses flow across pages, and overlong
   single words are broken to fit the column instead of overflowing it.
   data: { fromName, fromAddr, toName, toAddr, docNo, dateLabel, date,
           dueLabel, due, items:[{desc,qty,rate}], taxRate, discountPct,
           notes, currency,
           logoData (optional, invoice + quotation): 'data:image/png|jpeg;base64,...',
           logoHeader (optional bool), logoWatermark (optional bool),
           qrInclude (optional bool, INVOICE only),
           qrData (optional PNG data URL, INVOICE only) }
   Phase-2 header convention: the business identity sits at the TOP-LEFT
   (logo + business name/address) and the document title / number / dates
   sit at the TOP-RIGHT — the layout nearly every business invoice follows.
   This supersedes the phase-1 title-block-side placement, whose
   "only collision-free position" reasoning is retired: collisions are
   resolved by the two-column header layout itself. Without a header logo
   the header is exactly the phase-1 layout (title left, FROM block below).
   No logo/QR fields -> no image embedded, no layout shift. A PNG keeps its
   alpha: no background rectangle is ever drawn behind a logo, so
   transparency is preserved. The QR is invoice-only: quotation callers
   never pass qr fields, so no QR can appear on a quotation.
*/
(function () {
  'use strict';

  async function makeDoc(kind, d) {
    var PDFLib = window.PDFLib;
    if (!PDFLib) throw new Error('PDF engine failed to load.');
    var pdf = await PDFLib.PDFDocument.create();
    var helv = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    var helvB = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var W = 595.28, H = 841.89; // A4
    var M = 46;                  // margin
    var ACCENT = PDFLib.rgb(0.05, 0.33, 0.18);   // deep green
    var GRAY = PDFLib.rgb(0.42, 0.42, 0.42);
    var LIGHT = PDFLib.rgb(0.94, 0.96, 0.94);
    var cur = { sym: '$' };
    var SYM = d.currency || '$';

    function money(n) {
      n = Math.round((+n || 0) * 100) / 100;
      return SYM + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function round2(n) { return Math.round((+n || 0) * 100) / 100; }
    var warnings = [];

    /* Optional business logo (invoice + quotation): decode + embed once, BEFORE the first page is
       drawn, so the watermark can be painted first on every page. Any
       failure -> logoImg stays null and the document builds exactly as
       before (fail-soft, never breaks the PDF) AND a warning is recorded
       in `warnings` — a failed logo must never silently vanish from a
       business document. No background rectangle is drawn behind the
       image, so PNG alpha (transparency) is preserved. */
    var logoImg = null, logoDims = null;
    var logoRequested = typeof d.logoData === 'string' && d.logoData.length > 0;
    var logoFailed = false;
    try {
      var lm = typeof d.logoData === 'string'
        ? d.logoData.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+\/=]+)$/) : null;
      if (lm) {
        var bin = window.atob(lm[2]);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        logoImg = lm[1] === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        /* pdf-lib images expose width/height; size() exists on some builds —
           take whichever is present, in its own try, so a dims miss can never
           null out an already-embedded image. */
        try {
          logoDims = (typeof logoImg.size === 'function') ? logoImg.size()
            : { width: logoImg.width, height: logoImg.height };
        } catch (e2) { logoDims = { width: logoImg.width, height: logoImg.height }; }
      } else if (logoRequested) {
        /* A logo was supplied but is not a usable PNG/JPEG data URL
           (wrong type, corrupt prefix, empty payload) — previously this
           fell through silently; it is a failed embed, so report it. */
        logoFailed = true;
      }
    } catch (e) { logoImg = null; logoDims = null; logoFailed = true; }
    if (logoFailed) warnings.push('Logo could not be embedded in the PDF — the document was built without the logo.');

    var page = pdf.addPage([W, H]);
    drawWatermarkFirstPage();
    var y = H - 60;

    var watermarkWarned = false;
    function drawWatermark() {
      /* Watermark as anti-theft (phase 2): large, centred, drawn FIRST on
         the page so all text sits over it and stays readable. Opacity 0.12
         (raised from phase-1 0.08, which was near-invisible on a printed /
         photocopied page and so no deterrent) at 340pt tall — strong enough
         to survive a copy and mark the document as this business's, faint
         enough that full-weight body text over it stays readable. The QR
         block (invoice) is drawn later with its own opaque white margin,
         so watermark ink never sits inside the QR's quiet zone. */
      if (!logoImg || !d.logoWatermark) return;
      try {
        var dims = (logoDims && logoDims.width) ? logoDims
          : ((typeof logoImg.size === 'function') ? logoImg.size()
          : { width: logoImg.width, height: logoImg.height });
        var h = 340, w = h * dims.width / dims.height;
        if (w > 460) { w = 460; h = w * dims.height / dims.width; }
        page.drawImage(logoImg, {
          x: (W - w) / 2, y: (H - h) / 2, width: w, height: h, opacity: 0.12
        });
      } catch (e) {
        /* Watermark failure must not break the PDF — but it is reported
           once, never silently dropped on every page. */
        if (!watermarkWarned) {
          watermarkWarned = true;
          warnings.push('Logo watermark could not be drawn in the PDF — the document was built without the watermark.');
        }
      }
    }
    function need(h) {
      if (y - h < 60) {
        page = pdf.addPage([W, H]);
        y = H - 60;
        drawWatermark();
      }
    }
    function drawWatermarkFirstPage() { drawWatermark(); }
    function text(str, x, yy, opts) {
      opts = opts || {};
      page.drawText(String(str == null ? '' : str), {
        x: x, y: yy, size: opts.size || 10,
        font: opts.bold ? helvB : helv,
        color: opts.color || PDFLib.rgb(0.12, 0.12, 0.12),
        maxWidth: opts.maxWidth || undefined
      });
    }
    function textR(str, yy, opts) {
      /* Right-aligned text against the right margin (header title block). */
      opts = opts || {};
      var f = opts.bold ? helvB : helv, sz = opts.size || 10;
      var w = f.widthOfTextAtSize(String(str == null ? '' : str), sz);
      text(str, W - M - w, yy, opts);
    }
    function wrap(str, maxW, size, font) {
      /* Words are wrapped at spaces; a single word wider than the column
         (a long unbroken name, URL or description token) is broken into
         fitting chunks instead of overflowing the page edge silently. */
      var words = String(str || '').split(/\s+/), lines = [], line = '';
      words.forEach(function (w) {
        while (w && font.widthOfTextAtSize(w, size) > maxW) {
          if (line) { lines.push(line); line = ''; }
          var cut = 1;
          while (cut < w.length && font.widthOfTextAtSize(w.slice(0, cut + 1), size) <= maxW) cut++;
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        var t = line ? line + ' ' + w : w;
        if (font.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = w; }
        else line = t;
      });
      if (line) lines.push(line);
      return lines.length ? lines : [''];
    }

    /* header — convention layout (phase 2): with a header logo, the logo
       sits with the business identity at the TOP-LEFT and the title /
       number / dates sit at the TOP-RIGHT. The logo is crisp, aspect kept,
       max 48pt tall / 150pt wide, drawn on the page's white ground with no
       background rectangle, so it stands out and its transparency is kept.
       Without a header logo the block below is exactly the phase-1 layout. */
    var titleX = M, logoW = 0, logoH = 0;
    var logoHeaderLayout = !!(logoImg && d.logoHeader && logoDims);
    if (logoHeaderLayout) {
      logoH = 48; logoW = logoH * logoDims.width / logoDims.height;
      if (logoW > 150) { logoW = 150; logoH = logoW * logoDims.height / logoDims.width; }
      try {
        page.drawImage(logoImg, { x: M, y: y - logoH + 20, width: logoW, height: logoH });
      } catch (e) {
        logoW = 0; logoH = 0; logoHeaderLayout = false;
        warnings.push('Logo could not be drawn in the PDF header — the document was built without the header logo.');
      }
    }
    if (logoHeaderLayout) {
      var nameX = logoW ? M + logoW + 14 : M;
      var rx2 = W - M - 190; /* right column starts here; identity column ends before it */
      var leftW = Math.max(120, rx2 - nameX - 12);
      var nameLines = wrap(d.fromName || '', leftW, 13, helvB);
      var addrLines = wrap(d.fromAddr || '', leftW, 9.5, helv);
      var ny = y + 6;
      nameLines.forEach(function (l) { text(l, nameX, ny, { size: 13, bold: true }); ny -= 17; });
      addrLines.forEach(function (l) { text(l, nameX, ny, { size: 9.5, color: GRAY }); ny -= 13; });
      textR(kind, y, { size: 26, bold: true, color: ACCENT });
      textR(d.docNo || '', y - 22, { size: 11, color: GRAY });
      textR(d.dateLabel || 'Date', y - 38, { size: 9, color: GRAY });
      textR(d.date || '', y - 52, { size: 10, bold: true });
      if (d.dueLabel) {
        textR(d.dueLabel, y - 68, { size: 9, color: GRAY });
        textR(d.due || '', y - 82, { size: 10, bold: true });
      }
      var leftH = nameLines.length * 17 + addrLines.length * 13;
      var bandH = Math.max(logoH, leftH, 92);
      y = y - bandH - 16;
    } else {
      if (logoImg && d.logoHeader && logoDims) {
        logoH = 48; logoW = logoH * logoDims.width / logoDims.height;
        if (logoW > 150) { logoW = 150; logoH = logoW * logoDims.height / logoDims.width; }
        try {
          page.drawImage(logoImg, { x: M, y: y - logoH + 20, width: logoW, height: logoH });
        } catch (e) {
          logoW = 0; logoH = 0;
          warnings.push('Logo could not be drawn in the PDF header — the document was built without the header logo.');
        }
        if (logoW) titleX = M + logoW + 14;
      }
      text(kind, titleX, y, { size: 26, bold: true, color: ACCENT }); y -= 8;
      text(d.docNo || '', titleX, y - 14, { size: 11, color: GRAY }); y -= 42;
      var rx = W - M - 190;
      text(d.dateLabel || 'Date', rx, y + 42, { size: 9, color: GRAY });
      text(d.date || '', rx, y + 28, { size: 10, bold: true });
      if (d.dueLabel) {
        text(d.dueLabel, rx, y + 12, { size: 9, color: GRAY });
        text(d.due || '', rx, y - 2, { size: 10, bold: true });
      }
      y -= 10;
    }

    /* from / to — in the convention header layout the business identity is
       already at the top, so only BILL TO is drawn here. */
    if (!logoHeaderLayout) {
      text('FROM', M, y, { size: 9, bold: true, color: ACCENT }); y -= 14;
      wrap(d.fromName || '', W - 2 * M, 11, helvB).forEach(function (l) {
        need(15); text(l, M, y, { size: 11, bold: true }); y -= 15;
      });
      wrap(d.fromAddr || '', W - 2 * M, 9.5, helv).forEach(function (l) {
        need(13); text(l, M, y, { size: 9.5, color: GRAY }); y -= 13;
      });
      y -= 12;
    }
    text('BILL TO', M, y, { size: 9, bold: true, color: ACCENT }); y -= 14;
    wrap(d.toName || '', W - 2 * M, 11, helvB).forEach(function (l) {
      need(15); text(l, M, y, { size: 11, bold: true }); y -= 15;
    });
    wrap(d.toAddr || '', W - 2 * M, 9.5, helv).forEach(function (l) {
      need(13); text(l, M, y, { size: 9.5, color: GRAY }); y -= 13;
    });
    y -= 16;

    /* table */
    var cols = [M, M + 285, M + 345, M + 425]; // desc, qty, rate, amount
    var right = W - M;
    need(30);
    page.drawRectangle({ x: M, y: y - 6, width: right - M, height: 22, color: ACCENT });
    text('Description', cols[0] + 6, y, { size: 10, bold: true, color: PDFLib.rgb(1, 1, 1) });
    text('Qty', cols[1], y, { size: 10, bold: true, color: PDFLib.rgb(1, 1, 1) });
    text('Rate', cols[2], y, { size: 10, bold: true, color: PDFLib.rgb(1, 1, 1) });
    var amtHeadW = helvB.widthOfTextAtSize('Amount', 10);
    text('Amount', right - 6 - amtHeadW, y, { size: 10, bold: true, color: PDFLib.rgb(1, 1, 1) });
    y -= 26;
    var items = d.items && d.items.length ? d.items : [{ desc: '', qty: 0, rate: 0 }];
    /* Line amounts are cent-rounded FIRST (see the totals rule in the
       header comment): the subtotal below is their sum, so the parts
       the reader sees always add up to the totals they see. */
    var lineAmounts = items.map(function (it) { return round2((+it.qty || 0) * (+it.rate || 0)); });
    var stripe = false;
    items.forEach(function (it, idx) {
      var lines = wrap(it.desc || '', cols[1] - cols[0] - 12, 9.5, helv);
      var rh = Math.max(20, lines.length * 13 + 7);
      need(rh);
      if (stripe) page.drawRectangle({ x: M, y: y - 4, width: right - M, height: rh, color: LIGHT });
      stripe = !stripe;
      lines.forEach(function (l, i) { text(l, cols[0] + 6, y - i * 13, { size: 9.5 }); });
      text(String(it.qty == null ? '' : it.qty), cols[1], y, { size: 9.5 });
      text(money(it.rate), cols[2], y, { size: 9.5 });
      var amt = money(lineAmounts[idx]);
      var aw = helv.widthOfTextAtSize(amt, 9.5);
      text(amt, right - 6 - aw, y, { size: 9.5 });
      y -= rh;
    });

    /* totals — discount on the subtotal, tax on (subtotal − discount):
       that order is unchanged; only the rounding is fixed (see above). */
    var sub = lineAmounts.reduce(function (s, v) { return s + v; }, 0);
    var disc = round2(sub * (+d.discountPct || 0) / 100);
    var tax = round2((sub - disc) * (+d.taxRate || 0) / 100);
    var total = round2(sub - disc + tax);
    need(110);
    y -= 8;
    var tx = right - 200;
    function totalRow(label, val, bold, big) {
      text(label, tx, y, { size: big ? 12 : 10, bold: bold, color: big ? ACCENT : GRAY });
      var v = money(val);
      var vw = (big ? helvB : helv).widthOfTextAtSize(v, big ? 12 : 10);
      text(v, right - 6 - vw, y, { size: big ? 12 : 10, bold: bold, color: big ? ACCENT : undefined });
      y -= big ? 22 : 17;
    }
    totalRow('Subtotal', sub);
    if (+d.discountPct) totalRow('Discount (' + d.discountPct + '%)', -disc);
    if (+d.taxRate) totalRow('Tax (' + d.taxRate + '%)', tax);
    totalRow('TOTAL', total, true, true);
    y -= 10;

    /* Invoice QR (INVOICE only): a PNG data URL built by the invoice page
       from the invoice's own values. It is drawn AFTER the watermark
       (watermarks are painted first on every page), and its opaque white
       margin covers any watermark ink inside the QR rect, so the quiet
       zone stays clear and the code stays scannable. Placed at the bottom
       section beside the totals area, clear of the totals figures. */
    if (kind === 'INVOICE' && d.qrInclude) {
      /* A requested QR that cannot be placed — missing data (the caller
         could not generate it), an invalid data URL, or an embed/draw
         failure — must never silently produce a QR-less invoice that
         the user believes carries a code. The PDF still builds; the
         failure is reported in `warnings` for the caller to surface. */
      var qrOk = false;
      try {
        var qm = typeof d.qrData === 'string'
          ? d.qrData.match(/^data:image\/png;base64,([A-Za-z0-9+\/=]+)$/) : null;
        if (qm) {
          var qbin = window.atob(qm[1]);
          var qbytes = new Uint8Array(qbin.length);
          for (var qi = 0; qi < qbin.length; qi++) qbytes[qi] = qbin.charCodeAt(qi);
          var qrImg = await pdf.embedPng(qbytes);
          need(140);
          y -= 6;
          var qs = 110;
          page.drawImage(qrImg, { x: M, y: y - qs, width: qs, height: qs });
          text('Scan for invoice details', M + qs + 12, y - 16, { size: 9.5, color: GRAY });
          y -= qs + 16;
          qrOk = true;
        }
      } catch (e) { qrOk = false; }
      if (!qrOk) warnings.push('QR code could not be embedded in the PDF — the document was built without it.');
    }

    /* notes */
    if (d.notes) {
      need(40);
      text('Notes', M, y, { size: 10, bold: true, color: ACCENT }); y -= 15;
      wrap(d.notes, W - 2 * M, 9.5, helv).forEach(function (l) {
        need(14); text(l, M, y, { size: 9.5, color: GRAY }); y -= 13;
      });
      y -= 8;
    }

    /* footer */
    var f = 'Generated free with Ride Bangla Tools — tools.ridebangla.bd';
    text(f, M, 36, { size: 8.5, color: GRAY });

    return { bytes: await pdf.save(), total: total, money: money, warnings: warnings };
  }

  window.RB_BIZPDF = { makeDoc: makeDoc };
})();

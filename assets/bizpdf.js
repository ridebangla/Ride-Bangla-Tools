/* Ride Bangla Tools — shared invoice/quotation PDF renderer (pdf-lib).
   window.RB_BIZPDF.makeDoc(kind, data) -> Promise<Uint8Array pdf bytes>
   kind: 'INVOICE' | 'QUOTATION'
   data: { fromName, fromAddr, toName, toAddr, docNo, dateLabel, date,
           dueLabel, due, items:[{desc,qty,rate}], taxRate, discountPct,
           notes, currency }
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

    var page = pdf.addPage([W, H]);
    var y = H - 60;

    function need(h) {
      if (y - h < 60) {
        page = pdf.addPage([W, H]);
        y = H - 60;
      }
    }
    function text(str, x, yy, opts) {
      opts = opts || {};
      page.drawText(String(str == null ? '' : str), {
        x: x, y: yy, size: opts.size || 10,
        font: opts.bold ? helvB : helv,
        color: opts.color || PDFLib.rgb(0.12, 0.12, 0.12),
        maxWidth: opts.maxWidth || undefined
      });
    }
    function wrap(str, maxW, size, font) {
      var words = String(str || '').split(/\s+/), lines = [], line = '';
      words.forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (font.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = w; }
        else line = t;
      });
      if (line) lines.push(line);
      return lines.length ? lines : [''];
    }

    /* header */
    text(kind, M, y, { size: 26, bold: true, color: ACCENT }); y -= 8;
    text(d.docNo || '', M, y - 14, { size: 11, color: GRAY }); y -= 42;
    var rx = W - M - 190;
    text(d.dateLabel || 'Date', rx, y + 42, { size: 9, color: GRAY });
    text(d.date || '', rx, y + 28, { size: 10, bold: true });
    if (d.dueLabel) {
      text(d.dueLabel, rx, y + 12, { size: 9, color: GRAY });
      text(d.due || '', rx, y - 2, { size: 10, bold: true });
    }
    y -= 10;

    /* from / to */
    text('FROM', M, y, { size: 9, bold: true, color: ACCENT }); y -= 14;
    text(d.fromName || '', M, y, { size: 11, bold: true }); y -= 15;
    wrap(d.fromAddr || '', W - 2 * M, 9.5, helv).slice(0, 4).forEach(function (l) {
      text(l, M, y, { size: 9.5, color: GRAY }); y -= 13;
    });
    y -= 12;
    text('BILL TO', M, y, { size: 9, bold: true, color: ACCENT }); y -= 14;
    text(d.toName || '', M, y, { size: 11, bold: true }); y -= 15;
    wrap(d.toAddr || '', W - 2 * M, 9.5, helv).slice(0, 4).forEach(function (l) {
      text(l, M, y, { size: 9.5, color: GRAY }); y -= 13;
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
    text('Amount', right - 6, y, { size: 10, bold: true, color: PDFLib.rgb(1, 1, 1) });
    // right-align amount header: draw with offset
    y -= 26;
    var items = d.items && d.items.length ? d.items : [{ desc: '', qty: 0, rate: 0 }];
    var stripe = false;
    items.forEach(function (it) {
      var lines = wrap(it.desc || '', cols[1] - cols[0] - 12, 9.5, helv);
      var rh = Math.max(20, lines.length * 13 + 7);
      need(rh);
      if (stripe) page.drawRectangle({ x: M, y: y - 4, width: right - M, height: rh, color: LIGHT });
      stripe = !stripe;
      lines.forEach(function (l, i) { text(l, cols[0] + 6, y - i * 13, { size: 9.5 }); });
      text(String(it.qty == null ? '' : it.qty), cols[1], y, { size: 9.5 });
      text(money(it.rate), cols[2], y, { size: 9.5 });
      var amt = money((+it.qty || 0) * (+it.rate || 0));
      var aw = helv.widthOfTextAtSize(amt, 9.5);
      text(amt, right - 6 - aw, y, { size: 9.5 });
      y -= rh;
    });

    /* totals */
    var sub = items.reduce(function (s, it) { return s + (+it.qty || 0) * (+it.rate || 0); }, 0);
    var disc = sub * (+d.discountPct || 0) / 100;
    var tax = (sub - disc) * (+d.taxRate || 0) / 100;
    var total = sub - disc + tax;
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

    /* notes */
    if (d.notes) {
      need(40);
      text('Notes', M, y, { size: 10, bold: true, color: ACCENT }); y -= 15;
      wrap(d.notes, W - 2 * M, 9.5, helv).slice(0, 8).forEach(function (l) {
        need(14); text(l, M, y, { size: 9.5, color: GRAY }); y -= 13;
      });
      y -= 8;
    }

    /* footer */
    var f = 'Generated free with Ride Bangla Tools — tools.ridebangla.bd';
    text(f, M, 36, { size: 8.5, color: GRAY });

    return { bytes: await pdf.save(), total: total, money: money };
  }

  window.RB_BIZPDF = { makeDoc: makeDoc };
})();

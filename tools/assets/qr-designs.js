/* ==========================================================================
   Ride Bangla Tools — QR Design Studio v5 (DOM-free pixel renderer)
   Generates 3 plain designs (Classic, Rounded, Sunset Fade). No DOM
   required: render() returns raw pixels, so the same code runs in the
   browser AND in Node for automated tests.
   Requires global QRCode.create (embedded qrcode lib on the tool page).

   Logo engine: up to N logos at explicit positions (top/bottom/side/
   middle/center). CENTER-OF-QR uses error-correction level H, a white
   safe backdrop, and a capped logo size so the code still scans.

   v5 (owner order 2026-10-24): the 15 motif designs (Tiger, Lion, Cat,
   Panda, Owl, Fox, Bird, Kite, Ocean, Robot, Triangle, Heart, Star,
   Leaf, Flower) are REMOVED. They rendered as square QR codes with a
   coloured mosaic inside — not as realistic organic shapes — and a
   true organic silhouette cannot scan reliably with standard decoders:
   the three finder corners pin the code square, and measured shaping
   headroom is under 10% of data cells before exact decode fails, while
   any recognizable animal silhouette deletes far more. Per the owner's
   decode-or-remove rule, unconvertible motifs are removed, not kept
   as decoration. (The v4 FRAMED poster designs were already removed in
   v4 for the same reason: art in a strip below a plain QR.)
   ========================================================================== */
(function (root) {
  'use strict';

  var DESIGNS = [
    { id: 'classic', name: 'Classic', desc: 'Clean black-on-white squares', style: 'square', fg: '#141414', bg: '#FFFFFF', framed: false },
    { id: 'rounded', name: 'Rounded', desc: 'Soft circles, deep-green ink', style: 'round', fg: '#0B3D2E', bg: '#FFFFFF', framed: false },
    { id: 'sunset', name: 'Sunset Fade', desc: 'Warm gradient squares', style: 'gradient', fg: '#C2410C', fg2: '#7C2D12', bg: '#FFFBEB', framed: false }
  ];

  function hexRGB(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function lerpRGB(a, b, t) {
    return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------------- buffers ---------------- */
  function newBuf(w, h, rgb) {
    var buf = new Uint8ClampedArray(w * h * 4);
    for (var i = 0; i < w * h; i++) {
      buf[i * 4] = rgb[0]; buf[i * 4 + 1] = rgb[1]; buf[i * 4 + 2] = rgb[2]; buf[i * 4 + 3] = 255;
    }
    return { w: w, h: h, buf: buf };
  }
  function newBufT(w, h) { // transparent
    return { w: w, h: h, buf: new Uint8ClampedArray(w * h * 4) };
  }
  function setPx(px, x, y, rgb) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= px.w || y >= px.h) return;
    var i = (y * px.w + x) * 4;
    px.buf[i] = rgb[0]; px.buf[i + 1] = rgb[1]; px.buf[i + 2] = rgb[2]; px.buf[i + 3] = 255;
  }
  function blendPx(px, x, y, rgb, a) { // source-over with alpha 0..1
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= px.w || y >= px.h || a <= 0) return;
    if (a >= 1) { setPx(px, x, y, rgb); return; }
    var i = (y * px.w + x) * 4, b = px.buf;
    var da = b[i + 3] / 255, sa = a;
    var oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    b[i]     = Math.round((rgb[0] * sa + b[i]     * da * (1 - sa)) / oa);
    b[i + 1] = Math.round((rgb[1] * sa + b[i + 1] * da * (1 - sa)) / oa);
    b[i + 2] = Math.round((rgb[2] * sa + b[i + 2] * da * (1 - sa)) / oa);
    b[i + 3] = Math.round(oa * 255);
  }
  /* ---------------- shapes ---------------- */
  function fillRect(px, x, y, w, h, rgb) {
    var x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    var x1 = Math.min(px.w, Math.ceil(x + w)), y1 = Math.min(px.h, Math.ceil(y + h));
    for (var yy = y0; yy < y1; yy++)
      for (var xx = x0; xx < x1; xx++) setPx(px, xx, yy, rgb);
  }  function fillRectA(px, x, y, w, h, rgb, a) { // alpha rect
    var x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    var x1 = Math.min(px.w, Math.ceil(x + w)), y1 = Math.min(px.h, Math.ceil(y + h));
    for (var yy = y0; yy < y1; yy++)
      for (var xx = x0; xx < x1; xx++) blendPx(px, xx, yy, rgb, a);
  }
  function fillCircle(px, cx, cy, r, rgb) {
    var x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
    var x1 = Math.min(px.w - 1, Math.ceil(cx + r)), y1 = Math.min(px.h - 1, Math.ceil(cy + r));
    var r2 = r * r;
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) setPx(px, x, y, rgb);
      }
  }
  function fillCircleA(px, cx, cy, r, rgb, a) {
    var x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
    var x1 = Math.min(px.w - 1, Math.ceil(cx + r)), y1 = Math.min(px.h - 1, Math.ceil(cy + r));
    var r2 = r * r;
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          var edge = 1 - Math.sqrt(d2) / r; // soft edge
          blendPx(px, x, y, rgb, a * clamp(edge * 3, 0, 1));
        }
      }
  }
  function fillEllipse(px, cx, cy, rx, ry, rgb) {
    var x0 = Math.max(0, Math.floor(cx - rx)), y0 = Math.max(0, Math.floor(cy - ry));
    var x1 = Math.min(px.w - 1, Math.ceil(cx + rx)), y1 = Math.min(px.h - 1, Math.ceil(cy + ry));
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) setPx(px, x, y, rgb);
      }
  }
  function fillEllipseV(px, cx, cy, rx, ry, cTop, cBot) {
    var x0 = Math.max(0, Math.floor(cx - rx)), y0 = Math.max(0, Math.floor(cy - ry));
    var x1 = Math.min(px.w - 1, Math.ceil(cx + rx)), y1 = Math.min(px.h - 1, Math.ceil(cy + ry));
    for (var y = y0; y <= y1; y++) {
      var t = (y - (cy - ry)) / (2 * ry);
      var c = lerpRGB(cTop, cBot, clamp(t, 0, 1));
      for (var x = x0; x <= x1; x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) setPx(px, x, y, c);
      }
    }
  }
  function fillPolygon(px, pts, rgb) {
    var ys = pts.map(function (p) { return p[1]; });
    var y0 = Math.max(0, Math.floor(Math.min.apply(null, ys)));
    var y1 = Math.min(px.h - 1, Math.ceil(Math.max.apply(null, ys)));
    for (var y = y0; y <= y1; y++) {
      var xs = [];
      for (var i = 0; i < pts.length; i++) {
        var p1 = pts[i], p2 = pts[(i + 1) % pts.length];
        if ((p1[1] <= y && p2[1] > y) || (p2[1] <= y && p1[1] > y)) {
          xs.push(p1[0] + (y - p1[1]) / (p2[1] - p1[1]) * (p2[0] - p1[0]));
        }
      }
      xs.sort(function (a, b) { return a - b; });
      for (var k = 0; k + 1 < xs.length; k += 2) {
        var xa = Math.max(0, Math.ceil(xs[k])), xb = Math.min(px.w - 1, Math.floor(xs[k + 1]));
        for (var x = xa; x <= xb; x++) setPx(px, x, y, rgb);
      }
    }
  }
  function roundRect(px, x, y, w, h, r, rgb) {
    r = Math.min(r, w / 2, h / 2);
    fillRect(px, x + r, y, w - 2 * r, h, rgb);
    fillRect(px, x, y + r, w, h - 2 * r, rgb);
    fillCircle(px, x + r, y + r, r, rgb);
    fillCircle(px, x + w - r, y + r, r, rgb);
    fillCircle(px, x + r, y + h - r, r, rgb);
    fillCircle(px, x + w - r, y + h - r, r, rgb);
  }  function thickLine(px, x0, y0, x1, y1, width, rgb) {
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.ceil(len));
    var r = width / 2;
    for (var i = 0; i <= steps; i++) {
      fillCircle(px, x0 + dx * i / steps, y0 + dy * i / steps, r, rgb);
    }
  }
  function thickLineA(px, x0, y0, x1, y1, width, rgb, a) {
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.ceil(len / 3));
    var r = width / 2;
    for (var i = 0; i <= steps; i++) {
      fillCircleA(px, x0 + dx * i / steps, y0 + dy * i / steps, r, rgb, a);
    }
  }
  function arcStroke(px, cx, cy, r, a0, a1, width, rgb) {
    var steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 4));
    var prev = null;
    for (var i = 0; i <= steps; i++) {
      var a = a0 + (a1 - a0) * i / steps;
      var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      if (prev) thickLine(px, prev[0], prev[1], x, y, width, rgb);
      prev = [x, y];
    }
  }
  /* Box-blur the alpha channel only (soft shadows). r = radius. */  /* Draw an RGBA logo image (nearest-neighbor scale) with source-over. */
  function drawLogo(px, img, dx, dy, dw, dh) {
    var sw = img.w, sh = img.h, sd = img.data;
    var x0 = Math.max(0, Math.floor(dx)), y0 = Math.max(0, Math.floor(dy));
    var x1 = Math.min(px.w, Math.ceil(dx + dw)), y1 = Math.min(px.h, Math.ceil(dy + dh));
    for (var y = y0; y < y1; y++) {
      var sy = Math.min(sh - 1, Math.floor((y - dy) / dh * sh));
      for (var x = x0; x < x1; x++) {
        var sx = Math.min(sw - 1, Math.floor((x - dx) / dw * sw));
        var si = (sy * sw + sx) * 4;
        var a = sd[si + 3] / 255;
        if (a > 0) blendPx(px, x, y, [sd[si], sd[si + 1], sd[si + 2]], a);
      }
    }
  }  function isFinderZone(r, c, n) {
    return (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
  }
  function drawFinder(px, fr, fc, m, ox, oy, style, fg, bg, fg2) {
    var x = ox + fc * m, y = oy + fr * m, s = 7 * m;
    if (style === 'round') {
      fillCircle(px, x + s / 2, y + s / 2, s / 2, fg);
      fillCircle(px, x + s / 2, y + s / 2, s / 2 - m, bg);
      fillCircle(px, x + s / 2, y + s / 2, s / 2 - 2 * m, fg);
    } else if (style === 'gradient') {
      for (var r = 0; r < 7; r++) fillRect(px, x, y + r * m, s, m, lerpRGB(fg, fg2 || fg, r / 6));
      fillRect(px, x + m, y + m, s - 2 * m, s - 2 * m, bg);
      for (var r2 = 0; r2 < 3; r2++) fillRect(px, x + 2 * m, y + (2 + r2) * m, s - 4 * m, m, lerpRGB(fg, fg2 || fg, (r2 + 2) / 6));
    } else {
      fillRect(px, x, y, s, s, fg);
      fillRect(px, x + m, y + m, s - 2 * m, s - 2 * m, bg);
      fillRect(px, x + 2 * m, y + 2 * m, s - 4 * m, s - 4 * m, fg);
    }
  }
  function drawModules(px, qr, m, ox, oy, style, fg, fg2) {
    var n = qr.modules.size, data = qr.modules.data;
    for (var r = 0; r < n; r++) {
      var grow = fg2 ? lerpRGB(fg, fg2, n <= 1 ? 0 : r / (n - 1)) : fg;
      for (var c = 0; c < n; c++) {
        if (!data[r * n + c] || isFinderZone(r, c, n)) continue;
        var x = ox + c * m, y = oy + r * m;
        if (style === 'round') roundRect(px, x, y, m, m, m * 0.3, grow);
        else fillRect(px, x, y, m, m, grow);
      }
    }
  }
  function drawQR(px, qr, m, ox, oy, style, fg, bg, fg2) {
    var n = qr.modules.size;
    drawModules(px, qr, m, ox, oy, style, fg, fg2);
    drawFinder(px, 0, 0, m, ox, oy, style, fg, bg, fg2);
    drawFinder(px, 0, n - 7, m, ox, oy, style, fg, bg, fg2);
    drawFinder(px, n - 7, 0, m, ox, oy, style, fg, bg, fg2);
  }

  function getDesign(id) {
    for (var i = 0; i < DESIGNS.length; i++) if (DESIGNS[i].id === id) return DESIGNS[i];
    return DESIGNS[0];
  }

  /* logos: [{img:{data,w,h}, position:'top|bottom|side|middle|center'}] */
  function normLogos(opts) {
    var out = [];
    (opts.logos || []).forEach(function (L) {
      if (!L || !L.img || !L.img.data || !L.img.w || !L.img.h) return;
      var pos = ['top', 'bottom', 'side', 'middle', 'center'].indexOf(L.position) !== -1 ? L.position : 'center';
      out.push({ img: L.img, position: pos });
    });
    return out.slice(0, 4);
  }
  function byPos(logos, pos) { return logos.filter(function (L) { return L.position === pos; }); }

  /* fit logo into a box, return {dw,dh} preserving aspect */
  function fitBox(img, boxW, boxH) {
    var s = Math.min(boxW / img.w, boxH / img.h);
    return { dw: Math.max(1, Math.round(img.w * s)), dh: Math.max(1, Math.round(img.h * s)) };
  }
  function drawLogoCentered(px, L, cx, cy, boxW, boxH) {
    var f = fitBox(L.img, boxW, boxH);
    drawLogo(px, L.img, cx - f.dw / 2, cy - f.dh / 2, f.dw, f.dh);
    return f;
  }
  /* center-of-QR logo: white safe backdrop + capped size (<=22% of QR side) */
  function drawCenterLogo(px, L, qx, qy, qrPx) {
    var side = clamp(qrPx * 0.22, 56, 240);
    var f = fitBox(L.img, side, side);
    var pad = Math.round(Math.max(f.dw, f.dh) * 0.18) + 10;
    roundRect(px, qx + qrPx / 2 - f.dw / 2 - pad, qy + qrPx / 2 - f.dh / 2 - pad,
              f.dw + pad * 2, f.dh + pad * 2, pad, hexRGB('#FFFFFF'));
    drawLogo(px, L.img, qx + qrPx / 2 - f.dw / 2, qy + qrPx / 2 - f.dh / 2, f.dw, f.dh);
  }

  function renderPlain(text, d, qr, logos, labelText, maxSize) {
    var n = qr.modules.size;
    var m = Math.max(4, Math.min(14, Math.floor((maxSize || 900) / (n + 8))));
    var W = (n + 8) * m;
    var fg = hexRGB(d.fg), bg = hexRGB(d.bg), fg2 = d.fg2 ? hexRGB(d.fg2) : null;
    var tops = byPos(logos, 'top'), bots = byPos(logos, 'bottom');
    var sides = byPos(logos, 'side'), mids = byPos(logos, 'middle');
    var bandT = tops.length ? Math.round(W * 0.20) : 0;
    var bandB = bots.length ? Math.round(W * 0.20) : 0;
    var bandL = mids.length ? Math.round(W * 0.20) : 0;
    var bandR = sides.length ? Math.round(W * 0.20) : 0;
    var labelBand = labelText ? 132 : 0;
    var CW = W + bandL + bandR, CH = W + bandT + bandB + labelBand;
    var px = newBuf(CW, CH, bg);
    var ox = bandL + 4 * m, oy = bandT + 4 * m;
    drawQR(px, qr, m, ox, oy, d.style, fg, bg, fg2);
    tops.forEach(function (L) { drawLogoCentered(px, L, CW / 2, bandT / 2, W * 0.5, bandT - 16); });
    bots.forEach(function (L) { drawLogoCentered(px, L, CW / 2, bandT + W + bandB / 2, W * 0.5, bandB - 16); });
    mids.forEach(function (L) { drawLogoCentered(px, L, bandL / 2, bandT + W / 2, bandL - 16, W * 0.4); });
    sides.forEach(function (L) { drawLogoCentered(px, L, bandL + W + bandR / 2, bandT + W / 2, bandR - 16, W * 0.4); });
    byPos(logos, 'center').forEach(function (L) { drawCenterLogo(px, L, ox, oy, n * m); });
    var label = labelText ? {
      text: labelText, x: CW / 2, y: bandT + W + bandB + 72,
      maxW: CW - 80, fontPx: 54, color: d.fg
    } : null;
    return { w: CW, h: CH, data: px.buf, design: d.id, modules: n,
             qr: { x: ox, y: oy, size: n * m, module: m },
             label: label };
  }

  function render(text, designId, opts) {
    opts = opts || {};
    if (typeof text !== 'string' || !text.trim()) throw new Error('Enter some text or a link first.');
    if (text.length > 800) throw new Error('Text is too long (max 800 characters).');
    var QR = root.QRCode;
    if (!QR || !QR.create) throw new Error('QR engine not loaded.');
    var d = getDesign(designId);
    var logos = normLogos(opts);
    var hasCenter = logos.some(function (L) { return L.position === 'center'; });
    var ec = hasCenter ? 'H' : (opts.ecLevel || 'M');
    var qr = QR.create(text.trim(), { errorCorrectionLevel: ec });
    var labelText = (opts.labelText || '').trim().slice(0, 60) || null;
    var r = renderPlain(text, d, qr, logos, labelText, opts.maxSize);
    r.ecLevel = ec;
    return r;
  }

  root.QRDesigns = { DESIGNS: DESIGNS, render: render, getDesign: getDesign, version: 5 };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

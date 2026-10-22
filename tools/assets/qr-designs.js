/* ==========================================================================
   Ride Bangla Tools — QR Design Studio v4 (DOM-free pixel renderer)
   Generates 3 plain designs + motif designs. No DOM required: render()
   returns raw pixels, so the same code runs in the browser AND in Node
   for automated tests.
   Requires global QRCode.create (embedded qrcode lib on the tool page).

   Logo engine: up to N logos at explicit positions (top/bottom/side/
   middle/center). CENTER-OF-QR uses error-correction level H, a white
   safe backdrop, and a capped logo size so the code still scans.

   v4 (owner directive 2026-10-22): the old FRAMED poster designs are
   REMOVED — their themed art sat in a strip BELOW an otherwise plain QR,
   which is not a designed QR at all. Every named design is now a true
   MOTIF conversion: the motif is painted once at module resolution with
   3x3 supersampling, then EVERY module cell is filled with the sampled
   motif colour pushed to the luminance side that module needs (dark
   module -> colour darkened to <= 0.30, light module -> colour lightened
   to >= 0.74: visibly tinted, never washed to white), plus a
   small high-contrast centre anchor dot per cell — so the code itself
   forms the picture. Motif designs ALWAYS use error-correction level H
   and standard full-size finders. Kite and Ocean motifs added: every
   design in the list genuinely converts, and each shipped motif passes
   an automated jsQR decode gate (pristine + degraded) before release.
   ========================================================================== */
(function (root) {
  'use strict';

  var DESIGNS = [
    { id: 'classic', name: 'Classic', desc: 'Clean black-on-white squares', style: 'square', fg: '#141414', bg: '#FFFFFF', framed: false },
    { id: 'rounded', name: 'Rounded', desc: 'Soft circles, deep-green ink', style: 'round', fg: '#0B3D2E', bg: '#FFFFFF', framed: false },
    { id: 'sunset', name: 'Sunset Fade', desc: 'Warm gradient squares', style: 'gradient', fg: '#C2410C', fg2: '#7C2D12', bg: '#FFFBEB', framed: false },
    { id: 'motif-tiger', name: 'Tiger QR', desc: 'The whole code in a tiger design', mode: 'motif', motif: 'tiger', style: 'round', fg: '#5F2700', bg: '#FFF6E9', framed: false },
    { id: 'motif-lion', name: 'Lion QR', desc: 'The whole code in a lion design', mode: 'motif', motif: 'lion', style: 'round', fg: '#5A3000', bg: '#FFF8EC', framed: false },
    { id: 'motif-cat', name: 'Cat QR', desc: 'The whole code in a cat design', mode: 'motif', motif: 'cat', style: 'round', fg: '#10161C', bg: '#FFFFFF', framed: false },
    { id: 'motif-panda', name: 'Panda QR', desc: 'The whole code in a panda design', mode: 'motif', motif: 'panda', style: 'round', fg: '#1A1A1A', bg: '#FFFFFF', framed: false },
    { id: 'motif-owl', name: 'Owl QR', desc: 'The whole code in an owl design', mode: 'motif', motif: 'owl', style: 'round', fg: '#33200D', bg: '#FBF3E2', framed: false },
    { id: 'motif-fox', name: 'Fox QR', desc: 'The whole code in a fox design', mode: 'motif', motif: 'fox', style: 'round', fg: '#6E2A00', bg: '#FFF5EA', framed: false },
    { id: 'motif-bird', name: 'Bird QR', desc: 'The whole code in a bird design', mode: 'motif', motif: 'bird', style: 'round', fg: '#0B3D5C', bg: '#F2FAFF', framed: false },
    { id: 'motif-kite', name: 'Kite QR', desc: 'The whole code in a kite design', mode: 'motif', motif: 'kite', style: 'round', fg: '#6B2100', bg: '#FFF8E7', framed: false },
    { id: 'motif-ocean', name: 'Ocean QR', desc: 'The whole code in an ocean design', mode: 'motif', motif: 'ocean', style: 'round', fg: '#07304F', bg: '#EFF9FF', framed: false },
    { id: 'motif-robot', name: 'Robot QR', desc: 'The whole code in a robot design', mode: 'motif', motif: 'robot', style: 'round', fg: '#0F2A3D', bg: '#F0FAFB', framed: false },
    { id: 'motif-triangle', name: 'Triangle QR', desc: 'The whole code in a triangle design', mode: 'motif', motif: 'triangle', style: 'round', fg: '#4A2A00', bg: '#FFFAEC', framed: false },
    { id: 'motif-heart', name: 'Heart QR', desc: 'The whole code in a heart design', mode: 'motif', motif: 'heart', style: 'round', fg: '#6E0F26', bg: '#FFF2F5', framed: false },
    { id: 'motif-star', name: 'Star QR', desc: 'The whole code in a star design', mode: 'motif', motif: 'star', style: 'round', fg: '#5A4300', bg: '#FFFBEB', framed: false },
    { id: 'motif-leaf', name: 'Leaf QR', desc: 'The whole code in a leaf design', mode: 'motif', motif: 'leaf', style: 'round', fg: '#0B3D1E', bg: '#F2FBF3', framed: false },
    { id: 'motif-flower', name: 'Flower QR', desc: 'The whole code in a flower design', mode: 'motif', motif: 'flower', style: 'round', fg: '#5C1140', bg: '#FFF2F8', framed: false }
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

  /* ================= MOTIF LIBRARY (v3) =================
     Painters paintMotif(px, cx, cy, R, P): P is a resolved palette
     {ink, mid, soft, light, bg} of RGB arrays. Painters use ONLY palette
     colours (plus pure white for tiny eye highlights), so painting with
     an all-white palette on transparency yields the silhouette (alpha =
     coverage) — the shaped renderer below only needs the real-palette
     painting: per module it reads coverage (mean alpha) and colour
     (mean RGB over covered samples) from a 3x3-supersampled buffer. */

  var WHITE = [255, 255, 255];

  function fillEllipseA(px, cx, cy, rx, ry, rgb, a) { // alpha ellipse (motif section helper)
    var x0 = Math.max(0, Math.floor(cx - rx)), y0 = Math.max(0, Math.floor(cy - ry));
    var x1 = Math.min(px.w - 1, Math.ceil(cx + rx)), y1 = Math.min(px.h - 1, Math.ceil(cy + ry));
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) blendPx(px, x, y, rgb, a);
      }
  }

  function motifEye(px, x, y, r, P) {
    fillCircle(px, x, y, r, P.light);
    fillCircle(px, x, y, r * 0.62, P.ink);
    fillCircle(px, x - r * 0.22, y - r * 0.24, r * 0.20, WHITE);
    fillCircle(px, x + r * 0.26, y + r * 0.28, r * 0.11, WHITE);
  }
  function motifStripe(px, sx, sy, ex, ey, w0, w1, col) {
    var dx = ex - sx, dy = ey - sy, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    fillPolygon(px, [
      [sx + nx * w0 / 2, sy + ny * w0 / 2], [sx - nx * w0 / 2, sy - ny * w0 / 2],
      [ex - nx * w1 / 2, ey - ny * w1 / 2], [ex + nx * w1 / 2, ey + ny * w1 / 2]
    ], col);
    fillCircle(px, sx, sy, w0 / 2, col);
  }

  function paintTiger(px, cx, cy, R, P) {
    [-1, 1].forEach(function (s) {
      fillCircle(px, cx + s * R * 0.72, cy - R * 0.72, R * 0.34, P.ink);
      fillCircle(px, cx + s * R * 0.72, cy - R * 0.72, R * 0.26, P.mid);
      fillCircle(px, cx + s * R * 0.70, cy - R * 0.70, R * 0.14, P.light);
    });
    fillCircle(px, cx, cy, R * 0.98, P.mid);
    fillEllipseV(px, cx, cy - R * 0.14, R * 0.78, R * 0.72, lerpRGB(P.mid, WHITE, 0.22), P.mid);
    motifStripe(px, cx, cy - R * 0.96, cx, cy - R * 0.60, R * 0.13, R * 0.03, P.ink);
    motifStripe(px, cx - R * 0.34, cy - R * 0.88, cx - R * 0.24, cy - R * 0.56, R * 0.11, R * 0.03, P.ink);
    motifStripe(px, cx + R * 0.34, cy - R * 0.88, cx + R * 0.24, cy - R * 0.56, R * 0.11, R * 0.03, P.ink);
    [-1, 1].forEach(function (s) {
      motifStripe(px, cx + s * R * 0.97, cy - R * 0.28, cx + s * R * 0.66, cy - R * 0.18, R * 0.11, R * 0.03, P.ink);
      motifStripe(px, cx + s * R * 0.99, cy + R * 0.06, cx + s * R * 0.68, cy + R * 0.08, R * 0.11, R * 0.03, P.ink);
      motifStripe(px, cx + s * R * 0.92, cy + R * 0.38, cx + s * R * 0.64, cy + R * 0.34, R * 0.10, R * 0.03, P.ink);
    });
    fillEllipse(px, cx - R * 0.23, cy + R * 0.44, R * 0.29, R * 0.22, P.light);
    fillEllipse(px, cx + R * 0.23, cy + R * 0.44, R * 0.29, R * 0.22, P.light);
    fillEllipse(px, cx, cy + R * 0.64, R * 0.26, R * 0.14, P.light);
    motifEye(px, cx - R * 0.38, cy - R * 0.18, R * 0.17, P);
    motifEye(px, cx + R * 0.38, cy - R * 0.18, R * 0.17, P);
    fillPolygon(px, [[cx - R * 0.15, cy + R * 0.28], [cx + R * 0.15, cy + R * 0.28], [cx, cy + R * 0.44]], P.ink);
    thickLine(px, cx, cy + R * 0.44, cx, cy + R * 0.56, R * 0.05, P.ink);
    arcStroke(px, cx - R * 0.09, cy + R * 0.52, R * 0.10, Math.PI * 0.15, Math.PI * 0.85, R * 0.045, P.ink);
    arcStroke(px, cx + R * 0.09, cy + R * 0.52, R * 0.10, Math.PI * 0.15, Math.PI * 0.85, R * 0.045, P.ink);
    [-1, 1].forEach(function (s) {
      thickLineA(px, cx + s * R * 0.40, cy + R * 0.38, cx + s * R * 1.02, cy + R * 0.26, R * 0.028, WHITE, 0.9);
      thickLineA(px, cx + s * R * 0.42, cy + R * 0.50, cx + s * R * 1.04, cy + R * 0.50, R * 0.028, WHITE, 0.9);
      thickLineA(px, cx + s * R * 0.40, cy + R * 0.62, cx + s * R * 1.0, cy + R * 0.74, R * 0.028, WHITE, 0.85);
    });
  }

  function paintLion(px, cx, cy, R, P) {
    for (var i = 0; i < 16; i++) { // mane: alternating sun-ray discs
      var a = i / 16 * Math.PI * 2;
      fillCircle(px, cx + Math.cos(a) * R * 0.80, cy + Math.sin(a) * R * 0.80, R * 0.30, i % 2 ? P.mid : P.ink);
    }
    fillCircle(px, cx, cy, R * 0.86, P.mid);
    [-1, 1].forEach(function (s) {
      fillCircle(px, cx + s * R * 0.52, cy - R * 0.58, R * 0.20, P.mid);
      fillCircle(px, cx + s * R * 0.52, cy - R * 0.58, R * 0.11, P.light);
    });
    fillCircle(px, cx, cy, R * 0.68, P.soft);
    fillEllipseV(px, cx, cy - R * 0.08, R * 0.56, R * 0.52, lerpRGB(P.soft, WHITE, 0.25), P.soft);
    fillEllipse(px, cx - R * 0.20, cy + R * 0.34, R * 0.26, R * 0.20, P.light);
    fillEllipse(px, cx + R * 0.20, cy + R * 0.34, R * 0.26, R * 0.20, P.light);
    motifEye(px, cx - R * 0.30, cy - R * 0.16, R * 0.16, P);
    motifEye(px, cx + R * 0.30, cy - R * 0.16, R * 0.16, P);
    fillPolygon(px, [[cx - R * 0.13, cy + R * 0.20], [cx + R * 0.13, cy + R * 0.20], [cx, cy + R * 0.34]], P.ink);
    thickLine(px, cx, cy + R * 0.34, cx, cy + R * 0.44, R * 0.045, P.ink);
    arcStroke(px, cx - R * 0.08, cy + R * 0.41, R * 0.09, Math.PI * 0.15, Math.PI * 0.85, R * 0.04, P.ink);
    arcStroke(px, cx + R * 0.08, cy + R * 0.41, R * 0.09, Math.PI * 0.15, Math.PI * 0.85, R * 0.04, P.ink);
    [-1, 1].forEach(function (s) { // brow tufts
      thickLine(px, cx + s * R * 0.20, cy - R * 0.36, cx + s * R * 0.40, cy - R * 0.40, R * 0.05, P.ink);
    });
  }

  function paintCat(px, cx, cy, R, P) {
    // ears kept INSIDE the finder-safe area (tips |x| <= 0.52R): the v3
    // ears sat in the corner finder zones and were drawn over.
    [-1, 1].forEach(function (s) {
      fillPolygon(px, [[cx + s * R * 0.54, cy - R * 0.34], [cx + s * R * 0.50, cy - R * 0.86], [cx + s * R * 0.16, cy - R * 0.60]], P.mid);
      fillPolygon(px, [[cx + s * R * 0.46, cy - R * 0.42], [cx + s * R * 0.44, cy - R * 0.72], [cx + s * R * 0.24, cy - R * 0.56]], P.light);
    });
    fillCircle(px, cx, cy + R * 0.08, R * 0.82, P.mid);
    fillEllipse(px, cx, cy + R * 0.46, R * 0.38, R * 0.24, P.light);
    motifEye(px, cx - R * 0.32, cy - R * 0.08, R * 0.16, P);
    motifEye(px, cx + R * 0.32, cy - R * 0.08, R * 0.16, P);
    fillPolygon(px, [[cx - R * 0.09, cy + R * 0.30], [cx + R * 0.09, cy + R * 0.30], [cx, cy + R * 0.42]], P.ink);
    thickLine(px, cx, cy + R * 0.42, cx, cy + R * 0.50, R * 0.04, P.ink);
    motifStripe(px, cx, cy - R * 0.72, cx, cy - R * 0.50, R * 0.10, R * 0.05, P.ink);
    motifStripe(px, cx - R * 0.22, cy - R * 0.66, cx - R * 0.18, cy - R * 0.46, R * 0.09, R * 0.05, P.ink);
    motifStripe(px, cx + R * 0.22, cy - R * 0.66, cx + R * 0.18, cy - R * 0.46, R * 0.09, R * 0.05, P.ink);
    [-1, 1].forEach(function (s) {
      thickLine(px, cx + s * R * 0.36, cy + R * 0.34, cx + s * R * 0.78, cy + R * 0.26, R * 0.035, P.ink);
      thickLine(px, cx + s * R * 0.36, cy + R * 0.46, cx + s * R * 0.78, cy + R * 0.50, R * 0.035, P.ink);
    });
  }

  function paintPanda(px, cx, cy, R, P) {
    [-1, 1].forEach(function (s) {
      fillCircle(px, cx + s * R * 0.68, cy - R * 0.68, R * 0.30, P.ink);
      fillCircle(px, cx + s * R * 0.68, cy - R * 0.68, R * 0.17, P.mid);
    });
    fillCircle(px, cx, cy, R * 0.94, P.light);
    fillEllipseV(px, cx, cy - R * 0.10, R * 0.80, R * 0.76, WHITE, P.light);
    [-1, 1].forEach(function (s) { // ink eye patches, tilted ovals approximated by stacked circles
      fillCircle(px, cx + s * R * 0.34, cy - R * 0.22, R * 0.21, P.ink);
      fillCircle(px, cx + s * R * 0.28, cy - R * 0.12, R * 0.19, P.ink);
      fillCircle(px, cx + s * R * 0.32, cy - R * 0.18, R * 0.085, WHITE);
      fillCircle(px, cx + s * R * 0.32, cy - R * 0.18, R * 0.048, P.ink);
      fillCircle(px, cx + s * R * 0.295, cy - R * 0.205, R * 0.018, WHITE);
    });
    fillEllipse(px, cx, cy + R * 0.30, R * 0.13, R * 0.09, P.ink);
    thickLine(px, cx, cy + R * 0.39, cx, cy + R * 0.47, R * 0.04, P.ink);
    arcStroke(px, cx - R * 0.08, cy + R * 0.43, R * 0.09, Math.PI * 0.15, Math.PI * 0.85, R * 0.04, P.ink);
    arcStroke(px, cx + R * 0.08, cy + R * 0.43, R * 0.09, Math.PI * 0.15, Math.PI * 0.85, R * 0.04, P.ink);
    fillEllipse(px, cx, cy + R * 0.62, R * 0.34, R * 0.16, P.light);
  }

  function paintOwl(px, cx, cy, R, P) {
    [-1, 1].forEach(function (s) { // ear tufts
      fillPolygon(px, [[cx + s * R * 0.62, cy - R * 0.52], [cx + s * R * 0.86, cy - R * 0.98], [cx + s * R * 0.30, cy - R * 0.78]], P.mid);
    });
    fillEllipse(px, cx, cy + R * 0.08, R * 0.86, R * 0.94, P.mid);
    [-1, 1].forEach(function (s) { // wings
      fillEllipse(px, cx + s * R * 0.72, cy + R * 0.22, R * 0.24, R * 0.52, P.ink);
    });
    fillCircle(px, cx - R * 0.34, cy - R * 0.28, R * 0.42, P.light);
    fillCircle(px, cx + R * 0.34, cy - R * 0.28, R * 0.42, P.light);
    fillEllipse(px, cx, cy + R * 0.48, R * 0.44, R * 0.38, P.soft);
    [-2, 0, 2].forEach(function (k) { // belly chevrons
      arcStroke(px, cx + k * R * 0.14, cy + R * 0.42, R * 0.10, Math.PI * 0.15, Math.PI * 0.85, R * 0.035, P.ink);
      arcStroke(px, cx + k * R * 0.14, cy + R * 0.62, R * 0.10, Math.PI * 0.15, Math.PI * 0.85, R * 0.035, P.ink);
    });
    motifEye(px, cx - R * 0.34, cy - R * 0.28, R * 0.24, P);
    motifEye(px, cx + R * 0.34, cy - R * 0.28, R * 0.24, P);
    fillPolygon(px, [[cx - R * 0.10, cy - R * 0.02], [cx + R * 0.10, cy - R * 0.02], [cx, cy + R * 0.14]], P.soft);
    [-1, 1].forEach(function (s) { // feet
      thickLine(px, cx + s * R * 0.20, cy + R * 1.0, cx + s * R * 0.20, cy + R * 0.90, R * 0.05, P.soft);
    });
  }

  function paintFox(px, cx, cy, R, P) {
    // ears compressed into the finder-safe area (v3 tips sat at
    // (+-0.88R, -1.02R) — inside the corner finder zones, drawn over).
    [-1, 1].forEach(function (s) {
      fillPolygon(px, [[cx + s * R * 0.56, cy - R * 0.30], [cx + s * R * 0.52, cy - R * 0.88], [cx + s * R * 0.14, cy - R * 0.58]], P.mid);
      fillPolygon(px, [[cx + s * R * 0.50, cy - R * 0.38], [cx + s * R * 0.47, cy - R * 0.74], [cx + s * R * 0.24, cy - R * 0.54]], P.ink);
    });
    // pointed face: wide top narrowing to the chin
    fillPolygon(px, [[cx - R * 0.78, cy - R * 0.44], [cx + R * 0.78, cy - R * 0.44], [cx + R * 0.46, cy + R * 0.36], [cx, cy + R * 0.92], [cx - R * 0.46, cy + R * 0.36]], P.mid);
    // cream cheeks sweeping to the chin
    fillPolygon(px, [[cx - R * 0.46, cy + R * 0.36], [cx, cy + R * 0.92], [cx, cy + R * 0.06], [cx - R * 0.26, cy + R * 0.12]], P.light);
    fillPolygon(px, [[cx + R * 0.46, cy + R * 0.36], [cx, cy + R * 0.92], [cx, cy + R * 0.06], [cx + R * 0.26, cy + R * 0.12]], P.light);
    motifEye(px, cx - R * 0.30, cy - R * 0.12, R * 0.15, P);
    motifEye(px, cx + R * 0.30, cy - R * 0.12, R * 0.15, P);
    fillEllipse(px, cx, cy + R * 0.48, R * 0.14, R * 0.10, P.ink);
  }

  function paintBird(px, cx, cy, R, P) {
    // flying bird as ONE closed silhouette in a single tone — multi-part
    // shaded birds disintegrated at module resolution; a single bold
    // outline (beak, head, back, tail fan, belly, swept wing) survives.
    // All points stay out of the corner finder zones.
    fillPolygon(px, [
      [cx + R * 0.98, cy - R * 0.08],  // beak tip
      [cx + R * 0.68, cy - R * 0.20],  // beak base, top
      [cx + R * 0.50, cy - R * 0.34],  // head top
      [cx + R * 0.18, cy - R * 0.28],  // back of neck
      [cx - R * 0.55, cy - R * 0.05],  // back, sweeping to tail
      [cx - R * 0.92, cy - R * 0.18],  // tail tip, top
      [cx - R * 0.78, cy + R * 0.08],  // tail notch
      [cx - R * 0.90, cy + R * 0.30],  // tail tip, bottom
      [cx - R * 0.40, cy + R * 0.30],  // belly, rear
      [cx - R * 0.05, cy + R * 0.38],  // wing root, trailing
      [cx + R * 0.72, cy + R * 0.62],  // wing tip (swept down-right)
      [cx + R * 0.30, cy + R * 0.18],  // wing root, leading
      [cx + R * 0.52, cy + R * 0.05],  // chest
      [cx + R * 0.62, cy - R * 0.05]   // throat / beak base, bottom
    ], P.ink);
    // pale belly patch inside the silhouette + one eye
    fillEllipse(px, cx + R * 0.02, cy + R * 0.16, R * 0.30, R * 0.13, P.mid);
    fillCircle(px, cx + R * 0.52, cy - R * 0.16, R * 0.055, P.light);
  }



  function paintRobot(px, cx, cy, R, P) {
    // antenna + ears
    thickLine(px, cx, cy - R * 0.62, cx, cy - R * 0.92, R * 0.07, P.ink);
    fillCircle(px, cx, cy - R * 0.98, R * 0.11, P.soft);
    fillCircle(px, cx, cy - R * 0.98, R * 0.05, P.light);
    fillRect(px, cx - R * 1.0, cy - R * 0.28, R * 0.16, R * 0.52, P.ink);
    fillRect(px, cx + R * 0.84, cy - R * 0.28, R * 0.16, R * 0.52, P.ink);
    // head shell + face screen
    roundRect(px, cx - R * 0.92, cy - R * 0.70, R * 1.84, R * 1.42, R * 0.34, P.ink);
    roundRect(px, cx - R * 0.86, cy - R * 0.64, R * 1.72, R * 1.30, R * 0.30, P.mid);
    roundRect(px, cx - R * 0.68, cy - R * 0.46, R * 1.36, R * 0.94, R * 0.22, P.ink);
    // eyes: glowing soft discs
    fillCircle(px, cx - R * 0.33, cy - R * 0.12, R * 0.19, P.soft);
    fillCircle(px, cx + R * 0.33, cy - R * 0.12, R * 0.19, P.soft);
    fillCircle(px, cx - R * 0.36, cy - R * 0.17, R * 0.05, WHITE);
    fillCircle(px, cx + R * 0.30, cy - R * 0.17, R * 0.05, WHITE);
    // mouth: equaliser bars
    [-2, -1, 0, 1, 2].forEach(function (i) {
      var hh = [0.10, 0.17, 0.22, 0.17, 0.10][i + 2];
      fillRect(px, cx + i * R * 0.17 - R * 0.045, cy + R * 0.26 - R * hh / 2, R * 0.09, R * hh, P.soft);
    });
    // neck + shoulders + chest core
    fillRect(px, cx - R * 0.16, cy + R * 0.66, R * 0.32, R * 0.14, P.ink);
    fillPolygon(px, [[cx - R * 0.62, cy + R * 1.02], [cx + R * 0.62, cy + R * 1.02], [cx + R * 0.40, cy + R * 0.78], [cx - R * 0.40, cy + R * 0.78]], P.mid);
    fillCircle(px, cx, cy + R * 0.90, R * 0.10, P.soft);
    fillCircle(px, cx, cy + R * 0.90, R * 0.05, P.light);
    // cheek bolts
    fillCircle(px, cx - R * 0.62, cy + R * 0.34, R * 0.05, P.soft);
    fillCircle(px, cx + R * 0.62, cy + R * 0.34, R * 0.05, P.soft);
  }

  function paintTriangle(px, cx, cy, R, P) {
    fillEllipseA(px, cx, cy + R * 0.92, R * 0.78, R * 0.13, P.soft, 0.55);
    var top = [cx, cy - R * 1.02], bl = [cx - R * 0.94, cy + R * 0.82], br = [cx + R * 0.94, cy + R * 0.82];
    fillPolygon(px, [top, br, bl], P.ink);
    var t2 = [cx, cy - R * 0.80], b2l = [cx - R * 0.72, cy + R * 0.66], b2r = [cx + R * 0.72, cy + R * 0.66];
    fillPolygon(px, [t2, b2r, b2l], P.mid);
    // prism facets: light left, soft right, bright core
    fillPolygon(px, [t2, [cx, cy + R * 0.66], b2l], lerpRGB(P.mid, WHITE, 0.30));
    fillPolygon(px, [t2, b2r, [cx, cy + R * 0.66]], P.soft);
    fillPolygon(px, [[cx, cy - R * 0.44], [cx + R * 0.26, cy + R * 0.30], [cx - R * 0.26, cy + R * 0.30]], P.light);
    thickLine(px, top[0], top[1], cx, cy + R * 0.66, R * 0.035, P.ink);
    // sparkles
    [[cx - R * 0.92, cy - R * 0.72, 0.10], [cx + R * 0.94, cy - R * 0.44, 0.08], [cx + R * 0.80, cy + R * 0.94, 0.07]].forEach(function (sp) {
      fillPolygon(px, [[sp[0], sp[1] - R * sp[2]], [sp[0] + R * sp[2] * 0.32, sp[1]], [sp[0], sp[1] + R * sp[2]], [sp[0] - R * sp[2] * 0.32, sp[1]]], P.mid);
    });
  }

  function paintHeart(px, cx, cy, R, P) {
    fillCircle(px, cx - R * 0.44, cy - R * 0.34, R * 0.50, P.mid);
    fillCircle(px, cx + R * 0.44, cy - R * 0.34, R * 0.50, P.mid);
    fillPolygon(px, [[cx - R * 0.90, cy - R * 0.10], [cx + R * 0.90, cy - R * 0.10], [cx, cy + R * 1.0]], P.mid);
    fillEllipseV(px, cx, cy - R * 0.10, R * 0.72, R * 0.55, lerpRGB(P.mid, WHITE, 0.20), P.mid);
    // inner heart, offset up-left for depth
    fillCircle(px, cx - R * 0.30 - R * 0.08, cy - R * 0.30, R * 0.30, P.soft);
    fillCircle(px, cx + R * 0.30 - R * 0.08, cy - R * 0.30, R * 0.30, P.soft);
    fillPolygon(px, [[cx - R * 0.60, cy - R * 0.14], [cx + R * 0.44, cy - R * 0.14], [cx - R * 0.08, cy + R * 0.56]], P.soft);
    fillEllipseA(px, cx - R * 0.48, cy - R * 0.44, R * 0.20, R * 0.12, WHITE, 0.65); // gloss
    fillCircle(px, cx + R * 0.66, cy + R * 0.30, R * 0.07, P.light);
    fillCircle(px, cx - R * 0.78, cy + R * 0.42, R * 0.05, P.light);
  }

  function starPoints(cx, cy, rO, rI, rot) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? rI : rO, a = rot + i * Math.PI / 5;
      pts.push([cx + r * Math.sin(a), cy - r * Math.cos(a)]);
    }
    return pts;
  }
  function paintStar(px, cx, cy, R, P) {
    fillPolygon(px, starPoints(cx, cy, R * 1.04, R * 0.44, 0), P.ink);
    fillPolygon(px, starPoints(cx, cy, R * 0.92, R * 0.39, 0), P.mid);
    fillPolygon(px, starPoints(cx, cy - R * 0.04, R * 0.52, R * 0.22, 0), P.soft);
    fillCircle(px, cx, cy - R * 0.04, R * 0.17, P.light);
    fillCircleA(px, cx - R * 0.05, cy - R * 0.09, R * 0.06, WHITE, 0.8);
    [[cx - R * 0.88, cy - R * 0.80, 0.09], [cx + R * 0.90, cy - R * 0.55, 0.07], [cx + R * 0.78, cy + R * 0.82, 0.08]].forEach(function (sp) {
      fillPolygon(px, [[sp[0], sp[1] - R * sp[2]], [sp[0] + R * sp[2] * 0.32, sp[1]], [sp[0], sp[1] + R * sp[2]], [sp[0] - R * sp[2] * 0.32, sp[1]]], P.mid);
    });
  }

  function paintLeaf(px, cx, cy, R, P) {
    // leaf outline from a width profile (pointed at both ends, diagonal)
    var ptsTop = [], ptsBot = [], N = 24, i, t, wdt, pxX, pxY;
    var ax = -0.85, ay = 0.85, bx = 0.85, by = -0.85; // tip-to-tip axis (unit-ish)
    var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    for (i = 0; i <= N; i++) {
      t = i / N; wdt = Math.pow(Math.sin(Math.PI * t), 0.65) * 0.52;
      pxX = cx + (ax + dx * t) * R; pxY = cy + (ay + dy * t) * R;
      ptsTop.push([pxX + nx * wdt * R, pxY + ny * wdt * R]);
    }
    for (i = N; i >= 0; i--) {
      t = i / N; wdt = Math.pow(Math.sin(Math.PI * t), 0.65) * 0.52;
      pxX = cx + (ax + dx * t) * R; pxY = cy + (ay + dy * t) * R;
      ptsBot.push([pxX - nx * wdt * R, pxY - ny * wdt * R]);
    }
    fillPolygon(px, ptsTop.concat(ptsBot), P.mid);
    // lighter upper half sheen
    fillPolygon(px, ptsTop.concat([[cx, cy]]), lerpRGB(P.mid, WHITE, 0.18));
    // stem + centre vein + side veins in ink
    thickLine(px, cx + (ax - ux * 0.16) * R, cy + (ay - uy * 0.16) * R, cx + ax * R, cy + ay * R, R * 0.07, P.ink);
    thickLine(px, cx + ax * R, cy + ay * R, cx + bx * R, cy + by * R, R * 0.045, P.ink);
    [0.3, 0.48, 0.66].forEach(function (tt) {
      var vx = cx + (ax + dx * tt) * R, vy = cy + (ay + dy * tt) * R;
      var w2 = Math.pow(Math.sin(Math.PI * tt), 0.65) * 0.40;
      thickLine(px, vx, vy, vx + (nx * w2 + ux * 0.16) * R, vy + (ny * w2 + uy * 0.16) * R, R * 0.028, P.ink);
      thickLine(px, vx, vy, vx + (-nx * w2 + ux * 0.16) * R, vy + (-ny * w2 + uy * 0.16) * R, R * 0.028, P.ink);
    });
    fillCircle(px, cx + R * 0.62, cy + R * 0.72, R * 0.09, P.soft); // dew drop
    fillCircleA(px, cx + R * 0.59, cy + R * 0.69, R * 0.035, WHITE, 0.8);
  }

  function paintFlower(px, cx, cy, R, P) {
    var i, a;
    for (i = 0; i < 8; i++) { // outer petals, alternating shades
      a = i / 8 * Math.PI * 2;
      fillCircle(px, cx + Math.cos(a) * R * 0.46, cy + Math.sin(a) * R * 0.46, R * 0.31, i % 2 ? P.soft : P.mid);
    }
    for (i = 0; i < 8; i++) { // inner petal highlights
      a = (i + 0.5) / 8 * Math.PI * 2;
      fillCircle(px, cx + Math.cos(a) * R * 0.34, cy + Math.sin(a) * R * 0.34, R * 0.20, P.soft);
    }
    fillCircle(px, cx, cy, R * 0.28, P.light);
    fillCircle(px, cx, cy, R * 0.26, lerpRGB(P.light, P.soft, 0.35));
    [[0, 0], [-0.13, -0.08], [0.13, -0.08], [-0.08, 0.11], [0.09, 0.12], [0, -0.16]].forEach(function (p) {
      fillCircle(px, cx + p[0] * R, cy + p[1] * R, R * 0.045, P.ink);
    });
    fillCircleA(px, cx - R * 0.62, cy - R * 0.62, R * 0.07, WHITE, 0.7);
  }

  function paintKite(px, cx, cy, R, P) {
    var kx = cx, ky = cy - R * 0.30;
    // tail: a gentle S-curve string with three bow ties
    var tail = [];
    for (var i = 0; i <= 24; i++) {
      var t = i / 24;
      tail.push([kx + Math.sin(t * 2.6) * R * 0.22 * t, ky + R * 0.62 + t * R * 0.80]);
    }
    for (var j = 0; j < tail.length - 1; j++)
      thickLine(px, tail[j][0], tail[j][1], tail[j + 1][0], tail[j + 1][1], R * 0.06, P.ink);
    [0.30, 0.55, 0.80].forEach(function (tt, bi) {
      var bx = kx + Math.sin(tt * 2.6) * R * 0.22 * tt, by = ky + R * 0.62 + tt * R * 0.80;
      var bc = bi % 2 ? P.soft : P.mid, bw = R * 0.19;
      fillPolygon(px, [[bx - bw, by - bw * 0.55], [bx - bw, by + bw * 0.55], [bx, by]], bc);
      fillPolygon(px, [[bx + bw, by - bw * 0.55], [bx + bw, by + bw * 0.55], [bx, by]], bc);
      fillCircle(px, bx, by, R * 0.035, P.ink);
    });
    // kite body: classic diamond with four colour panels
    var top = [kx, ky - R * 0.62], bot = [kx, ky + R * 0.62],
        lft = [kx - R * 0.52, ky], rgt = [kx + R * 0.52, ky], ctr = [kx, ky];
    fillPolygon(px, [top, lft, ctr], P.mid);
    fillPolygon(px, [top, ctr, rgt], P.soft);
    fillPolygon(px, [lft, bot, ctr], P.soft);
    fillPolygon(px, [ctr, bot, rgt], P.mid);
    // spars
    thickLine(px, lft[0], lft[1], rgt[0], rgt[1], R * 0.075, P.ink);
    thickLine(px, top[0], top[1], bot[0], bot[1], R * 0.075, P.ink);
    // two small clouds
    fillEllipse(px, cx - R * 0.78, cy - R * 0.80, R * 0.20, R * 0.11, P.light);
    fillEllipse(px, cx - R * 0.64, cy - R * 0.86, R * 0.13, R * 0.09, P.light);
    fillEllipse(px, cx + R * 0.80, cy + R * 0.28, R * 0.17, R * 0.10, P.light);
  }

  function paintOcean(px, cx, cy, R, P) {
    // sun with a pale core
    fillCircle(px, cx - R * 0.05, cy - R * 0.80, R * 0.22, P.soft);
    fillCircle(px, cx - R * 0.05, cy - R * 0.80, R * 0.15, P.light);
    // three rolling wave bands, deepest colour at the bottom
    function waveBand(yBase, amp, phase, col) {
      var pts = [];
      for (var x = -1.15; x <= 1.151; x += 0.075)
        pts.push([cx + x * R, yBase + Math.sin(x * 3.4 + phase) * amp]);
      pts.push([cx + R * 1.15, cy + R * 1.25]);
      pts.push([cx - R * 1.15, cy + R * 1.25]);
      fillPolygon(px, pts, col);
    }
    waveBand(cy - R * 0.30, R * 0.10, 0.0, P.soft);
    waveBand(cy + R * 0.14, R * 0.11, 1.6, P.mid);
    waveBand(cy + R * 0.56, R * 0.10, 3.1, P.ink);
    // foam flecks along the two upper crests
    for (var fx = -1.0; fx <= 1.01; fx += 0.25) {
      fillCircle(px, cx + fx * R, cy - R * 0.30 + Math.sin(fx * 3.4) * R * 0.10 - R * 0.03, R * 0.035, WHITE);
      fillCircle(px, cx + (fx + 0.12) * R, cy + R * 0.14 + Math.sin((fx + 0.12) * 3.4 + 1.6) * R * 0.11 - R * 0.03, R * 0.030, WHITE);
    }
    // bubbles rising in the deep band
    fillCircle(px, cx - R * 0.52, cy + R * 0.82, R * 0.045, P.light);
    fillCircle(px, cx - R * 0.38, cy + R * 0.96, R * 0.032, P.light);
    fillCircle(px, cx + R * 0.30, cy + R * 0.88, R * 0.038, P.soft);
  }

  var MOTIFS = [
    { id: 'tiger', name: 'Tiger', paint: paintTiger, pal: { ink: '#5F2700', mid: '#E8760A', soft: '#F5A83D', light: '#FBD9A0', bg: '#FFF6E9' } },
    { id: 'lion', name: 'Lion', paint: paintLion, pal: { ink: '#5A3000', mid: '#B96A12', soft: '#E8A33D', light: '#F7D9A0', bg: '#FFF8EC' } },
    { id: 'cat', name: 'Cat', paint: paintCat, pal: { ink: '#10161C', mid: '#2E3B46', soft: '#7A8B99', light: '#E8EDF0', bg: '#FFFFFF' } },
    { id: 'panda', name: 'Panda', paint: paintPanda, pal: { ink: '#1A1A1A', mid: '#4A4A4A', soft: '#9E9E9E', light: '#E8E8E8', bg: '#FFFFFF' } },
    { id: 'owl', name: 'Owl', paint: paintOwl, pal: { ink: '#33200D', mid: '#7A4A1F', soft: '#C08A4A', light: '#EBD3AC', bg: '#FBF3E2' } },
    { id: 'fox', name: 'Fox', paint: paintFox, pal: { ink: '#6E2A00', mid: '#E05E10', soft: '#F08A3C', light: '#FBD3AC', bg: '#FFF5EA' } },
    { id: 'bird', name: 'Bird', paint: paintBird, pal: { ink: '#0B3D5C', mid: '#1D8AC0', soft: '#6FC3E8', light: '#CDEEFB', bg: '#F2FAFF' } },
    { id: 'kite', name: 'Kite', paint: paintKite, pal: { ink: '#6B2100', mid: '#D93A1E', soft: '#F2A007', light: '#FBE3AC', bg: '#FFF8E7' } },
    { id: 'ocean', name: 'Ocean', paint: paintOcean, pal: { ink: '#07304F', mid: '#0E6BA8', soft: '#3FA7D6', light: '#BDE6F7', bg: '#EFF9FF' } },
    { id: 'robot', name: 'Robot', paint: paintRobot, pal: { ink: '#0F2A3D', mid: '#1F7A8C', soft: '#5FC4CE', light: '#CDEFF2', bg: '#F0FAFB' } },
    { id: 'triangle', name: 'Triangle', paint: paintTriangle, pal: { ink: '#4A2A00', mid: '#D9940D', soft: '#F2B84B', light: '#FBE3AC', bg: '#FFFAEC' } },
    { id: 'heart', name: 'Heart', paint: paintHeart, pal: { ink: '#6E0F26', mid: '#D61F45', soft: '#F06A85', light: '#FBD3DC', bg: '#FFF2F5' } },
    { id: 'star', name: 'Star', paint: paintStar, pal: { ink: '#5A4300', mid: '#D9A404', soft: '#F2C94C', light: '#FBE9AC', bg: '#FFFBEB' } },
    { id: 'leaf', name: 'Leaf', paint: paintLeaf, pal: { ink: '#0B3D1E', mid: '#1E7A3C', soft: '#57B06B', light: '#CDEBD2', bg: '#F2FBF3' } },
    { id: 'flower', name: 'Flower', paint: paintFlower, pal: { ink: '#5C1140', mid: '#C22B7E', soft: '#F07BB0', light: '#FBD3E6', bg: '#FFF2F8' } }
  ];
  function getMotif(id) {
    for (var i = 0; i < MOTIFS.length; i++) if (MOTIFS[i].id === id) return MOTIFS[i];
    return MOTIFS[0];
  }
  function resolvePal(pal) {
    return { ink: hexRGB(pal.ink), mid: hexRGB(pal.mid), soft: hexRGB(pal.soft), light: hexRGB(pal.light), bg: hexRGB(pal.bg) };
  }

  /* ---------------- shaped (motif) renderer ----------------
     Geometry mirrors renderPlain: square canvas (n+8)*m, quiet zone 4m,
     logo bands + label band. The motif is painted ONCE into an offscreen
     buffer at module resolution with 3x3 supersampling; each module cell
     then samples coverage + mean colour and is FILLED with that colour
     pushed to the luminance side the module needs (dark <= 0.30, light
     >= 0.74 — light enough to scan, tinted enough to SEE), with a small
     centre anchor dot at extra contrast. Finders
     are ALWAYS the standard full drawFinder in ink on bg. */
  function lum(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }
  function pushDark(rgb, target) {
    var lim = (target == null ? 0.30 : target), c = rgb, t = 0;
    while (lum(c) > lim && t < 1) { t += 0.05; c = lerpRGB(rgb, [0, 0, 0], t); }
    return c;
  }
  function pushLight(rgb, target) {
    var lim = (target == null ? 0.74 : target), c = rgb, t = 0;
    while (lum(c) < lim && t < 1) { t += 0.05; c = lerpRGB(rgb, [255, 255, 255], t); }
    return c;
  }

  function renderMotif(text, d, qr, logos, labelText, opts) {
    opts = opts || {};
    var motif = getMotif(d.motif);
    var P = resolvePal(motif.pal);
    var ink = P.ink, bgc = P.bg;
    var n = qr.modules.size, data = qr.modules.data;
    var m = Math.max(4, Math.min(14, Math.floor((opts.maxSize || 900) / (n + 8))));
    var W = (n + 8) * m;
    var tops = byPos(logos, 'top'), bots = byPos(logos, 'bottom');
    var sides = byPos(logos, 'side'), mids = byPos(logos, 'middle');
    var bandT = tops.length ? Math.round(W * 0.20) : 0;
    var bandB = bots.length ? Math.round(W * 0.20) : 0;
    var bandL = mids.length ? Math.round(W * 0.20) : 0;
    var bandR = sides.length ? Math.round(W * 0.20) : 0;
    var labelBand = labelText ? 132 : 0;
    var CW = W + bandL + bandR, CH = W + bandT + bandB + labelBand;
    var px = newBuf(CW, CH, bgc);
    var ox = bandL + 4 * m, oy = bandT + 4 * m;
    /* v4 rendering: FULL-CELL picture. Inside the motif (coverage >=
       0.15) every module cell is filled edge-to-edge with the sampled
       motif colour pushed to the luminance side the module needs, plus
       a small centre anchor dot at extra contrast — the code itself
       forms the picture, instead of the v3 sparse-dot halftone whose
       picture washed out at real payload densities. Outside the motif,
       dark modules stay plain ink and light modules stay background.
       opts.motifMode is accepted for compatibility and ignored. */

    // paint the motif once, 3x3 supersampled at module resolution
    var SS = 3, S = n * SS;
    var mp = newBufT(S, S);
    motif.paint(mp, S / 2, S / 2, S * 0.52, P);
    // per-cell coverage + mean colour
    var cov = new Float32Array(n * n), colR = new Float32Array(n * n),
        colG = new Float32Array(n * n), colB = new Float32Array(n * n);
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var aSum = 0, rS = 0, gS = 0, bS = 0, cnt = 0;
        for (var sy = 0; sy < SS; sy++) {
          for (var sx = 0; sx < SS; sx++) {
            var idx = ((r * SS + sy) * S + (c * SS + sx)) * 4;
            var a = mp.buf[idx + 3] / 255;
            aSum += a;
            if (a > 0) { rS += mp.buf[idx] * a; gS += mp.buf[idx + 1] * a; bS += mp.buf[idx + 2] * a; cnt += a; }
          }
        }
        var k = r * n + c;
        cov[k] = aSum / (SS * SS);
        if (cnt > 0) { colR[k] = rS / cnt; colG[k] = gS / cnt; colB[k] = bS / cnt; }
      }
    }

    var cellRad = Math.max(1.5, m * 0.18);
    for (var rr = 0; rr < n; rr++) {
      for (var cc = 0; cc < n; cc++) {
        if (isFinderZone(rr, cc, n)) continue;
        var kk = rr * n + cc, dark = !!data[kk];
        var cv = cov[kk], col = [colR[kk], colG[kk], colB[kk]];
        var x0 = ox + cc * m, y0 = oy + rr * m;
        if (cv >= 0.15) {
          var base = dark ? pushDark(col) : pushLight(col);
          roundRect(px, x0 + 0.5, y0 + 0.5, m - 1, m - 1, cellRad, base);
          var anch = dark ? pushDark(col, 0.12) : pushLight(col, 0.95);
          fillCircle(px, x0 + m / 2, y0 + m / 2, m * 0.20, anch);
        } else if (dark) {
          roundRect(px, x0 + 0.5, y0 + 0.5, m - 1, m - 1, cellRad, ink);
        }
      }
    }
    // finders: always standard, full-size, ink on bg
    drawFinder(px, 0, 0, m, ox, oy, 'round', ink, bgc, null);
    drawFinder(px, 0, n - 7, m, ox, oy, 'round', ink, bgc, null);
    drawFinder(px, n - 7, 0, m, ox, oy, 'round', ink, bgc, null);

    tops.forEach(function (L) { drawLogoCentered(px, L, CW / 2, bandT / 2, W * 0.5, bandT - 16); });
    bots.forEach(function (L) { drawLogoCentered(px, L, CW / 2, bandT + W + bandB / 2, W * 0.5, bandB - 16); });
    mids.forEach(function (L) { drawLogoCentered(px, L, bandL / 2, bandT + W / 2, bandL - 16, W * 0.4); });
    sides.forEach(function (L) { drawLogoCentered(px, L, bandL + W + bandR / 2, bandT + W / 2, bandR - 16, W * 0.4); });
    byPos(logos, 'center').forEach(function (L) { drawCenterLogo(px, L, ox, oy, n * m); });
    var label = labelText ? {
      text: labelText, x: CW / 2, y: bandT + W + bandB + 72,
      maxW: CW - 80, fontPx: 54, color: '#' + ink.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('')
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
    var ec = (hasCenter || d.mode === 'motif') ? 'H' : (opts.ecLevel || 'M');
    var qr = QR.create(text.trim(), { errorCorrectionLevel: ec });
    var labelText = (opts.labelText || '').trim().slice(0, 60) || null;
    var r = d.mode === 'motif'
      ? renderMotif(text, d, qr, logos, labelText, opts)
      : renderPlain(text, d, qr, logos, labelText, opts.maxSize);
    r.ecLevel = ec;
    return r;
  }

  root.QRDesigns = { DESIGNS: DESIGNS, MOTIFS: MOTIFS, render: render, getDesign: getDesign, getMotif: getMotif, version: 4 };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

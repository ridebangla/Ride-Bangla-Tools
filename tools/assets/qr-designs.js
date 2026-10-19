/* ==========================================================================
   Ride Bangla Tools — QR Design Studio (DOM-free pixel renderer)
   Generates 8 QR designs. No DOM required: render() returns raw pixels,
   so the same code runs in the browser AND in Node for automated tests.
   Requires global QRCode.create (embedded qrcode lib on the tool page).
   Decorative art stays OUTSIDE the QR quiet zone — every design decodes.
   ========================================================================== */
(function (root) {
  'use strict';

  var DESIGNS = [
    { id: 'classic', name: 'Classic', desc: 'Clean black-on-white squares', style: 'square', fg: '#141414', bg: '#FFFFFF', framed: false },
    { id: 'rounded', name: 'Rounded', desc: 'Soft circles, deep-green ink', style: 'round', fg: '#0B3D2E', bg: '#FFFFFF', framed: false },
    { id: 'sunset', name: 'Sunset Fade', desc: 'Warm gradient squares', style: 'gradient', fg: '#C2410C', fg2: '#7C2D12', bg: '#FFFBEB', framed: false },
    { id: 'bird', name: 'Bird', desc: 'Flying bird over a sky frame', style: 'round', fg: '#0E7490', bg: '#EAF6FF', framed: true, art: 'bird' },
    { id: 'kite', name: 'Kite', desc: 'Colorful kite with a bow tail', style: 'round', fg: '#B45309', bg: '#FFF8E7', framed: true, art: 'kite' },
    { id: 'horse', name: 'Horse', desc: 'Golden horseshoe frame', style: 'square', fg: '#4A2F18', bg: '#F7F1E8', framed: true, art: 'horse' },
    { id: 'tiger', name: 'Tiger', desc: 'Tiger-face frame, bold stripes', style: 'square', fg: '#141414', bg: '#FFF4E5', framed: true, art: 'tiger' },
    { id: 'ocean', name: 'Ocean', desc: 'Rolling waves frame', style: 'round', fg: '#075985', bg: '#E8F7FF', framed: true, art: 'ocean' }
  ];

  function hexRGB(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function newBuf(w, h, rgb) {
    var buf = new Uint8ClampedArray(w * h * 4);
    for (var i = 0; i < w * h; i++) {
      buf[i * 4] = rgb[0]; buf[i * 4 + 1] = rgb[1]; buf[i * 4 + 2] = rgb[2]; buf[i * 4 + 3] = 255;
    }
    return { w: w, h: h, buf: buf };
  }

  function setPx(px, x, y, rgb) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= px.w || y >= px.h) return;
    var i = (y * px.w + x) * 4;
    px.buf[i] = rgb[0]; px.buf[i + 1] = rgb[1]; px.buf[i + 2] = rgb[2]; px.buf[i + 3] = 255;
  }

  function fillRect(px, x, y, w, h, rgb) {
    var x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    var x1 = Math.min(px.w, Math.ceil(x + w)), y1 = Math.min(px.h, Math.ceil(y + h));
    for (var yy = y0; yy < y1; yy++)
      for (var xx = x0; xx < x1; xx++) setPx(px, xx, yy, rgb);
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

  function fillEllipse(px, cx, cy, rx, ry, rgb) {
    var x0 = Math.max(0, Math.floor(cx - rx)), y0 = Math.max(0, Math.floor(cy - ry));
    var x1 = Math.min(px.w - 1, Math.ceil(cx + rx)), y1 = Math.min(px.h - 1, Math.ceil(cy + ry));
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) setPx(px, x, y, rgb);
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
  }

  function thickLine(px, x0, y0, x1, y1, width, rgb) {
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.ceil(len));
    var r = width / 2;
    for (var i = 0; i <= steps; i++) {
      fillCircle(px, x0 + dx * i / steps, y0 + dy * i / steps, r, rgb);
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

  function isFinderZone(r, c, n) {
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

  function lerpRGB(a, b, t) {
    return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
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

  /* ---------------- decorative frame art (kept clear of the QR) -------- */
  function artBird(px, x0, y0, x1, y1) {
    var ink = hexRGB('#0B3D2E'), soft = hexRGB('#5BA8A0');
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    // distant small birds
    [[x0 + 90, y0 + 60, 26], [x1 - 110, y0 + 110, 20]].forEach(function (b) {
      thickLine(px, b[0] - b[2], b[1], b[0], b[1] - b[2] * 0.45, 7, soft);
      thickLine(px, b[0], b[1] - b[2] * 0.45, b[0] + b[2], b[1], 7, soft);
    });
    // main bird: swept wings + body
    fillPolygon(px, [[cx - 14, cy], [cx - 200, cy - 96], [cx - 88, cy + 16]], ink);
    fillPolygon(px, [[cx + 14, cy], [cx + 200, cy - 96], [cx + 88, cy + 16]], ink);
    fillEllipse(px, cx, cy, 66, 24, ink);
    fillCircle(px, cx + 62, cy - 10, 17, ink);
    fillPolygon(px, [[cx + 76, cy - 14], [cx + 100, cy - 6], [cx + 76, cy + 2]], hexRGB('#F59E0B'));
    fillCircle(px, cx + 66, cy - 14, 3.4, hexRGB('#FFFFFF'));
  }

  function artKite(px, x0, y0, x1, y1) {
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - 10;
    var red = hexRGB('#DC2626'), yel = hexRGB('#FACC15'), grn = hexRGB('#16A34A'), dark = hexRGB('#7C2D12');
    // main kite
    fillPolygon(px, [[cx, cy - 120], [cx + 88, cy], [cx, cy + 120], [cx - 88, cy]], red);
    fillPolygon(px, [[cx, cy - 120], [cx + 88, cy], [cx, cy]], yel);
    fillPolygon(px, [[cx, cy - 120], [cx, cy], [cx - 88, cy]], grn);
    thickLine(px, cx, cy - 120, cx, cy + 120, 6, dark);
    thickLine(px, cx - 88, cy, cx + 88, cy, 6, dark);
    // tail with bows
    thickLine(px, cx, cy + 120, cx - 46, cy + 250, 7, dark);
    [[0.25, red], [0.55, yel], [0.85, grn]].forEach(function (t) {
      var bx = cx + (cx - 46 - cx) * t[0], by = cy + 120 + (250 - 120) * t[0];
      fillPolygon(px, [[bx - 26, by - 12], [bx + 26, by - 12], [bx, by + 16]], t[1]);
    });
    // small kite, top-right
    var kx = x1 - 120, ky = y0 + 80, ks = 0.42;
    fillPolygon(px, [[kx, ky - 120 * ks], [kx + 88 * ks, ky], [kx, ky + 120 * ks], [kx - 88 * ks, ky]], yel);
    thickLine(px, kx, ky + 120 * ks, kx - 20, ky + 190 * ks, 5, dark);
  }

  function artHorse(px, x0, y0, x1, y1) {
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var gold = hexRGB('#B8860B'), dark = hexRGB('#3F2A14');
    // horseshoe: arc open at the bottom (angles in radians; y grows downward)
    arcStroke(px, cx, cy - 10, 108, Math.PI * 0.78, Math.PI * 2.22, 36, gold);
    // nail heads along the shoe
    for (var i = 0; i < 6; i++) {
      var a = Math.PI * (0.82 + i * 0.27);
      fillCircle(px, cx + 108 * Math.cos(a), cy - 10 + 108 * Math.sin(a), 9, dark);
    }
    // sparkles
    [[x0 + 70, y0 + 50], [x1 - 80, y0 + 90], [x0 + 120, y1 - 60]].forEach(function (p) {
      fillCircle(px, p[0], p[1], 7, gold);
      thickLine(px, p[0] - 16, p[1], p[0] + 16, p[1], 4, gold);
      thickLine(px, p[0], p[1] - 16, p[0], p[1] + 16, 4, gold);
    });
  }

  function artTiger(px, x0, y0, x1, y1) {
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var orange = hexRGB('#F5820B'), dark = hexRGB('#141414'), cream = hexRGB('#FFF7EA');
    // ears
    fillPolygon(px, [[cx - 104, cy - 52], [cx - 128, cy - 128], [cx - 52, cy - 92]], orange);
    fillPolygon(px, [[cx + 104, cy - 52], [cx + 128, cy - 128], [cx + 52, cy - 92]], orange);
    fillPolygon(px, [[cx - 100, cy - 62], [cx - 114, cy - 108], [cx - 66, cy - 86]], dark);
    fillPolygon(px, [[cx + 100, cy - 62], [cx + 114, cy - 108], [cx + 66, cy - 86]], dark);
    // face
    fillCircle(px, cx, cy, 118, orange);
    // forehead stripes
    thickLine(px, cx - 44, cy - 108, cx - 30, cy - 66, 13, dark);
    thickLine(px, cx, cy - 114, cx, cy - 70, 13, dark);
    thickLine(px, cx + 44, cy - 108, cx + 30, cy - 66, 13, dark);
    // cheek stripes
    thickLine(px, cx - 118, cy - 20, cx - 78, cy - 8, 12, dark);
    thickLine(px, cx + 118, cy - 20, cx + 78, cy - 8, 12, dark);
    thickLine(px, cx - 112, cy + 34, cx - 76, cy + 40, 12, dark);
    thickLine(px, cx + 112, cy + 34, cx + 76, cy + 40, 12, dark);
    // eyes
    fillCircle(px, cx - 46, cy - 22, 20, cream);
    fillCircle(px, cx + 46, cy - 22, 20, cream);
    fillCircle(px, cx - 46, cy - 22, 9, dark);
    fillCircle(px, cx + 46, cy - 22, 9, dark);
    // muzzle + nose
    fillEllipse(px, cx, cy + 52, 56, 36, cream);
    fillPolygon(px, [[cx - 16, cy + 34], [cx + 16, cy + 34], [cx, cy + 52]], dark);
    thickLine(px, cx, cy + 52, cx, cy + 66, 7, dark);
  }

  function artOcean(px, x0, y0, x1, y1) {
    var deep = hexRGB('#0369A1'), mid = hexRGB('#0EA5E9'), lite = hexRGB('#7DD3FC');
    var cy = (y0 + y1) / 2;
    [[cy - 60, 120, mid], [cy + 10, 150, deep], [cy + 80, 110, lite]].forEach(function (w, idx) {
      var y = w[0], r = w[1], col = w[2];
      for (var x = x0 - r; x < x1 + r; x += r * 1.15) {
        arcStroke(px, x, y, r, Math.PI * 1.08, Math.PI * 1.92, 26, col);
      }
    });
    // sun
    fillCircle(px, x1 - 110, y0 + 60, 40, hexRGB('#FBBF24'));
  }

  var ART = { bird: artBird, kite: artKite, horse: artHorse, tiger: artTiger, ocean: artOcean };

  function getDesign(id) {
    for (var i = 0; i < DESIGNS.length; i++) if (DESIGNS[i].id === id) return DESIGNS[i];
    return DESIGNS[0];
  }

  function render(text, designId, opts) {
    opts = opts || {};
    if (typeof text !== 'string' || !text.trim()) throw new Error('Enter some text or a link first.');
    if (text.length > 800) throw new Error('Text is too long (max 800 characters).');
    var QR = root.QRCode;
    if (!QR || !QR.create) throw new Error('QR engine not loaded.');
    var d = getDesign(designId);
    var qr = QR.create(text.trim(), { errorCorrectionLevel: 'M' });
    var n = qr.modules.size;
    var fg = hexRGB(opts.fg || d.fg), bg = hexRGB(opts.bg || d.bg), fg2 = d.fg2 ? hexRGB(d.fg2) : null;

    if (!d.framed) {
      var m = Math.max(4, Math.min(14, Math.floor((opts.maxSize || 900) / (n + 8))));
      var W = (n + 8) * m;
      var px = newBuf(W, W, bg);
      drawQR(px, qr, m, 4 * m, 4 * m, d.style, fg, bg, fg2);
      return { w: W, h: W, data: px.buf, design: d.id, modules: n };
    }

    // framed (portrait poster)
    var W2 = 1080, H2 = 1440;
    var px2 = newBuf(W2, H2, bg);
    var m2 = Math.max(4, Math.min(15, Math.floor(860 / (n + 8))));
    var qrPx = n * m2, qz = 4 * m2, pad = 30;
    var cardW = qrPx + qz * 2 + pad * 2;
    var cardX = Math.round((W2 - cardW) / 2), cardY = 96;
    var cardH = cardW + 8;
    roundRect(px2, cardX, cardY, cardW, cardH, 40, hexRGB('#FFFFFF'));
    var ox = cardX + pad + qz, oy = cardY + pad + qz;
    drawQR(px2, qr, m2, ox, oy, d.style, fg, hexRGB('#FFFFFF'), fg2);
    // art strip (below the card, clear of the QR)
    var ay0 = cardY + cardH + 60, ay1 = H2 - 70;
    ART[d.art](px2, 90, ay0, W2 - 90, ay1);
    return { w: W2, h: H2, data: px2.buf, design: d.id, modules: n };
  }

  root.QRDesigns = { DESIGNS: DESIGNS, render: render, getDesign: getDesign };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

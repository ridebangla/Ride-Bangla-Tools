/* ==========================================================================
   Ride Bangla Tools — QR Design Studio v3 (DOM-free pixel renderer)
   Generates 8 classic designs + motif designs. No DOM required: render()
   returns raw pixels, so the same code runs in the browser AND in Node
   for automated tests.
   Requires global QRCode.create (embedded qrcode lib on the tool page).

   v2: framed designs render on a TRANSPARENT poster (alpha) — decorative
   art floats with no background, so downloads blend onto light AND dark
   surfaces. Non-framed designs keep their solid backgrounds.
   Logo engine: up to N logos at explicit positions (top/bottom/side/
   middle/center). CENTER-OF-QR uses error-correction level H, a white
   safe backdrop, and a capped logo size so the code still scans.
   Decorative art stays OUTSIDE the QR quiet zone — every design decodes.

   v3: MOTIF designs — the whole QR is sampled from a motif painting
   (tiger face, lion face, bird, robot, …): the motif is painted once at
   module resolution with 3x3 supersampling, then each module is drawn
   from the sampled colour/coverage with luminance pushed to safe dark /
   light levels. Motif designs ALWAYS use error-correction level H and
   standard full-size finders. Every shipped motif passed an automated
   jsQR decode gate (see decode-results.md).
   ========================================================================== */
(function (root) {
  'use strict';

  var DESIGNS = [
    { id: 'classic', name: 'Classic', desc: 'Clean black-on-white squares', style: 'square', fg: '#141414', bg: '#FFFFFF', framed: false },
    { id: 'rounded', name: 'Rounded', desc: 'Soft circles, deep-green ink', style: 'round', fg: '#0B3D2E', bg: '#FFFFFF', framed: false },
    { id: 'sunset', name: 'Sunset Fade', desc: 'Warm gradient squares', style: 'gradient', fg: '#C2410C', fg2: '#7C2D12', bg: '#FFFBEB', framed: false },
    { id: 'bird', name: 'Bird', desc: 'Flying bird over a sky frame', style: 'round', fg: '#0E7490', bg: '#EAF6FF', framed: true, art: 'bird', accent: '#0E7490' },
    { id: 'kite', name: 'Kite', desc: 'Colorful kite with a bow tail', style: 'round', fg: '#B45309', bg: '#FFF8E7', framed: true, art: 'kite', accent: '#DC2626' },
    { id: 'horse', name: 'Horse', desc: 'Golden horseshoe frame', style: 'square', fg: '#4A2F18', bg: '#F7F1E8', framed: true, art: 'horse', accent: '#B8860B' },
    { id: 'tiger', name: 'Tiger', desc: 'Tiger-face frame, bold stripes', style: 'square', fg: '#141414', bg: '#FFF4E5', framed: true, art: 'tiger', accent: '#F5820B' },
    { id: 'ocean', name: 'Ocean', desc: 'Rolling waves frame', style: 'round', fg: '#075985', bg: '#E8F7FF', framed: true, art: 'ocean', accent: '#0284C7' },
    { id: 'motif-tiger', name: 'Tiger QR', desc: 'The whole code in a tiger design', mode: 'motif', motif: 'tiger', style: 'round', fg: '#5F2700', bg: '#FFF6E9', framed: false },
    { id: 'motif-lion', name: 'Lion QR', desc: 'The whole code in a lion design', mode: 'motif', motif: 'lion', style: 'round', fg: '#5A3000', bg: '#FFF8EC', framed: false },
    { id: 'motif-cat', name: 'Cat QR', desc: 'The whole code in a cat design', mode: 'motif', motif: 'cat', style: 'round', fg: '#263238', bg: '#FFFFFF', framed: false },
    { id: 'motif-panda', name: 'Panda QR', desc: 'The whole code in a panda design', mode: 'motif', motif: 'panda', style: 'round', fg: '#1A1A1A', bg: '#FFFFFF', framed: false },
    { id: 'motif-owl', name: 'Owl QR', desc: 'The whole code in an owl design', mode: 'motif', motif: 'owl', style: 'round', fg: '#33200D', bg: '#FBF3E2', framed: false },
    { id: 'motif-fox', name: 'Fox QR', desc: 'The whole code in a fox design', mode: 'motif', motif: 'fox', style: 'round', fg: '#6E2A00', bg: '#FFF5EA', framed: false },
    { id: 'motif-horse', name: 'Horse QR', desc: 'The whole code in a horse design', mode: 'motif', motif: 'horse', style: 'round', fg: '#3A2410', bg: '#FAF3E7', framed: false },
    { id: 'motif-bird', name: 'Bird QR', desc: 'The whole code in a bird design', mode: 'motif', motif: 'bird', style: 'round', fg: '#0B3D5C', bg: '#F2FAFF', framed: false },
    { id: 'motif-koi', name: 'Koi QR', desc: 'The whole code in a koi design', mode: 'motif', motif: 'koi', style: 'round', fg: '#7A1F0B', bg: '#FFF7EE', framed: false },
    { id: 'motif-butterfly', name: 'Butterfly QR', desc: 'The whole code in a butterfly design', mode: 'motif', motif: 'butterfly', style: 'round', fg: '#3B1155', bg: '#FBF2FF', framed: false },
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
  function getA(px, x, y) {
    if (x < 0 || y < 0 || x >= px.w || y >= px.h) return 0;
    return px.buf[(y * px.w + x) * 4 + 3];
  }

  /* ---------------- shapes ---------------- */
  function fillRect(px, x, y, w, h, rgb) {
    var x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    var x1 = Math.min(px.w, Math.ceil(x + w)), y1 = Math.min(px.h, Math.ceil(y + h));
    for (var yy = y0; yy < y1; yy++)
      for (var xx = x0; xx < x1; xx++) setPx(px, xx, yy, rgb);
  }
  function fillRectV(px, x, y, w, h, cTop, cBot) { // vertical gradient, opaque
    var x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    var x1 = Math.min(px.w, Math.ceil(x + w)), y1 = Math.min(px.h, Math.ceil(y + h));
    for (var yy = y0; yy < y1; yy++) {
      var t = h <= 1 ? 0 : (yy - y0) / (y1 - y0 - 1);
      var c = lerpRGB(cTop, cBot, t);
      for (var xx = x0; xx < x1; xx++) setPx(px, xx, yy, c);
    }
  }
  function fillRectA(px, x, y, w, h, rgb, a) { // alpha rect
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
  }
  function roundRectA(px, x, y, w, h, r, rgb, a) {
    r = Math.min(r, w / 2, h / 2);
    fillRectA(px, x + r, y, w - 2 * r, h, rgb, a);
    fillRectA(px, x, y + r, w, h - 2 * r, rgb, a);
    [[x + r, y + r], [x + w - r, y + r], [x + r, y + h - r], [x + w - r, y + h - r]]
      .forEach(function (c) { fillCircleA(px, c[0], c[1], r, rgb, a); });
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
  /* Box-blur the alpha channel only (soft shadows). r = radius. */
  function blurAlpha(px, r) {
    var w = px.w, h = px.h, src = new Uint8ClampedArray(w * h);
    for (var i = 0; i < w * h; i++) src[i] = px.buf[i * 4 + 3];
    var tmp = new Uint8ClampedArray(w * h);
    var n = 2 * r + 1;
    for (var y = 0; y < h; y++) {
      var acc = 0;
      for (var x = -r; x <= r; x++) acc += src[y * w + clamp(x, 0, w - 1)];
      for (var x2 = 0; x2 < w; x2++) {
        tmp[y * w + x2] = Math.round(acc / n);
        acc += src[y * w + clamp(x2 + r + 1, 0, w - 1)] - src[y * w + clamp(x2 - r, 0, w - 1)];
      }
    }
    for (var x3 = 0; x3 < w; x3++) {
      var acc2 = 0;
      for (var y2 = -r; y2 <= r; y2++) acc2 += tmp[clamp(y2, 0, h - 1) * w + x3];
      for (var y3 = 0; y3 < h; y3++) {
        px.buf[(y3 * w + x3) * 4 + 3] = Math.round(acc2 / n);
        acc2 += tmp[clamp(y3 + r + 1, 0, h - 1) * w + x3] - tmp[clamp(y3 - r, 0, h - 1) * w + x3];
      }
    }
  }
  /* Draw an RGBA logo image (nearest-neighbor scale) with source-over. */
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
  }
  function logoAspect(img) { return img.w / img.h; }

  /* ---------------- QR primitives ---------------- */
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

  /* ---------------- decorative frame art (kept clear of the QR) ---------
     All art draws on TRANSPARENCY — no background fills. Each function
     receives the art strip bounds (x0,y0,x1,y1) below the QR card. */

  /* soft sparkle dots for the top margin of framed posters */
  function topSparkles(px, W, topY, accent) {
    var dots = [[70, 44, 7], [150, 88, 5], [W - 80, 52, 8], [W - 170, 96, 5], [W / 2 - 260, 60, 5], [W / 2 + 280, 46, 6]];
    dots.forEach(function (d) {
      fillCircleA(px, d[0], d[1], d[2], accent, 0.35);
      fillCircleA(px, d[0], d[1], d[2] * 0.45, accent, 0.5);
    });
  }

  function artBird(px, x0, y0, x1, y1) {
    var ink = hexRGB('#0B3D2E'), deep = hexRGB('#08382B'), soft = hexRGB('#5BA8A0'),
        sky = hexRGB('#BFE6F2'), gold = hexRGB('#F59E0B'), white = hexRGB('#FFFFFF');
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    // soft sky blobs (translucent, on transparency)
    fillCircleA(px, x0 + 130, y0 + 70, 90, sky, 0.35);
    fillCircleA(px, x1 - 140, y1 - 60, 110, sky, 0.30);
    fillCircleA(px, cx + 200, y0 + 40, 60, white, 0.5);
    // distant small birds
    [[x0 + 90, y0 + 60, 26], [x1 - 110, y0 + 110, 20], [x0 + 200, y1 - 50, 16]].forEach(function (b) {
      thickLine(px, b[0] - b[2], b[1], b[0], b[1] - b[2] * 0.45, 7, soft);
      thickLine(px, b[0], b[1] - b[2] * 0.45, b[0] + b[2], b[1], 7, soft);
    });
    // layered wing feathers (gradient dark -> ink)
    for (var f = 0; f < 3; f++) {
      var t = f / 2, col = lerpRGB(deep, ink, t), off = f * 26;
      fillPolygon(px, [[cx - 14 - off * 0.4, cy - 6 * f], [cx - 205 + off, cy - 100 + off * 0.5], [cx - 92 + off * 0.4, cy + 18]], col);
      fillPolygon(px, [[cx + 14 + off * 0.4, cy - 6 * f], [cx + 205 - off, cy - 100 + off * 0.5], [cx + 92 - off * 0.4, cy + 18]], col);
    }
    // body with vertical sheen
    fillEllipseV(px, cx, cy, 68, 26, lerpRGB(ink, white, 0.25), ink);
    // head + beak + eye
    fillCircle(px, cx + 62, cy - 12, 18, ink);
    fillPolygon(px, [[cx + 76, cy - 16], [cx + 102, cy - 8], [cx + 76, cy]], gold);
    fillCircle(px, cx + 66, cy - 16, 4.2, white);
    fillCircle(px, cx + 67, cy - 16, 2.2, deep);
    // tail flourish
    fillPolygon(px, [[cx - 62, cy + 8], [cx - 120, cy + 44], [cx - 84, cy + 46], [cx - 60, cy + 22]], deep);
  }

  function artKite(px, x0, y0, x1, y1) {
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - 10;
    var red = hexRGB('#DC2626'), redD = hexRGB('#991B1B'), yel = hexRGB('#FACC15'),
        grn = hexRGB('#16A34A'), dark = hexRGB('#7C2D12'), sky = hexRGB('#BFE6F2');
    // soft clouds
    fillCircleA(px, x0 + 110, y0 + 60, 55, sky, 0.4);
    fillCircleA(px, x0 + 160, y0 + 75, 40, sky, 0.4);
    fillCircleA(px, x1 - 120, y1 - 70, 65, sky, 0.35);
    // main kite: 4 gradient panels
    var K = 120;
    fillPolygon(px, [[cx, cy - K], [cx + 88, cy], [cx, cy]], lerpRGB(yel, hexRGB('#FFFFFF'), 0.15));
    fillPolygon(px, [[cx, cy - K], [cx, cy], [cx - 88, cy]], grn);
    fillPolygon(px, [[cx, cy], [cx + 88, cy], [cx, cy + K]], red);
    fillPolygon(px, [[cx, cy], [cx, cy + K], [cx - 88, cy]], redD);
    // spars
    thickLine(px, cx, cy - K, cx, cy + K, 6, dark);
    thickLine(px, cx - 88, cy, cx + 88, cy, 6, dark);
    // curving tail with bows
    var tail = [[0, 0], [-14, 60], [-34, 120], [-46, 190], [-40, 250]];
    for (var i = 0; i + 1 < tail.length; i++)
      thickLine(px, cx + tail[i][0], cy + K + tail[i][1], cx + tail[i + 1][0], cy + K + tail[i + 1][1], 7, dark);
    [[0.3, red], [0.55, yel], [0.8, grn]].forEach(function (t) {
      var bx = cx - 34 * t[0], by = cy + K + 200 * t[0];
      fillPolygon(px, [[bx - 26, by - 12], [bx + 26, by - 12], [bx, by + 16]], t[1]);
      fillCircle(px, bx, by - 2, 5, dark);
    });
    // small kite, top-right
    var kx = x1 - 120, ky = y0 + 80, ks = 0.42;
    fillPolygon(px, [[kx, ky - 120 * ks], [kx + 88 * ks, ky], [kx, ky + 120 * ks], [kx - 88 * ks, ky]], yel);
    fillPolygon(px, [[kx, ky - 120 * ks], [kx, ky], [kx - 88 * ks, ky]], grn);
    thickLine(px, kx, ky + 120 * ks, kx - 20, ky + 190 * ks, 5, dark);
  }

  function artHorse(px, x0, y0, x1, y1) {
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var gold = hexRGB('#D4A017'), goldD = hexRGB('#8A5A00'), dark = hexRGB('#3F2A14'),
        cream = hexRGB('#FFF7E0');
    // warm glow behind shoe
    fillCircleA(px, cx, cy - 10, 190, gold, 0.18);
    fillCircleA(px, cx, cy - 10, 140, gold, 0.15);
    // horseshoe: gradient gold arc open at the bottom
    var R = 108, W2 = 40;
    for (var s = 0; s <= 40; s++) { // draw arc as gradient segments
      var a = Math.PI * (0.78 + (2.22 - 0.78) * s / 40);
      var t = s / 40, col = lerpRGB(gold, goldD, Math.abs(t - 0.5) * 2 * 0.6);
      fillCircle(px, cx + R * Math.cos(a), cy - 10 + R * Math.sin(a), W2 / 2, col);
    }
    // inner bevel highlight
    for (var s2 = 0; s2 <= 30; s2++) {
      var a2 = Math.PI * (0.86 + (2.14 - 0.86) * s2 / 30);
      fillCircleA(px, cx + (R - 12) * Math.cos(a2), cy - 10 + (R - 12) * Math.sin(a2), 5, cream, 0.55);
    }
    // nail heads along the shoe
    for (var i = 0; i < 6; i++) {
      var a3 = Math.PI * (0.82 + i * 0.27);
      var nx = cx + R * Math.cos(a3), ny = cy - 10 + R * Math.sin(a3);
      fillCircle(px, nx, ny, 10, dark);
      fillCircleA(px, nx - 3, ny - 3, 3.5, cream, 0.7);
    }
    // sparkles + tiny stars
    [[x0 + 70, y0 + 50], [x1 - 80, y0 + 90], [x0 + 120, y1 - 60], [x1 - 150, y1 - 40]].forEach(function (p) {
      fillCircleA(px, p[0], p[1], 8, gold, 0.9);
      thickLineA(px, p[0] - 18, p[1], p[0] + 18, p[1], 4, gold, 0.9);
      thickLineA(px, p[0], p[1] - 18, p[0], p[1] + 18, 4, gold, 0.9);
    });
  }

  /* artTiger — REDRAWN in v3 (owner: the old strip tiger was "really bad").
     Symmetric round face built in layers: halo → layered ears (outer, rim,
     inner-ear blush) → deep rim circle → gradient face → tapered forehead
     and cheek stripes (polygons that narrow to a point, not blunt bars) →
     cream muzzle with whisker dots → layered amber eyes with double
     highlights → nose with sheen → mouth → long whiskers. Same bounds and
     signature as before; nothing outside the strip is touched. */
  function artTiger(px, x0, y0, x1, y1) {
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var orange = hexRGB('#F5820B'), orangeD = hexRGB('#C25E04'), orangeL = hexRGB('#FFB25E'),
        dark = hexRGB('#1C1005'), cream = hexRGB('#FFF7EA'), white = hexRGB('#FFFFFF'),
        blush = hexRGB('#F6C39A'), noseC = hexRGB('#8A3320'), amber = hexRGB('#D97706');
    function stripe(sx, sy, ex, ey, w0, w1, col) { // tapered stripe: wide base -> point
      var dx = ex - sx, dy = ey - sy, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;
      fillPolygon(px, [
        [sx + nx * w0 / 2, sy + ny * w0 / 2],
        [sx - nx * w0 / 2, sy - ny * w0 / 2],
        [ex - nx * w1 / 2, ey - ny * w1 / 2],
        [ex + nx * w1 / 2, ey + ny * w1 / 2]
      ], col);
      fillCircle(px, sx, sy, w0 / 2, col);
    }
    // soft halo
    fillCircleA(px, cx, cy, 205, orange, 0.16);
    fillCircleA(px, cx, cy, 160, orange, 0.12);
    // ears: outer disc, deep rim, inner-ear blush (layered, both sides)
    [-1, 1].forEach(function (s) {
      fillCircle(px, cx + s * 88, cy - 88, 42, orangeD);
      fillCircle(px, cx + s * 88, cy - 88, 34, orange);
      fillCircle(px, cx + s * 86, cy - 86, 20, blush);
      fillCircle(px, cx + s * 85, cy - 85, 11, cream);
    });
    // face: deep rim + main disc + warm vertical sheen
    fillCircle(px, cx, cy, 120, orangeD);
    fillCircle(px, cx, cy - 6, 112, orange);
    fillEllipseV(px, cx, cy - 22, 94, 86, lerpRGB(orange, white, 0.30), orange);
    // cheek fluff tufts (cream-tipped triangles at the jaw line)
    [-1, 1].forEach(function (s) {
      fillPolygon(px, [[cx + s * 108, cy + 34], [cx + s * 132, cy + 58], [cx + s * 100, cy + 62]], orangeL);
      fillPolygon(px, [[cx + s * 100, cy + 62], [cx + s * 124, cy + 84], [cx + s * 88, cy + 80]], orangeL);
    });
    // forehead stripes: three tapered marks, centre longest
    stripe(cx, cy - 116, cx, cy - 74, 15, 3, dark);
    stripe(cx - 40, cy - 106, cx - 28, cy - 70, 13, 3, dark);
    stripe(cx + 40, cy - 106, cx + 28, cy - 70, 13, 3, dark);
    stripe(cx - 74, cy - 90, cx - 58, cy - 60, 11, 2, dark);
    stripe(cx + 74, cy - 90, cx + 58, cy - 60, 11, 2, dark);
    // cheek stripes: three tapered marks per side, fanning down
    [-1, 1].forEach(function (s) {
      stripe(cx + s * 116, cy - 34, cx + s * 80, cy - 22, 13, 3, dark);
      stripe(cx + s * 118, cy + 4, cx + s * 82, cy + 8, 13, 3, dark);
      stripe(cx + s * 110, cy + 42, cx + s * 78, cy + 40, 12, 3, dark);
    });
    // chin stripe
    stripe(cx, cy + 118, cx, cy + 96, 11, 3, dark);
    // muzzle: two cream lobes + chin, drawn before nose/mouth
    fillEllipse(px, cx - 27, cy + 52, 34, 26, cream);
    fillEllipse(px, cx + 27, cy + 52, 34, 26, cream);
    fillEllipse(px, cx, cy + 76, 30, 16, cream);
    // whisker dots on the muzzle
    [-1, 1].forEach(function (s) {
      [[38, 44], [50, 54], [36, 62]].forEach(function (p) {
        fillCircle(px, cx + s * p[0], cy + p[1], 2.6, orangeD);
      });
    });
    // whiskers: three long fine lines per side, slight fan
    [-1, 1].forEach(function (s) {
      thickLineA(px, cx + s * 44, cy + 44, cx + s * 128, cy + 30, 3, white, 0.9);
      thickLineA(px, cx + s * 46, cy + 56, cx + s * 132, cy + 56, 3, white, 0.9);
      thickLineA(px, cx + s * 44, cy + 68, cx + s * 126, cy + 84, 3, white, 0.85);
    });
    // eyes: cream almond -> amber iris -> dark pupil -> double highlight
    [-1, 1].forEach(function (s) {
      var ex = cx + s * 46, ey = cy - 24;
      fillEllipse(px, ex, ey, 23, 19, cream);
      fillCircle(px, ex, ey, 13.5, amber);
      fillCircle(px, ex, ey, 8, dark);
      fillCircle(px, ex - 3.5, ey - 4, 3.6, white);
      fillCircle(px, ex + 4, ey + 4.5, 1.8, white);
      // upper lid line for definition
      arcStroke(px, ex, ey - 2, 21, Math.PI * 1.12, Math.PI * 1.88, 4.5, dark);
    });
    // nose: rounded triangle with sheen, philtrum + mouth curves
    fillPolygon(px, [[cx - 18, cy + 34], [cx + 18, cy + 34], [cx + 8, cy + 52], [cx - 8, cy + 52]], noseC);
    fillCircle(px, cx - 18, cy + 36, 5, noseC);
    fillCircle(px, cx + 18, cy + 36, 5, noseC);
    fillCircleA(px, cx - 6, cy + 40, 5, white, 0.5);
    thickLine(px, cx, cy + 53, cx, cy + 66, 6, dark);
    arcStroke(px, cx - 10, cy + 62, 11, Math.PI * 0.15, Math.PI * 0.85, 5.5, dark);
    arcStroke(px, cx + 10, cy + 62, 11, Math.PI * 0.15, Math.PI * 0.85, 5.5, dark);
  }

  function artOcean(px, x0, y0, x1, y1) {
    var deep = hexRGB('#0369A1'), mid = hexRGB('#0EA5E9'), lite = hexRGB('#7DD3FC'),
        foam = hexRGB('#FFFFFF'), sun = hexRGB('#FBBF24'), sunD = hexRGB('#F59E0B');
    var cy = (y0 + y1) / 2;
    // sun with soft glow (upper right)
    var sx = x1 - 120, sy = y0 + 70;
    fillCircleA(px, sx, sy, 78, sun, 0.25);
    fillCircleA(px, sx, sy, 58, sun, 0.35);
    fillCircle(px, sx, sy, 40, sun);
    fillCircle(px, sx - 10, sy - 10, 26, lerpRGB(sun, foam, 0.35));
    // three rolling wave bands with foam crests
    [[cy - 60, 120, mid], [cy + 10, 150, deep], [cy + 80, 110, lite]].forEach(function (w) {
      var y = w[0], r = w[1], col = w[2];
      for (var x = x0 - r; x < x1 + r; x += r * 1.15) {
        arcStroke(px, x, y, r, Math.PI * 1.08, Math.PI * 1.92, 26, col);
      }
      // foam highlights on crests
      for (var x2 = x0 - r; x2 < x1 + r; x2 += r * 1.15) {
        var fx = x2 + r * 0.575, fy = y - r;
        for (var k = -2; k <= 2; k++)
          fillCircleA(px, fx + k * 12, fy + Math.abs(k) * 3, 6, foam, 0.75);
      }
    });
    // little sailboat
    var bx = x0 + 150, by = cy + 10;
    fillPolygon(px, [[bx - 44, by + 42], [bx + 44, by + 42], [bx + 28, by + 66], [bx - 28, by + 66]], hexRGB('#7C2D12'));
    thickLine(px, bx, by + 42, bx, by - 44, 7, hexRGB('#7C2D12'));
    fillPolygon(px, [[bx + 5, by - 44], [bx + 5, by + 34], [bx + 52, by + 34]], foam);
    fillPolygon(px, [[bx - 5, by - 44], [bx - 5, by + 34], [bx - 40, by + 34]], lerpRGB(foam, lite, 0.4));
  }

  var ART = { bird: artBird, kite: artKite, horse: artHorse, tiger: artTiger, ocean: artOcean };

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

  function renderFramed(text, d, qr, logos, labelText) {
    var W2 = 1080, H2 = 1440;
    var n = qr.modules.size;
    var m2 = Math.max(4, Math.min(15, Math.floor(860 / (n + 8))));
    var qrPx = n * m2, qz = 4 * m2, pad = 30;
    var cardW = qrPx + qz * 2 + pad * 2, cardH = cardW + 8;
    var fg = hexRGB(d.fg), bg = hexRGB('#FFFFFF'), fg2 = d.fg2 ? hexRGB(d.fg2) : null;
    var accent = hexRGB(d.accent || d.fg);

    var tops = byPos(logos, 'top'), bots = byPos(logos, 'bottom');
    var topH = tops.length ? 116 + 28 : 0, botH = bots.length ? 116 + 28 : 0;
    var labelH = labelText ? 124 : 0;
    var cardY = 44 + topH;
    var cardX = Math.round((W2 - cardW) / 2);
    var ox = cardX + pad + qz, oy = cardY + pad + qz;
    var artY0 = cardY + cardH + botH + labelH + 44, artY1 = H2 - 60;

    var px = newBufT(W2, H2);
    topSparkles(px, W2, cardY, accent);
    // soft drop shadow -> white card
    roundRectA(px, cardX - 4, cardY + 16, cardW + 8, cardH + 6, 48, hexRGB('#0F172A'), 0.30);
    blurAlpha(px, 18);
    roundRect(px, cardX, cardY, cardW, cardH, 44, bg);
    drawQR(px, qr, m2, ox, oy, d.style, fg, bg, fg2);

    // logos: top stack / bottom stack / flanks / center
    var ty = 44;
    tops.forEach(function (L) { drawLogoCentered(px, L, W2 / 2, ty + 58, 300, 116); ty += 144; });
    var by = cardY + cardH + 28;
    bots.forEach(function (L) { drawLogoCentered(px, L, W2 / 2, by + 58, 300, 116); by += 144; });
    var flankL = cardX - 56, flankR = W2 - cardX - cardW - 56;
    var fz = clamp(Math.min(flankL, flankR), 60, 170);
    var cyF = cardY + cardH / 2;
    byPos(logos, 'middle').forEach(function (L) { drawLogoCentered(px, L, 28 + flankL / 2, cyF, fz, fz); });
    byPos(logos, 'side').forEach(function (L) { drawLogoCentered(px, L, W2 - 28 - flankR / 2, cyF, fz, fz); });
    byPos(logos, 'center').forEach(function (L) { drawCenterLogo(px, L, ox, oy, qrPx); });

    if (artY1 - artY0 > 120) ART[d.art](px, 90, artY0, W2 - 90, artY1);

    var label = labelText ? {
      text: labelText, x: W2 / 2, y: cardY + cardH + botH + 68,
      maxW: 920, fontPx: 58, color: '#1F2937'
    } : null;
    return { w: W2, h: H2, data: px.buf, design: d.id, modules: n,
             qr: { x: ox, y: oy, size: qrPx, module: m2 },
             label: label };
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
      fillCircle(px, cx + Math.cos(a) * R * 0.80, cy + Math.sin(a) * R * 0.80, R * 0.30, i % 2 ? P.soft : P.mid);
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
    motifEye(px, cx - R * 0.30, cy - R * 0.16, R * 0.135, P);
    motifEye(px, cx + R * 0.30, cy - R * 0.16, R * 0.135, P);
    fillPolygon(px, [[cx - R * 0.13, cy + R * 0.20], [cx + R * 0.13, cy + R * 0.20], [cx, cy + R * 0.34]], P.ink);
    thickLine(px, cx, cy + R * 0.34, cx, cy + R * 0.44, R * 0.045, P.ink);
    arcStroke(px, cx - R * 0.08, cy + R * 0.41, R * 0.09, Math.PI * 0.15, Math.PI * 0.85, R * 0.04, P.ink);
    arcStroke(px, cx + R * 0.08, cy + R * 0.41, R * 0.09, Math.PI * 0.15, Math.PI * 0.85, R * 0.04, P.ink);
    [-1, 1].forEach(function (s) { // brow tufts
      thickLine(px, cx + s * R * 0.20, cy - R * 0.36, cx + s * R * 0.40, cy - R * 0.40, R * 0.05, P.ink);
    });
  }

  function paintCat(px, cx, cy, R, P) {
    [-1, 1].forEach(function (s) {
      fillPolygon(px, [[cx + s * R * 0.86, cy - R * 0.30], [cx + s * R * 0.92, cy - R * 0.98], [cx + s * R * 0.34, cy - R * 0.72]], P.mid);
      fillPolygon(px, [[cx + s * R * 0.74, cy - R * 0.38], [cx + s * R * 0.78, cy - R * 0.80], [cx + s * R * 0.44, cy - R * 0.62]], P.light);
    });
    fillCircle(px, cx, cy + R * 0.06, R * 0.88, P.soft);
    fillEllipseV(px, cx, cy - R * 0.02, R * 0.72, R * 0.70, lerpRGB(P.soft, WHITE, 0.30), P.soft);
    motifStripe(px, cx, cy - R * 0.80, cx, cy - R * 0.56, R * 0.09, R * 0.02, P.ink);
    motifStripe(px, cx - R * 0.26, cy - R * 0.74, cx - R * 0.20, cy - R * 0.52, R * 0.08, R * 0.02, P.ink);
    motifStripe(px, cx + R * 0.26, cy - R * 0.74, cx + R * 0.20, cy - R * 0.52, R * 0.08, R * 0.02, P.ink);
    fillEllipse(px, cx, cy + R * 0.44, R * 0.40, R * 0.26, P.light);
    motifEye(px, cx - R * 0.34, cy - R * 0.10, R * 0.15, P);
    motifEye(px, cx + R * 0.34, cy - R * 0.10, R * 0.15, P);
    fillPolygon(px, [[cx - R * 0.09, cy + R * 0.28], [cx + R * 0.09, cy + R * 0.28], [cx, cy + R * 0.40]], P.mid);
    thickLine(px, cx, cy + R * 0.40, cx, cy + R * 0.48, R * 0.04, P.ink);
    arcStroke(px, cx - R * 0.07, cy + R * 0.45, R * 0.08, Math.PI * 0.15, Math.PI * 0.85, R * 0.035, P.ink);
    arcStroke(px, cx + R * 0.07, cy + R * 0.45, R * 0.08, Math.PI * 0.15, Math.PI * 0.85, R * 0.035, P.ink);
    [-1, 1].forEach(function (s) {
      thickLineA(px, cx + s * R * 0.44, cy + R * 0.30, cx + s * R * 1.04, cy + R * 0.20, R * 0.024, P.ink, 0.85);
      thickLineA(px, cx + s * R * 0.46, cy + R * 0.42, cx + s * R * 1.06, cy + R * 0.44, R * 0.024, P.ink, 0.85);
      thickLineA(px, cx + s * R * 0.44, cy + R * 0.54, cx + s * R * 1.02, cy + R * 0.68, R * 0.024, P.ink, 0.8);
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
    [-1, 1].forEach(function (s) {
      fillPolygon(px, [[cx + s * R * 0.80, cy - R * 0.34], [cx + s * R * 0.88, cy - R * 1.02], [cx + s * R * 0.28, cy - R * 0.70]], P.mid);
      fillPolygon(px, [[cx + s * R * 0.80, cy - R * 0.34], [cx + s * R * 0.88, cy - R * 1.02], [cx + s * R * 0.62, cy - R * 0.62]], P.ink);
      fillPolygon(px, [[cx + s * R * 0.68, cy - R * 0.42], [cx + s * R * 0.72, cy - R * 0.82], [cx + s * R * 0.42, cy - R * 0.60]], P.light);
    });
    // pointed face: wide top narrowing to the chin
    fillPolygon(px, [[cx - R * 0.88, cy - R * 0.52], [cx + R * 0.88, cy - R * 0.52], [cx + R * 0.52, cy + R * 0.42], [cx, cy + R * 0.98], [cx - R * 0.52, cy + R * 0.42]], P.mid);
    fillEllipseV(px, cx, cy - R * 0.30, R * 0.62, R * 0.34, lerpRGB(P.mid, WHITE, 0.25), P.mid);
    // cream cheeks sweeping to the chin
    fillPolygon(px, [[cx - R * 0.52, cy + R * 0.42], [cx, cy + R * 0.98], [cx, cy + R * 0.10], [cx - R * 0.30, cy + R * 0.16]], P.light);
    fillPolygon(px, [[cx + R * 0.52, cy + R * 0.42], [cx, cy + R * 0.98], [cx, cy + R * 0.10], [cx + R * 0.30, cy + R * 0.16]], P.light);
    motifEye(px, cx - R * 0.34, cy - R * 0.14, R * 0.14, P);
    motifEye(px, cx + R * 0.34, cy - R * 0.14, R * 0.14, P);
    [-1, 1].forEach(function (s) {
      thickLine(px, cx + s * R * 0.22, cy - R * 0.34, cx + s * R * 0.46, cy - R * 0.38, R * 0.05, P.ink);
    });
    fillEllipse(px, cx, cy + R * 0.52, R * 0.15, R * 0.11, P.ink);
    fillCircleA(px, cx - R * 0.05, cy + R * 0.48, R * 0.045, WHITE, 0.6);
  }

  /* Horse: HEAD IN PROFILE facing left — a profile reads instantly at
     small sizes (long face, flared nostril, ear, swept mane), while a
     front-on horse head collapses into a generic oval. */
  function paintHorse(px, cx, cy, R, P) {
    // mane mass behind the head (drawn first, head overlaps it)
    fillPolygon(px, [[cx + R * 0.30, cy - R * 0.92], [cx + R * 0.98, cy - R * 0.30], [cx + R * 0.86, cy + R * 0.98], [cx + R * 0.42, cy + R * 0.62], [cx + R * 0.52, cy - R * 0.20]], P.ink);
    // ear
    fillPolygon(px, [[cx - R * 0.30, cy - R * 0.74], [cx - R * 0.14, cy - R * 1.10], [cx + R * 0.06, cy - R * 0.76]], P.mid);
    fillPolygon(px, [[cx - R * 0.22, cy - R * 0.76], [cx - R * 0.13, cy - R * 0.98], [cx - R * 0.02, cy - R * 0.76]], P.light);
    // head profile
    fillPolygon(px, [
      [cx - R * 0.34, cy - R * 0.84], [cx + R * 0.30, cy - R * 0.80], [cx + R * 0.44, cy - R * 0.28],
      [cx + R * 0.60, cy + R * 0.44], [cx + R * 0.40, cy + R * 0.66], [cx - R * 0.30, cy + R * 0.72],
      [cx - R * 0.78, cy + R * 0.60], [cx - R * 0.90, cy + R * 0.30], [cx - R * 0.66, cy - R * 0.28]
    ], P.mid);
    fillEllipseV(px, cx - R * 0.30, cy - R * 0.30, R * 0.30, R * 0.42, lerpRGB(P.mid, WHITE, 0.22), P.mid);
    // muzzle band + jaw shading
    fillPolygon(px, [[cx - R * 0.90, cy + R * 0.30], [cx - R * 0.52, cy + R * 0.40], [cx - R * 0.30, cy + R * 0.72], [cx - R * 0.78, cy + R * 0.60]], P.soft);
    // forelock tuft
    fillPolygon(px, [[cx - R * 0.34, cy - R * 0.84], [cx + R * 0.10, cy - R * 0.86], [cx - R * 0.06, cy - R * 0.52], [cx - R * 0.38, cy - R * 0.56]], P.ink);
    // mane strands over the neck edge
    [0, 1, 2].forEach(function (i) {
      thickLine(px, cx + R * (0.44 - i * 0.02), cy - R * (0.55 - i * 0.38), cx + R * (0.66 - i * 0.04), cy - R * (0.30 - i * 0.38), R * 0.07, P.ink);
    });
    motifEye(px, cx - R * 0.28, cy - R * 0.30, R * 0.115, P);
    fillCircle(px, cx - R * 0.66, cy + R * 0.42, R * 0.075, P.ink); // nostril
    fillCircleA(px, cx - R * 0.69, cy + R * 0.39, R * 0.03, WHITE, 0.6);
    arcStroke(px, cx - R * 0.52, cy + R * 0.60, R * 0.16, Math.PI * 0.1, Math.PI * 0.7, R * 0.04, P.ink); // mouth
  }

  function paintBird(px, cx, cy, R, P) {
    // tail feathers
    fillPolygon(px, [[cx - R * 0.10, cy + R * 0.55], [cx - R * 0.52, cy + R * 1.02], [cx - R * 0.16, cy + R * 1.04], [cx + R * 0.08, cy + R * 0.62]], P.ink);
    fillPolygon(px, [[cx + R * 0.12, cy + R * 0.55], [cx - R * 0.10, cy + R * 1.04], [cx + R * 0.24, cy + R * 1.02], [cx + R * 0.28, cy + R * 0.58]], P.mid);
    // body + belly
    fillEllipse(px, cx, cy + R * 0.22, R * 0.62, R * 0.74, P.mid);
    fillEllipse(px, cx - R * 0.05, cy + R * 0.38, R * 0.42, R * 0.52, P.light);
    // wing
    fillEllipse(px, cx + R * 0.34, cy + R * 0.18, R * 0.26, R * 0.48, P.ink);
    fillEllipse(px, cx + R * 0.30, cy + R * 0.10, R * 0.17, R * 0.34, P.mid);
    // head + crest
    fillCircle(px, cx - R * 0.06, cy - R * 0.52, R * 0.46, P.mid);
    thickLine(px, cx - R * 0.16, cy - R * 0.92, cx - R * 0.30, cy - R * 1.10, R * 0.06, P.ink);
    thickLine(px, cx + R * 0.02, cy - R * 0.94, cx + R * 0.02, cy - R * 1.14, R * 0.06, P.ink);
    fillCircle(px, cx - R * 0.28, cy - R * 0.44, R * 0.13, P.soft); // cheek
    motifEye(px, cx - R * 0.16, cy - R * 0.56, R * 0.125, P);
    fillPolygon(px, [[cx - R * 0.48, cy - R * 0.46], [cx - R * 0.86, cy - R * 0.34], [cx - R * 0.46, cy - R * 0.24]], P.soft); // beak
    // perch branch + leaves
    thickLine(px, cx - R * 0.95, cy + R * 0.92, cx + R * 0.95, cy + R * 0.80, R * 0.07, P.ink);
    fillEllipse(px, cx + R * 0.78, cy + R * 0.66, R * 0.16, R * 0.09, P.soft);
    fillEllipse(px, cx - R * 0.80, cy + R * 0.74, R * 0.15, R * 0.08, P.soft);
  }

  function paintKoi(px, cx, cy, R, P) {
    arcStroke(px, cx - R * 0.30, cy - R * 0.72, R * 0.34, Math.PI * 0.05, Math.PI * 0.95, R * 0.035, P.soft);
    arcStroke(px, cx + R * 0.42, cy + R * 0.74, R * 0.30, Math.PI * 1.05, Math.PI * 1.95, R * 0.035, P.soft);
    // tail (flowing, right side)
    fillPolygon(px, [[cx + R * 0.55, cy - R * 0.10], [cx + R * 1.02, cy - R * 0.52], [cx + R * 0.94, cy], [cx + R * 1.02, cy + R * 0.52], [cx + R * 0.55, cy + R * 0.10]], P.mid);
    fillPolygon(px, [[cx + R * 0.58, cy - R * 0.05], [cx + R * 0.92, cy - R * 0.34], [cx + R * 0.86, cy], [cx + R * 0.92, cy + R * 0.34], [cx + R * 0.58, cy + R * 0.05]], P.soft);
    // pectoral fins
    fillPolygon(px, [[cx - R * 0.05, cy + R * 0.28], [cx - R * 0.30, cy + R * 0.66], [cx + R * 0.22, cy + R * 0.40]], P.mid);
    fillPolygon(px, [[cx + R * 0.30, cy - R * 0.30], [cx + R * 0.16, cy - R * 0.68], [cx + R * 0.52, cy - R * 0.38]], P.mid);
    // body
    fillEllipse(px, cx, cy, R * 0.82, R * 0.46, P.soft);
    fillEllipseV(px, cx, cy - R * 0.06, R * 0.74, R * 0.38, lerpRGB(P.soft, WHITE, 0.30), P.soft);
    // colour patches (classic koi markings)
    fillCircle(px, cx - R * 0.34, cy - R * 0.10, R * 0.24, P.mid);
    fillEllipse(px, cx + R * 0.16, cy + R * 0.10, R * 0.30, R * 0.22, P.mid);
    fillCircle(px, cx + R * 0.48, cy - R * 0.16, R * 0.15, P.mid);
    fillCircle(px, cx - R * 0.02, cy - R * 0.24, R * 0.12, P.ink);
    // head shading + eye + whiskers
    fillEllipse(px, cx - R * 0.62, cy, R * 0.22, R * 0.34, P.light);
    motifEye(px, cx - R * 0.52, cy - R * 0.16, R * 0.095, P);
    thickLineA(px, cx - R * 0.82, cy + R * 0.10, cx - R * 1.04, cy + R * 0.26, R * 0.03, P.ink, 0.9);
    thickLineA(px, cx - R * 0.82, cy - R * 0.10, cx - R * 1.04, cy - R * 0.26, R * 0.03, P.ink, 0.9);
  }

  function paintButterfly(px, cx, cy, R, P) {
    [-1, 1].forEach(function (s) {
      fillEllipse(px, cx + s * R * 0.52, cy - R * 0.34, R * 0.52, R * 0.40, P.mid);
      fillEllipse(px, cx + s * R * 0.46, cy + R * 0.38, R * 0.42, R * 0.34, P.soft);
      fillEllipse(px, cx + s * R * 0.50, cy - R * 0.32, R * 0.34, R * 0.25, P.soft);
      fillCircle(px, cx + s * R * 0.56, cy - R * 0.34, R * 0.13, P.light);
      fillCircle(px, cx + s * R * 0.48, cy + R * 0.38, R * 0.09, P.ink);
      fillCircle(px, cx + s * R * 0.72, cy + R * 0.52, R * 0.06, P.light);
    });
    fillEllipse(px, cx, cy + R * 0.05, R * 0.13, R * 0.72, P.ink); // body
    fillCircle(px, cx, cy - R * 0.72, R * 0.16, P.ink); // head
    [-1, 1].forEach(function (s) { // antennae
      arcStroke(px, cx + s * R * 0.06, cy - R * 0.80, R * 0.34, s < 0 ? Math.PI * 1.25 : Math.PI * 1.35, s < 0 ? Math.PI * 1.75 : Math.PI * 1.65, R * 0.035, P.ink);
      fillCircle(px, cx + s * R * 0.38, cy - R * 1.02, R * 0.055, P.ink);
    });
    motifEye(px, cx - R * 0.06, cy - R * 0.74, R * 0.05, P);
    motifEye(px, cx + R * 0.06, cy - R * 0.74, R * 0.05, P);
  }

  function paintRobot(px, cx, cy, R, P) {
    // antenna + ears
    thickLine(px, cx, cy - R * 0.62, cx, cy - R * 0.92, R * 0.07, P.ink);
    fillCircle(px, cx, cy - R * 0.98, R * 0.11, P.soft);
    fillCircle(px, cx, cy - R * 0.98, R * 0.05, P.light);
    fillRect(px, cx - R * 1.0, cy - R * 0.28, R * 0.16, R * 0.52, P.ink);
    fillRect(px, cx + R * 0.84, cy - R * 0.28, R * 0.16, R * 0.52, P.ink);
    // head shell + face screen
    roundRect(px, cx - R * 0.86, cy - R * 0.64, R * 1.72, R * 1.30, R * 0.30, P.mid);
    roundRect(px, cx - R * 0.68, cy - R * 0.46, R * 1.36, R * 0.94, R * 0.22, P.ink);
    // eyes: glowing soft discs
    fillCircle(px, cx - R * 0.33, cy - R * 0.12, R * 0.155, P.soft);
    fillCircle(px, cx + R * 0.33, cy - R * 0.12, R * 0.155, P.soft);
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
      fillCircle(px, cx + Math.cos(a) * R * 0.58, cy + Math.sin(a) * R * 0.58, R * 0.40, i % 2 ? P.soft : P.mid);
    }
    for (i = 0; i < 8; i++) { // inner petal highlights
      a = (i + 0.5) / 8 * Math.PI * 2;
      fillCircle(px, cx + Math.cos(a) * R * 0.44, cy + Math.sin(a) * R * 0.44, R * 0.24, P.soft);
    }
    fillCircle(px, cx, cy, R * 0.34, P.light);
    fillCircle(px, cx, cy, R * 0.26, lerpRGB(P.light, P.soft, 0.35));
    [[0, 0], [-0.13, -0.08], [0.13, -0.08], [-0.08, 0.11], [0.09, 0.12], [0, -0.16]].forEach(function (p) {
      fillCircle(px, cx + p[0] * R, cy + p[1] * R, R * 0.045, P.ink);
    });
    fillCircleA(px, cx - R * 0.62, cy - R * 0.62, R * 0.07, WHITE, 0.7);
  }

  var MOTIFS = [
    { id: 'tiger', name: 'Tiger', paint: paintTiger, pal: { ink: '#5F2700', mid: '#E8760A', soft: '#F5A83D', light: '#FBD9A0', bg: '#FFF6E9' } },
    { id: 'lion', name: 'Lion', paint: paintLion, pal: { ink: '#5A3000', mid: '#B96A12', soft: '#E8A33D', light: '#F7D9A0', bg: '#FFF8EC' } },
    { id: 'cat', name: 'Cat', paint: paintCat, pal: { ink: '#263238', mid: '#607D8B', soft: '#B0BEC5', light: '#ECEFF1', bg: '#FFFFFF' } },
    { id: 'panda', name: 'Panda', paint: paintPanda, pal: { ink: '#1A1A1A', mid: '#4A4A4A', soft: '#9E9E9E', light: '#E8E8E8', bg: '#FFFFFF' } },
    { id: 'owl', name: 'Owl', paint: paintOwl, pal: { ink: '#33200D', mid: '#7A4A1F', soft: '#C08A4A', light: '#EBD3AC', bg: '#FBF3E2' } },
    { id: 'fox', name: 'Fox', paint: paintFox, pal: { ink: '#6E2A00', mid: '#E05E10', soft: '#F08A3C', light: '#FBD3AC', bg: '#FFF5EA' } },
    { id: 'horse', name: 'Horse', paint: paintHorse, pal: { ink: '#3A2410', mid: '#8A5A2B', soft: '#C79A63', light: '#EBD9BC', bg: '#FAF3E7' } },
    { id: 'bird', name: 'Bird', paint: paintBird, pal: { ink: '#0B3D5C', mid: '#1D8AC0', soft: '#6FC3E8', light: '#CDEEFB', bg: '#F2FAFF' } },
    { id: 'koi', name: 'Koi', paint: paintKoi, pal: { ink: '#7A1F0B', mid: '#E4571D', soft: '#F58A4C', light: '#FBD0B4', bg: '#FFF7EE' } },
    { id: 'butterfly', name: 'Butterfly', paint: paintButterfly, pal: { ink: '#3B1155', mid: '#8B3FBF', soft: '#C77FD6', light: '#EBCBF5', bg: '#FBF2FF' } },
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
     then samples coverage + mean colour. Colour safety: dark cells are
     pushed to luminance <= 0.30, ghost dots to >= 0.82. Finders are
     ALWAYS the standard full drawFinder in ink on bg. */
  function lum(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }
  function pushDark(rgb) {
    var c = rgb, t = 0;
    while (lum(c) > 0.30 && t < 1) { t += 0.1; c = lerpRGB(rgb, [0, 0, 0], t); }
    return c;
  }
  function pushLight(rgb) {
    var c = rgb, t = 0;
    while (lum(c) < 0.82 && t < 1) { t += 0.1; c = lerpRGB(rgb, [255, 255, 255], t); }
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
    /* NOTE: a 'silhouette' variant (micro-dots outside the motif shape)
       was built and decode-gated in v3 development; it failed materially
       (30/64 as-rendered, several motifs 0/12) and was REMOVED before
       shipping — only the 'picture' halftone below ships. opts.motifMode
       is accepted for compatibility and ignored. */

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

    for (var rr = 0; rr < n; rr++) {
      for (var cc = 0; cc < n; cc++) {
        if (isFinderZone(rr, cc, n)) continue;
        var kk = rr * n + cc, dark = !!data[kk];
        var cv = cov[kk], col = [colR[kk], colG[kk], colB[kk]];
        var cxp = ox + cc * m + m / 2, cyp = oy + rr * m + m / 2;
        if (dark) {
          var dc = pushDark(cv >= 0.15 ? col : ink);
          var rad = m * (0.34 + 0.30 * (1 - lum(dc)));
          fillCircle(px, cxp, cyp, rad, dc);
        } else {
          if (cv >= 0.4 && lum(col) < 0.55) fillCircle(px, cxp, cyp, m * 0.30, pushLight(col));
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
      : (d.framed
        ? renderFramed(text, d, qr, logos, labelText)
        : renderPlain(text, d, qr, logos, labelText, opts.maxSize));
    r.ecLevel = ec;
    return r;
  }

  root.QRDesigns = { DESIGNS: DESIGNS, MOTIFS: MOTIFS, render: render, getDesign: getDesign, getMotif: getMotif, version: 3 };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

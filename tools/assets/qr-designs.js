/* ==========================================================================
   Ride Bangla Tools — QR Design Studio v2 (DOM-free pixel renderer)
   Generates 8 QR designs. No DOM required: render() returns raw pixels,
   so the same code runs in the browser AND in Node for automated tests.
   Requires global QRCode.create (embedded qrcode lib on the tool page).

   v2: framed designs render on a TRANSPARENT poster (alpha) — decorative
   art floats with no background, so downloads blend onto light AND dark
   surfaces. Non-framed designs keep their solid backgrounds.
   Logo engine: up to N logos at explicit positions (top/bottom/side/
   middle/center). CENTER-OF-QR uses error-correction level H, a white
   safe backdrop, and a capped logo size so the code still scans.
   Decorative art stays OUTSIDE the QR quiet zone — every design decodes.
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
    { id: 'ocean', name: 'Ocean', desc: 'Rolling waves frame', style: 'round', fg: '#075985', bg: '#E8F7FF', framed: true, art: 'ocean', accent: '#0284C7' }
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

  function artTiger(px, x0, y0, x1, y1) {
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var orange = hexRGB('#F5820B'), orangeD = hexRGB('#C25E04'), dark = hexRGB('#141414'),
        cream = hexRGB('#FFF7EA'), white = hexRGB('#FFFFFF');
    // soft halo
    fillCircleA(px, cx, cy, 200, orange, 0.16);
    // ears
    fillPolygon(px, [[cx - 104, cy - 52], [cx - 128, cy - 128], [cx - 52, cy - 92]], orangeD);
    fillPolygon(px, [[cx + 104, cy - 52], [cx + 128, cy - 128], [cx + 52, cy - 92]], orangeD);
    fillPolygon(px, [[cx - 100, cy - 62], [cx - 114, cy - 108], [cx - 66, cy - 86]], dark);
    fillPolygon(px, [[cx + 100, cy - 62], [cx + 114, cy - 108], [cx + 66, cy - 86]], dark);
    // face: layered gradient (light top -> orange -> deep edge)
    fillCircle(px, cx, cy, 118, orangeD);
    fillCircle(px, cx, cy - 8, 110, orange);
    fillEllipseV(px, cx, cy - 18, 92, 88, lerpRGB(orange, white, 0.28), orange);
    // forehead stripes
    thickLine(px, cx - 44, cy - 108, cx - 30, cy - 66, 13, dark);
    thickLine(px, cx, cy - 114, cx, cy - 70, 13, dark);
    thickLine(px, cx + 44, cy - 108, cx + 30, cy - 66, 13, dark);
    // cheek stripes
    thickLine(px, cx - 118, cy - 20, cx - 78, cy - 8, 12, dark);
    thickLine(px, cx + 118, cy - 20, cx + 78, cy - 8, 12, dark);
    thickLine(px, cx - 112, cy + 34, cx - 76, cy + 40, 12, dark);
    thickLine(px, cx + 112, cy + 34, cx + 76, cy + 40, 12, dark);
    // whisker dots + whiskers
    [[-1, 0], [1, 0]].forEach(function (s) {
      for (var wI = 0; wI < 3; wI++) {
        var wy = cy + 40 + wI * 14, wx = cx + s[0] * 66;
        thickLineA(px, wx, wy, wx + s[0] * 66, wy - 8 + wI * 6, 3, white, 0.85);
      }
    });
    // eyes (layered)
    fillCircle(px, cx - 46, cy - 22, 21, cream);
    fillCircle(px, cx + 46, cy - 22, 21, cream);
    fillCircle(px, cx - 46, cy - 22, 10, dark);
    fillCircle(px, cx + 46, cy - 22, 10, dark);
    fillCircle(px, cx - 43, cy - 25, 3.4, white);
    fillCircle(px, cx + 49, cy - 25, 3.4, white);
    // muzzle + nose + mouth
    fillEllipse(px, cx, cy + 52, 58, 37, cream);
    fillPolygon(px, [[cx - 17, cy + 33], [cx + 17, cy + 33], [cx, cy + 53]], dark);
    thickLine(px, cx, cy + 53, cx, cy + 68, 7, dark);
    thickLine(px, cx, cy + 68, cx - 20, cy + 78, 6, dark);
    thickLine(px, cx, cy + 68, cx + 20, cy + 78, 6, dark);
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
    var r = d.framed
      ? renderFramed(text, d, qr, logos, labelText)
      : renderPlain(text, d, qr, logos, labelText, opts.maxSize);
    r.ecLevel = ec;
    return r;
  }

  root.QRDesigns = { DESIGNS: DESIGNS, render: render, getDesign: getDesign, version: 2 };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

/* ==========================================================================
   Ride Bangla Tools — QR Studio shared logic (qr-code-generator + payment-qr)
   Brand badges, logo upload handling, render+label compositing, download.
   Requires: QRDesigns (assets/qr-designs.js) + QRCode lib on the page.
   ========================================================================== */
(function (root) {
  'use strict';

  var POSITIONS = [
    { id: 'top',    label: 'TOP',          hint: 'Above the QR code' },
    { id: 'bottom', label: 'BOTTOM',       hint: 'Below the QR code' },
    { id: 'side',   label: 'SIDE',         hint: 'Right of the QR code' },
    { id: 'middle', label: 'MIDDLE',       hint: 'Left of the QR code' },
    { id: 'center', label: 'CENTER-OF-QR', hint: 'On the QR code itself (max error correction)' }
  ];

  var BRANDS = {
    bkash:  { name: 'bKash',  color: '#E2136E', text: 'bKash' },
    nagad:  { name: 'Nagad',  color: '#F6921E', text: 'Nagad' },
    rocket: { name: 'Rocket', color: '#7B2CBF', text: 'Rocket' },
    bank:   { name: 'Bank',   color: '#1E3A8A', text: 'BANK' }
  };

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Built-in payment brand badge -> {data,w,h} (256px, transparent corners). */
  function makeBrandBadge(brandId) {
    var b = BRANDS[brandId];
    if (!b) return null;
    var S = 256, c = document.createElement('canvas');
    c.width = S; c.height = S;
    var x = c.getContext('2d');
    rr(x, 8, 8, S - 16, S - 16, 56);
    x.fillStyle = b.color; x.fill();
    // subtle top sheen
    rr(x, 8, 8, S - 16, (S - 16) / 2, 56);
    x.fillStyle = 'rgba(255,255,255,0.16)'; x.fill();
    x.fillStyle = '#FFFFFF';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    var fs = b.text.length > 5 ? 52 : 64;
    x.font = '800 ' + fs + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    x.fillText(b.text, S / 2, S / 2 + 4);
    var id = x.getImageData(0, 0, S, S);
    return { data: id.data, w: S, h: S };
  }

  /* User-uploaded image file -> {data,w,h}, downscaled to max 512px. */
  function fileToLogo(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        reject(new Error('Please choose an image file (PNG or JPG).'));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        try {
          var max = 512, s = Math.min(1, max / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          var id = c.getContext('2d').getImageData(0, 0, w, h);
          resolve({ data: id.data, w: w, h: h });
        } catch (e) { reject(new Error('Could not read that image.')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
      img.src = url;
    });
  }

  /* Render QRDesigns result onto a canvas, then draw the name label. */
  function renderToCanvas(canvas, text, designId, opts) {
    opts = opts || {};
    var r = QRDesigns.render(text, designId, {
      logos: opts.logos || [],
      labelText: opts.labelText || ''
    });
    canvas.width = r.w; canvas.height = r.h;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(r.w, r.h);
    img.data.set(r.data);
    ctx.putImageData(img, 0, 0);
    if (r.label && r.label.text) {
      var L = r.label;
      var fs = L.fontPx;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = L.color;
      // shrink to fit maxW
      var setF = function (s) { ctx.font = '700 ' + s + 'px "Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif'; };
      setF(fs);
      var tw = ctx.measureText(L.text).width;
      if (tw > L.maxW) { fs = Math.max(20, Math.floor(fs * L.maxW / tw)); setF(fs); }
      try { ctx.letterSpacing = '1px'; } catch (e) {}
      ctx.fillText(L.text, L.x, L.y, L.maxW);
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    }
    return r;
  }

  function downloadPNG(canvas, filename) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename || 'qr-code.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function posLabel(id) {
    for (var i = 0; i < POSITIONS.length; i++) if (POSITIONS[i].id === id) return POSITIONS[i].label;
    return id;
  }

  root.QRStudio = {
    POSITIONS: POSITIONS,
    BRANDS: BRANDS,
    makeBrandBadge: makeBrandBadge,
    fileToLogo: fileToLogo,
    renderToCanvas: renderToCanvas,
    downloadPNG: downloadPNG,
    posLabel: posLabel
  };
})(typeof window !== 'undefined' ? window : this);

/* Invoice sheet -> PNG picture, entirely in the browser (no upload).
   The sheet DOM is cloned, its images are inlined as data URLs, and it is drawn
   through an SVG <foreignObject> onto a canvas. The browser itself shapes the
   text, so Bengali (or any other language) and the currency symbol come out
   exactly as in the live preview.
   RBSheetImage.toPngBlob(node, { cssText, width, scale, wmUrl, vars }) -> Promise<Blob> */
(function () {
  'use strict';
  function blobToDataUrl(b) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(b); });
  }
  async function toDataUrl(src) {
    if (!src || /^data:/.test(src)) return src;
    var r = await fetch(src);
    if (!r.ok) throw new Error('image HTTP ' + r.status);
    return await blobToDataUrl(await r.blob());
  }
  async function toCanvas(node, opt) {
    opt = opt || {};
    var width = opt.width || node.offsetWidth || 540;
    var scale = opt.scale || 2;
    var clone = node.cloneNode(true);
    clone.removeAttribute('id');
    if (node.id) clone.setAttribute('id', node.id);
    clone.style.transform = ''; clone.style.margin = '0'; clone.style.maxWidth = 'none';
    clone.style.width = width + 'px'; clone.style.boxSizing = 'border-box';
    if (opt.vars) Object.keys(opt.vars).forEach(function (k) { clone.style.setProperty(k, opt.vars[k]); });
    if (opt.wmUrl) clone.style.setProperty('--wm', 'url("' + (await toDataUrl(opt.wmUrl)) + '")');
    var imgs = clone.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      try { imgs[i].setAttribute('src', await toDataUrl(imgs[i].getAttribute('src'))); } catch (e) { imgs[i].removeAttribute('src'); }
    }
    /* measure at the fixed width in a hidden holder (fonts + wrapping decide the height) */
    var holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + width + 'px;visibility:hidden;pointer-events:none';
    var st = document.createElement('style'); st.textContent = opt.cssText || '';
    holder.appendChild(st); holder.appendChild(clone); document.body.appendChild(holder);
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
    var height = Math.ceil(Math.max(clone.scrollHeight, clone.offsetHeight));
    var breaks = [], top0 = clone.getBoundingClientRect().top;
    clone.querySelectorAll(opt.breakSel || 'tr,.p-blk').forEach(function (e) { var b = e.getBoundingClientRect().bottom - top0; if (b > 0 && b < height) breaks.push(b); });
    breaks.sort(function (a, b) { return a - b; });
    holder.removeChild(clone); holder.removeChild(st); document.body.removeChild(holder);

    var xhtml = new XMLSerializer().serializeToString(clone);
    var cssSafe = String(opt.cssText || '').replace(/]]>/g, ']] >');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
      '<foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:' + width + 'px;height:' + height + 'px;background:#fff">' +
      '<style><![CDATA[' + cssSafe + ']]></style>' + xhtml + '</div></foreignObject></svg>';
    var img = new Image();
    await new Promise(function (res, rej) {
      img.onload = res; img.onerror = function () { rej(new Error('Could not draw the invoice picture')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    var cv = document.createElement('canvas');
    cv.width = Math.round(width * scale); cv.height = Math.round(height * scale);
    var cx = cv.getContext('2d');
    cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height);
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    return { canvas: cv, width: width, height: height, scale: scale, breaks: breaks };
  }
  async function toPngBlob(node, opt) {
    var r = await toCanvas(node, opt);
    return await new Promise(function (res, rej) { r.canvas.toBlob(function (b) { b ? res(b) : rej(new Error('Could not make the picture')); }, 'image/png'); });
  }
  window.RBSheetImage = { toPngBlob: toPngBlob, toCanvas: toCanvas };
})();

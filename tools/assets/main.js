// Ride Bangla Tools — shared site behaviour
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  // Homepage / category live search
  var search = document.getElementById('tool-search');
  if (search) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.tool-row'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('.cat-group'));
    var countEl = document.getElementById('search-count');
    var run = function () {
      var q = search.value.trim().toLowerCase();
      var visible = 0;
      rows.forEach(function (row) {
        var hay = (row.getAttribute('data-search') || '').toLowerCase();
        var match = !q || hay.indexOf(q) !== -1;
        row.hidden = !match;
        if (match) visible++;
      });
      groups.forEach(function (g) {
        var anyVisible = g.querySelectorAll('.tool-row:not([hidden])').length > 0;
        g.style.display = anyVisible ? '' : 'none';
      });
      if (countEl) {
        countEl.textContent = q
          ? visible + ' tool' + (visible === 1 ? '' : 's') + ' matching "' + search.value.trim() + '"'
          : rows.length + ' free tools, no sign-up required';
      }
    };
    search.addEventListener('input', run);
    run();
  }
  // Hero video: ensure autoplay attempt + sound toggle button
  var heroVideo = document.getElementById('hero-video');
  var heroSound = document.getElementById('hero-sound');
  if (heroVideo) {
    // Some browsers block autoplay even when muted; retry play on first interaction
    var tryPlay = function () {
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (heroVideo.paused) tryPlay();
    document.addEventListener('touchstart', tryPlay, { once: true, passive: true });
  }
  if (heroVideo && heroSound) {
    heroSound.addEventListener('click', function () {
      heroVideo.muted = !heroVideo.muted;
      var label = heroSound.querySelector('span');
      if (label) label.textContent = heroVideo.muted ? 'Tap for sound' : 'Sound on';
      heroSound.setAttribute('aria-label', heroVideo.muted ? 'Turn video sound on' : 'Turn video sound off');
    });
  }
})();

// Copy-to-clipboard helper used by tool pages
function rbCopy(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(function () {
    rbToast('Copied to clipboard');
  }).catch(function () {
    rbToast('Could not copy — select and copy manually');
  });
}

function rbToast(msg) {
  var el = document.querySelector('.copy-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'copy-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
}

/* ==========================================================================
   Ride Bangla Limited — company brand bar (injected on every page)
   Shows the main company logo + links to ridebangla.bd and it.ridebangla.bd.
   Also appends Privacy Policy / About links to the footer.
   Ad placements are untouched.
   ========================================================================== */
(function () {
  // 1) Top company brand bar — inserted as the very first element in <body>
  if (!document.querySelector('.rb-company-bar')) {
    var bar = document.createElement('div');
    bar.className = 'rb-company-bar';
    bar.innerHTML =
      '<div class="rb-company-inner">' +
        '<a class="rb-company-brand" href="https://ridebangla.bd" target="_blank" rel="noopener" aria-label="Ride Bangla Limited — main website">' +
          '<img src="/assets/brand-logo-main.png" alt="Ride Bangla Limited — Ride. Food. Delivery. Courier">' +
        '</a>' +
        '<nav class="rb-company-links" aria-label="Ride Bangla company sites">' +
          '<a class="rb-clink" href="https://ridebangla.bd" target="_blank" rel="noopener">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
            '<span>Main Website</span>' +
          '</a>' +
          '<a class="rb-clink rb-clink-it" href="https://it.ridebangla.bd" target="_blank" rel="noopener">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' +
            '<span>IT &amp; Development</span>' +
          '</a>' +
        '</nav>' +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // 2) Footer — append Privacy Policy + About links under the "Ride Bangla" column
  var footer = document.querySelector('footer.site-footer');
  if (footer && !footer.querySelector('[data-rb-legal]')) {
    var lists = footer.querySelectorAll('ul');
    for (var i = 0; i < lists.length; i++) {
      var ul = lists[i];
      if (ul.textContent.indexOf('Main website') !== -1) {
        var li1 = document.createElement('li');
        li1.setAttribute('data-rb-legal', '1');
        li1.innerHTML = '<a href="/privacy.html">Privacy Policy</a>';
        ul.appendChild(li1);
        var li2 = document.createElement('li');
        li2.setAttribute('data-rb-legal', '1');
        li2.innerHTML = '<a href="/about.html">About This Site</a>';
        ul.appendChild(li2);
        var li3 = document.createElement('li');
        li3.setAttribute('data-rb-legal', '1');
        li3.innerHTML = '<a href="https://it.ridebangla.bd" target="_blank" rel="noopener">IT &amp; Development</a>';
        ul.appendChild(li3);
        break;
      }
    }
  }
})();

/* ==========================================================================
   Language switcher (injected into header) + i18n engine loader
   ========================================================================== */
(function () {
  // load the i18n engine (works on every page, no HTML edits needed)
  var s = document.createElement('script');
  s.src = '/assets/i18n.js';
  s.defer = true;
  document.head.appendChild(s);

  function inject() {
    var bar = document.querySelector('.site-header .bar');
    if (!bar || bar.querySelector('.rb-lang-switch')) return;
    var wrap = document.createElement('div');
    wrap.className = 'rb-lang-switch';
    var labels = { en: 'EN', bn: 'বাংলা', zh: '中文', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português', pl: 'Polski', ja: '日本語', ko: '한국어', hi: 'हिन्दी', ar: 'العربية', ru: 'Русский', tr: 'Türkçe', id: 'ID' };
    var sel = document.createElement('select');
    sel.className = 'rb-lang-select';
    sel.setAttribute('aria-label', 'Language / ভাষা / 语言');
    ['en','bn','zh','es','fr','de','it','pt','pl','ja','ko','hi','ar','ru','tr','id'].forEach(function (code) {
      var o = document.createElement('option');
      o.value = code;
      o.textContent = labels[code];
      sel.appendChild(o);
    });
    try {
      var saved = localStorage.getItem('rb-lang');
      if (saved) sel.value = saved;
    } catch (e) {}
    sel.addEventListener('change', function () {
      if (window.rbSetLang) window.rbSetLang(sel.value);
    });
    wrap.appendChild(sel);
    // place before the mobile nav-toggle if present, else at end
    var toggle = bar.querySelector('.nav-toggle');
    if (toggle) bar.insertBefore(wrap, toggle);
    else bar.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

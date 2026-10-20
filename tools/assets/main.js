// Ride Bangla Tools — shared site behaviour
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
    // close the drawer when a link is tapped
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) nav.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') nav.classList.remove('open');
    });
  }

  // Header search panel (injected): the search button in the header opens a
  // real search field — the hero video carries no search bar (user decision).
  (function headerSearch() {
    var header = document.querySelector('.site-header');
    var btn = document.getElementById('header-search-btn');
    if (!header || !btn || document.getElementById('header-search')) return;
    var panel = document.createElement('div');
    panel.className = 'header-search';
    panel.id = 'header-search';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="hs-inner">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<input id="tool-search" type="text" data-i18n-ph="hero.searchPh" placeholder="Search tools \u2014 e.g. \u0022pdf\u0022, \u0022qr\u0022, \u0022age\u0022" autocomplete="off" aria-label="Search tools">' +
      '<button type="button" class="hs-close" aria-label="Close search">\u00d7</button>' +
      '</div>' +
      '<div class="search-count" id="search-count"></div>';
    header.appendChild(panel);
    var input = panel.querySelector('#tool-search');
    function open() {
      panel.hidden = false;
      // re-run i18n for the injected placeholder if the i18n engine is ready
      if (window.rbApplyI18n) { try { window.rbApplyI18n(); } catch (e) {} }
      setTimeout(function () { input.focus(); }, 30);
    }
    function close() { panel.hidden = true; }
    btn.addEventListener('click', function () {
      if (panel.hidden) open(); else close();
    });
    panel.querySelector('.hs-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    // typing in header search scrolls the tool catalog into view (homepage)
    var scrolled = false;
    input.addEventListener('input', function () {
      if (scrolled) return;
      var cat = document.getElementById('all-tools');
      if (cat) {
        var r = cat.getBoundingClientRect();
        if (r.top > window.innerHeight || r.bottom < 0) {
          scrolled = true;
          cat.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  })();

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
  // Hero video: bulletproof autoplay — muted+playsinline should allow it,
  // but mobile browsers are strict, so retry on every plausible trigger.
  var heroVideo = document.getElementById('hero-video');
  var heroSound = document.getElementById('hero-sound');
  if (heroVideo) {
    var playAttempted = false;
    var tryPlay = function () {
      if (!heroVideo.paused && !heroVideo.ended) return;
      try {
        var p = heroVideo.play();
        if (p && p.catch) p.catch(function () { playAttempted = false; });
        else playAttempted = true;
      } catch (e) { playAttempted = false; }
    };
    // Try immediately, on metadata/canplay, and on every user/environment signal
    tryPlay();
    heroVideo.addEventListener('loadedmetadata', tryPlay);
    heroVideo.addEventListener('canplay', tryPlay);
    heroVideo.addEventListener('canplaythrough', tryPlay);
    document.addEventListener('touchstart', tryPlay, { once: true, passive: true });
    document.addEventListener('click', tryPlay, { once: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) tryPlay();
    });
    // Last resort: if still paused after 2.5s, show poster cleanly (no broken state)
    setTimeout(function () {
      if (heroVideo.paused && !playAttempted) tryPlay();
    }, 2500);
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
   Ride Bangla Limited — company bar (injected on every page)
   Links ONLY: ridebangla.bd + it.ridebangla.bd. NO company logo in this bar
   (user order, repeated 2026-10-20 — the logo pill must never appear here).
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

  // 1b) Enforce links-only bar: strip ANY logo/pill element found inside the
  //     bar (e.g. left in the DOM by an older cached script or page state).
  //     The bar must contain exactly the two text links and nothing else.
  var liveBar = document.querySelector('.rb-company-bar');
  if (liveBar) {
    var junk = liveBar.querySelectorAll('.rb-company-brand, .rb-company-brand--icon, img');
    for (var j = 0; j < junk.length; j++) {
      if (junk[j].parentNode) junk[j].parentNode.removeChild(junk[j]);
    }
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

// PWA: register service worker (offline-capable)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}

/* ==========================================================================
   Ride Bangla Tools — multi-language engine
   Auto-detects visitor language (browser setting) and translates the UI.
   Supported: en (default), bn (Bengali), zh (Simplified Chinese).
   - Elements with [data-i18n="key"] get innerHTML from the dictionary.
   - Elements with [data-i18n-ph="key"] get placeholder from the dictionary.
   - Header nav links are auto-translated by href on EVERY page (no edits needed).
   - Choice is remembered in localStorage; window.rbSetLang(lang) switches manually.
   ========================================================================== */
(function () {
  var SUPPORTED = ['en', 'bn', 'zh'];
  var DEFAULT = 'en';
  var cache = {};
  var currentLang = DEFAULT;

  // href (as written in nav) -> dictionary key
  var NAV_MAP = {
    './': 'nav.allTools', '../': 'nav.allTools', '/': 'nav.allTools',
    'pdf/': 'nav.pdf', '../pdf/': 'nav.pdf',
    'image/': 'nav.image', '../image/': 'nav.image',
    'calculator/': 'nav.calculator', '../calculator/': 'nav.calculator',
    'converter/': 'nav.converter', '../converter/': 'nav.converter',
    'text/': 'nav.text', '../text/': 'nav.text',
    'seo/': 'nav.seo', '../seo/': 'nav.seo',
    'developer/': 'nav.developer', '../developer/': 'nav.developer',
    'qr/': 'nav.qr', '../qr/': 'nav.qr',
    'date-time/': 'nav.datetime', '../date-time/': 'nav.datetime',
    'finance/': 'nav.finance', '../finance/': 'nav.finance',
    'career/': 'nav.career', '../career/': 'nav.career',
    'about.html': 'nav.about', '../about.html': 'nav.about',
    'privacy.html': 'nav.privacy', '../privacy.html': 'nav.privacy'
  };

  function detect() {
    try {
      var saved = localStorage.getItem('rb-lang');
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    var n = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (n.indexOf('bn') === 0) return 'bn';
    if (n.indexOf('zh') === 0) return 'zh';
    return DEFAULT;
  }

  function get(obj, path) {
    var parts = path.split('.'), o = obj;
    for (var i = 0; i < parts.length; i++) {
      if (o == null) return undefined;
      o = o[parts[i]];
    }
    return o;
  }

  function apply(dict, lang) {
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : lang);

    // 1) data-i18n attributes (homepage + any instrumented page)
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var v = get(dict, els[i].getAttribute('data-i18n'));
      if (typeof v === 'string') els[i].innerHTML = v;
    }
    var phs = document.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < phs.length; j++) {
      var p = get(dict, phs[j].getAttribute('data-i18n-ph'));
      if (typeof p === 'string') phs[j].setAttribute('placeholder', p);
    }

    // 2) header nav on every page (href-mapped, no page edits needed)
    var links = document.querySelectorAll('.site-nav a');
    for (var k = 0; k < links.length; k++) {
      var href = links[k].getAttribute('href');
      var key = NAV_MAP[href];
      if (key) {
        var t = get(dict, key);
        if (typeof t === 'string') links[k].textContent = t;
      }
    }

    // 3) company brand bar links (injected by main.js)
    var clinks = document.querySelectorAll('.rb-company-links .rb-clink span');
    if (clinks.length >= 2) {
      var m = get(dict, 'companybar.main');
      var it = get(dict, 'companybar.it');
      if (typeof m === 'string') clinks[0].textContent = m;
      if (typeof it === 'string') clinks[1].textContent = it;
    }

    // 4) language switcher UI state
    var sel = document.querySelector('.rb-lang-select');
    if (sel) sel.value = lang;
  }

  function load(lang, cb) {
    if (cache[lang]) { cb(cache[lang]); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/assets/i18n/' + lang + '.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            cache[lang] = JSON.parse(xhr.responseText);
            cb(cache[lang]);
          } catch (e) { cb(null); }
        } else { cb(null); }
      }
    };
    xhr.send();
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT;
    try { localStorage.setItem('rb-lang', lang); } catch (e) {}
    if (lang === DEFAULT) {
      // reload to restore original English HTML
      try { localStorage.setItem('rb-lang', lang); } catch (e2) {}
      window.location.reload();
      return;
    }
    load(lang, function (d) { if (d) apply(d, lang); });
  }

  window.rbSetLang = setLang;
  window.rbGetLang = function () { return currentLang; };

  // boot
  var lang = detect();
  if (lang !== DEFAULT) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        load(lang, function (d) { if (d) apply(d, lang); });
      });
    } else {
      load(lang, function (d) { if (d) apply(d, lang); });
    }
  }
})();

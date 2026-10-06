/* ==========================================================================
   Ride Bangla Tools — multi-language engine
   Auto-detects visitor language (browser setting) and translates the UI.
   Supported: en, bn, zh, es, fr, de, it, pt, pl, ja, ko, hi, ar (RTL), ru, tr, id.
   - Elements with [data-i18n="key"] get innerHTML from the dictionary.
   - Elements with [data-i18n-ph="key"] get placeholder from the dictionary.
   - Header nav links are auto-translated by href on EVERY page (no edits needed).
   - Choice is remembered in localStorage; window.rbSetLang(lang) switches manually.
   ========================================================================== */
(function () {
  var SUPPORTED = ['en','bn','zh','es','fr','de','it','pt','pl','ja','ko','hi','ar','ru','tr','id'];
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
    var prefixes = ['bn','zh','es','fr','de','it','pt','pl','ja','ko','hi','ar','ru','tr','id'];
    for (var i = 0; i < prefixes.length; i++) {
      if (n.indexOf(prefixes[i]) === 0) return prefixes[i];
    }
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
    var htmlLang = { zh: 'zh-CN', ja: 'ja', ko: 'ko', ar: 'ar' }[lang] || lang;
    document.documentElement.setAttribute('lang', htmlLang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

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


    // 2b) common action buttons on tool pages (by element id, no page edits needed)
    var BTN_MAP = {
      'dlResult': 'common.downloadResult',
      'dl': 'common.download', 'dlLink': 'common.download', 'ccDl': 'common.download',
      'brDl': 'common.download', 'peDl': 'common.downloadPhoto',
      'mrImgDl': 'common.downloadPhoto', 'mrVidDl': 'common.downloadVideo', 'mrPdfDl': 'common.downloadPdf',
      'copyJson': 'common.copy', 'copyPw': 'common.copy', 'copyMeta': 'common.copy',
      'copySlug': 'common.copy', 'copyLorem': 'common.copy', 'makePdf': 'common.download',
      'cv-download': 'common.download', 'letter-download': 'common.download'
    };
    for (var bid in BTN_MAP) {
      var bel = document.getElementById(bid);
      if (bel) {
        var bt = get(dict, BTN_MAP[bid]);
        if (typeof bt === 'string') {
          if (bel.tagName === 'INPUT') bel.value = bt; else bel.textContent = bt;
        }
      }
    }


    // 2c) homepage catalog: category headings, counts, "open" links
    var CAT_MAP = { 'pdf':'nav.pdf','image':'nav.image','calculator':'nav.calculator','converter':'nav.converter',
      'text':'nav.text','seo':'nav.seo','developer':'nav.developer','qr':'nav.qr','date-time':'nav.datetime',
      'finance':'nav.finance','career':'nav.career' };
    var catHeads = document.querySelectorAll('.cat-head h2');
    for (var ci = 0; ci < catHeads.length; ci++) {
      var tagEl = catHeads[ci].parentElement.querySelector('.tag');
      if (tagEl) {
        var slug = tagEl.textContent.replace(/\//g,'').trim();
        var ckey = CAT_MAP[slug];
        if (ckey) { var ct = get(dict, ckey); if (typeof ct === 'string') catHeads[ci].textContent = ct; }
      }
    }
    var counts = document.querySelectorAll('.cat-head .count');
    var toolsWord = get(dict, 'common.tools');
    for (var ni = 0; ni < counts.length; ni++) {
      var mnum = counts[ni].textContent.match(/\d+/);
      if (mnum && typeof toolsWord === 'string') counts[ni].textContent = mnum[0] + ' ' + toolsWord;
    }
    var goes = document.querySelectorAll('.tool-row .go, .popular-card .go');
    var openWord = get(dict, 'common.open');
    for (var gi = 0; gi < goes.length; gi++) {
      if (typeof openWord === 'string') goes[gi].innerHTML = openWord + ' &rarr;';
    }


    // 2e) tool page: title, lede, form labels from toolmeta (per-tool translations).
    try {
      var pm = location.pathname.match(/\/([a-z-]+)\/([a-z-]+)\.html$/);
      if (pm) {
        var toolId = pm[1] + '-' + pm[2];
        var meta = get(dict, 'toolmeta.' + toolId);
        if (meta) {
          var th1 = document.querySelector('.tool-header h1');
          if (th1 && meta.title) th1.textContent = meta.title;
          var tlede = document.querySelector('.tool-header .lede');
          if (tlede && meta.lede) tlede.textContent = meta.lede;
          if (meta.labels) {
            var labEls = document.querySelectorAll('label');
            for (var li = 0; li < labEls.length; li++) {
              var lt = labEls[li].textContent.trim();
              if (meta.labels[lt]) labEls[li].textContent = meta.labels[lt];
            }
          }
        }
      }
    } catch (e) { /* toolmeta is best-effort */ }

    // 2d) tool-page template strings (FAQ headings, repeated Q&A) via text matching.
    // No HTML edits needed: matches English patterns and swaps in translations.
    try {
      var h1el = document.querySelector('.tool-header h1');
      var toolName = h1el ? h1el.textContent.trim() : '';
      var catName = '';
      var crumb = document.querySelector('.tool-header .crumb');
      if (crumb) {
        var clinks = crumb.querySelectorAll('a');
        if (clinks.length >= 2) catName = clinks[1].textContent.trim();
        else if (clinks.length === 1) catName = clinks[0].textContent.trim();
      }
      var T = function (key, vars) {
        var s = get(dict, key);
        if (typeof s !== 'string') return null;
        if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
        return s;
      };
      var patterns = [
        { re: /^Frequently asked questions$/, key: 'tools.faq' },
        { re: /^How to use (.+)$/, key: 'tools.howTo', vk: 'tool' },
        { re: /^Is (.+) free to use\?$/, key: 'tools.freeQ', vk: 'tool' },
        { re: /^Yes\. (.+) is completely free,/, key: 'tools.freeA', vk: 'tool' },
        { re: /^Is my data uploaded to a server\?$/, key: 'tools.dataQ' },
        { re: /^No\. (.+) runs entirely in your browser/, key: 'tools.dataA', vk: 'tool' },
        { re: /^More in (.+)$/, key: 'tools.moreIn', ck: 'cat' },
        { re: /^How accurate is the result\?$/, key: 'tools.accurateQ' },
        { re: /^The calculation uses the standard formula/, key: 'tools.accurateA' }
      ];
      if (toolName || catName) {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: function (n) {
            var p = n.parentElement;
            if (!p) return NodeFilter.FILTER_REJECT;
            var tag = p.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return NodeFilter.FILTER_REJECT;
            if (p.closest && p.closest('[data-i18n]')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        var tn;
        while ((tn = walker.nextNode())) {
          var txt = tn.nodeValue.trim();
          if (!txt || txt.length > 400) continue;
          for (var pi = 0; pi < patterns.length; pi++) {
            var pat = patterns[pi], m = txt.match(pat.re);
            if (m) {
              var vars = {};
              if (pat.vk === 'tool' && toolName) vars.tool = toolName;
              if (pat.ck === 'cat' && catName) vars.cat = catName;
              else if (pat.ck === 'cat') continue;
              var rep = T(pat.key, vars);
              if (rep) { tn.nodeValue = tn.nodeValue.replace(txt, rep); }
              break;
            }
          }
        }
      }
    } catch (e) { /* template matching is best-effort */ }


    try { window._rbDL = (dict && dict.dl) ? dict.dl : {}; } catch (e) { window._rbDL = {}; }
    try { window._rbDict = dict || {}; } catch (e) { window._rbDict = {}; }
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
  window.rbT = function (key) {
    var d = cache[currentLang];
    if (!d) return null;
    var v = get(d, key);
    return (typeof v === 'string') ? v : null;
  };

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

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

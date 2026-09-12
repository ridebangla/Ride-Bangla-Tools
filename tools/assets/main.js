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

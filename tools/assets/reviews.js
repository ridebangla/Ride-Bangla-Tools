/* ==========================================================================
   Ride Bangla Tools — public Reviews section (assets/reviews.js)
   Displays community reviews and lets visitors write one after a quick
   Google sign-in (Firebase Auth). Data lives on the AI backend's public
   reviews API (site=tools); no API keys are ever exposed client-side.
   ========================================================================== */
(function () {
  'use strict';

  var SITE_KEY = 'rbsite-00f37b79c72f4e678febbd82d43bb46c'; // public site key
  var REVIEWS_API = 'https://ai.ridebangla.bd/api/public/reviews';
  var FB_CONFIG_API = 'https://ai.ridebangla.bd/api/public/firebase-config';
  var FB_SDK_VER = '10.12.5';

  var root = document.getElementById('rb-reviews');
  if (!root) return;

  var STAR = 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.6 6.8L12 17l-6.2 3.4 1.6-6.8-5.2-4.6 6.9-.7z';

  function starSvg(filled, cls) {
    return '<svg class="' + (cls || 'rb-star') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '"/></svg>';
  }

  function starsRow(avg) {
    var out = '<span class="rb-stars" role="img" aria-label="' + avg.toFixed(1) + ' out of 5 stars">';
    for (var i = 1; i <= 5; i++) {
      var f = Math.max(0, Math.min(1, avg - (i - 1)));
      out += '<span class="rb-star-wrap">' + starSvg(false) +
        '<span class="rb-star-fill" style="width:' + Math.round(f * 100) + '%">' + starSvg(true) + '</span></span>';
    }
    return out + '</span>';
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  }

  function friendlyError(msg) {
    if (!msg) return 'Sorry — that did not work. Please try again in a moment.';
    if (/rate|limit|429/i.test(msg)) return 'You have already shared a review recently. Please try again tomorrow.';
    if (/unauthorized|domain|auth\//i.test(msg)) return 'Sign-in did not complete — please try again, or contact us via the Help Center.';
    if (/network|fetch/i.test(msg)) return 'Could not reach our servers — check your connection and try again.';
    return 'Sorry — that did not work. Please try again in a moment.';
  }

  /* ------------------------- render review list ------------------------- */
  var avgEl = root.querySelector('[data-rb="avg"]');
  var countEl = root.querySelector('[data-rb="count"]');
  var listEl = root.querySelector('[data-rb="list"]');
  var formZone = root.querySelector('[data-rb="form-zone"]');
  var statusEl = root.querySelector('[data-rb="status"]');

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg || ''; }

  function renderSummary(average, count) {
    if (!avgEl || !countEl) return;
    avgEl.innerHTML = starsRow(Number(average) || 0) +
      '<strong>' + (Number(average) || 0).toFixed(1) + '</strong>';
    countEl.textContent = count === 1 ? '1 review' : (count || 0) + ' reviews';
  }

  function renderList(reviews) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!reviews || !reviews.length) {
      var empty = el('p', 'rb-review-empty', 'No reviews yet — be the first to share your experience.');
      listEl.appendChild(empty);
      return;
    }
    reviews.forEach(function (r) {
      var card = el('article', 'rb-review-card');
      var head = el('div', 'rb-review-head');
      var name = el('strong', 'rb-review-name', String(r.name || 'Verified visitor').slice(0, 40));
      head.appendChild(name);
      var s = el('span'); s.innerHTML = starsRow(Number(r.rating) || 5);
      head.appendChild(s);
      card.appendChild(head);
      var text = el('p', 'rb-review-text', String(r.text || '').slice(0, 1000));
      card.appendChild(text);
      var date = fmtDate(r.createdAt);
      if (date) card.appendChild(el('div', 'rb-review-date', date));
      listEl.appendChild(card);
    });
  }

  async function loadReviews() {
    try {
      var res = await fetch(REVIEWS_API + '?site=tools&siteKey=' + encodeURIComponent(SITE_KEY), { method: 'GET' });
      if (!res.ok) throw new Error('http-' + res.status);
      var d = await res.json();
      if (!d || d.ok !== true) throw new Error('bad-response');
      renderSummary(d.average, d.count);
      renderList(d.reviews);
      return d;
    } catch (e) {
      renderSummary(0, 0);
      if (listEl) listEl.appendChild(el('p', 'rb-review-empty', 'Reviews are temporarily unavailable — please check back later.'));
      return null;
    }
  }

  /* ------------------------- Firebase + Google sign-in ------------------ */
  var firebaseApp = null, firebaseAuth = null, sdkLoading = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('sdk')); };
      document.head.appendChild(s);
    });
  }

  async function ensureAuth() {
    if (firebaseAuth) return firebaseAuth;
    if (sdkLoading) return sdkLoading;
    sdkLoading = (async function () {
      if (!window.firebase) {
        await loadScript('https://www.gstatic.com/firebasejs/' + FB_SDK_VER + '/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/' + FB_SDK_VER + '/firebase-auth-compat.js');
      }
      var cfgRes = await fetch(FB_CONFIG_API + '?siteKey=' + encodeURIComponent(SITE_KEY));
      if (!cfgRes.ok) throw new Error('config');
      var cfg = await cfgRes.json();
      if (!cfg || !cfg.apiKey) throw new Error('config');
      if (!firebaseApp) {
        firebaseApp = firebase.initializeApp(cfg);
        firebaseAuth = firebase.auth();
      }
      return firebaseAuth;
    })();
    try { return await sdkLoading; } finally { sdkLoading = null; }
  }

  async function googleSignIn() {
    var auth = await ensureAuth();
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    var cred = await auth.signInWithPopup(provider);
    return { user: cred.user, token: await cred.user.getIdToken() };
  }

  /* ------------------------------- write UI ----------------------------- */
  var state = { token: null, name: '' };

  function renderSignIn() {
    formZone.innerHTML = '';
    var box = el('div', 'rb-review-signin');
    box.appendChild(el('p', '', 'Sign in with Google to write a review.'));
    var btn = el('button', 'rb-btn rb-btn-gold', 'Continue with Google');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      btn.disabled = true; setStatus('');
      googleSignIn().then(function (r) {
        state.token = r.token;
        state.name = (r.user.displayName || '').slice(0, 40);
        renderForm();
      }).catch(function (e) {
        btn.disabled = false;
        setStatus(friendlyError(e && e.message));
      });
    });
    box.appendChild(btn);
    formZone.appendChild(box);
  }

  function renderForm() {
    formZone.innerHTML = '';
    var box = el('div', 'rb-review-form');
    var rating = 5;
    var stars = el('div', 'rb-review-pick');
    var starBtns = [];
    for (var i = 1; i <= 5; i++) {
      (function (v) {
        var b = el('button', 'rb-pick-star on', '');
        b.type = 'button';
        b.setAttribute('aria-label', v + ' star' + (v > 1 ? 's' : ''));
        b.innerHTML = starSvg(true);
        b.addEventListener('click', function () {
          rating = v;
          starBtns.forEach(function (x, idx) { x.classList.toggle('on', idx < v); });
        });
        starBtns.push(b); stars.appendChild(b);
      })(i);
    }
    box.appendChild(stars);
    var nameInput = el('input', 'rb-review-input');
    nameInput.placeholder = 'Your name';
    nameInput.maxLength = 40;
    nameInput.value = state.name;
    // The reviewer name is the VERIFIED Google account name from the ID
    // token — never a free-text field. An editable name would let anyone
    // post reviews impersonating other people (e.g. the Ride Bangla team).
    nameInput.readOnly = true;
    nameInput.title = 'Reviews are posted under your Google account name.';
    box.appendChild(nameInput);
    var textArea = el('textarea', 'rb-review-input rb-review-textarea');
    textArea.placeholder = 'What do you like about Ride Bangla Tools?';
    textArea.maxLength = 1000;
    textArea.rows = 4;
    box.appendChild(textArea);
    var submit = el('button', 'rb-btn rb-btn-gold', 'Post review');
    submit.type = 'button';
    submit.addEventListener('click', function () {
      var text = textArea.value.trim();
      if (!text) { setStatus('Please write a few words first.'); return; }
      submit.disabled = true; setStatus('');
      fetch(REVIEWS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteKey: SITE_KEY, site: 'tools',
          idToken: state.token, rating: rating,
          name: state.name,
          text: text
        })
      }).then(function (res) {
        return res.json().then(function (d) { return { status: res.status, body: d }; });
      }).then(function (r) {
        if (r.status === 200 && r.body && r.body.ok === true) {
          setStatus('Thank you — your review is live.');
          loadReviews();
          setTimeout(function () { formZone.innerHTML = ''; }, 3000);
        } else {
          submit.disabled = false;
          setStatus(friendlyError((r.body && (r.body.message || r.body.error)) || ('http-' + r.status)));
        }
      }).catch(function () {
        submit.disabled = false;
        setStatus('Could not reach our servers — check your connection and try again.');
      });
    });
    box.appendChild(submit);
    formZone.appendChild(box);
  }

  var writeBtn = root.querySelector('[data-rb="write"]');
  if (writeBtn) {
    writeBtn.addEventListener('click', function () {
      renderSignIn();
      formZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  loadReviews();
})();

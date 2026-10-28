/* ==========================================================================
   Ride Bangla Tools — public Reviews section (assets/reviews.js)
   CANONICAL SYSTEM (Reviews-System round, 2026-10-23): aligned with the
   MAIN website (src/lib/reviews.ts + ReviewsSection.tsx) — data lives in
   Firestore collection `website_reviews`; the public feed is the APPROVED
   pool (status == "approved", newest first, limit 24) read directly via
   the Firebase compat SDK; a review is written after Google sign-in with
   doc id == uid, status "pending" (admin-moderated -> approved) and
   source "google", exactly the shape the deployed rules allow.
   PREVIOUSLY this file read a different pool (`site_reviews`, served by
   https://ai.ridebangla.bd/api/public/reviews?site=tools) — a separate,
   server-mediated pool. That API returned HTTP 500 with
   {"ok":false,"error":"Could not load reviews right now."} throughout the
   2026-10-23 morning while project Firestore answered direct REST reads
   with 429 RESOURCE_EXHAUSTED (quota), and the old loader's catch block
   rendered that failure as a fake "0.0 / 0 reviews" summary. This loader
   therefore: retries transient failures with backoff, caches the last
   good result in localStorage, and NEVER renders a failed load as zero
   reviews (failure, cached and empty are three distinct honest states).
   No API keys are hard-coded: the public Firebase web config is fetched
   at runtime from the established config endpoint, as before.
   ========================================================================== */
(function () {
  'use strict';

  var SITE_KEY = 'rbsite-00f37b79c72f4e678febbd82d43bb46c'; // public site key
  var FB_CONFIG_API = 'https://ai.ridebangla.bd/api/public/firebase-config';
  var FB_SDK_VER = '10.12.5';
  var COLLECTION = 'website_reviews';
  var MAX_REVIEWS = 24;
  var CACHE_KEY = 'rb-tools-reviews-cache-v2';
  // HEAD-GRAFT (fix-all-remaining, 2026-10-28): per-site summaries on the
  // TRUE HEAD base. The held (a) rewrite's SOURCE_SITES enum is reused
  // ONLY as the validation list for aggregates; no card badge, Google-only
  // gate, pagination, embedded-config or sign-out change from (a) is
  // included here. Labels are the (c) summary labels, never invented.
  var SOURCE_SITES = ['studio', 'tools', 'ai', 'main', 'it'];
  var SITE_SUMMARY_ORDER = [
    { key: 'tools', label: 'Ride Bangla Tools', thisSite: true },
    { key: 'main', label: 'Ride Bangla Main Website' },
    { key: 'ai', label: 'Ride Bangla AI' },
    { key: 'studio', label: 'Ride Bangla Studio' },
    { key: 'it', label: 'Ride Bangla IT Team' }
  ];
  var TRUNCATE = 80; // Main ReviewsSection compact-card truncation

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

  function friendlyError(err) {
    var msg = '';
    var code = '';
    if (err && typeof err === 'object') {
      code = err.code || '';
      msg = err.message || '';
      try { console.error('[rb-reviews]', code || '(no code)', msg); } catch (e) {}
    } else if (typeof err === 'string') {
      msg = err;
    }
    var hay = (code + ' ' + msg);
    if (/rate|limit|429|resource-exhausted/i.test(hay)) return 'Reviews are busy right now — please try again later.';
    if (code === 'auth/unauthorized-domain' || /unauthorized-domain/i.test(hay)) return 'Sign-in is not enabled for this website address yet — please tell us via the Help Center and we will fix it.';
    if (code === 'auth/operation-not-allowed' || /operation-not-allowed/i.test(hay)) return 'Google sign-in is not switched on yet — please tell us via the Help Center and we will fix it.';
    if (code === 'auth/popup-blocked' || /popup-blocked/i.test(hay)) return 'Your browser blocked the sign-in window — allow popups for this site, or try again and we will use a full-page sign-in.';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || /popup-closed|cancelled-popup/i.test(hay)) return 'The sign-in window was closed before finishing — tap Continue with Google to try again.';
    if (code === 'auth/network-request-failed' || /network|failed to fetch/i.test(hay)) return 'Could not reach our servers — check your connection and try again.';
    if (msg === 'config' || msg === 'sdk') return 'Sign-in is unavailable right now — please try again later, or reach us via the Help Center.';
    if (/unauthorized|domain|auth\//i.test(hay)) return 'Sign-in did not complete — please try again, or contact us via the Help Center.';
    return 'Sorry — that did not work. Please try again in a moment.';
  }

  /* ------------------------------ summary ------------------------------ */
  var avgEl = root.querySelector('[data-rb="avg"]');
  var countEl = root.querySelector('[data-rb="count"]');
  var distEl = root.querySelector('[data-rb="dist"]');
  var siteSummariesEl = root.querySelector('[data-rb="site-summaries"]');
  var listEl = root.querySelector('[data-rb="list"]');
  var formZone = root.querySelector('[data-rb="form-zone"]');
  var statusEl = root.querySelector('[data-rb="status"]');

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg || ''; }

  // Summary math matches Main's useReviews(): average + count computed
  // from the fetched approved pool itself; plus the owner-required
  // per-star distribution (count + % of the same pool, never invented).
  function computeStats(reviews) {
    var count = reviews.length;
    var sum = 0;
    var perStar = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(function (r) {
      var rating = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
      if (rating >= 1) { sum += rating; perStar[rating]++; }
    });
    return { average: count ? sum / count : 0, count: count, perStar: perStar };
  }

  function renderSummary(stats) {
    if (avgEl) {
      avgEl.innerHTML = starsRow(stats.average) + '<strong>' + stats.average.toFixed(1) + '</strong>';
    }
    if (countEl) countEl.textContent = stats.count === 1 ? '1 review' : stats.count + ' reviews';
    if (distEl) {
      distEl.innerHTML = '';
      if (stats.count > 0) {
        var box = el('div', 'rb-dist');
        [5, 4, 3, 2, 1].forEach(function (star) {
          var n = stats.perStar[star] || 0;
          var pct = stats.count ? Math.round((n / stats.count) * 100) : 0;
          var row = el('div', 'rb-dist-row');
          row.appendChild(el('span', 'rb-dist-label', star + '★'));
          var bar = el('span', 'rb-dist-bar');
          var fill = el('span', 'rb-dist-fill');
          fill.style.width = pct + '%';
          bar.appendChild(fill);
          row.appendChild(bar);
          row.appendChild(el('span', 'rb-dist-num', pct + '% (' + n + ')'));
          box.appendChild(row);
        });
        distEl.appendChild(box);
      }
    }
  }

  function renderUnavailableSummary() {
    // A failed load is NOT "0.0 / 0 reviews" — that was the old bug.
    if (avgEl) avgEl.innerHTML = starsRow(0) + '<strong>–</strong>';
    if (countEl) countEl.textContent = 'Reviews unavailable';
    if (distEl) distEl.innerHTML = '';
  }

  /* ------------- per-site rating summaries (HEAD graft) ------------- */
  // Aggregates cover the FULL approved pool (see fetchAggregatePool) —
  // never the 24-review loaded page alone. Attribution is exact only:
  // a doc counts toward a site ONLY when its sourceSite is one of the
  // five enum values; every other doc (missing/invalid sourceSite)
  // counts ONLY toward the legacy row, never toward any site. Averages
  // reuse computeStats, so per-site rows and the overall row use the
  // same rating math as the main summary and sum consistently.
  // Adapted from unified-reviews-completion (c); the (c) text that
  // depended on the held rewrite's pagination state and its
  // two-argument summary rendering is NOT copied: HEAD has neither,
  // so the wiring below uses HEAD's own fetch and summary functions.
  function computeSiteAggregates(pool) {
    var groups = {};
    SITE_SUMMARY_ORDER.forEach(function (s) { groups[s.key] = []; });
    var legacy = [];
    pool.forEach(function (r) {
      if (r.sourceSite && groups.hasOwnProperty(r.sourceSite)) groups[r.sourceSite].push(r);
      else legacy.push(r);
    });
    return { groups: groups, legacy: legacy, overall: computeStats(pool) };
  }

  function siteSummaryRow(label, stats, opts) {
    opts = opts || {};
    var row = el('li', 'rb-site-summary-row' + (opts.rowClass ? ' ' + opts.rowClass : ''));
    row.appendChild(el('span', 'rb-site-summary-name', label));
    if (opts.thisSite) row.appendChild(el('span', 'rb-review-site', 'This website'));
    if (!stats || stats.count === 0) {
      // Honest empty state: no average, NO stars presented as a rating.
      row.appendChild(el('span', 'rb-site-summary-empty', 'No reviews yet'));
    } else {
      var rating = el('span', 'rb-site-summary-rating');
      rating.innerHTML = starsRow(stats.average);
      rating.appendChild(el('strong', '', stats.average.toFixed(1)));
      rating.appendChild(el('span', 'rb-site-summary-count',
        '(' + stats.count + (stats.count === 1 ? ' review)' : ' reviews)')));
      row.appendChild(rating);
    }
    return row;
  }

  // pool === null means the aggregate read failed: heading + an honest
  // note, never numbers. An empty pool ([]) renders every row as
  // "No reviews yet" — again no fake average, no stars as a rating.
  function renderSiteSummaries(pool) {
    if (!siteSummariesEl) return;
    siteSummariesEl.innerHTML = '';
    var box = el('div', 'rb-site-summaries');
    box.appendChild(el('h4', 'rb-site-summary-title', 'Ratings across Ride Bangla websites'));
    if (pool === null) {
      box.appendChild(el('p', 'rb-site-summary-note', 'Per-site ratings are temporarily unavailable.'));
      siteSummariesEl.appendChild(box);
      return;
    }
    var agg = computeSiteAggregates(pool);
    var list = el('ul', 'rb-site-summary-list');
    SITE_SUMMARY_ORDER.forEach(function (s) {
      list.appendChild(siteSummaryRow(s.label, computeStats(agg.groups[s.key]), { thisSite: !!s.thisSite }));
    });
    list.appendChild(siteSummaryRow('Reviews with source not recorded', computeStats(agg.legacy),
      { rowClass: 'rb-site-summary-legacy' }));
    list.appendChild(siteSummaryRow('All websites', agg.overall, { rowClass: 'rb-site-summary-overall' }));
    box.appendChild(list);
    box.appendChild(el('p', 'rb-site-summary-note', 'Based on all approved reviews across Ride Bangla websites.'));
    siteSummariesEl.appendChild(box);
  }

  /* --------------------------- review cards ---------------------------- */
  var GOOGLE_G = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-9z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5l-3.9 3C3.3 21.3 7.4 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-3.9-3C.5 9.3 0 10.6 0 12s.5 2.7 1.3 3.9l3.9-3z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.3 2.7 1.3 6.6l3.9 3c.9-2.9 3.6-4.9 6.8-4.9z"/></svg>';

  function initialsFor(name) {
    var parts = String(name || '').split(' ').filter(Boolean).slice(0, 2);
    var s = parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
    return s || 'R';
  }

  function avatarNode(r) {
    var url = typeof r.photoURL === 'string' ? r.photoURL : '';
    if (url && /^https:\/\//i.test(url)) {
      var img = el('img', 'rb-review-avatar');
      img.src = url;
      img.alt = String(r.name || 'Reviewer');
      img.setAttribute('referrerpolicy', 'no-referrer');
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        var fb = el('span', 'rb-review-initials', initialsFor(r.name));
        if (img.parentNode) img.parentNode.replaceChild(fb, img);
      });
      return img;
    }
    return el('span', 'rb-review-initials', initialsFor(r.name));
  }

  function reviewCard(r) {
    var card = el('article', 'rb-review-card');
    var head = el('div', 'rb-review-head');
    head.appendChild(avatarNode(r));
    var idCol = el('div', 'rb-review-id');
    idCol.appendChild(el('strong', 'rb-review-name', String(r.name || 'Verified visitor').slice(0, 40)));
    var s = el('span'); s.innerHTML = starsRow(Number(r.rating) || 5);
    idCol.appendChild(s);
    head.appendChild(idCol);
    card.appendChild(head);
    // Compact cards (Main pattern): long text truncates at 80 chars with
    // a See more / See less toggle instead of stretching the card.
    var full = String(r.text || '').slice(0, 600);
    var textEl = el('p', 'rb-review-text', full.length > TRUNCATE ? full.slice(0, TRUNCATE).trim() + '…' : full);
    card.appendChild(textEl);
    if (full.length > TRUNCATE) {
      var more = el('button', 'rb-review-more', 'See more');
      more.type = 'button';
      var expanded = false;
      more.addEventListener('click', function () {
        expanded = !expanded;
        textEl.textContent = expanded ? full : full.slice(0, TRUNCATE).trim() + '…';
        more.textContent = expanded ? 'See less' : 'See more';
      });
      card.appendChild(more);
    }
    var meta = el('div', 'rb-review-meta');
    // Verified chip ONLY when the stored record proves Google sign-in
    // (Main renders it when source == "google").
    if (r.source === 'google') {
      var pill = el('span', 'rb-review-verified');
      pill.innerHTML = GOOGLE_G;
      pill.appendChild(document.createTextNode('Verified Google account'));
      meta.appendChild(pill);
    }
    var date = fmtDate(r.createdAt);
    if (date) meta.appendChild(el('span', 'rb-review-date', date));
    if (meta.childNodes.length) card.appendChild(meta);
    return card;
  }

  /* --------------------- slider (Main pattern, 4s) -------------------- */
  var carousel = { timer: null, index: 0, count: 0, paused: false, track: null, slides: [] };

  function visibleCount() {
    var w = window.innerWidth || 1024;
    if (w < 640) return 1;
    if (w < 1024) return 2;
    return 4;
  }

  function maxIndex() { return Math.max(0, carousel.count - visibleCount()); }

  function layoutCarousel() {
    if (!carousel.track) return;
    var vis = visibleCount();
    var w = (100 / vis) + '%';
    carousel.slides.forEach(function (s) { s.style.width = w; });
    if (carousel.index > maxIndex()) carousel.index = maxIndex();
    carousel.track.style.transform = 'translateX(-' + (carousel.index * (100 / vis)) + '%)';
    var dots = listEl.querySelectorAll('.rb-dot');
    dots.forEach(function (d, i) { d.classList.toggle('on', i === carousel.index); });
  }

  function goToSlide(i) {
    var max = maxIndex();
    if (max <= 0) { carousel.index = 0; layoutCarousel(); return; }
    carousel.index = ((i % (max + 1)) + (max + 1)) % (max + 1);
    layoutCarousel();
  }

  function stopCarousel() { if (carousel.timer) { clearInterval(carousel.timer); carousel.timer = null; } }

  function startCarousel() {
    stopCarousel();
    if (maxIndex() <= 0) return;
    carousel.timer = setInterval(function () {
      if (carousel.paused) return;
      goToSlide(carousel.index + 1);
    }, 4000); // Main ReviewsSection: auto-advance every 4 seconds
  }

  function renderList(reviews) {
    if (!listEl) return;
    stopCarousel();
    carousel.track = null; carousel.slides = []; carousel.index = 0; carousel.count = 0;
    listEl.innerHTML = '';
    if (!reviews || !reviews.length) {
      listEl.appendChild(el('p', 'rb-review-empty', 'No reviews yet — be the first to share your experience.'));
      return;
    }
    carousel.count = reviews.length;
    var wrap = el('div', 'rb-carousel');
    var viewport = el('div', 'rb-carousel-viewport');
    var track = el('div', 'rb-carousel-track');
    reviews.forEach(function (r) {
      var slide = el('div', 'rb-carousel-slide');
      slide.appendChild(reviewCard(r));
      track.appendChild(slide);
      carousel.slides.push(slide);
    });
    viewport.appendChild(track);
    wrap.appendChild(viewport);
    carousel.track = track;

    if (maxIndex() > 0) {
      var prev = el('button', 'rb-carousel-btn rb-carousel-prev', '');
      prev.type = 'button'; prev.setAttribute('aria-label', 'Previous reviews');
      prev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7"/></svg>';
      prev.addEventListener('click', function () { goToSlide(carousel.index - 1); });
      var next = el('button', 'rb-carousel-btn rb-carousel-next', '');
      next.type = 'button'; next.setAttribute('aria-label', 'Next reviews');
      next.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
      next.addEventListener('click', function () { goToSlide(carousel.index + 1); });
      wrap.appendChild(prev); wrap.appendChild(next);
    }
    listEl.appendChild(wrap);

    var pages = maxIndex() + 1;
    if (pages > 1) {
      var dots = el('div', 'rb-carousel-dots');
      var shown = Math.min(5, pages);
      for (var i = 0; i < shown; i++) {
        (function (idx) {
          var d = el('button', 'rb-dot', '');
          d.type = 'button';
          d.setAttribute('aria-label', 'Go to slide ' + (idx + 1));
          d.addEventListener('click', function () { goToSlide(idx); });
          dots.appendChild(d);
        })(i);
      }
      listEl.appendChild(dots);
    }

    wrap.addEventListener('mouseenter', function () { carousel.paused = true; });
    wrap.addEventListener('mouseleave', function () { carousel.paused = false; });
    wrap.addEventListener('touchstart', function () { carousel.paused = true; }, { passive: true });
    wrap.addEventListener('touchend', function () { carousel.paused = false; }, { passive: true });

    layoutCarousel();
    startCarousel();
  }

  window.addEventListener('resize', function () { layoutCarousel(); });

  /* ------------------- Firebase bootstrap (config API) ------------------ */
  var firebaseApp = null, firebaseAuth = null, firestoreDb = null, sdkLoading = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('sdk')); };
      document.head.appendChild(s);
    });
  }

  async function ensureFirebase(needAuth) {
    if (firebaseApp && (!needAuth || firebaseAuth)) {
      return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
    }
    if (sdkLoading) await sdkLoading;
    else {
      sdkLoading = (async function () {
        if (!window.firebase) {
          await loadScript('https://www.gstatic.com/firebasejs/' + FB_SDK_VER + '/firebase-app-compat.js');
        }
        if (!firebase.firestore) await loadScript('https://www.gstatic.com/firebasejs/' + FB_SDK_VER + '/firebase-firestore-compat.js');
        if (needAuth && !firebase.auth) await loadScript('https://www.gstatic.com/firebasejs/' + FB_SDK_VER + '/firebase-auth-compat.js');
        if (!firebaseApp) {
          var cfgRes = await fetch(FB_CONFIG_API + '?siteKey=' + encodeURIComponent(SITE_KEY));
          if (!cfgRes.ok) throw new Error('config');
          var cfg = await cfgRes.json();
          if (!cfg || !cfg.apiKey) throw new Error('config');
          firebaseApp = firebase.initializeApp(cfg);
          firestoreDb = firebase.firestore();
        }
        if (needAuth && !firebaseAuth) {
          firebaseAuth = firebase.auth();
          // Session persistence (owner order 2026-10-23: a signed-in user must
          // not be asked to sign in again on every visit): keep the reviewer
          // signed in across reloads, new tabs and browser restarts. LOCAL is
          // the compat SDK's default, but set it explicitly so the behaviour
          // never silently depends on an SDK default changing.
          try { await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
        }
      })();
      try { await sdkLoading; } finally { sdkLoading = null; }
    }
    if (needAuth && !firebaseAuth) {
      if (!firebase.auth) await loadScript('https://www.gstatic.com/firebasejs/' + FB_SDK_VER + '/firebase-auth-compat.js');
      firebaseAuth = firebase.auth();
      try { await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
    }
    return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, ms); })
    ]);
  }

  function normalizeDoc(doc) {
    var d = doc.data() || {};
    var created = null;
    try { if (d.created_at && typeof d.created_at.toDate === 'function') created = d.created_at.toDate().toISOString(); } catch (e) {}
    return {
      name: typeof d.name === 'string' ? d.name.trim() : '',
      photoURL: (typeof d.photo_url === 'string' && /^https:\/\//i.test(d.photo_url)) ? d.photo_url : '',
      rating: (typeof d.rating === 'number') ? Math.min(5, Math.max(1, Math.round(d.rating))) : 0,
      text: typeof d.comment === 'string' ? d.comment.trim() : '',
      source: typeof d.source === 'string' ? d.source : null,
      sourceSite: (function () {
        var s = typeof d.sourceSite === 'string' ? d.sourceSite : null;
        return SOURCE_SITES.indexOf(s) >= 0 ? s : null;
      })(),
      createdAt: created
    };
  }

  async function fetchApprovedReviews() {
    var fb = await ensureFirebase(false);
    var col = fb.db.collection(COLLECTION);
    try {
      var snap = await withTimeout(
        col.where('status', '==', 'approved').orderBy('created_at', 'desc').limit(MAX_REVIEWS).get(), 12000);
      return snap.docs.map(normalizeDoc).filter(function (r) { return r.name && r.text; });
    } catch (primaryErr) {
      // Main's fallback: keep working if the composite index is missing —
      // unordered approved query, sorted + sliced client-side.
      try { console.error('[rb-reviews] primary query failed, trying fallback', primaryErr && primaryErr.code, primaryErr && primaryErr.message); } catch (e) {}
      var snap2 = await withTimeout(col.where('status', '==', 'approved').get(), 12000);
      var all = snap2.docs.map(normalizeDoc).filter(function (r) { return r.name && r.text; });
      all.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
      return all.slice(0, MAX_REVIEWS);
    }
  }

  // Dedicated aggregate read (HEAD graft): the per-site summaries MUST
  // cover the FULL approved pool, so they are never computed from the
  // 24-review loaded page alone. This query is deliberately UNCAPPED
  // (no limit). HEAD DIFFERENCE from (c): (c) reused the fallback pool
  // when the fallback already held it; HEAD's fetchApprovedReviews
  // slices its fallback pool to 24, so no full pool is available to
  // reuse — this graft therefore runs the dedicated read on EVERY
  // successful load (at most one extra uncapped read per load). If the
  // pool ever grows large, the honest fix is a server-side aggregate —
  // not a page-sliced estimate presented as a total.
  async function fetchAggregatePool() {
    var fb = await ensureFirebase(false);
    var col = fb.db.collection(COLLECTION);
    var snap = await withTimeout(col.where('status', '==', 'approved').get(), 12000);
    var all = snap.docs.map(normalizeDoc).filter(function (r) { return r.name && r.text; });
    all.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
    return all;
  }

  /* ------------------------- cache (last good) ------------------------- */
  function saveCache(reviews, stats) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), reviews: reviews, stats: stats })); } catch (e) {}
  }
  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.reviews)) return null;
      return d;
    } catch (e) { return null; }
  }

  function renderFailure() {
    // The summaries block has no cached aggregate pool to draw on (the
    // cache stores the loaded page only), so on ANY failure it renders
    // the honest unavailable note — never page-sliced numbers.
    renderSiteSummaries(null);
    var cached = readCache();
    if (cached && cached.reviews.length) {
      renderSummary(cached.stats || computeStats(cached.reviews));
      renderList(cached.reviews);
      if (listEl) {
        var note = el('p', 'rb-review-note', 'Showing the last loaded reviews — we could not refresh them just now.');
        listEl.appendChild(note);
      }
      return;
    }
    renderUnavailableSummary();
    if (listEl) {
      listEl.innerHTML = '';
      var box = el('div', 'rb-review-fail');
      box.appendChild(el('p', 'rb-review-empty', 'Reviews are temporarily unavailable — please check back later.'));
      var retry = el('button', 'rb-btn rb-btn-gold', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', function () { loadReviews(); });
      box.appendChild(retry);
      listEl.appendChild(box);
    }
  }

  async function loadReviews() {
    var delays = [0, 900, 2200]; // 3 attempts, backoff on transient failure
    var lastErr = null;
    for (var attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt]) await new Promise(function (r) { setTimeout(r, delays[attempt]); });
      try {
        var reviews = await fetchApprovedReviews();
        var stats = computeStats(reviews);
        renderSummary(stats);
        // Full-pool aggregates: run the dedicated aggregate read. An
        // aggregate failure must NOT break the cards: the summaries
        // block then renders its unavailable note.
        var aggregatePool = null;
        try { aggregatePool = await fetchAggregatePool(); } catch (aggErr) {
          try { console.error('[rb-reviews] aggregate read failed', aggErr && aggErr.code, aggErr && aggErr.message); } catch (e2) {}
          aggregatePool = null;
        }
        renderSiteSummaries(aggregatePool);
        renderList(reviews);
        saveCache(reviews, stats);
        setStatus('');
        return reviews;
      } catch (e) {
        lastErr = e;
        try { console.error('[rb-reviews] load attempt ' + (attempt + 1) + ' failed', e && e.code, e && e.message); } catch (e2) {}
      }
    }
    try { console.error('[rb-reviews] all load attempts failed', lastErr && lastErr.message); } catch (e) {}
    renderFailure();
    return null;
  }

  /* ------------------------- Google sign-in ---------------------------- */
  function isMobileBrowser() {
    try {
      var ua = navigator.userAgent || '';
      if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
      if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return true;
    } catch (e) {}
    return false;
  }

  async function googleSignIn() {
    var fb = await ensureFirebase(true);
    var auth = fb.auth;
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      var cred = await auth.signInWithPopup(provider);
      return cred.user;
    } catch (e) {
      var code = (e && e.code) || '';
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request' ||
          code === 'auth/popup-closed-by-user' || isMobileBrowser()) {
        try { sessionStorage.setItem('rb-review-redirect', '1'); } catch (e2) {}
        await auth.signInWithRedirect(provider);
        return null;
      }
      throw e;
    }
  }

  async function handleRedirectResult() {
    var flagged = false;
    try { flagged = !!sessionStorage.getItem('rb-review-redirect'); } catch (e) {}
    if (!flagged) return;
    try { sessionStorage.removeItem('rb-review-redirect'); } catch (e) {}
    try {
      var fb = await ensureFirebase(true);
      var cred = await fb.auth.getRedirectResult();
      if (cred && cred.user) {
        state.user = cred.user;
        state.name = (cred.user.displayName || '').slice(0, 40);
        setStatus('Signed in — write your review below.');
        renderForm();
      }
    } catch (e) {
      setStatus(friendlyError(e));
    }
  }

  /* ------------------- session restore (persistence) -------------------
     A popup/redirect sign-in puts the signed-in user only in the in-memory
     `state` below, so without this restore a signed-in reviewer was asked
     to sign in again on EVERY reload, new tab and browser restart, even
     though Firebase Auth itself keeps the user in LOCAL persistence.
     Restore that persisted user once on load and hand it to the write form. */
  var sessionReady = null;
  function restoreSession() {
    if (sessionReady) return sessionReady;
    sessionReady = (async function () {
      try {
        var fb = await ensureFirebase(true);
        var auth = fb.auth;
        return await new Promise(function (resolve) {
          var done = false;
          var unsub = auth.onAuthStateChanged(function (user) {
            if (done) return; done = true;
            if (unsub) unsub();
            if (user) {
              state.user = user;
              state.name = (user.displayName || '').slice(0, 40);
            }
            resolve(!!user);
          });
          // Never let the Write button wait forever on a stuck listener.
          setTimeout(function () { if (!done) { done = true; resolve(!!state.user); } }, 8000);
        });
      } catch (e) { return false; }
    })();
    return sessionReady;
  }

  /* ------------------------------- write UI ----------------------------- */
  var state = { user: null, name: '' };

  function renderSignIn() {
    formZone.innerHTML = '';
    var box = el('div', 'rb-review-signin');
    box.appendChild(el('p', '', 'Sign in with Google to write a review.'));
    var btn = el('button', 'rb-btn rb-btn-gold', 'Continue with Google');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      btn.disabled = true; setStatus('');
      googleSignIn().then(function (user) {
        if (!user) return; // redirect sign-in in progress
        state.user = user;
        state.name = (user.displayName || '').slice(0, 40);
        renderForm();
      }).catch(function (e) {
        btn.disabled = false;
        setStatus(friendlyError(e));
      });
    });
    box.appendChild(btn);
    formZone.appendChild(box);
  }

  // Write path = Main's submitReview(): doc id == uid in website_reviews,
  // the exact field set the deployed rules validate (status "pending",
  // source "google", name/photo bound to the Google account).
  async function submitReview(user, rating, comment) {
    var fb = await ensureFirebase(true);
    var db = fb.db;
    var name = (user.displayName || '').trim();
    var text = comment.trim();
    if (!name) throw new Error('Your Google account name is required to publish a review.');
    if (rating < 1 || rating > 5) throw new Error('Please choose a star rating between 1 and 5.');
    if (text.length < 2) throw new Error('Please write a short comment about your experience.');
    if (text.length > 600) throw new Error('Please keep your review under 600 characters.');
    var ref = db.collection(COLLECTION).doc(user.uid);
    var existing = await ref.get();
    if (existing.exists && existing.data().status === 'approved') {
      throw new Error('Your review is already published and can no longer be edited.');
    }
    var payload = {
      uid: user.uid,
      name: name.slice(0, 100),
      photo_url: user.photoURL || null,
      rating: Math.round(rating),
      comment: text,
      status: 'pending',
      source: 'google',
      created_at: existing.exists ? existing.data().created_at : firebase.firestore.FieldValue.serverTimestamp(),
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(payload);
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
    nameInput.readOnly = true;
    nameInput.title = 'Reviews are posted under your Google account name.';
    box.appendChild(nameInput);
    var textArea = el('textarea', 'rb-review-input rb-review-textarea');
    textArea.placeholder = 'What do you like about Ride Bangla Tools?';
    textArea.maxLength = 600;
    textArea.rows = 4;
    box.appendChild(textArea);
    var submit = el('button', 'rb-btn rb-btn-gold', 'Post review');
    submit.type = 'button';
    submit.addEventListener('click', function () {
      var text = textArea.value.trim();
      if (!text) { setStatus('Please write a few words first.'); return; }
      submit.disabled = true; setStatus('');
      submitReview(state.user, rating, text).then(function () {
        // Canonical moderation: a new review is "pending" until approved,
        // so it does NOT appear instantly — say exactly that.
        setStatus('Thank you — your review has been received and will appear here after a quick check.');
        setTimeout(function () { formZone.innerHTML = ''; }, 3000);
      }).catch(function (e) {
        submit.disabled = false;
        var isLib = e && typeof e === 'object' && 'code' in e;
        setStatus(isLib ? friendlyError(e) : (e && e.message) || friendlyError(e));
      });
    });
    box.appendChild(submit);
    formZone.appendChild(box);
  }

  var writeBtn = root.querySelector('[data-rb="write"]');
  if (writeBtn) {
    writeBtn.addEventListener('click', async function () {
      // If a persisted session exists, go straight to the review form —
      // a signed-in reviewer is never asked to sign in again. Awaiting the
      // one-time restore first also closes the race where a fast click
      // landed before onAuthStateChanged had delivered the saved user.
      if (!state.user) { try { await restoreSession(); } catch (e) {} }
      if (state.user) renderForm();
      else renderSignIn();
      formZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  loadReviews();
  handleRedirectResult();
  restoreSession();
})();

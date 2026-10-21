/* Ride Bangla Tools — AI helper (first-party API) + shared AI result panel
   Endpoint: POST /api/ai — this site's OWN serverless proxy
   (tools/api/ai.js, same origin). The proxy holds the provider keys
   (GROQ_API_KEY, GEMINI_API_KEY) in the ride-bangla-tools Vercel
   project env and runs the chain Groq -> Gemini. Provider keys NEVER
   touch this file or the browser.
   Auth: the site's PUBLIC siteKey in the JSON body (same key the chat
   widget uses — it identifies the site, grants no admin powers, and
   is MEANT to be public). The proxy checks it before spending quota.

   Every AI surface on this site (AI Tips buttons etc.) goes through
   RB_AI below; the browser never calls Groq/Gemini directly.

   Results and AI errors are shown in ONE shared panel (a lazily built
   overlay + card appended to <body> by this file) — never via a native alert.
   The panel renders the AI's markdown safely with RB_AI.renderMarkdown
   (all HTML is escaped first; only a small markdown subset is turned
   back into markup). aiButton success semantics: a page that passes a
   real onResult callback (the field-write tools) presents the result
   itself — the panel is NOT opened; a page without one gets the panel.
   Errors and the empty-prompt message ALWAYS go to the panel.
   RB_AI.showText(markdown, title) exposes the panel's content state so
   page code can present text in the panel whenever it needs to.
*/
(function () {
  'use strict';

  // ======== SINGLE CONFIGURATION POINT ========
  var AI_BACKEND_URL = '/api/ai';
  var AI_SITE_KEY = 'rbsite-00f37b79c72f4e678febbd82d43bb46c'; // public site key (docs example)
  // ============================================

  // Stable per-visitor caller id (rate-limit bucket = siteKey + callerId).
  // Persisted so one visitor keeps one bucket; namespaced per site.
  function callerId() {
    try {
      var k = 'rb_ai_caller';
      var v = localStorage.getItem(k);
      if (!v) {
        v = 'tools-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem(k, v);
      }
      return v;
    } catch (e) {
      return 'tools-anon';
    }
  }

  // Client-side throttle: min gap between AI calls (backs up the 30/min limit).
  var lastCall = 0;
  var MIN_GAP_MS = 2000;

  // Map our internal task names to the backend's allowlisted tasks.
  // Backend allows ONLY "chat" | "generate".
  function toBackendTask(task) {
    if (task === 'help-chat') return 'chat';
    return 'generate';
  }

  function systemFor(task) {
    if (task === 'help-chat') {
      return 'You are the Ride Bangla assistant on the Ride Bangla Tools help center ' +
        '(tools.ridebangla.bd — 67 free client-side tools, no signup). Answer helpfully and briefly ' +
        'about the tools, the company (Ride Bangla Limited, ridebangla.bd), and how to use the site. ' +
        'If asked about something unrelated, answer briefly and steer back to the tools.';
    }
    return 'You are a helpful assistant on Ride Bangla Tools (tools.ridebangla.bd), a site of 67 free ' +
      'client-side utilities. Give concise, practical answers.';
  }

  // i18n lookup with a proper English fallback. window.rbT(key) is
  // single-argument and returns null when the current language has no
  // such key (the en dictionary has no msg.* section at all), so the
  // fallback must be applied here with || — never passed to rbT.
  function rbText(key, fallback) {
    try {
      if (typeof window !== 'undefined' && typeof window.rbT === 'function') {
        var v = window.rbT(key);
        if (typeof v === 'string' && v) return v;
      }
    } catch (e) {}
    return fallback;
  }

  // Response-language directive: ask the model to answer in the language
  // the visitor picked in the site language selector.
  var LANG_NAMES = {
    en: 'English', bn: 'Bengali (Bangla)', ar: 'Arabic', de: 'German',
    es: 'Spanish', fr: 'French', hi: 'Hindi', id: 'Indonesian',
    it: 'Italian', ja: 'Japanese', ko: 'Korean', pl: 'Polish',
    pt: 'Portuguese', ru: 'Russian', tr: 'Turkish', zh: 'Chinese'
  };
  function responseLangName() {
    var code = 'en';
    try {
      if (typeof window !== 'undefined' && typeof window.rbGetLang === 'function') {
        code = window.rbGetLang() || 'en';
      }
    } catch (e) {}
    code = String(code).toLowerCase().split('-')[0];
    return LANG_NAMES[code] || 'English';
  }
  function withResponseLang(system) {
    return String(system == null ? '' : system) + ' Respond in ' + responseLangName() + '.';
  }

  // Check if AI is available (cached). Pages may hide/disable AI buttons when false.
  var aiAvailable = null;
  async function checkAI() {
    if (aiAvailable !== null) return aiAvailable;
    var r = await callAI('generate', 'Reply with the single word: ok', { maxTokens: 5, silent: true });
    aiAvailable = r.ok;
    return aiAvailable;
  }

  // Call the AI backend.
  // Returns {ok:true, result} or {ok:false, error|notConfigured|rateLimited|subscriptionPaused}
  async function callAI(task, prompt, opts) {
    opts = opts || {};
    prompt = String(prompt == null ? '' : prompt);
    if (!prompt.trim()) return { ok: false, error: 'empty-prompt' };

    // client-side throttle
    var now = Date.now();
    var wait = MIN_GAP_MS - (now - lastCall);
    if (wait > 0 && !opts.silent) {
      await new Promise(function (res) { setTimeout(res, wait); });
    }
    lastCall = Date.now();

    var btask = toBackendTask(task);
    var body = {
      siteKey: AI_SITE_KEY,
      task: btask,
      provider: 'auto',
      callerId: callerId(),
      maxTokens: Math.min(4000, opts.maxTokens || 1000),
      temperature: opts.temperature != null ? opts.temperature : 0.7
    };
    if (btask === 'chat') {
      body.input = {
        messages: [
          { role: 'system', content: withResponseLang(opts.system || systemFor(task)) },
          { role: 'user', content: prompt.slice(0, 20000) }
        ]
      };
    } else {
      body.input = { prompt: prompt.slice(0, 20000), system: withResponseLang(opts.system || systemFor(task)) };
    }

    var r, d;
    try {
      r = await fetch(AI_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      return { ok: false, error: 'network' };
    }
    try { d = await r.json(); } catch (e) {
      return { ok: false, error: 'bad-response' };
    }
    // Diagnostics: keep the real failure class visible in the console
    // (status + backend error/reason) instead of flattening everything
    // into the one friendly visitor message below.
    if (!r.ok || (d && d.ok !== true)) {
      try {
        console.warn('[rb-ai] request failed', r.status, (d && d.error) || '', (d && d.reason) || '');
      } catch (e) {}
    }

    if (r.status === 401) return { ok: false, error: 'bad-site-key' };
    if (r.status === 402) return { ok: false, error: 'subscription-paused' };
    if (r.status === 429) return { ok: false, error: 'rate-limited', rateLimited: true };
    if (r.status === 400) return { ok: false, error: (d && d.error) || 'bad-request' };

    if (d && d.ok === true && d.aiConfigured === false) {
      // Honest degraded mode: backend has no provider key yet. Never fake output.
      return { ok: false, notConfigured: true, message: d.message || 'AI is not configured for this site yet.' };
    }
    if (d && d.ok === true && d.aiConfigured !== false && d.text) {
      return { ok: true, result: d.text, provider: d.provider, model: d.model };
    }
    // 502 provider failure or other honest errors — never expose backend
    // internals (key/credit details); show a plain honest message instead.
    var msg = (d && d.error) || ('http-' + r.status);
    if (/provider|credit|429|502|failed/i.test(msg)) {
      return { ok: false, error: 'temporarily-unavailable' };
    }
    if (d && d.reason) msg += ': ' + d.reason;
    return { ok: false, error: msg };
  }

  /* ================= safe markdown renderer =================
     Escape EVERYTHING first; only the supported subset below is then
     turned back into markup. Supported: ATX headings (# .. ######),
     **bold**, *italic*, _italic_, `inline code`, ``` code fences,
     unordered (-, *, +) and ordered (1. / 1)) lists, markdown tables
     (| a | b | with a |---| separator row), links [text](https://...)
     (http/https only), paragraphs and line breaks.
     The AI sometimes emits a literal <br> inside table cells; after
     escaping that is the exact token '&lt;br&gt;' / '&lt;br/&gt;' —
     only those exact escaped tokens are converted back to a real <br>.
  */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function restoreBreaks(escaped) {
    return escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  }

  // Inline formatting on ALREADY-escaped text.
  function renderInline(escaped) {
    var stash = [];
    function keep(html) {
      stash.push(html);
      return '' + (stash.length - 1) + '';
    }
    var s = escaped;
    // inline code first: content stays literal (no formatting inside)
    s = s.replace(/`([^`]+)`/g, function (m, code) {
      return keep('<code>' + code + '</code>');
    });
    // links: http/https only; anything else is left as plain text
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, text, href) {
      var label = text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return keep('<a href="' + href + '" target="_blank" rel="noopener">' + label + '</a>');
    });
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/(^|[^A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])/g, '$1<em>$2</em>');
    s = restoreBreaks(s);
    s = s.replace(/(\d+)/g, function (m, i) { return stash[Number(i)]; });
    return s;
  }

  function splitTableRow(line) {
    var t = line.trim();
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
    return t.split('|').map(function (c) { return c.trim(); });
  }
  function isTableSeparator(line) {
    var t = line.trim();
    return t.indexOf('|') !== -1 && t.indexOf('-') !== -1 && /^\|?[\s:|-]+\|?$/.test(t);
  }
  function isTableRow(line) {
    return line.trim().indexOf('|') !== -1;
  }

  function renderMarkdown(md) {
    var lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;
    function isBlockStart(idx) {
      var l = lines[idx];
      return /^\s*```/.test(l) ||
        /^#{1,6}\s+/.test(l) ||
        /^\s*([-*+]|\d+[.)])\s+/.test(l) ||
        (isTableRow(l) && idx + 1 < lines.length && isTableSeparator(lines[idx + 1])) ||
        /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l) ||
        /^\s*>\s?/.test(l);
    }
    while (i < lines.length) {
      var line = lines[i];
      // code fence
      if (/^\s*```/.test(line)) {
        var buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // closing fence (or EOF)
        out.push('<pre><code>' + escapeHtml(buf.join('\n')) + '</code></pre>');
        continue;
      }
      // blank line
      if (!line.trim()) { i++; continue; }
      // ATX heading
      var hm = line.match(/^(#{1,6})\s+(.*)$/);
      if (hm) {
        var level = hm[1].length;
        out.push('<h' + level + '>' + renderInline(escapeHtml(hm[2].trim())) + '</h' + level + '>');
        i++; continue;
      }
      // horizontal rule
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      // table: header row + separator row
      if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        var head = splitTableRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].trim() && isTableRow(lines[i])) {
          rows.push(splitTableRow(lines[i])); i++;
        }
        var th = head.map(function (c) { return '<th>' + renderInline(escapeHtml(c)) + '</th>'; }).join('');
        var trs = rows.map(function (r) {
          var tds = [];
          for (var ci = 0; ci < head.length; ci++) {
            tds.push('<td>' + renderInline(escapeHtml(r[ci] == null ? '' : r[ci])) + '</td>');
          }
          return '<tr>' + tds.join('') + '</tr>';
        }).join('');
        out.push('<div class="rb-ai-table-wrap"><table><thead><tr>' + th +
          '</tr></thead><tbody>' + trs + '</tbody></table></div>');
        continue;
      }
      // blockquote
      if (/^\s*>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, '')); i++;
        }
        out.push('<blockquote>' + quote.map(function (q) {
          return renderInline(escapeHtml(q));
        }).join('<br>') + '</blockquote>');
        continue;
      }
      // list (unordered or ordered)
      var lm = line.match(/^\s*([-*+]|\d+[.)])\s+/);
      if (lm) {
        var ordered = /\d/.test(lm[1]);
        var items = [];
        while (i < lines.length) {
          var im = lines[i].match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
          if (!im || /\d/.test(im[1]) !== ordered) break;
          items.push(im[2]); i++;
        }
        var tag = ordered ? 'ol' : 'ul';
        out.push('<' + tag + '>' + items.map(function (it) {
          return '<li>' + renderInline(escapeHtml(it)) + '</li>';
        }).join('') + '</' + tag + '>');
        continue;
      }
      // paragraph: gather plain lines until a blank line / block start
      var para = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !isBlockStart(i)) { para.push(lines[i]); i++; }
      out.push('<p>' + para.map(function (p) {
        return renderInline(escapeHtml(p.trim()));
      }).join('<br>') + '</p>');
    }
    return out.join('\n');
  }

  /* ================= shared result panel =================
     Lazily built once, appended to <body>. Site CSS variables are used
     when present — verified against tools/assets/style.css :root,
     which defines --text-hi/--text-lo/--line/--ink-900/--brass (it has
     NO --card/--text/--muted/--border/--primary), so each declaration
     chains: brief name -> real site variable -> literal fallback.
  */
  var panelOverlay = null, panelTitle = null, panelBody = null, panelCloseBtn = null;
  var panelReturnFocus = null, panelPrevOverflow = '';

  var PANEL_CSS = [
    '.rb-ai-overlay{position:fixed;inset:0;z-index:9999;background:rgba(7,19,13,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow-y:auto;}',
    '.rb-ai-overlay[hidden]{display:none;}',
    '.rb-ai-card{background:var(--card,var(--ink-900,#fff));color:var(--text,var(--text-hi,#12151C));border:1px solid var(--border,var(--line,#e5e7eb));border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.28);width:100%;max-width:660px;margin:auto 0;}',
    '.rb-ai-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border,var(--line,#e5e7eb));}',
    '.rb-ai-title{font-weight:700;font-size:17px;line-height:1.3;flex:1 1 auto;word-break:break-word;}',
    '.rb-ai-close{flex:0 0 auto;background:none;border:1px solid var(--border,var(--line,#e5e7eb));color:inherit;border-radius:8px;padding:7px 12px;font:inherit;font-size:14px;cursor:pointer;}',
    '.rb-ai-close:hover{border-color:var(--primary,var(--brass,#2563eb));color:var(--primary,var(--brass,#2563eb));}',
    '.rb-ai-body{padding:18px;overflow-wrap:break-word;line-height:1.6;}',
    '.rb-ai-body>*:first-child{margin-top:0;}.rb-ai-body>*:last-child{margin-bottom:0;}',
    '.rb-ai-body h1,.rb-ai-body h2,.rb-ai-body h3,.rb-ai-body h4,.rb-ai-body h5,.rb-ai-body h6{line-height:1.25;margin:.9em 0 .45em;}',
    '.rb-ai-body p{margin:0 0 .9em;}',
    '.rb-ai-body ul,.rb-ai-body ol{margin:0 0 .9em;padding-left:1.4em;}',
    '.rb-ai-body a{color:var(--primary,var(--brass,#2563eb));text-decoration:underline;}',
    '.rb-ai-body code{background:var(--border,var(--line,#e5e7eb));border-radius:4px;padding:.1em .35em;font-size:.92em;}',
    '.rb-ai-body pre{background:#0c1f16;color:#e8f5ec;border-radius:8px;padding:12px;overflow-x:auto;}',
    '.rb-ai-body pre code{background:none;padding:0;color:inherit;}',
    '.rb-ai-body blockquote{margin:0 0 .9em;padding:.4em 0 .4em 12px;border-left:3px solid var(--border,var(--line,#e5e7eb));color:var(--muted,var(--text-lo,#6b7280));}',
    '.rb-ai-table-wrap{overflow-x:auto;margin:0 0 .9em;}',
    '.rb-ai-body table{border-collapse:collapse;width:100%;font-size:.95em;}',
    '.rb-ai-body th,.rb-ai-body td{border:1px solid var(--border,var(--line,#e5e7eb));padding:7px 10px;text-align:left;vertical-align:top;}',
    '.rb-ai-body th{background:var(--ink-850,#f6f8f7);}',
    '.rb-ai-error{color:inherit;margin:0;}',
    '.rb-ai-loading{display:flex;align-items:center;gap:12px;color:var(--muted,var(--text-lo,#6b7280));}',
    '.rb-ai-spinner{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:3px solid var(--border,var(--line,#e5e7eb));border-top-color:var(--primary,var(--brass,#2563eb));animation:rb-ai-spin .8s linear infinite;}',
    '@keyframes rb-ai-spin{to{transform:rotate(360deg);}}'
  ].join('\n');

  function ensurePanel() {
    if (panelOverlay) return panelOverlay;
    var style = document.createElement('style');
    style.id = 'rb-ai-panel-style';
    style.textContent = PANEL_CSS;
    document.head.appendChild(style);

    panelOverlay = document.createElement('div');
    panelOverlay.className = 'rb-ai-overlay';
    panelOverlay.hidden = true;

    var card = document.createElement('div');
    card.className = 'rb-ai-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'rb-ai-panel-title');

    var head = document.createElement('div');
    head.className = 'rb-ai-head';
    panelTitle = document.createElement('div');
    panelTitle.className = 'rb-ai-title';
    panelTitle.id = 'rb-ai-panel-title';
    panelCloseBtn = document.createElement('button');
    panelCloseBtn.type = 'button';
    panelCloseBtn.className = 'rb-ai-close';
    panelCloseBtn.addEventListener('click', closePanel);
    head.appendChild(panelTitle);
    head.appendChild(panelCloseBtn);

    panelBody = document.createElement('div');
    panelBody.className = 'rb-ai-body';

    card.appendChild(head);
    card.appendChild(panelBody);
    panelOverlay.appendChild(card);
    panelOverlay.addEventListener('click', function (ev) {
      if (ev.target === panelOverlay) closePanel();
    });
    document.addEventListener('keydown', function (ev) {
      if (!panelOverlay.hidden && (ev.key === 'Escape' || ev.keyCode === 27)) closePanel();
    });
    document.body.appendChild(panelOverlay);
    return panelOverlay;
  }

  function openPanel(title, returnFocusEl) {
    ensurePanel();
    panelReturnFocus = returnFocusEl || null;
    panelTitle.textContent = title || 'AI';
    var closeLabel = rbText('common.close', 'Close');
    panelCloseBtn.textContent = closeLabel;
    panelCloseBtn.setAttribute('aria-label', closeLabel);
    if (panelOverlay.hidden) {
      panelPrevOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    }
    panelOverlay.hidden = false;
    try { panelCloseBtn.focus(); } catch (e) {}
  }

  function closePanel() {
    if (!panelOverlay || panelOverlay.hidden) return;
    panelOverlay.hidden = true;
    document.body.style.overflow = panelPrevOverflow;
    if (panelReturnFocus && typeof panelReturnFocus.focus === 'function') {
      try { panelReturnFocus.focus(); } catch (e) {}
    }
    panelReturnFocus = null;
  }

  function panelLoading(title, btn) {
    openPanel(title, btn);
    panelBody.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'rb-ai-loading';
    var spinner = document.createElement('span');
    spinner.className = 'rb-ai-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    var text = document.createElement('span');
    text.textContent = rbText('msg.loading', 'Loading…');
    wrap.appendChild(spinner);
    wrap.appendChild(text);
    panelBody.appendChild(wrap);
  }

  function panelContent(title, markdown, btn) {
    openPanel(title, btn);
    panelBody.innerHTML = renderMarkdown(markdown);
  }

  function panelError(title, message, btn) {
    openPanel(title, btn);
    panelBody.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'rb-ai-error';
    p.textContent = message;
    panelBody.appendChild(p);
  }

  // Public: present text/markdown in the shared panel's content state.
  // Page code calls RB_AI.showText(markdown, title) whenever it needs
  // to present text in the panel itself (e.g. a fallback branch that
  // used to use a native alert).
  function showText(markdown, title) {
    var el = null;
    try { el = document.activeElement; } catch (e) {}
    panelContent(title || 'AI', markdown == null ? '' : String(markdown), el);
  }

  // UI helper: run AI on a button and present the outcome.
  // No native alert anywhere.
  // Success semantics:
  //  - onResult IS a function (field-write pages — CV builder, text to
  //    PDF, word counter, case converter, meta-tag, lorem ipsum): the
  //    page presents the result itself, exactly as today — call
  //    onResult(result) and do NOT open the panel.
  //  - onResult absent / not a function (the tips tools, once the
  //    transform strips their alert callbacks): open the panel in its
  //    loading state, then show the rendered result in the panel.
  // Empty prompt, not-configured, rate-limited and every other error
  // ALWAYS go to the panel (message state), whichever kind of page it
  // is — field-write tools used to fail silently or via alert there.
  async function aiButton(btn, task, getPrompt, onResult) {
    var orig = btn.innerHTML;
    var title = (btn.textContent || '').replace(/\s+/g, ' ').trim() || 'AI';
    btn.disabled = true;
    btn.innerHTML = 'AI…';
    var prompt = getPrompt();
    if (!prompt || !String(prompt).trim()) {
      btn.disabled = false; btn.innerHTML = orig;
      panelError(title, rbText('msg.typeFirst', 'Type something first.'), btn);
      return;
    }
    var hasCallback = typeof onResult === 'function';
    if (!hasCallback) panelLoading(title, btn);
    var r = await callAI(task, prompt);
    btn.disabled = false; btn.innerHTML = orig;
    if (r.notConfigured) {
      panelError(title, 'AI is not available right now — please try again later, or contact us via the Help Center.', btn);
      return;
    }
    if (r.rateLimited) {
      panelError(title, 'Too many AI requests — please wait a minute and try again.', btn);
      return;
    }
    if (r.error === 'subscription-paused' || r.error === 'temporarily-unavailable') {
      panelError(title, 'AI is temporarily unavailable — please try again later.', btn);
      return;
    }
    if (!r.ok) {
      if (r.error === 'bad-site-key') {
        panelError(title, 'AI is not available for this site yet — please contact support via the Help Center.', btn);
      } else if (r.error === 'network' || r.error === 'bad-response' || r.error === 'bad-request') {
        panelError(title, 'AI is busy right now — please check your connection and try again in a moment.', btn);
      } else {
        panelError(title, 'AI could not complete that just now — please try again in a moment.', btn);
      }
      return;
    }
    if (hasCallback) {
      // The page presents the result itself — no panel on success.
      onResult(r.result);
      return;
    }
    panelContent(title, r.result, btn);
  }

  window.RB_AI = { checkAI: checkAI, callAI: callAI, aiButton: aiButton, renderMarkdown: renderMarkdown, showText: showText };
})();

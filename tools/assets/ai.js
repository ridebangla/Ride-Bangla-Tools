/* Ride Bangla Tools — AI helper (first-party API)
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
        '(tools.ridebangla.bd — 66 free client-side tools, no signup). Answer helpfully and briefly ' +
        'about the tools, the company (Ride Bangla Limited, ridebangla.bd), and how to use the site. ' +
        'If asked about something unrelated, answer briefly and steer back to the tools.';
    }
    return 'You are a helpful assistant on Ride Bangla Tools (tools.ridebangla.bd), a site of 66 free ' +
      'client-side utilities. Give concise, practical answers.';
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
          { role: 'system', content: opts.system || systemFor(task) },
          { role: 'user', content: prompt.slice(0, 20000) }
        ]
      };
    } else {
      body.input = { prompt: prompt.slice(0, 20000), system: opts.system || systemFor(task) };
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

  // UI helper: run AI on a button, show loading, handle result
  async function aiButton(btn, task, getPrompt, onResult) {
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'AI…';
    var prompt = getPrompt();
    if (!prompt || !String(prompt).trim()) {
      btn.disabled = false; btn.innerHTML = orig;
      alert(typeof rbT === 'function' ? rbT('msg.typeFirst', 'Type something first.') : 'Type something first.');
      return;
    }
    var r = await callAI(task, prompt);
    btn.disabled = false; btn.innerHTML = orig;
    if (r.notConfigured) {
      alert('AI is not available right now — please try again later, or contact us via the Help Center.');
      return;
    }
    if (r.rateLimited) {
      alert('Too many AI requests — please wait a minute and try again.');
      return;
    }
    if (r.error === 'subscription-paused' || r.error === 'temporarily-unavailable') {
      alert('AI is temporarily unavailable — please try again later.');
      return;
    }
    if (!r.ok) {
      if (r.error === 'bad-site-key') {
        alert('AI is not available for this site yet — please contact support via the Help Center.');
      } else if (r.error === 'network' || r.error === 'bad-response' || r.error === 'bad-request') {
        alert('AI is busy right now — please check your connection and try again in a moment.');
      } else {
        alert('AI could not complete that just now — please try again in a moment.');
      }
      return;
    }
    onResult(r.result);
  }

  window.RB_AI = { checkAI: checkAI, callAI: callAI, aiButton: aiButton };
})();

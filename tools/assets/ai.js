/* Ride Bangla Tools — AI helper (Gemini via /api/gemini proxy)
   The API key stays on the server (Vercel env var GEMINI_API_KEY).
   If AI is not configured, features gracefully show a message. */
(function () {
  'use strict';

  // Check if AI is available (cached)
  let aiAvailable = null;

  async function checkAI() {
    if (aiAvailable !== null) return aiAvailable;
    try {
      const r = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'summarize', prompt: 'test' }),
      });
      const d = await r.json();
      aiAvailable = !(d.error === 'AI_NOT_CONFIGURED');
    } catch (e) {
      aiAvailable = false;
    }
    return aiAvailable;
  }

  // Call Gemini via proxy. Returns {ok, result} or {ok:false, error}
  async function callAI(task, prompt) {
    try {
      const r = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, prompt: String(prompt).slice(0, 4000) }),
      });
      // 404 = API not deployed yet on Vercel
      if (r.status === 404) {
        return { ok: false, notDeployed: true };
      }
      let d;
      try { d = await r.json(); } catch (e) {
        return { ok: false, error: 'bad-response' };
      }
      if (d.error === 'AI_NOT_CONFIGURED') {
        return { ok: false, notConfigured: true };
      }
      if (d.error || !d.result) {
        return { ok: false, error: d.error || 'empty' };
      }
      return { ok: true, result: d.result };
    } catch (e) {
      return { ok: false, error: String(e).slice(0, 100) };
    }
  }

  // UI helper: run AI on a button, show loading, handle result
  async function aiButton(btn, task, getPrompt, onResult) {
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'AI…';
    const prompt = getPrompt();
    if (!prompt || !prompt.trim()) {
      btn.disabled = false; btn.innerHTML = orig;
      alert(typeof rbT === 'function' ? rbT('msg.typeFirst', 'Type something first.') : 'Type something first.');
      return;
    }
    const r = await callAI(task, prompt);
    btn.disabled = false; btn.innerHTML = orig;
    if (r.notConfigured) {
      alert('AI is not configured yet. The site owner needs to add GEMINI_API_KEY in Vercel.');
      return;
    }
    if (!r.ok) {
      alert('AI failed: ' + (r.error || 'unknown error'));
      return;
    }
    onResult(r.result);
  }

  window.RB_AI = { checkAI, callAI, aiButton };
})();

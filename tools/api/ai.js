// Vercel Serverless Function: Tools AI proxy (Groq -> Gemini chain)
// Added 2026-10-21 on the owner's order: the Tools site's AI features
// (assets/ai.js -> RB_AI) call THIS same-origin endpoint instead of the
// AI platform backend, so the provider keys the owner set in the
// ride-bangla-tools Vercel project (GROQ_API_KEY, GEMINI_API_KEY) are
// actually read by code that runs in this project. Provider keys live
// ONLY in this project's Vercel env — they never reach the browser.
//
// Request/response contract mirrors the AI platform's public generate
// route (POST /api/public/ai/generate) so assets/ai.js works unchanged
// apart from the URL:
//   Request : { siteKey, task: "chat"|"generate", provider?,
//               callerId?, maxTokens?, temperature?,
//               input: { messages: [{role, content}] }        (chat)
//                    | { prompt, system? } }                   (generate)
//   Success : { ok: true, aiConfigured: true, provider, model, text }
//   No keys : { ok: true, aiConfigured: false, provider: null,
//               model: null, text: null, message }  (honest degraded
//               mode — never fake output)
//   Failure : 502 { ok: false, error: "AI providers failed" |
//               "AI provider \"x\" failed", provider, reason }
//               where reason lists each attempt, e.g.
//               "groq: HTTP 429 … | gemini: HTTP 400 …".
//   Every provider failure is also written to the function log
//   (console.error) with the provider name and reason, so the real
//   cause is visible server-side even though visitor copy stays plain.
//
// Chain order for provider "auto": groq -> gemini (same priority as the
// platform backend). A pinned provider ("groq" | "gemini") tries only
// that provider. Empty provider text counts as a failure and falls
// over to the next provider.
//
// Hardening (same pattern as tools/api/shorten.js):
//  - CORS restricted to the Tools origin.
//  - Per-IP + per-caller in-memory rate limit (30 req/min), trusted
//    client IP (x-vercel-forwarded-for / last XFF entry, never first).
//  - Input caps mirror the platform route: 20,000 chars per message /
//    prompt, max 50 messages, maxTokens capped at 4,000.

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.0-flash';
const PROVIDER_TIMEOUT_MS = 30000;
const MAX_INPUT_CHARS = 20000;
const MAX_MESSAGES = 50;
const MAX_TOKENS_CAP = 4000;
const ALLOWED_TASKS = ['chat', 'generate'];
const ALLOWED_PROVIDERS = ['auto', 'groq', 'gemini'];

// The site's PUBLIC site key (same value assets/ai.js sends; it only
// identifies the site). Overridable via env if the key ever rotates.
const EXPECTED_SITE_KEY =
  process.env.TOOLS_AI_SITE_KEY || 'rbsite-00f37b79c72f4e678febbd82d43bb46c';

const DEGRADED_MESSAGE =
  'AI is not configured for this site yet — the site owner still needs to add an AI provider key (Groq or Gemini). ' +
  'This response was not AI-generated.';

// ---- Trusted client IP (same rule as tools/api/shorten.js) ----
function getClientIp(req) {
  const vercelFwd = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelFwd === 'string' && vercelFwd.length > 0) {
    const first = vercelFwd.split(',')[0].trim();
    if (first) return first;
  }
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    const parts = fwd.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// ---- Rate limiting (in-memory, per instance) ----
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const hits = new Map();

function isRateLimited(key) {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (now - v.windowStart > RATE_WINDOW_MS) hits.delete(k);
    }
  }
  const rec = hits.get(key);
  if (!rec || now - rec.windowStart > RATE_WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_LIMIT;
}

// ---- CORS allowlist (same as tools/api/shorten.js) ----
const ALLOWED_ORIGINS = [
  'https://tools.ridebangla.bd',
  'https://www.tools.ridebangla.bd',
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch {
    return false;
  }
  return false;
}

// ---- Provider calls ----
// Each returns the completion text or throws an Error whose message is
// the attempt reason ("groq: HTTP 429 …"), matching the platform
// backend's reason format.

async function callGroq(apiKey, messages, maxTokens, temperature) {
  let res;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (e) {
    throw new Error(`groq: request failed (${e && e.message ? e.message : String(e)})`);
  }
  if (!res.ok) {
    const snippet = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`groq: HTTP ${res.status} ${snippet}`);
  }
  const data = await res.json().catch(() => null);
  const text = (data && data.choices && data.choices[0] && data.choices[0].message
    ? String(data.choices[0].message.content || '')
    : '').trim();
  if (!text) throw new Error('groq: empty response');
  return { provider: 'groq', model: GROQ_MODEL, text };
}

function toGeminiPayload(messages, maxTokens, temperature) {
  const systemParts = [];
  const contents = [];
  for (const m of messages) {
    if (m.role === 'system') {
      if (m.content) systemParts.push({ text: m.content });
    } else {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }
  }
  return {
    ...(systemParts.length ? { systemInstruction: { parts: systemParts } } : {}),
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
}

async function callGemini(apiKey, messages, maxTokens, temperature) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(toGeminiPayload(messages, maxTokens, temperature)),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (e) {
    throw new Error(`gemini: request failed (${e && e.message ? e.message : String(e)})`);
  }
  if (!res.ok) {
    const snippet = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`gemini: HTTP ${res.status} ${snippet}`);
  }
  const data = await res.json().catch(() => null);
  const blocked = data && data.promptFeedback && data.promptFeedback.blockReason;
  if (blocked) throw new Error(`gemini: prompt blocked (${blocked})`);
  const parts =
    (data && data.candidates && data.candidates[0] && data.candidates[0].content
      ? data.candidates[0].content.parts
      : null) || [];
  const text = parts
    .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
    .join('')
    .trim();
  if (!text) throw new Error('gemini: empty response');
  return { provider: 'gemini', model: GEMINI_MODEL, text };
}

const PROVIDERS = {
  groq: { envKey: 'GROQ_API_KEY', call: callGroq },
  gemini: { envKey: 'GEMINI_API_KEY', call: callGemini },
};

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'JSON body required' });
  }

  // ---- Site key (public identifier, mirrors the platform route) ----
  const siteKey = body.siteKey;
  if (!siteKey || typeof siteKey !== 'string') {
    return res.status(401).json({ ok: false, error: 'siteKey is required' });
  }
  if (siteKey !== EXPECTED_SITE_KEY) {
    return res.status(401).json({ ok: false, error: 'Invalid site key' });
  }

  // ---- Rate limit: per IP and per caller id ----
  const ip = getClientIp(req);
  const callerId =
    typeof body.callerId === 'string' && body.callerId.trim()
      ? body.callerId.trim().slice(0, 64)
      : 'anon';
  if (isRateLimited(`tools-ai:ip:${ip}`) || isRateLimited(`tools-ai:caller:${callerId}`)) {
    res.setHeader('Retry-After', '60');
    return res
      .status(429)
      .json({ ok: false, error: 'RATE_LIMITED', message: 'Too many AI requests. Try again in a minute.' });
  }

  // ---- Validate task + provider + input (mirrors the platform route) ----
  const task = body.task;
  if (typeof task !== 'string' || !ALLOWED_TASKS.includes(task)) {
    return res.status(400).json({ ok: false, error: `task must be one of: ${ALLOWED_TASKS.join(', ')}` });
  }
  const providerHint = body.provider === undefined ? 'auto' : body.provider;
  if (typeof providerHint !== 'string' || !ALLOWED_PROVIDERS.includes(providerHint)) {
    return res.status(400).json({ ok: false, error: `provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}` });
  }

  let maxTokens = 1000;
  if (body.maxTokens !== undefined) {
    if (typeof body.maxTokens !== 'number' || body.maxTokens < 1) {
      return res.status(400).json({ ok: false, error: 'maxTokens must be a positive number' });
    }
    maxTokens = Math.min(Math.floor(body.maxTokens), MAX_TOKENS_CAP);
  }
  let temperature = 0.7;
  if (typeof body.temperature === 'number' && body.temperature >= 0 && body.temperature <= 2) {
    temperature = body.temperature;
  }

  const input = body.input && typeof body.input === 'object' ? body.input : {};
  const messages = [];
  if (task === 'chat') {
    const raw = input.messages;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ ok: false, error: 'input.messages must be a non-empty array for task "chat"' });
    }
    if (raw.length > MAX_MESSAGES) {
      return res.status(400).json({ ok: false, error: `input.messages is limited to ${MAX_MESSAGES} entries` });
    }
    for (const m of raw) {
      if (!m || typeof m !== 'object' || typeof m.content !== 'string') {
        return res.status(400).json({ ok: false, error: 'each message needs a string content' });
      }
      const role = ['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user';
      messages.push({ role, content: m.content.slice(0, MAX_INPUT_CHARS) });
    }
  } else {
    // task "generate"
    if (typeof input.prompt !== 'string' || !input.prompt.trim()) {
      return res.status(400).json({ ok: false, error: 'input.prompt is required for task "generate"' });
    }
    if (typeof input.system === 'string' && input.system) {
      messages.push({ role: 'system', content: input.system.slice(0, MAX_INPUT_CHARS) });
    }
    messages.push({ role: 'user', content: input.prompt.slice(0, MAX_INPUT_CHARS) });
  }

  // ---- Provider chain ----
  const order = providerHint === 'auto' ? ['groq', 'gemini'] : [providerHint];
  const keyed = order.filter((name) => {
    const k = process.env[PROVIDERS[name].envKey];
    return typeof k === 'string' && k.trim().length > 0;
  });

  if (keyed.length === 0) {
    // No provider key configured in THIS project — honest degraded mode.
    console.error(
      `[tools-ai] no provider key configured (checked ${order
        .map((n) => PROVIDERS[n].envKey)
        .join(', ')}) — returning aiConfigured:false`
    );
    return res.status(200).json({
      ok: true,
      aiConfigured: false,
      provider: null,
      model: null,
      text: null,
      message: DEGRADED_MESSAGE,
    });
  }

  const attempts = [];
  for (const name of keyed) {
    try {
      const out = await PROVIDERS[name].call(
        process.env[PROVIDERS[name].envKey],
        messages,
        maxTokens,
        temperature
      );
      return res.status(200).json({
        ok: true,
        aiConfigured: true,
        provider: out.provider,
        model: out.model,
        text: out.text,
      });
    } catch (e) {
      const reason = e && e.message ? e.message : String(e);
      attempts.push(reason);
      console.error(`[tools-ai] provider attempt failed: ${reason}`);
    }
  }

  const pinned = providerHint !== 'auto' ? providerHint : null;
  console.error(
    `[tools-ai] all providers failed for caller ${callerId}: ${attempts.join(' | ')}`
  );
  return res.status(502).json({
    ok: false,
    error: pinned ? `AI provider "${pinned}" failed` : 'AI providers failed',
    provider: pinned,
    reason: attempts.join(' | ').slice(0, 500),
  });
}

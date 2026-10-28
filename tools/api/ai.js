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

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
];
const GEMINI_MODEL = 'gemini-3.8-flash';
const PROVIDER_TIMEOUT_MS = 30000;
const MAX_INPUT_CHARS = 20000;
const MAX_MESSAGES = 50;
const MAX_TOKENS_CAP = 4000;
const ALLOWED_TASKS = ['chat', 'generate'];
const TOOLS_CATALOGUE = [
  'Image to PDF',
  'Text to PDF',
  'Merge PDF',
  'Split PDF',
  'Rotate PDF',
  'PDF Editor',
  'Photo Editor',
  'Background Remover',
  'Image to Base64',
  'Image Compressor',
  'Image Resizer',
  'Metadata Remover',
  'HEIC to JPG',
  'Image Format Converter',
  'Image Cropper',
  'Color Palette Generator',
  'YouTube Thumbnail Downloader',
  'Favicon Generator',
  'Image Watermark',
  'BMI Calculator',
  'Percentage Calculator',
  'Unit Converter',
  'Number Base Converter',
  'Word Counter',
  'Lorem Ipsum Generator',
  'Case Converter',
  'Text to Speech',
  'Base64 Encoder / Decoder',
  'Remove Duplicate Lines',
  'Meta Tag Generator',
  'URL Slug Generator',
  'URL Shortener',
  'JSON Formatter',
  'Color Converter',
  'Password Generator',
  'URL Encoder / Decoder',
  'UUID Generator',
  'CSV to JSON Converter',
  'Markdown to HTML',
  'Text Diff Checker',
  'CSS Minifier',
  'JWT Decoder',
  'Regex Tester',
  'QR Code Generator',
  'Wi-Fi QR Generator',
  'Payment QR Generator',
  'QR Code Reader',
  'Barcode Generator',
  'vCard QR Generator',
  'Age Calculator',
  'Date Difference Calculator',
  'Military Time Converter',
  'Time Zone Converter',
  'Timestamp Converter',
  'Countdown Timer',
  'Loan EMI Calculator',
  'Simple Interest Calculator',
  'Mortgage Calculator',
  'Compound Interest Calculator',
  'Tip Calculator',
  'Discount Calculator',
  'Zakat Calculator',
  'Invoice Generator',
  'Quotation Generator',
  'Business Name Generator',
  'Freelance Rate Calculator',
  'CV & Cover Letter Builder'
];

// ---- Canonical server-side system prompt (PL-01) ----
// The client MUST NOT be able to replace the system prompt: the browser
// sends only user content, and the server supplies the system message.
// This also grounds the model in the exact 67-tool catalogue (no invented
// tools), enforces the owner's no-fare-figures rule, and keeps answers
// concise (answer, then stop). When addressing a visitor in Bengali,
// use "স্যার/ম্যাডাম" for an unknown visitor, never bare "স্যার".
const CANONICAL_SYSTEM =
  'You are the Ride Bangla Tools assistant on tools.ridebangla.bd, a site of 67 free ' +
  'client-side utilities, no signup. Give concise, practical answers, then stop — no brochure walls. ' +
  'When naming tools, name ONLY tools from this exact list, and say plainly that a tool is not offered ' +
  'if it is not on the list: ' + TOOLS_CATALOGUE.join(', ') + '. ' +
  'Never quote ride fares or prices for Ride Bangla rides, and never invent a fare figure. ' +
  'When addressing an unknown visitor in Bengali, use "স্যার/ম্যাডাম", never bare "স্যার".';
// M30 HEAD-DECISION NOTE (fix-all-remaining, 2026-10-28) — read before landing:
// Total non-system (user) input is capped at 20,000 chars and rejected
// with HTTP 400 BEFORE any provider call (see the total-input check
// below); PL-01 lands ONLY behind that cap. Canonical system-prompt
// length MEASURED from this file's own strings (node String length):
// 1,762 chars (67-tool catalogue joined + fixed wording). The staged
// prelaunch text also discloses "~2,100 chars/call"; that figure is NOT
// reproduced by measurement and is retained here ONLY as a conservative
// budgeting ceiling, never as a measured fact. The staged code excludes
// the system prompt from the 20,000 total, so a max-size request sends
// at most 20,000 user chars + 1,762 canonical chars. CORRECTION PATH
// (owner, one word): "total-including-system" changes the total check
// to count the system prompt too (user allowance then 18,238 measured,
// 17,900 on the 2,100 ceiling); "drop PL-01" removes this file's
// canonical-prompt block and cap together. No cost figure is asserted
// as fact anywhere in this file.
const MAX_TOTAL_INPUT_CHARS = 20000;

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
  // Groq retires model ids over time (llama-3.3-70b-versatile returned
  // 404 model_not_found live on 2026-10-21). Try the current catalogue
  // in order, falling to the next model ONLY on a model-not-found 404;
  // any other failure (auth, quota, timeout) is reported immediately.
  let lastErr = null;
  for (const model of GROQ_MODELS) {
    let res;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
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
      const err = new Error(`groq: HTTP ${res.status} ${snippet}`);
      if (res.status === 404 && /model_not_found|does not exist/i.test(snippet)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
    const data = await res.json().catch(() => null);
    const text = (data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '')
      : '').trim();
    if (!text) throw new Error('groq: empty response');
    return { provider: 'groq', model, text };
  }
  throw lastErr || new Error('groq: no model available');
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
      // PL-01: client-supplied system messages are dropped — the server
      // supplies the single canonical system message below.
      if (m.role === 'system') continue;
      const role = ['assistant', 'user'].includes(m.role) ? m.role : 'user';
      messages.push({ role, content: m.content.slice(0, MAX_INPUT_CHARS) });
    }
    messages.unshift({ role: 'system', content: CANONICAL_SYSTEM });
  } else {
    // task "generate"
    if (typeof input.prompt !== 'string' || !input.prompt.trim()) {
      return res.status(400).json({ ok: false, error: 'input.prompt is required for task "generate"' });
    }
    // PL-01: client-supplied input.system is ignored — the server supplies
    // the single canonical system message.
    messages.push({ role: 'system', content: CANONICAL_SYSTEM });
    messages.push({ role: 'user', content: input.prompt.slice(0, MAX_INPUT_CHARS) });
  }

  // PL-01: cap TOTAL input across all messages. Per-message slicing alone
  // allowed 50 messages x 20,000 chars = 1,000,000 chars in one request.
  const totalInputChars = messages.filter((m) => m.role !== 'system').reduce((sum, m) => sum + m.content.length, 0);
  if (totalInputChars > MAX_TOTAL_INPUT_CHARS) {
    return res.status(400).json({ ok: false, error: 'total input is limited to 20000 characters' });
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

// Vercel Serverless Function: URL Shortener proxy
// No API key needed. Proxies to TinyURL (primary) and is.gd (fallback).
// Client calls /api/shorten only — avoids browser CORS blocks.
//
// M-04 hardening:
//  - CORS restricted to the Tools origin (was `*` — anyone could use
//    Ride Bangla's infra as a free shortening backend for phishing links).
//  - Per-IP sliding-window rate limit (30 req/hour) with trusted client
//    IP (x-vercel-forwarded-for / last XFF entry, never first).
//  - Blocklist: private/loopback/link-local/metadata hosts, our own
//    providers (no re-shortening loops), other URL shorteners (no
//    laundering already-hidden destinations), plus an env-configurable
//    host blocklist (SHORTEN_BLOCKED_HOSTS, comma-separated, exact or
//    suffix match).
//  - Live phishing/malware-feed check is NOT implemented here: it needs
//    a Google Safe Browsing API key. OWNER STEPS: enable Safe Browsing
//    API in Google Cloud, set SAFE_BROWSING_API_KEY in Vercel env, and
//    query threats.lookup before shortening. Until then, the static
//    blocklist + rate limit above are the controls in place.

const MAX_URL_LEN = 8000;

// ---- Trusted client IP (same rule as tools/api/ai.js) ----
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
const RATE_WINDOW_MS = 60 * 60 * 1000;
const ipHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  if (ipHits.size > 5000) {
    for (const [key, val] of ipHits) {
      if (now - val.windowStart > RATE_WINDOW_MS) ipHits.delete(key);
    }
  }
  const rec = ipHits.get(ip);
  if (!rec || now - rec.windowStart > RATE_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    return { limited: false, retryAfter: 0 };
  }
  rec.count += 1;
  if (rec.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((rec.windowStart + RATE_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false, retryAfter: 0 };
}

// ---- CORS allowlist ----
const ALLOWED_ORIGINS = [
  'https://tools.ridebangla.bd',
  'https://www.tools.ridebangla.bd',
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  const extra = (process.env.SHORTEN_PREVIEW_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (extra.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch {
    return false;
  }
  return false;
}

// ---- URL blocklist ----
const BLOCKED_HOSTS = [
  'localhost',
  'metadata.google.internal',
  // Our own providers — no re-shortening loops.
  'tinyurl.com',
  'is.gd',
  // Other shorteners — a short link hides its destination; do not let
  // this endpoint launder an already-hidden destination.
  'bit.ly',
  't.co',
  'goo.gl',
  'cutt.ly',
  'shorturl.at',
  'tiny.cc',
  'ow.ly',
  'rb.gy',
  'rebrand.ly',
  'buff.ly',
];

function isPrivateIPv4(host) {
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 0 || a >= 224) return true;
  return false;
}

function isBlockedHost(hostname) {
  // WHATWG URL keeps IPv6 literals bracketed ('[fd00::1]') — strip the
  // brackets BEFORE the prefix checks, otherwise ULA / link-local /
  // loopback IPv6 hosts sail straight past them.
  let host = hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  if (host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '::') return true;
  if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;
  // IPv4-mapped IPv6 — judge the embedded IPv4. WHATWG URL may keep the
  // dotted form ('::ffff:127.0.0.1') or normalize it to hex groups
  // ('::ffff:7f00:1'); handle both.
  if (host.startsWith('::ffff:')) {
    const tail = host.slice('::ffff:'.length);
    if (isPrivateIPv4(tail)) return true;
    const hex = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16), lo = parseInt(hex[2], 16);
      const v4 = `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
      if (isPrivateIPv4(v4)) return true;
    }
  }
  if (isPrivateIPv4(host)) return true;
  // Round-2: wildcard-DNS laundering — a public hostname whose first labels
  // embed an IP (127.0.0.1.nip.io, 192-168-1-1.sslip.io) resolves straight to
  // that IP in the clicker's browser. Block when the embedded IP is private.
  const labels = host.split('.');
  if (labels.length > 4) {
    const dotted = labels.slice(0, 4).join('.');
    if (isPrivateIPv4(dotted)) return true;
  }
  const dashed = host.match(/^(\d+)-(\d+)-(\d+)-(\d+)[.-]/);
  if (dashed && isPrivateIPv4(`${dashed[1]}.${dashed[2]}.${dashed[3]}.${dashed[4]}`)) return true;
  const envList = (process.env.SHORTEN_BLOCKED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const blocked of [...BLOCKED_HOSTS, ...envList]) {
    if (host === blocked || host.endsWith('.' + blocked)) return true;
  }
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ip = getClientIp(req);
  const rl = isRateLimited(ip);
  if (rl.limited) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'RATE_LIMITED', message: `Too many shorten requests. Try again in ${rl.retryAfter} seconds.` });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  let { url } = body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url' });
  }
  url = url.trim();
  if (url.length > MAX_URL_LEN) {
    return res.status(400).json({ error: 'URL too long' });
  }
  // Round-2: an explicit non-http(s) scheme (ftp://…, file://…) must not be
  // smuggled through the https:// prepend (it produced 'https://ftp://…').
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Only http(s) URLs can be shortened' });
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
    if (isBlockedHost(u.hostname)) {
      return res.status(400).json({ error: 'URL host is not allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Primary: TinyURL
  try {
    const r = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const short = (await r.text()).trim();
      if (short.startsWith('http')) return res.status(200).json({ short });
    }
  } catch (e) { /* fall through to backup */ }

  // Backup: is.gd
  try {
    const r2 = await fetch('https://is.gd/create.php?format=simple&url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(10000) });
    if (r2.ok) {
      const short2 = (await r2.text()).trim();
      if (short2.startsWith('http')) return res.status(200).json({ short: short2 });
    }
  } catch (e) { /* fall through to error */ }

  return res.status(502).json({ error: 'Shortening service unavailable, try again in a moment.' });
}

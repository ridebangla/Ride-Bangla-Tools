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
//  - MAX-01/MAX-02 (security-max, staged): DNS-resolution block,
//    body-size cap, empty-host rejection, normalized-URL forwarding,
//    and an env-gated Safe Browsing check (no-op without the key).

import dns from 'node:dns';

const MAX_URL_LEN = 8000;

// The site's PUBLIC site key (same value tools/api/ai.js sends; it only
// identifies the site — it is NOT a secret and does NOT stop a caller
// who reads it out of the page source. Its purpose is parity with
// /api/ai: casual cross-site / drive-by use of this backend stops,
// while the free public tool keeps working unchanged for visitors.
// Overridable via env if the key ever rotates.
const EXPECTED_SITE_KEY =
  process.env.TOOLS_SHORTEN_SITE_KEY || 'rbsite-00f37b79c72f4e678febbd82d43bb46c';

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

// Wildcard-DNS services: any subdomain of these resolves to an IP embedded
// in the hostname itself — the laundering vector behind the encoded-IP
// checks in isBlockedHost.
const WILDCARD_DNS_HOSTS = ['nip.io', 'sslip.io', 'xip.io'];

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

// Parse one IPv4 number part the way WHATWG / inet_aton do: decimal, octal
// (leading 0) or hex (0x prefix). Returns null when the part is not a valid
// number in its radix.
function parseIPv4Part(part) {
  if (part === '') return null;
  let radix = 10;
  let digits = part;
  if (/^0[xX]/.test(part)) {
    radix = 16;
    digits = part.slice(2);
    if (digits === '') return 0;
  } else if (part.length > 1 && part[0] === '0') {
    radix = 8;
    digits = part.slice(1);
  }
  const valid = radix === 16 ? /^[0-9a-fA-F]+$/ : radix === 8 ? /^[0-7]+$/ : /^[0-9]+$/;
  if (!valid.test(digits)) return null;
  const value = parseInt(digits, radix);
  return Number.isSafeInteger(value) ? value : null;
}

// Decode a 1–4 part IPv4 in any per-part encoding (decimal/octal/hex),
// including the partial forms where the last part absorbs the remaining
// bytes ('127.1' = 127.0.0.1, '2130706433' = 127.0.0.1). Returns the
// dotted-quad string, or null when the input is not such an encoding.
function parseIPv4Encoded(str) {
  const parts = str.split('.');
  if (parts.length > 4) return null;
  const nums = parts.map(parseIPv4Part);
  if (nums.some((n) => n === null)) return null;
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] > 255) return null;
  }
  const last = nums[nums.length - 1];
  if (last >= 256 ** (5 - nums.length)) return null;
  const bytes = nums.slice(0, -1);
  let rest = last;
  const tail = new Array(5 - nums.length);
  for (let i = tail.length - 1; i >= 0; i--) {
    tail[i] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  return [...bytes, ...tail].join('.');
}

// A single hostname label that carries a whole IPv4 as one decimal or hex
// number (2130706433, 0x7f000001). Only judged as an encoding when the
// decoded top octet is non-zero — small plain numbers ('2024', '90210')
// are ordinary hostname labels, not addresses.
function isEncodedIPLabel(label) {
  if (!/^0[xX][0-9a-fA-F]+$/.test(label) && !/^[0-9]+$/.test(label)) return false;
  const decoded = parseIPv4Encoded(label);
  if (!decoded || decoded.startsWith('0.')) return false;
  return isPrivateIPv4(decoded);
}

function isBlockedHost(hostname) {
  // WHATWG URL keeps IPv6 literals bracketed ('[fd00::1]') — strip the
  // brackets BEFORE the prefix checks, otherwise ULA / link-local /
  // loopback IPv6 hosts sail straight past them.
  let host = hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  if (host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '::') return true;
  // MAX-01: IPv6 prefix checks only make sense for an IP literal (a ':'
  // is present). Without the colon gate, ordinary DNS names starting
  // with "fc"/"fd" (e.g. fda.gov) were wrongly blocked.
  if (host.includes(':') && (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd'))) return true;
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
  // Round-3 (checker F1): an IPv4 can also hide in encoded form — a whole
  // address as ONE decimal/hex label (2130706433.nip.io, 0x7f000001.nip.io),
  // or in octal/hex label runs (0177.0.0.1.nip.io) — which the dotted and
  // dashed checks above cannot see. Judge any such form by the address it
  // decodes to. Full 4-label runs are judged anywhere in the host (the
  // dotted rule above only looked at the leading labels); partial runs
  // ('127.1' = 127.0.0.1) are only address-shaped on wildcard-DNS hosts,
  // whose entire purpose is IP embedding, so those are judged there.
  for (const label of labels) {
    if (isEncodedIPLabel(label)) return true;
  }
  const onWildcardDns = WILDCARD_DNS_HOSTS.some(
    (suffix) => host === suffix || host.endsWith('.' + suffix)
  );
  for (let start = 0; start + 1 < labels.length; start++) {
    for (let len = 2; len <= 4 && start + len <= labels.length; len++) {
      if (len < 4 && !onWildcardDns) continue;
      const decoded = parseIPv4Encoded(labels.slice(start, start + len).join('.'));
      if (decoded && isPrivateIPv4(decoded)) return true;
    }
  }
  const envList = (process.env.SHORTEN_BLOCKED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const blocked of [...BLOCKED_HOSTS, ...envList]) {
    if (host === blocked || host.endsWith('.' + blocked)) return true;
  }
  return false;
}

// ---- DNS-resolution check (MAX-01) ----
// A public hostname can RESOLVE to a private address (attacker DNS,
// rebinding-shaped setup) even though its spelling passes isBlockedHost.
// The server never fetches the target itself, so this is defence-in-depth
// for the clicker/provider path, not a server-SSRF control: resolve the
// host and refuse when ANY answer is a blocked address. Fail-OPEN on
// lookup error/timeout: a DNS outage must not break legitimate links,
// and rebinding between check time and click time cannot be closed from
// here (documented residual) — a positive private answer is still a
// hard block. IP literals are never looked up: the spelling blocklist
// above already judges them.
const DNS_LOOKUP_TIMEOUT_MS = 3000;

function resolvedIsPrivate(addresses) {
  return (addresses || []).some((a) => {
    const addr = typeof a === 'string' ? a : a && a.address;
    return typeof addr === 'string' && addr.length > 0 && isBlockedHost(addr);
  });
}

async function resolvesToBlockedHost(hostname) {
  try {
    const answers = await Promise.race([
      dns.lookup(hostname, { all: true }),
      new Promise((resolve) => setTimeout(() => resolve(null), DNS_LOOKUP_TIMEOUT_MS)),
    ]);
    if (!answers) return false; // timeout -> fail open (see comment above)
    return resolvedIsPrivate(answers);
  } catch {
    return false; // lookup error -> fail open (see comment above)
  }
}

// ---- Safe Browsing opt-in check (MAX-02) ----
// Only active when the owner has placed SAFE_BROWSING_API_KEY in the
// Vercel env (owner launch step; see the file header). Without the key
// this is a no-op and behaviour is exactly as before. On a threat match
// the URL is refused; on API error/timeout the check fails OPEN (a Safe
// Browsing outage must not take down the free tool) and the failure is
// logged. The key itself is never logged or returned.
const SB_TIMEOUT_MS = 5000;
const SB_THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'];

async function isSafeBrowsingMatch(targetUrl) {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  if (!apiKey) return false;
  try {
    const r = await fetch(
      'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + encodeURIComponent(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'ridebangla-tools', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: SB_THREAT_TYPES,
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: targetUrl }],
          },
        }),
        signal: AbortSignal.timeout(SB_TIMEOUT_MS),
      }
    );
    if (!r.ok) {
      console.error('[shorten] Safe Browsing lookup failed: HTTP ' + r.status);
      return false;
    }
    const data = await r.json().catch(() => null);
    return !!(data && Array.isArray(data.matches) && data.matches.length > 0);
  } catch (e) {
    console.error('[shorten] Safe Browsing lookup error');
    return false;
  }
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

  // MAX-01: body-size cap. A legitimate shorten body is ~8.1 KB at most
  // (8000-char URL + site key); anything larger is abuse payload, not a
  // link. The header check runs before parsing so oversized bodies cost
  // nothing; the string check below covers bodies without that header.
  const MAX_BODY_BYTES = 16384;
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request body too large' });
  }

  const ip = getClientIp(req);
  const rl = isRateLimited(ip);
  if (rl.limited) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'RATE_LIMITED', message: `Too many shorten requests. Try again in ${rl.retryAfter} seconds.` });
  }

  // MAX-01: raw string-body size cap (see the header check above).
  if (typeof req.body === 'string' && req.body.length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request body too large' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // S20-P10: site-key check (mirrors tools/api/ai.js). The shortener
  // previously accepted any caller with no identifier at all.
  const siteKey = body && body.siteKey;
  if (!siteKey || typeof siteKey !== 'string') {
    return res.status(401).json({ error: 'siteKey is required' });
  }
  if (siteKey !== EXPECTED_SITE_KEY) {
    return res.status(401).json({ error: 'Invalid site key' });
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
  let parsed = null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
    // PL-03: a short link must never launder login credentials — a URL
    // carrying userinfo would hand the credentials to anyone holding the link.
    if (u.username || u.password) {
      return res.status(400).json({ error: 'URLs with login credentials cannot be shortened' });
    }
    if (isBlockedHost(u.hostname)) {
      return res.status(400).json({ error: 'URL host is not allowed' });
    }
    // MAX-01: an empty hostname (a collapsed scheme-relative input)
    // passed the blocklist vacuously; reject it outright.
    if (!u.hostname) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    parsed = u;
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // RECHECK3 FIX (live): provider order swapped.
  // Live evidence 2026-10-23: links created via TinyURL's free
  // api-create.php now route through a tinyurl.com/preview/deprecated/*
  // interstitial and, in a real browser, sometimes stall there instead
  // of landing on the target (1 of 2 browser follow runs stalled >45s;
  // the raw 302->301 chain does eventually resolve). is.gd links answer
  // with a single direct 301 to the target (verified by curl + browser).
  // is.gd is therefore primary; TinyURL stays as the fallback so a
  // provider outage still degrades to a working short link.
  // Primary: is.gd

  // MAX-01: DNS-resolution check (fail-open on error/timeout; IP
  // literals are already judged by the spelling blocklist, so they
  // are not looked up). A positive private answer is a hard block.
  // Note: the hostname is logged here only after PL-03 rejected any
  // credential-bearing URL above, so no userinfo can reach the log.
  // (Placed after the comment paragraph on purpose: this block's diff
  // hunk must not touch the paragraph's first line, which other staged
  // sets word differently.)
  const hostForDns = parsed.hostname;
  const isLiteral = hostForDns.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(hostForDns);
  if (!isLiteral && (await resolvesToBlockedHost(hostForDns))) {
    console.error('[shorten] DNS block: host resolves to a blocked address');
    return res.status(400).json({ error: 'URL host is not allowed' });
  }

  // MAX-01: send the provider the NORMALIZED URL that was actually
  // checked, not the raw input string — otherwise the checked string
  // and the shortened string can differ (parser normalization, e.g.
  // embedded tabs/newlines the URL parser strips).
  url = parsed.href;

  // MAX-02: Safe Browsing (no-op without the owner-placed key).
  if (await isSafeBrowsingMatch(url)) {
    return res.status(400).json({ error: 'This URL was flagged as unsafe and cannot be shortened' });
  }

  try {
    const r = await fetch('https://is.gd/create.php?format=simple&url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const short = (await r.text()).trim();
      if (short.startsWith('http')) return res.status(200).json({ short });
    }
  } catch (e) { /* fall through to backup */ }

  // Backup: TinyURL
  try {
    const r2 = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(10000) });
    if (r2.ok) {
      const short2 = (await r2.text()).trim();
      if (short2.startsWith('http')) return res.status(200).json({ short: short2 });
    }
  } catch (e) { /* fall through to error */ }

  return res.status(502).json({ error: 'Shortening service unavailable, try again in a moment.' });
}

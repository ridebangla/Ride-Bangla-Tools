// Ride Bangla self-hosted URL shortener (Vercel Serverless Function)
// Professional: no third-party interstitial, no ads.
// POST {url} -> {short, code}   |   GET ?c=CODE -> instant 301 redirect (no page shown)
//
// Setup (one-time):
// 1. Vercel env var: FIREBASE_WEB_API_KEY = your Firebase Web API key
//    (Firebase Console -> Project Settings -> General -> Web API Key)
// 2. Firestore rules: allow public read + validated create on rb_short_links
//    (see FIRESTORE_RULES.txt in this folder)

const PROJECT_ID = "ride-bangla-app";
const COLLECTION = "rb_short_links";
const CODE_LEN = 6;
// Unambiguous chars only (no 0/O, 1/l/I)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const MAX_URL_LEN = 2000;

const fsBase = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function randomCode() {
  let s = "";
  try {
    const arr = new Uint32Array(CODE_LEN);
    crypto.getRandomValues(arr);
    for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[arr[i] % CODE_CHARS.length];
  } catch {
    for (let i = 0; i < CODE_LEN; i++)
      s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

function validUrl(input) {
  let url = (input || "").trim();
  if (!url || url.length > MAX_URL_LEN) return null;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // prevent shortening our own redirect endpoint (loop protection)
    if (/\/api\/rb(\?|$)/i.test(u.pathname + u.search)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function docExists(code, apiKey) {
  try {
    const r = await fetch(
      `${fsBase()}/${COLLECTION}/${code}?key=${apiKey}&mask.fieldPaths=url`,
      { signal: AbortSignal.timeout(8000) }
    );
    return r.ok;
  } catch {
    return true; // fail safe: assume exists, retry with new code
  }
}

async function createDoc(code, url, apiKey) {
  try {
    const r = await fetch(
      `${fsBase()}/${COLLECTION}?documentId=${code}&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          fields: {
            url: { stringValue: url },
            createdAt: { timestampValue: new Date().toISOString() },
            clicks: { integerValue: "0" },
          },
        }),
      }
    );
    return r.ok;
  } catch {
    return false;
  }
}

async function lookupUrl(code, apiKey) {
  try {
    const r = await fetch(
      `${fsBase()}/${COLLECTION}/${code}?key=${apiKey}&mask.fieldPaths=url&mask.fieldPaths=clicks`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return null;
    const doc = await r.json();
    const url = doc.fields && doc.fields.url && doc.fields.url.stringValue;
    if (!url) return null;
    // bump click counter (fire and forget)
    try {
      const clicks =
        parseInt((doc.fields.clicks && doc.fields.clicks.integerValue) || "0", 10) + 1;
      fetch(
        `${fsBase()}/${COLLECTION}/${code}?key=${apiKey}&updateMask.fieldPaths=clicks`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            fields: { clicks: { integerValue: String(clicks) } },
          }),
        }
      ).catch(() => {});
    } catch {}
    return url;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Shortener not configured yet." });
  }

  // ---- REDIRECT: instant 301, browser goes straight to destination ----
  if (req.method === "GET") {
    const code = ((req.query && req.query.c) || "").trim();
    if (!code || code.length > 16 || !/^[A-Za-z2-9]+$/.test(code)) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      return res.end("Invalid link");
    }
    const url = await lookupUrl(code, apiKey);
    if (!url) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Link not found");
    }
    res.writeHead(301, { Location: url, "Cache-Control": "no-store" });
    return res.end();
  }

  // ---- CREATE: POST {url} ----
  if (req.method === "POST") {
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
    const url = validUrl(body && body.url);
    if (!url) return res.status(400).json({ error: "Invalid URL" });

    let code = null;
    for (let i = 0; i < 5; i++) {
      const c = randomCode();
      if (!(await docExists(c, apiKey))) {
        code = c;
        break;
      }
    }
    if (!code) return res.status(503).json({ error: "Try again in a moment." });
    if (!(await createDoc(code, url, apiKey))) {
      return res.status(500).json({ error: "Could not save link." });
    }
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return res
      .status(200)
      .json({ short: `https://${host}/api/rb?c=${code}`, code });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// Vercel Serverless Function: URL Shortener proxy
// No API key needed. Proxies to TinyURL (primary) and is.gd (fallback).
// Client calls /api/shorten only — avoids browser CORS blocks.

const MAX_URL_LEN = 8000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

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
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
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

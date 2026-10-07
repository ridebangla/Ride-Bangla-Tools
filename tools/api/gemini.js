// Vercel Serverless Function: Gemini AI proxy
// Env var name: GEMINI_API_KEY (set in Vercel dashboard → Environment Variables)
// Security: API key never leaves the server. Client calls /api/gemini only.

const GEMINI_MODEL = 'gemini-3.8-flash';
const MAX_INPUT = 4000;

export default async function handler(req, res) {
  // CORS for same-origin (Vercel handles this, but be explicit)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI_NOT_CONFIGURED', message: 'Gemini API key not set. Add GEMINI_API_KEY in Vercel Environment Variables.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { prompt, task } = body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > MAX_INPUT) {
    return res.status(400).json({ error: 'Invalid prompt (max 4000 chars)' });
  }

  // Whitelist tasks to prevent prompt-injection abuse
  const ALLOWED_TASKS = ['cv-summary', 'meta-tags', 'improve-text', 'summarize', 'explain', 'health-tips', 'finance-tips', 'fun-facts', 'suggest-palette', 'generate-content', 'ai-tips', 'help-chat'];
  if (!ALLOWED_TASKS.includes(task)) {
    return res.status(400).json({ error: 'Unknown task' });
  }

  const systemPrompts = {
    'cv-summary': 'Write a concise professional CV summary (2-3 sentences) based on the following details. Keep it professional and ATS-friendly.',
    'meta-tags': 'Generate an SEO-optimized meta title (under 60 chars) and meta description (under 160 chars) for the following page content. Return as:\nTitle: ...\nDescription: ...',
    'improve-text': 'Improve the following text: fix grammar, improve clarity and flow, keep the same language and meaning. Return only the improved text.',
    'summarize': 'Summarize the following text concisely in the same language. Return only the summary.',
    'explain': 'Explain the following calculation or result in simple terms, in the same language as the input. Keep it brief and helpful.',
    'health-tips': 'Based on the following BMI/health info, give 3 brief, practical health tips in the same language. Keep it encouraging, not medical advice.',
    'finance-tips': 'Based on the following financial calculation, give 3 brief practical money tips in the same language. Keep it helpful, not financial advice.',
    'fun-facts': 'Share 2-3 fun facts related to the following date/age info, in the same language. Keep it light and interesting.',
    'suggest-palette': 'Suggest a harmonious 5-color palette based on the following color. Return as hex codes with brief names, one per line.',
    'generate-content': 'Generate realistic placeholder content (2-3 paragraphs) for the following topic, in the same language. Make it sound natural, not lorem ipsum.',
    'ai-tips': 'Give 3 brief practical tips for getting the best results from the following tool, in the same language.',
    'help-chat': `You are the AI assistant for Ride Bangla's Help Center. Answer questions about Ride Bangla in the same language the user writes in. Be helpful, friendly, and concise.

ABOUT RIDE BANGLA:
- Ride Bangla is a Bangladeshi digital services company offering ride-sharing, food delivery, courier/parcel delivery, and online services.
- Main website: https://ridebangla.bd
- IT Team website: https://it.ridebangla.bd (web development, app development, IT services)
- Free online tools: https://tools.ridebangla.bd (31 free tools - calculators, converters, PDF tools, image tools, QR generators, SEO tools)
- Leadership: Enamul Seddik (Co-Founder & CEO), Emon Seddik (Co-Founder & Director), Obayedur Rahman Shaikh (Marketing Director), Tabassum Nisha (IT Team Director)
- Contact: via the main website https://ridebangla.bd

RULES:
- If asked about services, mention ride-sharing, food delivery, courier, and the free tools site.
- If asked for contact, direct to https://ridebangla.bd
- If asked about IT/web/app development services, direct to https://it.ridebangla.bd
- If asked about free tools, direct to https://tools.ridebangla.bd
- Keep answers under 150 words unless more detail is requested.
- Never make up phone numbers, addresses, or prices not listed above.`, 
  };

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompts[task] + '\n\n' + prompt }] }],
          generationConfig: { maxOutputTokens: task === 'help-chat' ? 800 : 500, temperature: 0.7 },
        }),
      }
    );
    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'Gemini API error', detail: err.slice(0, 200) });
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ result: text.trim() });
  } catch (e) {
    return res.status(500).json({ error: 'AI request failed', detail: String(e).slice(0, 200) });
  }
}

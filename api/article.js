// api/article.js — server-side full-text extraction for the news reader.
//
// GNews only returns a ~2-sentence description, so the reader asks this
// function to fetch the publisher's page and pull the article body out of the
// HTML (paragraph-cluster heuristic, no external dependencies).
//
// GET /api/article?url=https://…
// → { ok, title?, image?, paragraphs: string[], fallback: true? }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractMeta(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return null;
}

function extractParagraphs(html) {
  // Drop the noisy regions before looking for body copy.
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(header|footer|nav|aside|form|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const raw = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripTags(m[1]));
  const paragraphs = raw.filter((p) => p.length >= 45 && p.length <= 2000 && !/^\s*(read more|advertisement|subscribe|share this|click here)/i.test(p));

  // Trim leading promos / trailing boilerplate.
  while (paragraphs.length && paragraphs[0].length < 70) paragraphs.shift();
  return paragraphs.slice(0, 14);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = String(req.query.url || '');
  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Valid article url required' });
  }
  if (!/^https?:$/.test(target.protocol)) {
    return res.status(400).json({ error: 'Only http(s) urls are supported' });
  }
  // Basic SSRF guard: never fetch loopback / private addresses.
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(target.hostname) || target.hostname === '[::1]') {
    return res.status(400).json({ error: 'Blocked url' });
  }

  try {
    const response = await fetch(target.href, {
      headers: { Accept: 'text/html,*/*', 'User-Agent': UA, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const paragraphs = extractParagraphs(html);
    const total = paragraphs.join(' ').length;
    const enough = total >= 350;

    const result = {
      ok: enough,
      title: extractMeta(html, 'og:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)[1]) : null),
      image: extractMeta(html, 'og:image'),
      paragraphs: enough ? paragraphs : [],
      publisher: target.hostname.replace(/^www\./, ''),
    };
    if (!enough) result.fallback = true;

    // Publishers change constantly — keep extracted pages briefly, not forever.
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
    return res.status(200).json(result);
  } catch (err) {
    console.error('[article] extraction failed:', err.message);
    return res.status(200).json({ ok: false, fallback: true, paragraphs: [], error: err.message });
  }
}

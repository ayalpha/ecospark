// src/services/newsService.js
// Green news feed with topic rotation: each "page" pulls up to 10 fresh
// articles from the next topic in the rotation, deduped into one growing pool.
// Dev hits GNews directly (localhost CORS is allowed); production proxies
// through /api/news so the API key stays server-side.

const TOPICS = [
  'climate change',
  'sustainability',
  'renewable energy',
  'environment protection',
  'pollution control',
  'recycling waste',
  'solar energy',
  'electric vehicles',
  'wildlife conservation',
  'water conservation',
];

// ── Pool state ──────────────────────────────────────────────────────────────
let pool = new Map();      // url → article (dedupe key)
let nextTopic = 0;         // rotation cursor
let inflight = null;       // coalesce concurrent loads
let poolListeners = new Set();

function publishPool() {
  const articles = [...pool.values()].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  poolListeners.forEach((cb) => cb(articles));
}

export function getPool() {
  return [...pool.values()].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}

function normalizeArticle(a) {
  return {
    title: a.title,
    description: a.description,
    url: a.url,
    image: a.image,
    publishedAt: a.publishedAt,
    source: { name: a.source?.name, url: a.source?.url },
  };
}

async function fetchTopic(topic) {
  const max = 10;
  // Dev and prod both route through /api/news — the Vite dev middleware runs
  // the same serverless handler locally, so there is one code path.
  const params = new URLSearchParams({ topic, max: String(max) });
  const res = await fetch(`/api/news?${params}`);
  if (!res.ok) throw new Error(`News API error: ${res.status}`);
  const data = await res.json();
  return (data.articles || []).map(normalizeArticle);
}

/**
 * Load the next page of news. Returns { articles, hasMore, loading } shape via
 * the accumulated pool (deduped across topics, newest first).
 * Safe to call concurrently — concurrent calls share one request.
 */
export async function loadMoreNews() {
  if (inflight) return inflight;

  if (nextTopic >= TOPICS.length) {
    return { articles: getPool(), hasMore: false };
  }

  inflight = (async () => {
    try {
      const topic = TOPICS[nextTopic];
      nextTopic += 1;
      const fresh = await fetchTopic(topic);
      for (const a of fresh) {
        // GNews repeats stories across topics — dedupe on URL, keep first.
        if (a.url && !pool.has(a.url)) pool.set(a.url, a);
      }
      publishPool();
      return { articles: getPool(), hasMore: nextTopic < TOPICS.length };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Compatibility entry for the dashboard board: ensures the first page is
 * loaded and returns the current pool snapshot.
 */
export async function fetchGreenNews() {
  if (pool.size === 0) {
    await loadMoreNews();
  }
  return getPool();
}

export function subscribeNewsPool(callback) {
  poolListeners.add(callback);
  return () => poolListeners.delete(callback);
}

export function resetNewsFeed() {
  pool.clear();
  nextTopic = 0;
  publishPool();
}

export function hasMoreNews() {
  return nextTopic < TOPICS.length;
}

export function clearNewsCache() {
  resetNewsFeed();
}

/**
 * Fetch the publisher's full article text through the serverless extractor.
 * Resolves to { ok, title, image, paragraphs, publisher } — `ok` is false when
 * the page couldn't be parsed (JS-rendered sites, paywalls) and the reader
 * falls back to the GNews description.
 */
export async function fetchArticleContent(url) {
  try {
    const res = await fetch(`/api/article?url=${encodeURIComponent(url)}`);
    if (!res.ok) return { ok: false, fallback: true, paragraphs: [] };
    return await res.json();
  } catch {
    return { ok: false, fallback: true, paragraphs: [] };
  }
}

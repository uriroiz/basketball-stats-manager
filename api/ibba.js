const ALLOWED_ORIGINS = new Set([
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'https://basketball-stats-manager.vercel.app'
]);
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 60;
const rateLimits = new Map();

function isAllowedOrigin(origin, requestHost) {
  if (!origin) return false;
  try {
    return ALLOWED_ORIGINS.has(origin) || new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

function isAllowedTarget(target) {
  const hostname = target.hostname.toLowerCase();
  const allowedPath = /^\/wp-json\/(?:sportspress|wp)\/v2\/(?:events|players)(?:\/\d+)?\/?$/.test(target.pathname)
    || /^\/league\/[a-z0-9_-]+\/?$/i.test(target.pathname)
    || target.pathname.toLowerCase() === '/league/2024-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa/'
    || target.pathname.toLowerCase() === '/league/2023-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa/'
    || /^\/(?:game|event)\/[a-z0-9_-]+\/?$/i.test(target.pathname);
  return target.protocol === 'https:'
    && !target.username
    && !target.password
    && !target.port
    && allowedPath
    && (hostname === 'ibasketball.co.il' || hostname.endsWith('.ibasketball.co.il'));
}

function isSameOriginBrowserRequest(req, originAllowed) {
  return originAllowed || req.headers['sec-fetch-site'] === 'same-origin';
}

function isRateLimited(req) {
  const now = Date.now();
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = forwarded || req.socket?.remoteAddress || 'unknown';
  const current = rateLimits.get(key);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_REQUESTS;
}

async function readLimitedBody(response) {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const originAllowed = isAllowedOrigin(origin, req.headers.host);
  if (origin && originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return originAllowed ? res.status(204).end() : res.status(403).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isSameOriginBrowserRequest(req, originAllowed)) return res.status(403).json({ error: 'Origin not allowed' });
  if (isRateLimited(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests' });
  }

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid url parameter' });
  }
  if (!isAllowedTarget(target)) return res.status(403).json({ error: 'Target is not allowed' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    let currentTarget = target;
    let upstream;
    for (let redirectCount = 0; redirectCount <= 2; redirectCount++) {
      upstream = await fetch(currentTarget, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          Accept: 'application/json, text/html;q=0.9',
          'User-Agent': 'Basketball-Stats-Manager/2.0'
        }
      });
      if (upstream.status < 300 || upstream.status >= 400) break;
      const location = upstream.headers.get('location');
      const nextTarget = location ? new URL(location, currentTarget) : null;
      if (!nextTarget || !isAllowedTarget(nextTarget)) return res.status(502).json({ error: 'Unsafe upstream redirect' });
      currentTarget = nextTarget;
    }
    if (!upstream || (upstream.status >= 300 && upstream.status < 400)) {
      return res.status(502).json({ error: 'Too many upstream redirects' });
    }
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Upstream request failed' });

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json') && !contentType.includes('text/html')) {
      return res.status(502).json({ error: 'Unsupported upstream content type' });
    }
    const contentLength = Number(upstream.headers.get('content-length') || 0);
    if (contentLength > MAX_RESPONSE_BYTES) return res.status(502).json({ error: 'Upstream response is too large' });

    const body = await readLimitedBody(upstream);
    if (!body) return res.status(502).json({ error: 'Upstream response is too large' });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', contentType.includes('application/json')
      ? 'application/json; charset=utf-8'
      : 'text/plain; charset=utf-8');
    return res.status(200).send(body);
  } catch (error) {
    const status = error?.name === 'AbortError' ? 504 : 502;
    return res.status(status).json({ error: status === 504 ? 'Upstream timed out' : 'Upstream request failed' });
  } finally {
    clearTimeout(timeout);
  }
}

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT || 8000);
const maxResponseBytes = 5 * 1024 * 1024;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdn.sheetjs.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://ruzfbkxiqusfbiyxyegb.supabase.co https://ibasketball.co.il https://*.ibasketball.co.il; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff'
};

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function allowedTarget(target) {
  const hostname = target.hostname.toLowerCase();
  const allowedPath = /^\/wp-json\/(?:sportspress|wp)\/v2\/(?:events|players)(?:\/\d+)?\/?$/.test(target.pathname)
    || /^\/league\/[a-z0-9_-]+\/?$/i.test(target.pathname)
    || /^\/(?:game|event)\/[a-z0-9_-]+\/?$/i.test(target.pathname);
  return target.protocol === 'https:'
    && !target.username
    && !target.password
    && !target.port
    && allowedPath
    && (hostname === 'ibasketball.co.il' || hostname.endsWith('.ibasketball.co.il'));
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
    if (total > maxResponseBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function proxyIbba(requestUrl, response) {
  let target;
  try {
    target = new URL(requestUrl.searchParams.get('url'));
  } catch {
    return sendJson(response, 400, { error: 'Invalid url parameter' });
  }
  if (!allowedTarget(target)) return sendJson(response, 403, { error: 'Target is not allowed' });

  let currentTarget = target;
  let upstream;
  for (let redirectCount = 0; redirectCount <= 2; redirectCount++) {
    upstream = await fetch(currentTarget, {
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
      headers: { Accept: 'application/json, text/html;q=0.9', 'User-Agent': 'Basketball-Stats-Manager-Dev/2.0' }
    });
    if (upstream.status < 300 || upstream.status >= 400) break;
    const location = upstream.headers.get('location');
    const nextTarget = location ? new URL(location, currentTarget) : null;
    if (!nextTarget || !allowedTarget(nextTarget)) return sendJson(response, 502, { error: 'Unsafe upstream redirect' });
    currentTarget = nextTarget;
  }
  if (!upstream || (upstream.status >= 300 && upstream.status < 400)) {
    return sendJson(response, 502, { error: 'Too many upstream redirects' });
  }
  if (!upstream.ok) return sendJson(response, upstream.status, { error: 'Upstream request failed' });

  const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json') && !contentType.includes('text/html')) {
    return sendJson(response, 502, { error: 'Unsupported upstream content type' });
  }
  const body = await readLimitedBody(upstream);
  if (!body) return sendJson(response, 502, { error: 'Upstream response is too large' });
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType.includes('application/json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  try {
    const requestHost = String(request.headers.host || '').toLowerCase();
    if (requestHost !== `localhost:${port}` && requestHost !== `127.0.0.1:${port}`) {
      return sendJson(response, 403, { error: 'Host not allowed' });
    }
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (requestUrl.pathname === '/api/ibba') {
      if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
      return await proxyIbba(requestUrl, response);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Method not allowed' });

    const pathname = requestUrl.pathname === '/' ? '/index.html' : decodeURIComponent(requestUrl.pathname);
    const isPublicPath = pathname === '/env.js'
      || /^\/[^/]+\.html$/i.test(pathname)
      || /^\/(js|css|assets)\//i.test(pathname);
    if (!isPublicPath || pathname.split('/').some(segment => segment.startsWith('.'))) {
      return sendJson(response, 403, { error: 'Path not allowed' });
    }
    const filePath = resolve(root, `.${pathname}`);
    if (!filePath.startsWith(`${root}${sep}`)) return sendJson(response, 403, { error: 'Path not allowed' });
    if (!statSync(filePath).isFile()) return sendJson(response, 404, { error: 'Not found' });

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
      ...securityHeaders
    });
    if (request.method === 'HEAD') return response.end();
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error?.code === 'ENOENT') return sendJson(response, 404, { error: 'Not found' });
    if (error?.name === 'TimeoutError') return sendJson(response, 504, { error: 'Upstream timed out' });
    return sendJson(response, 500, { error: 'Local server error' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local dashboard: http://localhost:${port}`);
});

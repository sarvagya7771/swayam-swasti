import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';
const ROOT = resolve(process.cwd(), 'dist');
const INDEX = join(ROOT, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

function sendFile(res, path, status = 200, cache = 'no-cache') {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': cache,
  });
  createReadStream(path).pipe(res);
}

const server = createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { ...SECURITY_HEADERS, Allow: 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    res.end('Bad Request');
    return;
  }

  // Resolve inside dist only — no path traversal.
  const candidate = normalize(join(ROOT, pathname));
  if (!candidate.startsWith(ROOT)) {
    res.writeHead(403, SECURITY_HEADERS);
    res.end('Forbidden');
    return;
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (await fileExists(candidate)) {
    const cache = pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache';
    sendFile(res, candidate, 200, cache);
    return;
  }

  // Single-page app: unknown routes fall back to the app shell so deep links
  // such as /bookings or /guidance/beginning-a-practice work on refresh.
  sendFile(res, INDEX, 200, 'no-cache');
});

server.listen(PORT, HOST, () => {
  console.log(`Swayam Swasti customer app listening on http://${HOST}:${PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { OPTIONS, POST } from './api/chat.ts';
import { POST as TTS_POST } from './api/tts.ts';

const port = Number(process.env.PORT || 3000);
const distDir = resolve(process.cwd(), 'dist');
const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendJson(outgoing: import('node:http').ServerResponse, status: number, payload: unknown) {
  outgoing.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  outgoing.end(JSON.stringify(payload));
}

async function serveFrontend(pathname: string, method: string, outgoing: import('node:http').ServerResponse) {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(outgoing, 400, { error: 'Invalid URL path' });
    return;
  }

  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = resolve(distDir, '.' + requestedPath);
  const relativePath = relative(distDir, filePath);
  if (relativePath.startsWith('..' + sep) || relativePath === '..' || isAbsolute(relativePath)) {
    sendJson(outgoing, 403, { error: 'Forbidden' });
    return;
  }

  let body: Buffer;
  let servedPath = filePath;
  try {
    body = await readFile(filePath);
  } catch {
    // Client-side routes fall back to the SPA entry; missing assets remain real 404s.
    if (extname(requestedPath)) {
      sendJson(outgoing, 404, { error: 'Not found' });
      return;
    }
    servedPath = resolve(distDir, 'index.html');
    try {
      body = await readFile(servedPath);
    } catch {
      sendJson(outgoing, 503, { error: 'Frontend build is not available' });
      return;
    }
  }

  const isHashedAsset = /\\.[a-f0-9]{8,}\\./i.test(servedPath);
  outgoing.writeHead(200, {
    'content-type': MIME_TYPES[extname(servedPath).toLowerCase()] || 'application/octet-stream',
    'content-length': body.byteLength,
    'cache-control': servedPath.endsWith('index.html')
      ? 'no-cache'
      : isHashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    'x-content-type-options': 'nosniff',
  });
  outgoing.end(method === 'HEAD' ? undefined : body);
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method || 'GET';
    const url = new URL(incoming.url || '/', `http://${incoming.headers.host || 'localhost'}`);

    if (url.pathname === '/api/version' && method === 'GET') {
      const origin = incoming.headers.origin || '';
      const mobileOrigins = new Set(['capacitor://localhost', 'http://localhost', 'https://localhost']);
      outgoing.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...(mobileOrigins.has(origin) ? { 'access-control-allow-origin': origin, 'vary': 'Origin' } : {}),
      });
      outgoing.end(JSON.stringify({
        app: 'VAYORA-SAPIENTIA',
        minimumBuild: 7,
        latestBuild: 7,
        versionName: '0.0.1',
        updateRequired: false,
      }));
      return;
    }

    if (url.pathname === '/healthz' && method === 'GET') {
      outgoing.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      });
      outgoing.end(JSON.stringify({ ok: true, service: 'vayora-avora-api' }));
      return;
    }

    if (url.pathname === '/api/tts' && method === 'POST') {
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
      const request = new Request(url, {
        method,
        headers,
        body: Readable.toWeb(incoming) as ReadableStream<Uint8Array>,
        duplex: 'half',
      } as RequestInit);
      const response = await TTS_POST(request);
      outgoing.statusCode = response.status;
      response.headers.forEach((value, key) => outgoing.setHeader(key, value));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    if (url.pathname === '/api/chat' && method === 'POST') {
      const suppliedBuild = Number(incoming.headers['x-vayora-build'] || 0);
      if (!Number.isInteger(suppliedBuild) || suppliedBuild < 7) {
        sendJson(outgoing, 426, {
          code: 'update_required',
          error: 'هذا الإصدار لم يعد مدعوماً. حدّث VAYORA إلى أحدث إصدار للمتابعة.',
          minimumBuild: 7,
        });
        return;
      }
    }

    if (url.pathname === '/api/chat' && (method === 'POST' || method === 'OPTIONS')) {
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }

      const body = method === 'POST' ? Readable.toWeb(incoming) as ReadableStream<Uint8Array> : undefined;
      const init = {
        method,
        headers,
        ...(body ? { body, duplex: 'half' } : {}),
      } as RequestInit;

      const request = new Request(url, init);
      const response = method === 'OPTIONS' ? await OPTIONS(request) : await POST(request);

      outgoing.statusCode = response.status;
      response.headers.forEach((value, key) => outgoing.setHeader(key, value));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(outgoing, 404, { error: 'Not found' });
      return;
    }

    if (method === 'GET' || method === 'HEAD') {
      await serveFrontend(url.pathname, method, outgoing);
      return;
    }

    sendJson(outgoing, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Request failed:', error instanceof Error ? error.message : 'unknown error');
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    }
    outgoing.end(JSON.stringify({ error: 'حدث خطأ داخلي في الخادم.' }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`VAYORA app and avora API listening on port ${port}`);
});

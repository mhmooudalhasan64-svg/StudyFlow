import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { OPTIONS, POST } from './api/chat.ts';

const port = Number(process.env.PORT || 3000);

const server = createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method || 'GET';
    const url = new URL(incoming.url || '/', `http://${incoming.headers.host || 'localhost'}`);

    if (url.pathname === '/healthz' && method === 'GET') {
      outgoing.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      outgoing.end(JSON.stringify({ ok: true, service: 'vayora-skova-api' }));
      return;
    }

    if (url.pathname !== '/api/chat' || (method !== 'POST' && method !== 'OPTIONS')) {
      outgoing.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      outgoing.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

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
  } catch (error) {
    console.error('API request failed:', error instanceof Error ? error.message : 'unknown error');
    if (!outgoing.headersSent) outgoing.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    outgoing.end(JSON.stringify({ error: 'حدث خطأ داخلي في الخادم.' }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`VAYORA SKOVA API listening on port ${port}`);
});

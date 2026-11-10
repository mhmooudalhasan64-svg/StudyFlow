// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST } from './chat';

const runtime = globalThis as typeof globalThis & {
  process: { env: Record<string, string | undefined> };
};
const env = runtime.process.env;
const originalGroqKey = env.GROQ_API_KEY;

beforeEach(() => {
  env.GROQ_API_KEY = 'test-key';
});

afterEach(() => {
  if (originalGroqKey === undefined) delete env.GROQ_API_KEY;
  else env.GROQ_API_KEY = originalGroqKey;
});

describe('POST /api/chat request guards', () => {
  it('rejects non-JSON requests before processing them', async () => {
    const response = await POST(new Request('https://example.test/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    }));

    expect(response.status).toBe(415);
  });

  it('rejects request bodies larger than 48 KB', async () => {
    const response = await POST(new Request('https://example.test/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'x'.repeat(49 * 1024),
    }));

    expect(response.status).toBe(413);
  });
});

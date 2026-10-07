import { describe, expect, it } from 'vitest';
import { handle, type Env } from '../src/site-worker';

const env: Env = { ASSETS: { fetch: async (r: Request) => new Response(`asset ${new URL(r.url).pathname}`) } };

describe('site worker', () => {
  it('sends www to the bare domain, keeping path and query', async () => {
    const res = await handle(new Request('https://www.careercrash.org/incident/?c=pl'), env);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://careercrash.org/incident/?c=pl');
  });

  it('serves assets on the bare domain and on preview hosts', async () => {
    for (const u of ['https://careercrash.org/robots.txt', 'https://career-crash.example.workers.dev/']) {
      const res = await handle(new Request(u), env);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(`asset ${new URL(u).pathname}`);
    }
  });
});

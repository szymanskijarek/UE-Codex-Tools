import { describe, expect, it } from 'vitest';
import { handle, type Env } from '../src/site-worker';

const env: Env = {
  ASSETS: {
    // Like the asset store: a missing trailing slash (or /index.html) is a temporary redirect.
    fetch: async (r: Request) => {
      const path = new URL(r.url).pathname;
      if (path === '/news') return new Response(null, { status: 307, headers: { location: '/news/' } });
      if (path === '/index.html') return new Response(null, { status: 307, headers: { location: 'https://careercrash.org/' } });
      return new Response(`asset ${path}`);
    },
  },
};

describe('site worker', () => {
  it('sends www to the bare domain, keeping path and query', async () => {
    const res = await handle(new Request('https://www.careercrash.org/incident/?c=pl'), env);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://careercrash.org/incident/?c=pl');
  });

  it("makes the asset store's tidy-URL redirects permanent", async () => {
    for (const [from, to] of [
      ['https://careercrash.org/news', 'https://careercrash.org/news/'],
      ['https://careercrash.org/index.html', 'https://careercrash.org/'],
    ]) {
      const res = await handle(new Request(from), env);
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe(to);
    }
  });

  it('serves assets on the bare domain and on preview hosts', async () => {
    for (const u of ['https://careercrash.org/robots.txt', 'https://career-crash.example.workers.dev/']) {
      const res = await handle(new Request(u), env);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(`asset ${new URL(u).pathname}`);
    }
  });
});

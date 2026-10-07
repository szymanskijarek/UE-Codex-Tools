import { DatabaseSync } from 'node:sqlite';
import { HourTally, VoteKeys, type Env } from '../src/index';
import type { Sql } from '../src/ledger';

// In-memory stand-ins for the Worker's Durable Objects, shared with the page's tests (apps/client/test/incident-votes.test.ts).

/** Durable Object SQLite on node:sqlite. */
export function memorySql(): Sql {
  const db = new DatabaseSync(':memory:');
  return {
    exec(q, ...b) {
      const st = db.prepare(q);
      if (/^\s*select/i.test(q)) return { toArray: () => st.all(...b) as Record<string, string | number>[] };
      st.run(...b);
      return { toArray: () => [] };
    },
  };
}

export function fakeState() {
  const kv = new Map<string, unknown>();
  let alarm: number | null = null;
  return {
    storage: {
      sql: memorySql(),
      get: async <T>(k: string) => kv.get(k) as T | undefined,
      put: async (k: string, v: unknown) => void kv.set(k, v),
      getAlarm: async () => alarm,
      setAlarm: async (t: number) => void (alarm = t),
    },
    alarmAt: () => alarm,
  };
}

/** A namespace that keeps one object per name, like the real thing. */
function namespace<T extends { fetch(r: Request): Promise<Response> }>(make: () => T) {
  const objs = new Map<string, T>();
  return {
    objs,
    ns: {
      idFromName: (n: string) => n,
      get: (id: string) => {
        if (!objs.has(id)) objs.set(id, make());
        const o = objs.get(id)!;
        return { fetch: (u: string | Request, init?: RequestInit) => o.fetch(typeof u === 'string' ? new Request(u, init) : u) };
      },
    },
  };
}

export function setup() {
  const hours = namespace(() => new HourTally(fakeState() as never, {} as Env));
  const keys = namespace(() => new VoteKeys(fakeState() as never, {} as Env));
  const env = { HOURS: hours.ns, KEYS: keys.ns, ALLOWED_ORIGIN: 'https://careercrash.org' } as unknown as Env;
  return { env, hours: hours.objs };
}


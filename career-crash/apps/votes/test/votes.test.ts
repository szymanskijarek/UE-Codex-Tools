import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { NETWORK_CAP, POW_BITS, POW_PREFIX, type HourTallies } from '@cc/protocol/votes';
import { handle, HourTally, type Env } from '../src/index';
import { fakeState, setup } from './fakes';
import { type Sql } from '../src/ledger';
import { checkToken, dayOf, leadingZeroBits } from '../src/token';

/** Earns a token the way the page does (node's sync sha256 for speed). */
function proof(now: number, salt: string) {
  const day = dayOf(now);
  for (let nonce = 0; ; nonce++) {
    const h = createHash('sha256').update(`${POW_PREFIX}${day}:${salt}:${nonce}`).digest();
    if (leadingZeroBits(h) >= POW_BITS) return { day, salt, nonce };
  }
}

const T0 = Date.parse('2026-10-07T14:00:10Z');
const at = (min: number, sec = 0) => T0 - 10_000 + min * 60_000 + sec * 1000;
const post = (path: string, body: unknown) => new Request(`https://vote.careercrash.org${path}`, { method: 'POST', body: JSON.stringify(body), headers: { origin: 'https://careercrash.org', 'cf-connecting-ip': '203.0.113.7' } });
const get = (path: string) => new Request(`https://vote.careercrash.org${path}`, { headers: { origin: 'https://careercrash.org' } });

async function token(env: Env, now: number, salt: string): Promise<string> {
  const res = await handle(post('/token', proof(now, salt)), env, undefined, now);
  expect(res.status).toBe(200);
  return ((await res.json()) as { token: string }).token;
}

async function like(env: Env, now: number, tok: string, country: string, hour = '2026-10-07T14') {
  HourTally.now = () => now;
  return handle(post('/like', { token: tok, country, hour }), env, undefined, now);
}

async function hour(env: Env, now: number, s: number): Promise<HourTallies> {
  const res = await handle(get(`/hour/2026-10-07T14?s=${s}`), env, undefined, now);
  expect(res.status).toBe(200);
  return (await res.json()) as HourTallies;
}

afterEach(() => {
  HourTally.now = () => Date.now();
});

describe('vote service', () => {
  it('issues tokens only for a real proof of work', async () => {
    const { env } = setup();
    const p = proof(T0, 'a1b2c3d4e5f60718');
    expect((await handle(post('/token', { ...p, nonce: p.nonce + 1 }), env, undefined, T0)).status).toBe(400);
    expect((await handle(post('/token', { ...p, day: '2026-09-01' }), env, undefined, T0)).status).toBe(400);
    const res = await handle(post('/token', p), env, undefined, T0);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://careercrash.org');
    const { token: t } = (await res.json()) as { token: string };
    // Forged or expired tokens are refused.
    const key = await (await env.KEYS.get(env.KEYS.idFromName('v1')).fetch('https://keys/key')).text();
    expect(await checkToken(key, t, T0)).not.toBeNull();
    expect(await checkToken(key, t.slice(0, -1) + (t.endsWith('0') ? '1' : '0'), T0)).toBeNull();
    expect(await checkToken(key, t, T0 + 8 * 86_400_000)).toBeNull();
  });

  it('counts one like per device per country per hour, from the next session', async () => {
    const { env } = setup();
    const a = await token(env, T0, 'aaaaaaaaaaaaaaaa');
    const b = await token(env, T0, 'bbbbbbbbbbbbbbbb');
    expect((await like(env, at(2), a, 'PL')).status).toBe(200);
    expect((await like(env, at(3), a, 'PL')).status).toBe(409);
    expect((await like(env, at(3), a, 'ENG')).status).toBe(200);
    const r = await like(env, at(7), b, 'PL');
    expect(await r.json()).toEqual({ hour: '2026-10-07T14', session: 1 });

    const h = await hour(env, at(7), 1);
    expect(h.session).toBe(1);
    expect(h.frozen).toEqual([{}, { PL: 1, ENG: 1 }]);
    expect(h.pending).toEqual({ PL: 1 });
    // Later likes never change a session that has started.
    const later = await hour(env, at(31), 6);
    expect(later.frozen[1]).toEqual({ PL: 1, ENG: 1 });
    expect(later.frozen[2]).toEqual({ PL: 2, ENG: 1 });
    expect(later.frozen[6]).toEqual({ PL: 2, ENG: 1 });
  });

  it('turns away bad likes', async () => {
    const { env } = setup();
    const a = await token(env, T0, 'cccccccccccccccc');
    expect((await like(env, at(1), a, 'XX')).status).toBe(400);
    expect((await like(env, at(1), 'v1.nope', 'PL')).status).toBe(401);
    expect((await like(env, at(1), a, 'PL', '2026-10-07T13')).status).toBe(410);
    expect((await handle(post('/like', { token: a, country: 'PL', hour: '2026-10-07T14' }), { ...env, LIKES_OPEN: '0' }, undefined, at(1))).status).toBe(503);
  });

  it('waits for a session to start before giving out its tally', async () => {
    const { env } = setup();
    expect((await handle(get('/hour/2026-10-07T14?s=3'), env, undefined, at(14, 59))).status).toBe(425);
    expect((await handle(get('/hour/2026-10-07T14?s=3'), env, undefined, at(15))).status).toBe(200);
    expect((await handle(get('/hour/2026-10-07T15?s=0'), env, undefined, at(15))).status).toBe(404);
    // A finished hour: all twelve sessions.
    expect((await hour(env, at(75), 11)).frozen).toHaveLength(12);
  });

  it('caps likes per network and country', async () => {
    const { env } = setup();
    const stub = env.HOURS.get(env.HOURS.idFromName('2026-10-07T14'));
    HourTally.now = () => at(1);
    const send = (voter: string, country: string, network = '203.0.113') =>
      stub.fetch('https://hour/like', { method: 'POST', body: JSON.stringify({ hour: '2026-10-07T14', voter, country, network }) }).then((r) => r.status);
    for (let i = 0; i < NETWORK_CAP; i++) expect(await send(`v${i}`, 'PL')).toBe(200);
    expect(await send('one-more', 'PL')).toBe(429);
    expect(await send('one-more', 'ENG')).toBe(200);
    expect(await send('elsewhere', 'PL', '198.51.100')).toBe(200);
  });

  it('forgets who liked what after the hour, and keeps the counts', async () => {
    const { env, hours } = setup();
    const a = await token(env, T0, 'dddddddddddddddd');
    await like(env, at(2), a, 'PL');
    const obj = hours.get('2026-10-07T14')!;
    // The alarm is set for two hours after the hour ends.
    expect((obj as unknown as { state: ReturnType<typeof fakeState> }).state.alarmAt()).toBe(Date.parse('2026-10-07T17:00:00Z'));
    obj.alarm();
    expect((await hour(env, at(75), 11)).frozen[11]).toEqual({ PL: 1 });
    // Nobody is on file any more, only the totals.
    const sql = (obj as unknown as { ledger: { sql: Sql } }).ledger.sql;
    expect(sql.exec('SELECT COUNT(*) AS n FROM likes').toArray()[0]!.n).toBe(0);
  });
});

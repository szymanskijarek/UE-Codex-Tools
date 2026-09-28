import { join } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import type { AttackResponse, AuthResponse, CareerOfferResponse, MeResponse, OpponentDTO } from '@cc/protocol';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Repo } from '../src/repo';
import type { Env } from '../src/util';
import { D1Shim } from './d1-shim';

function setup() {
  const db = new D1Shim(join(__dirname, '..', 'migrations'));
  const env: Env = { DB: db as unknown as D1Database, SESSION_SECRET: 'test-secret' };
  const app = createApp();
  let token = '';
  const call = async <T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; data: T }> => {
    const res = await app.request(
      `/api/v1${path}`,
      { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) },
      env,
    );
    return { status: res.status, data: (await res.json()) as T };
  };
  const signIn = async (secret: string, name: string) => {
    const r = await call<AuthResponse>('POST', '/auth/device', { deviceSecret: secret, displayName: name });
    token = r.data.token;
    return r.data;
  };
  return { db, env, call, signIn, setToken: (t: string) => (token = t) };
}

describe('API (01 §6.4)', () => {
  it('rejects unauthenticated requests', async () => {
    const { call } = setup();
    expect((await call('GET', '/me')).status).toBe(401);
  });

  it('device sign-up creates a player with a starter roster, wallet and defence; sign-in is idempotent', async () => {
    const t = setup();
    const a = await t.signIn('device-secret-0001', 'Alice');
    const me = await t.call<MeResponse>('GET', '/me');
    expect(me.status).toBe(200);
    expect(me.data.player.displayName).toBe('Alice');
    expect(me.data.roster).toHaveLength(4);
    expect(me.data.player.wallet.cash).toBe(1000);
    expect(me.data.player.wallet.tickets).toBe(10);
    expect(me.data.defences[0]!.characterIds).toHaveLength(3);
    const again = await t.signIn('device-secret-0001', 'ignored');
    expect(again.playerId).toBe(a.playerId);
  });

  it('full loop: opponents → attack → rewards, XP, rating, ledger invariant', async () => {
    const t = setup();
    const { playerId } = await t.signIn('device-secret-0002', 'Bob');
    const me = (await t.call<MeResponse>('GET', '/me')).data;
    const opp = await t.call<{ opponents: OpponentDTO[] }>('GET', '/opponents/duel_3v3');
    expect(opp.status).toBe(200);
    expect(opp.data.opponents.length).toBeGreaterThan(0);
    const target = opp.data.opponents[0]!;
    const ids = me.roster.slice(0, 3).map((c) => c.id);
    const atk = await t.call<AttackResponse>('POST', '/battles/attack', { mode: 'duel_3v3', opponentId: target.playerId, characterIds: ids });
    expect(atk.status).toBe(200);
    expect(atk.data.record.input.teams).toHaveLength(2);
    expect(atk.data.progress).toHaveLength(3);
    expect(atk.data.player.wallet.tickets).toBe(9);
    expect(atk.data.record.summary.report.lines).toHaveLength(6);
    // The battle record replays to the same hash on the client.
    const { simulate } = await import('@cc/sim');
    const { bundle } = await import('@cc/content');
    expect(simulate(atk.data.record.input, bundle).resultHash).toBe(atk.data.record.resultHash);
    // Stale opponent list is rejected (must refresh).
    const again = await t.call('POST', '/battles/attack', { mode: 'duel_3v3', opponentId: target.playerId, characterIds: ids });
    expect(again.status).toBe(409);
    expect(await new Repo(t.env.DB).ledgerConsistent(playerId)).toBe(true);
  });

  it('PvP: attacking a real player updates their rating and pending defence rewards', async () => {
    const t = setup();
    const def = await t.signIn('device-secret-defender', 'Defender');
    const atk = await t.signIn('device-secret-attacker', 'Attacker');
    // Real players are preferred over bots, so the defender (same rating) is the "even" pick.
    const r = await t.call<{ opponents: OpponentDTO[] }>('GET', '/opponents/duel_3v3?refresh=1');
    const card = r.data.opponents.find((o) => o.playerId === def.playerId);
    expect(card?.difficulty).toBe('even');
    const me = (await t.call<MeResponse>('GET', '/me')).data;
    const res = await t.call<AttackResponse>('POST', '/battles/attack', { mode: 'duel_3v3', opponentId: def.playerId, characterIds: me.roster.slice(0, 3).map((c) => c.id) });
    expect(res.status).toBe(200);
    await t.signIn('device-secret-defender', 'Defender');
    const dme = (await t.call<MeResponse>('GET', '/me')).data;
    const total = dme.pending.defences.wins + dme.pending.defences.losses + dme.pending.defences.draws;
    expect(total).toBe(1);
    expect(dme.unreadReports).toBe(1);
    const reports = await t.call<{ reports: { attackerName: string }[] }>('GET', '/reports');
    expect(reports.data.reports[0]!.attackerName).toBe('Attacker');
    expect(dme.player.rating).not.toBe(1000);
    expect(atk.playerId).not.toBe(def.playerId);
  });

  it('idempotency keys replay the first response', async () => {
    const t = setup();
    await t.signIn('device-secret-0003', 'Cara');
    const shop = await t.call<{ items: { id: string; price: number }[] }>('GET', '/shop');
    const item = [...shop.data.items].sort((x, y) => x.price - y.price)[0]!;
    const a = await t.call<{ inventory: string[] }>('POST', `/shop/${item.id}/buy`, undefined, { 'Idempotency-Key': 'k1' });
    const b = await t.call<{ inventory: string[] }>('POST', `/shop/${item.id}/buy`, undefined, { 'Idempotency-Key': 'k1' });
    expect(a.status).toBe(200);
    expect(b.data).toEqual(a.data);
    const me = (await t.call<MeResponse>('GET', '/me')).data;
    expect(me.player.inventory).toEqual([item.id]);
    expect(me.player.wallet.cash).toBe(1000 - item.price);
    // Roster slots cost 1000 × (slot − 5)² — the 7th slot (4000) is unaffordable at start.
    expect((await t.call('POST', '/roster/slots')).status).toBe(402);
  });

  it('career milestone: offer → choose; recruiting and shop enforce costs', async () => {
    const t = setup();
    const { playerId } = await t.signIn('device-secret-0004', 'Dee');
    const me = (await t.call<MeResponse>('GET', '/me')).data;
    const ch = me.roster[0]!;
    expect((await t.call('POST', `/characters/${ch.id}/offer`)).status).toBe(409); // level 1: no milestone
    // Level the character directly in the DB to reach the level-5 milestone.
    ch.level = 5;
    ch.xp = 920;
    await new Repo(t.env.DB).saveCharacter(ch).run();
    const offer = await t.call<CareerOfferResponse>('POST', `/characters/${ch.id}/offer`);
    expect(offer.status).toBe(200);
    expect(offer.data.offer.length).toBeGreaterThan(0);
    const pick = await t.call<{ character: { careers: string[] } }>('POST', `/characters/${ch.id}/career`, { careerId: offer.data.offer[0] });
    expect(pick.status).toBe(200);
    expect(pick.data.character.careers).toHaveLength(2);

    const recruits = await t.call<{ applicants: { index: number; cost: number }[] }>('GET', '/recruits');
    const cheapest = recruits.data.applicants.sort((a, b) => a.cost - b.cost)[0]!;
    const hire = await t.call('POST', `/recruits/${cheapest.index}/hire`);
    expect(hire.status).toBe(200);
    expect((await t.call('POST', `/recruits/${cheapest.index}/hire`)).status).toBe(409);
    expect(await new Repo(t.env.DB).ledgerConsistent(playerId)).toBe(true);
  });

  it('defence upload validates ownership and team size', async () => {
    const t = setup();
    await t.signIn('device-secret-0005', 'Eve');
    const me = (await t.call<MeResponse>('GET', '/me')).data;
    expect((await t.call('PUT', '/defence/duel_3v3', { characterIds: me.roster.slice(0, 2).map((c) => c.id) })).status).toBe(400);
    expect((await t.call('PUT', '/defence/duel_3v3', { characterIds: ['x', 'y', 'z'] })).status).toBe(403);
    const ok = await t.call<{ power: number }>('PUT', '/defence/duel_3v3', { characterIds: me.roster.slice(1, 4).map((c) => c.id) });
    expect(ok.status).toBe(200);
    expect(ok.data.power).toBeGreaterThan(0);
  });
});

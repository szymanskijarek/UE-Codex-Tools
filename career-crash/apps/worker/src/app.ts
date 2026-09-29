import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { D1PreparedStatement } from '@cloudflare/workers-types';
import { buildReport } from '@cc/commentary';
import { bundle } from '@cc/content';
import { STAT_KEYS, type Stats } from '@cc/content-schema';
import {
  addXp,
  allocatePoints,
  applyBattleToCharacter,
  attackReward,
  battleXp,
  botTeam,
  careerOffers,
  chooseCareer,
  defenceReward,
  evaluateTraits,
  generateRecruit,
  hasMilestone,
  leagueFor,
  meetsPrerequisites,
  offlinePay,
  pickOpponents,
  ratingChange,
  recruitRarity,
  regenTickets,
  relationshipDeltas,
  rosterSlotCost,
  teamPower,
  toSnapshot,
  type Character,
  type DefenceCandidate,
  type Difficulty,
  type Outcome,
} from '@cc/game-rules';
import {
  API_PREFIX,
  type ApplicantDTO,
  type AttackRequest,
  type AttackResponse,
  type BattleRecord,
  type CareerOfferResponse,
  type ChooseCareerResponse,
  type CharacterProgress,
  type JobBoardDTO,
  type LeaderboardDTO,
  type MeResponse,
  type OpponentDTO,
  type ReportDTO,
  type ShopDTO,
} from '@cc/protocol';
import { Rng, SIM_VERSION, simulate, type BattleInput, type BattleMode, type TeamSnapshot } from '@cc/sim';
import { emptyPending, Repo, toPlayerDTO, type Player, type PlayerState } from './repo';
import { ApiFail, dayKey, fail, newId, randomHex, sha256, signToken, verifyToken, verifyTurnstile, type Env } from './util';

type Vars = { playerId: string; now: number };
type C = Context<{ Bindings: Env; Variables: Vars }>;

const econ = bundle.economy;
const MODES: BattleMode[] = ['duel_3v3', 'duel_5v5'];
const teamSize = (m: BattleMode): number => (m === 'duel_5v5' ? 5 : 3);
const OPPONENT_TTL = 10 * 60_000;
const REMATCH_COOLDOWN = 24 * 3_600_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function defaultState(now: number): PlayerState {
  return {
    unlockedCareers: bundle.careers.filter((c) => c.unlock.type === 'default' && !c.deprecated).map((c) => c.id),
    inventory: [],
    ticketsRegenAt: now,
    day: dayKey(now),
    winsToday: 0,
    hiredToday: [],
    lastSettled: now,
    pending: emptyPending(),
    rosterSlots: econ.rosterSlots.start,
    attacked: {},
    opponents: null,
  };
}

/**
 * Daily rollover + ticket regeneration (03 §2). Mutates the player state and
 * returns the ledger statements plus the number of tickets gained.
 */
function refresh(repo: Repo, p: Player, tickets: number, now: number): { stmts: D1PreparedStatement[]; gained: number } {
  const stmts: D1PreparedStatement[] = [];
  let gained = 0;
  const today = dayKey(now);
  if (p.state.day !== today) {
    p.state.day = today;
    p.state.winsToday = 0;
    p.state.hiredToday = [];
    gained += econ.tickets.dailyBonus;
    stmts.push(...repo.credit(p.id, 'tickets', econ.tickets.dailyBonus, 'daily_bonus', today, now));
  }
  const r = regenTickets(econ, tickets + gained, p.state.ticketsRegenAt, now);
  if (r.tickets > tickets + gained) {
    stmts.push(...repo.credit(p.id, 'tickets', r.tickets - tickets - gained, 'regen', null, now));
    gained = r.tickets - tickets;
  }
  p.state.ticketsRegenAt = r.lastRegenMs;
  for (const [k, t] of Object.entries(p.state.attacked)) if (now - t > REMATCH_COOLDOWN) delete p.state.attacked[k];
  p.lastSeenAt = now;
  return { stmts, gained };
}

async function loadMe(c: C): Promise<{ repo: Repo; p: Player }> {
  const repo = new Repo(c.env.DB);
  const p = (await repo.player(c.get('playerId'))) ?? fail(401, 'unknown_player', 'Player not found');
  return { repo, p };
}

function ownCharacters(roster: Character[], ids: string[], size: number): Character[] {
  if (new Set(ids).size !== ids.length) fail(400, 'duplicate_characters', 'Each character can only be picked once');
  if (ids.length !== size) fail(400, 'team_size', `Pick exactly ${size} characters`);
  return ids.map((id) => roster.find((c) => c.id === id) ?? fail(403, 'not_your_character', `Character ${id} is not in your roster`));
}

function makeTeam(p: Player, chars: Character[]): TeamSnapshot {
  return { playerId: p.id, playerName: p.displayName, rating: p.rating, characters: chars.map(toSnapshot) };
}

function applicants(p: Player): ApplicantDTO[] {
  const out: ApplicantDTO[] = [];
  for (let i = 0; i < econ.recruit.applicants; i++) {
    const rng = Rng.fromSeed(`${p.id}:${p.state.day}:applicant:${i}`);
    const rarity = recruitRarity(rng);
    const character = generateRecruit(bundle, rng, `ch_${p.id.slice(2, 12)}_${p.state.day.replaceAll('-', '')}_${i}`, { rarity, careerPool: p.state.unlockedCareers.filter((id) => bundle.careers.find((x) => x.id === id)?.tier === 1) });
    out.push({ index: i, rarity, cost: econ.recruit.costs[rarity] ?? 500, character, hired: p.state.hiredToday.includes(i) });
  }
  return out;
}

function shopItems(p: Player): string[] {
  const rng = Rng.fromSeed(`${p.id}:${p.state.day}:shop`);
  const pool = [...bundle.equipment].sort((a, b) => (a.id < b.id ? -1 : 1));
  const items: string[] = [];
  while (items.length < 6 && pool.length > 0) items.push(pool.splice(rng.int(pool.length), 1)[0]!.id);
  return items;
}

function pendingPreview(p: Player, roster: Character[], now: number) {
  const off = offlinePay(bundle, roster, p.state.lastSettled, now);
  return { ...p.state.pending, cash: p.state.pending.cash + off.cash, offlineHours: off.hours };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>();

  app.use('*', async (c, next) => {
    const origin = c.env.ALLOWED_ORIGIN ?? '*';
    return cors({ origin: origin.split(','), allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'], allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'] })(c, next);
  });

  app.onError((err, c) => {
    if (err instanceof ApiFail) return c.json({ error: err.message, code: err.code }, err.status);
    console.error(JSON.stringify({ level: 'error', message: String(err), stack: (err as Error).stack }));
    return c.json({ error: 'Internal error', code: 'internal' }, 500);
  });

  const api = new Hono<{ Bindings: Env; Variables: Vars }>();

  api.get('/content/manifest', (c) => c.json({ contentHash: bundle.hash, simVersion: SIM_VERSION }));

  // ---- Auth -----------------------------------------------------------------
  api.post('/auth/device', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { deviceSecret?: string; displayName?: string; turnstileToken?: string };
    if (!body.deviceSecret || body.deviceSecret.length < 16) fail(400, 'device_secret', 'deviceSecret (≥16 chars) required');
    const now = Date.now();
    const repo = new Repo(c.env.DB);
    const subject = await sha256(body.deviceSecret!);
    let playerId = await repo.identity('device', subject);
    if (!playerId) {
      if (!(await verifyTurnstile(c.env, body.turnstileToken, c.req.header('CF-Connecting-IP') ?? null))) fail(403, 'turnstile', 'Bot check failed');
      playerId = newId('pl');
      const name = (body.displayName ?? '').trim().slice(0, 24) || `Manager ${randomHex(2).toUpperCase()}`;
      const p: Player = { id: playerId, displayName: name, createdAt: now, lastSeenAt: now, rating: econ.rating.start, league: leagueFor(econ, econ.rating.start), state: defaultState(now) };
      const rng = Rng.fromSeed(`${playerId}:starters`);
      const starters = [0, 1, 2, 3].map((i) => generateRecruit(bundle, rng, `ch_${playerId!.slice(3)}_s${i}`, { rarity: i === 3 ? 'rare' : 'common', now }));
      const team = makeTeam(p, starters.slice(0, 3));
      await c.env.DB.batch([
        repo.insertPlayer(p),
        repo.insertIdentity('device', subject, playerId),
        ...repo.initWallet(playerId, econ.startingWallet, now),
        ...starters.map((s) => repo.insertCharacter(playerId!, s)),
        repo.upsertDefence(playerId, 'duel_3v3', starters.slice(0, 3).map((s) => s.id), team, bundle.hash, teamPower(bundle, team.characters), p.rating, now),
      ]);
    }
    return c.json({ token: await signToken(c.env.SESSION_SECRET, playerId, now), playerId });
  });

  // Everything below requires a session.
  api.use('*', async (c, next) => {
    const auth = c.req.header('Authorization') ?? '';
    const now = Date.now();
    const pid = auth.startsWith('Bearer ') ? await verifyToken(c.env.SESSION_SECRET, auth.slice(7), now) : null;
    if (!pid) return c.json({ error: 'Not signed in', code: 'unauthorized' }, 401);
    c.set('playerId', pid);
    c.set('now', now);
    // Idempotency (01 §6.4): replay stored responses for repeated mutating requests.
    const key = c.req.header('Idempotency-Key');
    if (key && c.req.method !== 'GET') {
      const hit = await c.env.DB.prepare('SELECT response FROM idempotency WHERE player_id = ? AND key = ?').bind(pid, key).first<{ response: string }>();
      if (hit) return c.body(hit.response, 200, { 'Content-Type': 'application/json', 'Idempotent-Replay': 'true' });
      await next();
      if (c.res.status === 200) {
        const text = await c.res.clone().text();
        await c.env.DB.prepare('INSERT OR IGNORE INTO idempotency (key, player_id, response, created_at) VALUES (?, ?, ?, ?)').bind(key, pid, text, now).run();
      }
      return;
    }
    await next();
  });

  // ---- Me -------------------------------------------------------------------
  api.get('/me', async (c) => {
    const { repo, p } = await loadMe(c);
    const now = c.get('now');
    const wallet = await repo.wallet(p.id);
    const { stmts } = refresh(repo, p, wallet.tickets, now);
    await c.env.DB.batch([...stmts, repo.savePlayer(p)]);
    const [w2, roster, defences, unread] = await Promise.all([
      repo.wallet(p.id),
      repo.roster(p.id),
      repo.defences(p.id),
      c.env.DB.prepare('SELECT COUNT(*) AS n FROM battles WHERE defender_id = ? AND seen_by_defender = 0').bind(p.id).first<{ n: number }>(),
    ]);
    const res: MeResponse = {
      player: toPlayerDTO(p, w2),
      roster,
      defences,
      pending: pendingPreview(p, roster, now),
      unreadReports: unread?.n ?? 0,
      contentHash: bundle.hash,
      simVersion: SIM_VERSION,
      serverTime: now,
    };
    return c.json(res);
  });

  api.post('/rewards/collect', async (c) => {
    const { repo, p } = await loadMe(c);
    const now = c.get('now');
    const roster = await repo.roster(p.id);
    const pend = pendingPreview(p, roster, now);
    const hoursMs = pend.offlineHours * 3_600_000;
    p.state.lastSettled = pend.offlineHours > 0 ? Math.max(p.state.lastSettled + hoursMs, now - econ.offline.capHours * 3_600_000) : p.state.lastSettled;
    if (pend.offlineHours >= econ.offline.capHours) p.state.lastSettled = now;
    p.state.pending = emptyPending();
    await c.env.DB.batch([...repo.credit(p.id, 'cash', pend.cash, 'collect', null, now), ...repo.credit(p.id, 'rep', pend.rep, 'collect', null, now), repo.savePlayer(p)]);
    return c.json({ collected: pend, player: toPlayerDTO(p, await repo.wallet(p.id)) });
  });

  // ---- Characters -----------------------------------------------------------
  const loadChar = async (c: C) => {
    const { repo, p } = await loadMe(c);
    const roster = await repo.roster(p.id);
    const ch = roster.find((x) => x.id === c.req.param('id')) ?? fail(404, 'no_character', 'Character not found');
    return { repo, p, roster, ch };
  };

  api.post('/characters/:id/offer', async (c) => {
    const { repo, p, ch } = await loadChar(c);
    const body = (await c.req.json().catch(() => ({}))) as { reroll?: boolean };
    if (!hasMilestone(econ, ch)) fail(409, 'no_milestone', 'No career milestone available');
    const milestoneIndex = ch.careers.length;
    const rerollCost = ch.rerolls === 0 ? 0 : econ.rerollCostPerMilestone * milestoneIndex;
    const stmts: D1PreparedStatement[] = [];
    if (!ch.pendingOffer || body.reroll) {
      if (body.reroll && ch.pendingOffer) {
        const w = await repo.wallet(p.id);
        if (w.cash < rerollCost) fail(402, 'insufficient_cash', 'Not enough cash to reroll');
        stmts.push(...repo.credit(p.id, 'cash', -rerollCost, 'reroll', ch.id, c.get('now')));
        ch.rerolls++;
      }
      ch.pendingOffer = careerOffers(bundle, ch, p.state.unlockedCareers, `${ch.id}:${milestoneIndex}:${ch.rerolls}`);
      stmts.push(repo.saveCharacter(ch));
      await c.env.DB.batch(stmts);
    }
    const res: CareerOfferResponse = { characterId: ch.id, offer: ch.pendingOffer!, rerollCost: ch.rerolls === 0 ? 0 : econ.rerollCostPerMilestone * milestoneIndex };
    return c.json(res);
  });

  api.post('/characters/:id/career', async (c) => {
    const { repo, p, ch } = await loadChar(c);
    const { careerId } = (await c.req.json()) as { careerId: string };
    const r = chooseCareer(bundle, ch, careerId);
    if (r.error) fail(409, 'career', r.error);
    const now = c.get('now');
    const stmts: D1PreparedStatement[] = [repo.saveCharacter(ch)];
    const discoveries: string[] = [];
    for (const m of r.masteries) {
      const existing = await c.env.DB.prepare('SELECT first_player_id FROM discoveries WHERE mastery_id = ?').bind(m).first<{ first_player_id: string }>();
      if (!existing) {
        discoveries.push(m);
        stmts.push(c.env.DB.prepare('INSERT INTO discoveries (mastery_id, first_player_id, first_at, total_count) VALUES (?, ?, ?, 1)').bind(m, p.id, now));
      } else stmts.push(c.env.DB.prepare('UPDATE discoveries SET total_count = total_count + 1 WHERE mastery_id = ?').bind(m));
      stmts.push(...repo.credit(p.id, 'rep', econ.rewards['mastery_discovery']?.rep ?? 0, 'mastery', m, now));
    }
    await c.env.DB.batch(stmts);
    const res: ChooseCareerResponse = { character: ch, masteries: r.masteries, discoveries };
    return c.json(res);
  });

  api.post('/characters/:id/allocate', async (c) => {
    const { repo, ch } = await loadChar(c);
    const alloc = (await c.req.json()) as Partial<Stats>;
    for (const k of Object.keys(alloc)) if (!(STAT_KEYS as readonly string[]).includes(k)) fail(400, 'stat', `Unknown stat ${k}`);
    const err = allocatePoints(bundle, ch, alloc);
    if (err) fail(400, 'allocate', err);
    await repo.saveCharacter(ch).run();
    return c.json({ character: ch });
  });

  api.post('/characters/:id/equip', async (c) => {
    const { repo, p, ch } = await loadChar(c);
    const body = (await c.req.json()) as { held?: string | null; accessory?: string | null };
    for (const slot of ['held', 'accessory'] as const) {
      if (!(slot in body)) continue;
      const want = body[slot] ?? null;
      if (want) {
        const def = bundle.equipment.find((e) => e.id === want) ?? fail(400, 'equipment', `Unknown item ${want}`);
        if (def.slot !== slot) fail(400, 'slot', `${want} is not a ${slot} item`);
        const i = p.state.inventory.indexOf(want);
        if (i < 0) fail(403, 'not_owned', `You don't own ${want}`);
        p.state.inventory.splice(i, 1);
      }
      if (ch[slot]) p.state.inventory.push(ch[slot]!);
      ch[slot] = want;
    }
    await c.env.DB.batch([repo.saveCharacter(ch), repo.savePlayer(p)]);
    return c.json({ character: ch, inventory: p.state.inventory });
  });

  api.post('/characters/:id/traits/lock', async (c) => {
    const { repo, ch } = await loadChar(c);
    const { traitId, locked } = (await c.req.json()) as { traitId: string; locked: boolean };
    if (!ch.traits.includes(traitId)) fail(400, 'trait', 'Character does not have that trait');
    ch.lockedTraits = ch.lockedTraits.filter((t) => t !== traitId);
    if (locked) {
      if (ch.lockedTraits.length >= 2) fail(409, 'lock_limit', 'At most 2 traits can be locked');
      ch.lockedTraits.push(traitId);
    }
    await repo.saveCharacter(ch).run();
    return c.json({ character: ch });
  });

  api.post('/characters/:id/retire', async (c) => {
    const { repo, p, ch, roster } = await loadChar(c);
    if (roster.length <= 3) fail(409, 'roster_min', 'Keep at least 3 characters');
    const defs = await repo.defences(p.id);
    if (defs.some((d) => d.characterIds.includes(ch.id))) fail(409, 'in_defence', 'Remove this character from your defence first');
    ch.retired = true;
    if (ch.held) p.state.inventory.push(ch.held);
    if (ch.accessory) p.state.inventory.push(ch.accessory);
    const payout = econ.retirePayoutPerLevelSq * ch.level * ch.level;
    await c.env.DB.batch([repo.saveCharacter(ch), repo.savePlayer(p), ...repo.credit(p.id, 'cash', payout, 'retire', ch.id, c.get('now'))]);
    return c.json({ payout });
  });

  // ---- Recruiting, job board, shop ------------------------------------------
  api.get('/recruits', async (c) => {
    const { p } = await loadMe(c);
    return c.json({ applicants: applicants(p) });
  });

  api.post('/recruits/:index/hire', async (c) => {
    const { repo, p } = await loadMe(c);
    const idx = Number(c.req.param('index'));
    const a = applicants(p).find((x) => x.index === idx) ?? fail(404, 'applicant', 'No such applicant');
    if (a.hired) fail(409, 'hired', 'Already hired');
    const roster = await repo.roster(p.id);
    if (roster.length >= p.state.rosterSlots) fail(409, 'roster_full', 'Roster is full — buy a slot or retire someone');
    const w = await repo.wallet(p.id);
    if (w.cash < a.cost) fail(402, 'insufficient_cash', 'Not enough cash');
    p.state.hiredToday.push(idx);
    const now = c.get('now');
    a.character.createdAt = now;
    await c.env.DB.batch([repo.insertCharacter(p.id, a.character), repo.savePlayer(p), ...repo.credit(p.id, 'cash', -a.cost, 'recruit', a.character.id, now)]);
    return c.json({ character: a.character });
  });

  api.post('/roster/slots', async (c) => {
    const { repo, p } = await loadMe(c);
    if (p.state.rosterSlots >= econ.rosterSlots.max) fail(409, 'max_slots', 'Roster is at maximum size');
    const cost = rosterSlotCost(econ, p.state.rosterSlots + 1);
    const w = await repo.wallet(p.id);
    if (w.cash < cost) fail(402, 'insufficient_cash', 'Not enough cash');
    p.state.rosterSlots++;
    await c.env.DB.batch([repo.savePlayer(p), ...repo.credit(p.id, 'cash', -cost, 'roster_slot', String(p.state.rosterSlots), c.get('now'))]);
    return c.json({ rosterSlots: p.state.rosterSlots, cost });
  });

  api.get('/jobs', async (c) => {
    const { p, repo } = await loadMe(c);
    const roster = await repo.roster(p.id);
    const res: JobBoardDTO = {
      careers: bundle.careers
        .filter((x) => !x.deprecated)
        .map((x) => ({
          id: x.id,
          tier: x.tier,
          cost: econ.jobBoard.tierCost[String(x.tier)] ?? 0,
          unlocked: p.state.unlockedCareers.includes(x.id),
          eligible: roster.some((ch) => meetsPrerequisites(x, ch.careers)),
        })),
    };
    return c.json(res);
  });

  api.post('/jobs/:careerId/unlock', async (c) => {
    const { repo, p } = await loadMe(c);
    const id = c.req.param('careerId');
    const career = bundle.careers.find((x) => x.id === id) ?? fail(404, 'career', 'Unknown career');
    if (p.state.unlockedCareers.includes(id)) fail(409, 'unlocked', 'Already unlocked');
    const cost = econ.jobBoard.tierCost[String(career.tier)] ?? 0;
    const w = await repo.wallet(p.id);
    if (w.rep < cost) fail(402, 'insufficient_rep', 'Not enough reputation');
    p.state.unlockedCareers.push(id);
    await c.env.DB.batch([repo.savePlayer(p), ...repo.credit(p.id, 'rep', -cost, 'career_unlock', id, c.get('now'))]);
    return c.json({ unlockedCareers: p.state.unlockedCareers });
  });

  api.get('/shop', async (c) => {
    const { p } = await loadMe(c);
    const res: ShopDTO = { items: shopItems(p).map((id) => ({ id, price: bundle.equipment.find((e) => e.id === id)!.price, owned: p.state.inventory.includes(id) })) };
    return c.json(res);
  });

  api.post('/shop/:itemId/buy', async (c) => {
    const { repo, p } = await loadMe(c);
    const id = c.req.param('itemId');
    if (!shopItems(p).includes(id)) fail(404, 'not_in_shop', 'Item is not in today’s shop');
    const price = bundle.equipment.find((e) => e.id === id)!.price;
    const w = await repo.wallet(p.id);
    if (w.cash < price) fail(402, 'insufficient_cash', 'Not enough cash');
    p.state.inventory.push(id);
    await c.env.DB.batch([repo.savePlayer(p), ...repo.credit(p.id, 'cash', -price, 'equipment', id, c.get('now'))]);
    return c.json({ inventory: p.state.inventory });
  });

  // ---- Defence & opponents --------------------------------------------------
  api.put('/defence/:mode', async (c) => {
    const { repo, p } = await loadMe(c);
    const mode = c.req.param('mode') as BattleMode;
    if (!MODES.includes(mode)) fail(400, 'mode', 'Unknown mode');
    const { characterIds } = (await c.req.json()) as { characterIds: string[] };
    const chars = ownCharacters(await repo.roster(p.id), characterIds, teamSize(mode));
    const team = makeTeam(p, chars);
    const power = teamPower(bundle, team.characters);
    await repo.upsertDefence(p.id, mode, characterIds, team, bundle.hash, power, p.rating, c.get('now')).run();
    return c.json({ mode, characterIds, power, updatedAt: c.get('now') });
  });

  api.get('/opponents/:mode', async (c) => {
    const { repo, p } = await loadMe(c);
    const mode = c.req.param('mode') as BattleMode;
    if (!MODES.includes(mode)) fail(400, 'mode', 'Unknown mode');
    const now = c.get('now');
    const roster = await repo.roster(p.id);
    const size = teamSize(mode);
    if (roster.length < size) fail(409, 'roster_small', `You need ${size} characters for this mode`);
    const myPower = Math.trunc(teamPower(bundle, [...roster].sort((a, b) => b.level - a.level).slice(0, size).map(toSnapshot)));
    const refreshList = c.req.query('refresh') === '1' || !p.state.opponents || p.state.opponents.mode !== mode || now - p.state.opponents.at > OPPONENT_TTL;
    const rows = await repo.defencePool(mode, p.rating - 300, p.rating + 400, p.id);
    // Grudges: teams fielding someone one of my characters has a rivalry with get priority.
    const myRivals = new Set(roster.flatMap((ch) => toSnapshot(ch).rivals ?? []));
    const pool: DefenceCandidate[] = rows.map((r) => ({
      playerId: r.player_id,
      playerName: r.display_name,
      rating: r.rating,
      power: r.power,
      ghost: false,
      rival: (JSON.parse(r.character_ids) as string[]).some((id) => myRivals.has(id)),
    }));
    // Thin pool → add deterministic bot teams around my rating (03 §5.2).
    if (pool.length < 12) {
      for (const off of [-120, -60, -30, 0, 30, 60, 120, 180]) {
        const rating = Math.max(800, p.rating + off);
        const seed = `${p.state.day}:${mode}:${rating}`;
        const team = botTeam(bundle, seed, rating, size);
        pool.push({ playerId: team.playerId, playerName: team.playerName, rating, power: teamPower(bundle, team.characters), ghost: true });
      }
    }
    if (refreshList) {
      const picks = pickOpponents(pool, p.rating, myPower, `${p.id}:${now}`, new Set(Object.keys(p.state.attacked)));
      p.state.opponents = { mode, at: now, ids: picks.map((o) => o.playerId), difficulties: picks.map((o) => o.difficulty) };
      await repo.savePlayer(p).run();
    }
    const { ids, difficulties } = p.state.opponents!;
    const cards: OpponentDTO[] = [];
    for (const [i, id] of ids.entries()) {
      const cand = pool.find((x) => x.playerId === id);
      const team = await opponentTeam(repo, id, mode);
      if (!cand || !team) continue;
      cards.push({
        playerId: id,
        playerName: cand.playerName,
        rating: cand.rating,
        power: cand.power,
        difficulty: difficulties[i] ?? 'even',
        ghost: cand.ghost,
        rival: !!cand.rival,
        preview: team.characters.map((ch) => ({ name: ch.name, careers: ch.careers, level: ch.level })),
      });
    }
    return c.json({ opponents: cards });
  });

  async function opponentTeam(repo: Repo, id: string, mode: BattleMode): Promise<TeamSnapshot | null> {
    if (id.startsWith('bot:')) {
      const seed = id.slice(4);
      const rating = Number(seed.split(':')[2]);
      return botTeam(bundle, seed, rating, teamSize(mode));
    }
    return (await repo.defenceSnapshot(id, mode))?.team ?? null;
  }

  // ---- Battles --------------------------------------------------------------
  api.post('/battles/attack', async (c) => {
    const { repo, p } = await loadMe(c);
    const now = c.get('now');
    const req = (await c.req.json()) as AttackRequest;
    if (!MODES.includes(req.mode)) fail(400, 'mode', 'Unknown mode');
    const cached = p.state.opponents;
    if (!cached || cached.mode !== req.mode || !cached.ids.includes(req.opponentId)) fail(409, 'stale_opponent', 'Opponent list expired — refresh opponents');
    const difficulty: Difficulty = cached!.difficulties[cached!.ids.indexOf(req.opponentId)] ?? 'even';
    const wallet = await repo.wallet(p.id);
    const pre = refresh(repo, p, wallet.tickets, now);
    if (wallet.tickets + pre.gained < 1) fail(402, 'no_tickets', 'No tickets left — they regenerate over time');
    const roster = await repo.roster(p.id);
    const mine = ownCharacters(roster, req.characterIds, teamSize(req.mode));
    const defTeam = (await opponentTeam(repo, req.opponentId, req.mode)) ?? fail(404, 'opponent', 'Opponent has no defence');
    const isBot = req.opponentId.startsWith('bot:');
    const defender = isBot ? null : await repo.player(req.opponentId);
    if (!isBot && !defender) fail(404, 'opponent', 'Opponent not found');

    const seed = randomHex(16);
    const arenas = bundle.arenas.filter((a) => a.unlock.league === 'intern' || a.unlock.league === p.league);
    const input: BattleInput = {
      schemaVersion: 1,
      contentHash: bundle.hash,
      simVersion: SIM_VERSION,
      seed,
      arenaId: Rng.fromSeed(`${seed}:arena`).pick(arenas).id,
      mode: req.mode,
      teams: [makeTeam(p, mine), defTeam],
      modifiers: [],
    };
    const out = simulate(input, bundle);
    const report = buildReport(bundle, input, out);
    const w = out.result.winner;
    const outcome: Outcome = w === 0 ? 'win' : w === 1 ? 'loss' : 'draw';
    const score = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0;
    const rc = ratingChange(econ, p.rating, defTeam.rating, score);
    const reward = attackReward(econ, outcome, difficulty, p.state.winsToday);
    const battleId = newId('bt');
    const record: BattleRecord = {
      id: battleId,
      input,
      resultHash: out.resultHash,
      summary: {
        winner: outcome === 'win' ? 'attacker' : outcome === 'loss' ? 'defender' : 'draw',
        reason: out.result.reason,
        seconds: Math.round(out.result.ticks / 2) / 10,
        attackerName: p.displayName,
        defenderName: defTeam.playerName,
        arenaId: input.arenaId,
        report,
      },
      createdAt: now,
    };

    const stmts: D1PreparedStatement[] = [...pre.stmts];
    stmts.push(...repo.credit(p.id, 'tickets', -1, 'rated_attack', battleId, now));
    stmts.push(...repo.credit(p.id, 'cash', reward.cash, `attack_${outcome}`, battleId, now));
    stmts.push(...repo.credit(p.id, 'rep', reward.rep, `attack_${outcome}`, battleId, now));
    if (outcome === 'win') p.state.winsToday++;
    p.rating = Math.max(0, p.rating + rc.attacker);
    p.league = leagueFor(econ, p.rating);
    p.state.attacked[req.opponentId] = now;
    p.state.opponents = null;

    // Character progression for both sides (defenders earn reduced XP, 03 §3.1).
    const rel = relationshipDeltas(out.result, out.events);
    const progress: CharacterProgress[] = [];
    const progressChar = (ch: Character, team: number, defence: boolean): CharacterProgress | null => {
      const r = out.result.characters.find((x) => x.snapshotId === ch.id && x.team === team);
      if (!r) return null;
      const o: Outcome = w < 0 ? 'draw' : w === team ? 'win' : 'loss';
      const mvp = out.result.mvp === r.entityId;
      const xp = battleXp(econ, o, r.counters.kos, mvp, defence);
      const levels = addXp(econ, ch, xp);
      applyBattleToCharacter(ch, r, o, mvp);
      const newTraits = evaluateTraits(bundle, ch);
      for (const [other, d] of rel.get(ch.id) ?? []) ch.relationships[other] = Math.max(-10, Math.min(10, (ch.relationships[other] ?? 0) + d));
      return { characterId: ch.id, xp, levelsGained: levels, newTraits, milestone: hasMilestone(econ, ch) };
    };
    for (const ch of mine) {
      const pr = progressChar(ch, 0, false);
      if (pr) progress.push(pr);
      stmts.push(repo.saveCharacter(ch));
    }
    let defenderDelta = 0;
    if (defender) {
      defenderDelta = rc.defender;
      defender.rating = Math.max(0, defender.rating + rc.defender);
      defender.league = leagueFor(econ, defender.rating);
      const dOutcome: Outcome = outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw';
      const dr = defenceReward(econ, dOutcome);
      defender.state.pending.cash += dr.cash;
      defender.state.pending.rep += dr.rep;
      const key = dOutcome === 'win' ? 'wins' : dOutcome === 'loss' ? 'losses' : 'draws';
      defender.state.pending.defences[key]++;
      stmts.push(repo.savePlayer(defender), repo.updateDefenceRating(defender.id, defender.rating));
      const dRoster = await repo.roster(defender.id);
      for (const snap of defTeam.characters) {
        const ch = dRoster.find((x) => x.id === snap.id);
        if (!ch) continue;
        progressChar(ch, 1, true);
        stmts.push(repo.saveCharacter(ch));
      }
    }
    stmts.push(repo.savePlayer(p), repo.updateDefenceRating(p.id, p.rating));
    stmts.push(
      c.env.DB.prepare(
        'INSERT INTO battles (id, attacker_id, defender_id, mode, record, winner, rating_delta, defender_rating_delta, seen_by_defender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(battleId, p.id, defender?.id ?? null, req.mode, JSON.stringify(record), record.summary.winner, rc.attacker, defenderDelta, defender ? 0 : 1, now),
    );
    await c.env.DB.batch(stmts);
    const res: AttackResponse = { record, rewards: reward, ratingDelta: rc.attacker, progress, player: toPlayerDTO(p, await repo.wallet(p.id)) };
    return c.json(res);
  });

  api.get('/battles/:id', async (c) => {
    const r = await c.env.DB.prepare('SELECT record, attacker_id, defender_id FROM battles WHERE id = ?').bind(c.req.param('id')).first<{ record: string }>();
    if (!r) fail(404, 'battle', 'Battle not found');
    return c.body(r!.record, 200, { 'Content-Type': 'application/json' });
  });

  api.get('/reports', async (c) => {
    const pid = c.get('playerId');
    const { results } = await c.env.DB.prepare(
      `SELECT id, created_at, winner, defender_rating_delta, record FROM battles WHERE defender_id = ? ORDER BY created_at DESC LIMIT 30`,
    )
      .bind(pid)
      .all<{ id: string; created_at: number; winner: string; defender_rating_delta: number; record: string }>();
    const reports: ReportDTO[] = results.map((r) => {
      const rec = JSON.parse(r.record) as BattleRecord;
      return {
        id: r.id,
        createdAt: r.created_at,
        attackerName: rec.summary.attackerName,
        outcome: r.winner === 'defender' ? 'win' : r.winner === 'attacker' ? 'loss' : 'draw',
        ratingDelta: r.defender_rating_delta,
        headline: rec.summary.report.headline?.text ?? null,
      };
    });
    await c.env.DB.prepare('UPDATE battles SET seen_by_defender = 1 WHERE defender_id = ? AND seen_by_defender = 0').bind(pid).run();
    return c.json({ reports });
  });

  api.get('/history', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT id, created_at, winner, rating_delta, record FROM battles WHERE attacker_id = ? ORDER BY created_at DESC LIMIT 30')
      .bind(c.get('playerId'))
      .all<{ id: string; created_at: number; winner: string; rating_delta: number; record: string }>();
    return c.json({
      battles: results.map((r) => {
        const rec = JSON.parse(r.record) as BattleRecord;
        return { id: r.id, createdAt: r.created_at, defenderName: rec.summary.defenderName, outcome: r.winner === 'attacker' ? 'win' : r.winner === 'defender' ? 'loss' : 'draw', ratingDelta: r.rating_delta, headline: rec.summary.report.headline?.text ?? null };
      }),
    });
  });

  api.get('/leaderboard', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT id, display_name, rating, league FROM players ORDER BY rating DESC LIMIT 50').all<{ id: string; display_name: string; rating: number; league: string }>();
    const res: LeaderboardDTO = { entries: results.map((r) => ({ playerId: r.id, displayName: r.display_name, rating: r.rating, league: r.league })) };
    return c.json(res);
  });

  api.get('/discoveries', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT d.mastery_id, d.first_at, d.total_count, p.display_name FROM discoveries d JOIN players p ON p.id = d.first_player_id').all();
    return c.json({ discoveries: results });
  });

  api.post('/telemetry', async (c) => {
    const body = await c.req.json().catch(() => null);
    console.log(JSON.stringify({ level: 'info', kind: 'telemetry', playerId: c.get('playerId'), body }));
    return c.json({ ok: true });
  });

  app.route(API_PREFIX, api);
  app.get('/', (c) => c.text('Career Crash API'));
  return app;
}

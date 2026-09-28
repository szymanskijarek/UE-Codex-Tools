import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { Character, Currency } from '@cc/game-rules';
import type { DefenceDTO, PendingRewards, PlayerDTO, Wallet } from '@cc/protocol';
import type { BattleMode, TeamSnapshot } from '@cc/sim';

/** Per-player state kept as JSON alongside the row (things that are always read and written whole). */
export interface PlayerState {
  unlockedCareers: string[];
  inventory: string[];
  ticketsRegenAt: number;
  day: string;
  winsToday: number;
  hiredToday: number[];
  lastSettled: number;
  pending: PendingRewards;
  rosterSlots: number;
  attacked: Record<string, number>;
  opponents: { mode: BattleMode; at: number; ids: string[] } | null;
}

export interface PlayerRow {
  id: string;
  display_name: string;
  created_at: number;
  last_seen_at: number;
  rating: number;
  league: string;
  state: string;
}

export interface Player {
  id: string;
  displayName: string;
  createdAt: number;
  lastSeenAt: number;
  rating: number;
  league: string;
  state: PlayerState;
}

export const CURRENCIES: Currency[] = ['cash', 'rep', 'tickets', 'stars'];

export function emptyPending(): PendingRewards {
  return { cash: 0, rep: 0, offlineHours: 0, defences: { wins: 0, losses: 0, draws: 0 } };
}

export function rowToPlayer(r: PlayerRow): Player {
  return { id: r.id, displayName: r.display_name, createdAt: r.created_at, lastSeenAt: r.last_seen_at, rating: r.rating, league: r.league, state: JSON.parse(r.state) as PlayerState };
}

export function toPlayerDTO(p: Player, wallet: Wallet): PlayerDTO {
  return {
    id: p.id,
    displayName: p.displayName,
    rating: p.rating,
    league: p.league,
    wallet,
    rosterSlots: p.state.rosterSlots,
    unlockedCareers: p.state.unlockedCareers,
    inventory: p.state.inventory,
    winsToday: p.state.winsToday,
    createdAt: p.createdAt,
  };
}

export class Repo {
  constructor(private db: D1Database) {}

  async player(id: string): Promise<Player | null> {
    const r = await this.db.prepare('SELECT * FROM players WHERE id = ?').bind(id).first<PlayerRow>();
    return r ? rowToPlayer(r) : null;
  }

  savePlayer(p: Player): D1PreparedStatement {
    return this.db
      .prepare('UPDATE players SET display_name = ?, last_seen_at = ?, rating = ?, league = ?, state = ? WHERE id = ?')
      .bind(p.displayName, p.lastSeenAt, p.rating, p.league, JSON.stringify(p.state), p.id);
  }

  insertPlayer(p: Player): D1PreparedStatement {
    return this.db
      .prepare('INSERT INTO players (id, display_name, created_at, last_seen_at, rating, league, state) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(p.id, p.displayName, p.createdAt, p.lastSeenAt, p.rating, p.league, JSON.stringify(p.state));
  }

  async identity(provider: string, subject: string): Promise<string | null> {
    const r = await this.db.prepare('SELECT player_id FROM auth_identities WHERE provider = ? AND subject = ?').bind(provider, subject).first<{ player_id: string }>();
    return r?.player_id ?? null;
  }

  insertIdentity(provider: string, subject: string, playerId: string): D1PreparedStatement {
    return this.db.prepare('INSERT INTO auth_identities (provider, subject, player_id) VALUES (?, ?, ?)').bind(provider, subject, playerId);
  }

  async wallet(playerId: string): Promise<Wallet> {
    const { results } = await this.db.prepare('SELECT currency, balance FROM wallets WHERE player_id = ?').bind(playerId).all<{ currency: Currency; balance: number }>();
    const w = { cash: 0, rep: 0, tickets: 0, stars: 0 } as Wallet;
    for (const r of results) w[r.currency] = r.balance;
    return w;
  }

  initWallet(playerId: string, start: Record<string, number>, now: number): D1PreparedStatement[] {
    const out: D1PreparedStatement[] = [];
    for (const c of CURRENCIES) {
      out.push(this.db.prepare('INSERT INTO wallets (player_id, currency, balance) VALUES (?, ?, 0)').bind(playerId, c));
      if (start[c]) out.push(...this.credit(playerId, c, start[c]!, 'starting_wallet', null, now));
    }
    return out;
  }

  /** Balance change + append-only ledger row (the ledger invariant: balance = SUM(delta)). */
  credit(playerId: string, currency: Currency, delta: number, reason: string, ref: string | null, now: number): D1PreparedStatement[] {
    if (delta === 0) return [];
    return [
      this.db.prepare('UPDATE wallets SET balance = balance + ? WHERE player_id = ? AND currency = ?').bind(delta, playerId, currency),
      this.db.prepare('INSERT INTO ledger (player_id, currency, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(playerId, currency, delta, reason, ref, now),
    ];
  }

  async ledgerConsistent(playerId: string): Promise<boolean> {
    const { results } = await this.db
      .prepare(
        'SELECT w.currency, w.balance, COALESCE((SELECT SUM(delta) FROM ledger l WHERE l.player_id = w.player_id AND l.currency = w.currency), 0) AS total FROM wallets w WHERE w.player_id = ?',
      )
      .bind(playerId)
      .all<{ currency: string; balance: number; total: number }>();
    return results.every((r) => r.balance === r.total);
  }

  async roster(playerId: string): Promise<Character[]> {
    const { results } = await this.db.prepare('SELECT data FROM characters WHERE player_id = ? AND retired = 0 ORDER BY id').bind(playerId).all<{ data: string }>();
    return results.map((r) => JSON.parse(r.data) as Character);
  }

  insertCharacter(playerId: string, c: Character): D1PreparedStatement {
    return this.db.prepare('INSERT INTO characters (id, player_id, data, version, retired) VALUES (?, ?, ?, 1, 0)').bind(c.id, playerId, JSON.stringify(c));
  }

  saveCharacter(c: Character): D1PreparedStatement {
    return this.db.prepare('UPDATE characters SET data = ?, version = version + 1, retired = ? WHERE id = ?').bind(JSON.stringify(c), c.retired ? 1 : 0, c.id);
  }

  async defences(playerId: string): Promise<DefenceDTO[]> {
    const { results } = await this.db.prepare('SELECT mode, character_ids, power, updated_at FROM defences WHERE player_id = ?').bind(playerId).all<{ mode: BattleMode; character_ids: string; power: number; updated_at: number }>();
    return results.map((r) => ({ mode: r.mode, characterIds: JSON.parse(r.character_ids) as string[], power: r.power, updatedAt: r.updated_at }));
  }

  async defenceSnapshot(playerId: string, mode: BattleMode): Promise<{ team: TeamSnapshot; power: number; rating: number } | null> {
    const r = await this.db.prepare('SELECT snapshot, power, rating FROM defences WHERE player_id = ? AND mode = ?').bind(playerId, mode).first<{ snapshot: string; power: number; rating: number }>();
    return r ? { team: JSON.parse(r.snapshot) as TeamSnapshot, power: r.power, rating: r.rating } : null;
  }

  upsertDefence(playerId: string, mode: BattleMode, ids: string[], team: TeamSnapshot, contentHash: string, power: number, rating: number, now: number): D1PreparedStatement {
    return this.db
      .prepare(
        `INSERT INTO defences (player_id, mode, character_ids, snapshot, content_hash, power, rating, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (player_id, mode) DO UPDATE SET character_ids = excluded.character_ids, snapshot = excluded.snapshot, content_hash = excluded.content_hash,
         power = excluded.power, rating = excluded.rating, updated_at = excluded.updated_at`,
      )
      .bind(playerId, mode, JSON.stringify(ids), JSON.stringify(team), contentHash, power, rating, now);
  }

  updateDefenceRating(playerId: string, rating: number): D1PreparedStatement {
    return this.db.prepare('UPDATE defences SET rating = ? WHERE player_id = ?').bind(rating, playerId);
  }

  async defencePool(mode: BattleMode, lo: number, hi: number, excludePlayer: string): Promise<{ player_id: string; display_name: string; rating: number; power: number }[]> {
    const { results } = await this.db
      .prepare(
        `SELECT d.player_id, p.display_name, d.rating, d.power FROM defences d JOIN players p ON p.id = d.player_id
         WHERE d.mode = ? AND d.rating BETWEEN ? AND ? AND d.player_id != ? ORDER BY d.rating LIMIT 200`,
      )
      .bind(mode, lo, hi, excludePlayer)
      .all<{ player_id: string; display_name: string; rating: number; power: number }>();
    return results;
  }
}

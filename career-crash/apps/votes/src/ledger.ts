import type { HourTallies, Tally } from '@cc/protocol/votes';

/** The bit of Durable Object SQLite this needs (`ctx.storage.sql`), so tests can run it on node:sqlite. */
export interface Sql {
  exec(query: string, ...bindings: (string | number)[]): { toArray(): Record<string, string | number>[] };
}

/**
 * One hour's likes (09 §6.1), kept in that hour's Durable Object.
 *
 * `likes` holds one row per voter per country (its primary key is the
 * dedupe: one like per country per hour), with the session it landed in.
 * `counts` keeps the totals per session and country, so reading the hour
 * never scans the likes. Voters are a one-way hash of the device token and
 * the hour; `purge` drops them two hours after the hour and keeps the counts
 * (09 §6.4).
 */
export class HourLedger {
  constructor(private sql: Sql) {
    sql.exec('CREATE TABLE IF NOT EXISTS likes (voter TEXT NOT NULL, country TEXT NOT NULL, session INTEGER NOT NULL, PRIMARY KEY (voter, country)) WITHOUT ROWID');
    sql.exec('CREATE TABLE IF NOT EXISTS counts (session INTEGER NOT NULL, country TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (session, country)) WITHOUT ROWID');
  }

  /** Records a like. False if this voter has already liked this country this hour. */
  like(voter: string, country: string, session: number): boolean {
    if (this.sql.exec('SELECT 1 AS x FROM likes WHERE voter = ? AND country = ?', voter, country).toArray().length) return false;
    this.sql.exec('INSERT INTO likes (voter, country, session) VALUES (?, ?, ?)', voter, country, session);
    this.sql.exec('INSERT INTO counts (session, country, n) VALUES (?, ?, 1) ON CONFLICT (session, country) DO UPDATE SET n = n + 1', session, country);
    return true;
  }

  /**
   * What each session up to `current` runs on, and the likes still arriving.
   * `frozen[s]` counts every like from sessions before `s`, so it can't change
   * once session `s` has begun: a later like lands in a later session.
   */
  tallies(hour: string, current: number): HourTallies {
    const bySession: Tally[] = Array.from({ length: current + 1 }, () => ({}));
    for (const r of this.sql.exec('SELECT session, country, n FROM counts').toArray()) {
      const s = Number(r.session);
      if (s <= current) bySession[s]![String(r.country)] = Number(r.n);
    }
    const frozen: Tally[] = [];
    let running: Tally = {};
    for (let s = 0; s <= current; s++) {
      frozen.push(running);
      running = { ...running };
      for (const [k, n] of Object.entries(bySession[s]!)) running[k] = (running[k] ?? 0) + n;
    }
    return { hour, session: current, frozen, pending: bySession[current]! };
  }

  /** Forget who liked what; keep the totals. */
  purge(): void {
    this.sql.exec('DELETE FROM likes');
  }
}

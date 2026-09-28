/**
 * Minimal D1Database implementation over node:sqlite, for API tests without wrangler.
 * Supports prepare/bind/first/all/run and atomic batch().
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type Param = string | number | null;

class Stmt {
  constructor(
    private db: DatabaseSync,
    readonly sql: string,
    readonly params: Param[] = [],
  ) {}

  bind(...params: unknown[]): Stmt {
    return new Stmt(this.db, this.sql, params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : (p as Param))));
  }

  async first<T>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (col ? row[col] : { ...row }) as T;
  }

  async all<T>(): Promise<{ results: T[]; success: true; meta: object }> {
    const rows = this.db.prepare(this.sql).all(...this.params) as Record<string, unknown>[];
    return { results: rows.map((r) => ({ ...r }) as T), success: true, meta: {} };
  }

  async run(): Promise<{ success: true; meta: { changes: number } }> {
    const r = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: Number(r.changes) } };
  }

  runSync(): void {
    this.db.prepare(this.sql).run(...this.params);
  }
}

export class D1Shim {
  db = new DatabaseSync(':memory:');

  constructor(migrationsDir: string) {
    for (const f of readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()) this.db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
  }

  prepare(sql: string): Stmt {
    return new Stmt(this.db, sql);
  }

  async batch(stmts: Stmt[]): Promise<unknown[]> {
    this.db.exec('BEGIN');
    try {
      for (const s of stmts) s.runSync();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return stmts.map(() => ({ success: true }));
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}

import type { BattleEvent, Entity } from '@cc/sim';

/**
 * Sandbox grudges: whoever floors a Sandbox fighter becomes their rival, and
 * rivals carry into the next Sandbox fights (per browser; the online game keeps
 * them on the server via character relationships).
 */
const KEY = 'cc.sandboxRivals';
let rivals: Record<string, string[]> = load();

function load(): Record<string, string[]> {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
}

function save(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rivals));
  } catch {
    // Private mode or storage blocked: grudges last for this page only.
  }
}

export function rivalsOf(snapshotId: string): string[] {
  return rivals[snapshotId] ?? [];
}

/** Record who floored whom in a finished Sandbox battle. */
export function recordGrudges(events: BattleEvent[], byId: Map<number, Entity>): void {
  for (const e of events) {
    if (e.type !== 'downed' && e.type !== 'ko') continue;
    const killer = byId.get(e.a);
    const victim = byId.get(e.b);
    if (!killer || !victim || killer.kind !== 'char' || victim.kind !== 'char' || killer.team === victim.team) continue;
    const list = new Set(rivals[victim.snapshotId] ?? []);
    list.add(killer.snapshotId);
    rivals[victim.snapshotId] = [...list].slice(-6);
  }
  save();
}

export function grudgeCount(): number {
  return Object.values(rivals).reduce((n, l) => n + l.length, 0);
}

export function clearGrudges(): void {
  rivals = {};
  save();
}

import type { MarketDef } from '@cc/content-schema';

/**
 * Regards, Wall Street (13 §3): the floor keeps the exchange's hours. While the
 * market trades the floor runs live on the wall clock; before the open, after
 * the close, at weekends and on holidays it replays the session's last period
 * on a loop, with the lights down. Pure: wall time in, the same answer for
 * every viewer.
 */

export type SessionPhase = 'pre' | 'open' | 'after' | 'closed';

export interface SessionState {
  /** `open` while it trades; `pre` and `after` on a trading day; `closed` at weekends and on holidays. */
  phase: SessionPhase;
  /** The exchange's local date now, `YYYY-MM-DD`. */
  day: string;
  /** The next open (strictly after now). */
  nextOpenMs: number;
  /** The latest close at or before now, and that session's open. */
  lastCloseMs: number;
  lastOpenMs: number;
  /** The moment the floor shows: now while open, else a loop through the last session's final period. */
  floorMs: number;
  /** Just after a close (`session.closingBellSec`): the Closing Bell is on. */
  closingBell: boolean;
  /** The first period of the day is running: its start is the Opening Bell. */
  firstPeriod: boolean;
}

const DAY_MS = 86_400_000;
const formats = new Map<string, Intl.DateTimeFormat>();

function fmt(tz: string): Intl.DateTimeFormat {
  let f = formats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formats.set(tz, f);
  }
  return f;
}

/** Wall time → the exchange's local calendar fields. */
export function zoned(ms: number, tz: string): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  const p = Object.fromEntries(fmt(tz).formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]));
  return { y: p.year!, mo: p.month!, d: p.day!, h: p.hour!, mi: p.minute!, s: p.second! };
}

/** A local date and "HH:MM" in `tz` → wall time (handles daylight saving). */
export function zonedToMs(day: string, hhmm: string, tz: string): number {
  const [y, mo, d] = day.split('-').map(Number) as [number, number, number];
  const [h, mi] = hhmm.split(':').map(Number) as [number, number];
  const want = Date.UTC(y, mo - 1, d, h, mi);
  let ms = want;
  // Two passes settle the offset, even on the day the clocks change.
  for (let i = 0; i < 2; i++) {
    const z = zoned(ms, tz);
    ms += want - Date.UTC(z.y, z.mo - 1, z.d, z.h, z.mi, z.s);
  }
  return ms;
}

const dayOf = (ms: number, tz: string): string => {
  const z = zoned(ms, tz);
  return `${z.y}-${String(z.mo).padStart(2, '0')}-${String(z.d).padStart(2, '0')}`;
};

/** The calendar day `n` days after `day`. */
function addDays(day: string, n: number): string {
  const [y, mo, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, mo - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

type Session = NonNullable<MarketDef['session']>;

export function isTradingDay(s: Session, day: string): boolean {
  const [y, mo, d] = day.split('-').map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return wd !== 0 && wd !== 6 && !s.holidays.includes(day);
}

/** A trading day's open and close, wall time (half days close early). */
export function sessionHours(s: Session, day: string): { openMs: number; closeMs: number } {
  return { openMs: zonedToMs(day, s.open, s.tz), closeMs: zonedToMs(day, s.halfDays.includes(day) ? s.halfClose : s.close, s.tz) };
}

export function sessionState(def: MarketDef, nowMs: number): SessionState {
  const s = def.session;
  if (!s) throw new Error(`${def.id} has no trading session`);
  const periodMs = (def.periodSec ?? 3600) * 1000;
  const day = dayOf(nowMs, s.tz);
  const today = isTradingDay(s, day) ? sessionHours(s, day) : null;
  let nextOpenMs = 0;
  for (let i = 0; i < 15 && !nextOpenMs; i++) {
    const d = addDays(day, i);
    if (isTradingDay(s, d) && sessionHours(s, d).openMs > nowMs) nextOpenMs = sessionHours(s, d).openMs;
  }
  let last = { openMs: 0, closeMs: 0 };
  for (let i = 0; i < 15 && !last.closeMs; i++) {
    const d = addDays(day, -i);
    if (isTradingDay(s, d) && sessionHours(s, d).closeMs <= nowMs) last = sessionHours(s, d);
  }
  const open = !!today && nowMs >= today.openMs && nowMs < today.closeMs;
  const phase: SessionPhase = open ? 'open' : !today ? 'closed' : nowMs < today.openMs ? 'pre' : 'after';
  // Closed: loop the last period of the last session, so the floor is never empty.
  const floorMs = open ? nowMs : last.closeMs - periodMs + ((((nowMs - last.closeMs) % periodMs) + periodMs) % periodMs);
  return {
    phase,
    day,
    nextOpenMs,
    lastCloseMs: last.closeMs,
    lastOpenMs: last.openMs,
    floorMs,
    closingBell: !open && nowMs - last.closeMs < s.closingBellSec * 1000,
    firstPeriod: open && nowMs - today!.openMs < periodMs,
  };
}

/** "11:30" in the exchange's time, for labels. */
export function sessionTime(def: MarketDef, ms: number): string {
  const z = zoned(ms, def.session!.tz);
  return `${String(z.h).padStart(2, '0')}:${String(z.mi).padStart(2, '0')}`;
}

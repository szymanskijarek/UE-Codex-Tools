import type { ContentBundle, HrNoteDef, StatKey } from '@cc/content-schema';
import { HR_ALLY_KEYS, HR_GOOD_STATUSES, STAT_KEYS } from '@cc/content-schema/constants';
import type { CharacterSnapshot } from '@cc/sim';
import { statLabel, type CareerChar } from './skills';

// ---------------------------------------------------------------------------
// Personnel files (06): each profession's hidden HR notes, which switch on in
// the right arena, next to the right colleague, against certain opponents,
// or with certain perks or snacks packed.
// ---------------------------------------------------------------------------

/** What a career-mode fight looks like from one fighter's side. */
export interface HrContext {
  arenaId: string;
  /** The fighter's teammates (main character, hires, agency temps), not the fighter. */
  allies: CareerChar[];
  enemies: CareerChar[];
  boss: boolean;
}

export interface ActiveHrNote {
  note: HrNoteDef;
  /** Names of the teammates or opponents who set it off (empty for arena, gear and snack notes). */
  by: string[];
}

const lastCareer = (cc: CareerChar): string => cc.c.careers[cc.c.careers.length - 1]!;

/** Every note in a character's file: their careers' notes, in career order. */
export function hrNotesOf(bundle: ContentBundle, careers: readonly string[]): HrNoteDef[] {
  const notes = bundle.hrNotes ?? [];
  return careers.flatMap((cid) => notes.filter((n) => n.career === cid));
}

/** Notes in the file the player hasn't read yet. */
export function unreadHrNotes(bundle: ContentBundle, cc: CareerChar): HrNoteDef[] {
  const read = new Set(cc.readNotes ?? []);
  return hrNotesOf(bundle, cc.c.careers).filter((n) => !read.has(n.id));
}

/** Opening the file reads every note in it. */
export function readHrFile(bundle: ContentBundle, cc: CareerChar): void {
  cc.readNotes = [...new Set([...(cc.readNotes ?? []), ...hrNotesOf(bundle, cc.c.careers).map((n) => n.id)])];
}

/** People among `pool` who match a career list, a tag list and/or a personality list. */
function matching(bundle: ContentBundle, pool: CareerChar[], careers?: string[], tags?: string[], personalities?: string[]): CareerChar[] {
  return pool.filter((p) => {
    const cid = lastCareer(p);
    if (careers && !careers.includes(cid)) return false;
    if (tags) {
      const own = bundle.careers.find((c) => c.id === cid)?.tags ?? [];
      if (!tags.some((t) => own.includes(t))) return false;
    }
    if (personalities && !personalities.includes(p.c.personality)) return false;
    return true;
  });
}

/** The notes in effect for one fighter in one fight (every condition must hold). */
export function activeHrNotes(bundle: ContentBundle, cc: CareerChar, ctx: HrContext): ActiveHrNote[] {
  if (cc.temp) return [];
  const out: ActiveHrNote[] = [];
  for (const note of hrNotesOf(bundle, cc.c.careers)) {
    const w = note.when;
    const by: string[] = [];
    if (w.arena && !w.arena.includes(ctx.arenaId)) continue;
    if (w.boss && !ctx.boss) continue;
    if (w.gear && !(cc.gear ?? []).some((g) => w.gear!.includes(g.base))) continue;
    if (w.consumable && !(cc.loadout ?? []).some((i) => w.consumable!.includes(i))) continue;
    if (w.temp) {
      const temps = ctx.allies.filter((a) => a.temp);
      if (!temps.length) continue;
      by.push(...temps.map((t) => t.c.name));
    }
    if (w.ally || w.allyTag || w.allyPersonality) {
      const who = matching(bundle, ctx.allies, w.ally, w.allyTag, w.allyPersonality);
      if (!who.length) continue;
      by.push(...who.map((p) => p.c.name));
    }
    if (w.enemy || w.enemyTag) {
      const who = matching(bundle, ctx.enemies, w.enemy, w.enemyTag);
      if (!who.length) continue;
      by.push(...who.map((p) => p.c.name));
    }
    out.push({ note, by: [...new Set(by)] });
  }
  return out;
}

/** Fold active notes into a battle snapshot: stats added, kick-off statuses attached. */
export function applyHrNotes(snap: CharacterSnapshot, active: readonly ActiveHrNote[]): CharacterSnapshot {
  if (!active.length) return snap;
  const stats = { ...snap.stats };
  const startStatuses = [...(snap.startStatuses ?? [])];
  for (const { note } of active) {
    for (const k of STAT_KEYS) stats[k] = Math.max(1, stats[k] + (note.stats?.[k] ?? 0));
    if (note.status) startStatuses.push({ status: note.status.status, durationTicks: note.status.durationTicks });
  }
  return { ...snap, stats, ...(startStatuses.length ? { startStatuses } : {}) };
}

/** A teammate sets this note off (it can make the fighter scowl). */
export function hrAllyCaused(note: HrNoteDef): boolean {
  return HR_ALLY_KEYS.some((k) => note.when[k] !== undefined);
}

/** The face a fighter pulls when a teammate's presence is working against them (null = no scowl). */
export function hrMood(active: readonly ActiveHrNote[]): 'angry' | 'hurt' | null {
  const sore = active.find((a) => a.note.tone !== 'buff' && hrAllyCaused(a.note));
  return sore ? (sore.note.mood ?? 'angry') : null;
}

/** +1 for a buff, −1 for a debuff, 0 for a mixed note (for the ▲/▼ on unread notes). */
export function hrDirection(note: HrNoteDef): number {
  return note.tone === 'buff' ? 1 : note.tone === 'debuff' ? -1 : 0;
}

// ---------------------------------------------------------------------------
// Display text, generated from the data so the file never goes stale.
// ---------------------------------------------------------------------------
const name = (bundle: ContentBundle, id: string): string => bundle.locale[`${id}.name`] ?? id;
const article = (s: string): string => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);
const orList = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
const TAG_WORDS: Record<string, string> = {
  'role:medical': 'medical staff',
  'role:emergency': 'emergency services',
  'role:tech': 'tech people',
  'role:manual': 'tradespeople',
  'role:media': 'media types',
  'role:legal': 'legal types',
  'role:food': 'food people',
  'role:education': 'teachers and lecturers',
  'role:arts': 'artists',
  'role:science': 'scientists',
  'role:transport': 'drivers and transport crew',
  'role:outdoors': 'outdoorsy types',
  'role:office': 'office workers',
  'role:security': 'security and police',
  'role:beauty': 'stylists',
  'role:sport': 'gym people',
  'role:music': 'musicians',
  'animal-friend': 'animal people',
};
const tagWord = (t: string): string => TAG_WORDS[t] ?? t.replace(/^[a-z]+:/, '').replace(/-/g, ' ');

/** "In the Diner · with a Lawyer in the squad", in plain words. */
export function describeHrWhen(bundle: ContentBundle, note: HrNoteDef): string {
  const w = note.when;
  const parts: string[] = [];
  if (w.arena) parts.push(`in the ${orList(w.arena.map((a) => name(bundle, a)))}`);
  if (w.ally) parts.push(`with ${orList(w.ally.map((c) => article(name(bundle, c))))} in the squad`);
  if (w.allyTag) parts.push(`with ${orList(w.allyTag.map(tagWord))} in the squad`);
  if (w.allyPersonality) parts.push(`with ${orList(w.allyPersonality.map((p) => article(name(bundle, p))))} teammate`);
  if (w.temp) parts.push('next to an agency temp');
  if (w.enemy) parts.push(`against ${orList(w.enemy.map((c) => article(name(bundle, c))))}`);
  if (w.enemyTag) parts.push(`against ${orList(w.enemyTag.map(tagWord))}`);
  if (w.boss) parts.push('in a boss fight');
  if (w.gear) parts.push(`wearing ${orList(w.gear.map((g) => article(name(bundle, g))))}`);
  if (w.consumable) parts.push(`with ${orList(w.consumable.map((i) => article(name(bundle, i))))} packed`);
  const s = parts.join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "+2 Strength, −1 Charisma · starts Inspired (15 s)". */
export function describeHrEffect(bundle: ContentBundle, note: HrNoteDef): string {
  const parts: string[] = [];
  for (const k of STAT_KEYS) {
    const v = note.stats?.[k as StatKey] ?? 0;
    if (v) parts.push(`${v > 0 ? '+' : '−'}${Math.abs(v)} ${statLabel(k)}`);
  }
  if (note.status) parts.push(`starts ${name(bundle, note.status.status)} (${Math.round(note.status.durationTicks / 20)} s)`);
  return parts.join(', ');
}

/** Is a kick-off status one of the good ones? */
export function hrGoodStatus(status: string): boolean {
  return (HR_GOOD_STATUSES as readonly string[]).includes(status);
}

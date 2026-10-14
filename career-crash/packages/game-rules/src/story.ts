import type { ContactDef, ContentBundle, GigDef, StoryBeatDef, StoryEffect } from '@cc/content-schema';
import { STAT_KEYS } from '@cc/content-schema/constants';
import { Rng, type CharacterSnapshot } from '@cc/sim';
import type { Character } from './character';
import { autoUnlock, careerSnapshot, DIFFICULTIES, generatedFighter, grow, RANK_XP, stageInfo, STAGES_PER_ARENA, type CareerChar, type GrowthReport } from './skills';

/**
 * The career story (12): beats told through Messages, the friend who fights
 * your first fights, temps and hiring as unlocks, and invite-only gigs.
 *
 * Pure state transitions over `StoryState`. The client decides *when* to call
 * them (timers, scrolling, fight results); nothing here reads the clock, and
 * nothing here touches the sim.
 */

export type StoryUnlock = 'messages' | 'feed' | 'easyApply' | 'temps' | 'hiring' | 'nationality';
export type FeedGate = 'bro' | 'delegate' | 'news';

/** Who a thread's portrait shows: a career's face (with a look), a persona, or an icon square. */
export interface StoryLook {
  who?: { careers: string[]; appearance: { skin: string; hair: string; hairStyle: number }; persona?: string; art?: string };
  icon?: string;
}

export interface StoryLine {
  /** `them`: the contact; `me`: the player's reply. */
  from: 'them' | 'me';
  text: string;
  /** Career fight number it arrived after. */
  fight: number;
  /** A picture attached (a story card). */
  art?: string;
  /** A link card to another show's page. */
  link?: 'crypto' | 'incident' | 'news';
  /** A button to a career screen (the nudges: spend points, assign perks, go shopping); `id` picks whose. */
  action?: { to: 'skills' | 'perks' | 'shop'; id?: string };
}

export interface StoryThread extends StoryLook {
  id: string;
  name: string;
  sub: string;
  lines: StoryLine[];
  /** How many lines the player has seen. */
  read: number;
  /** The beat whose replies are on offer. */
  ask?: string;
  /** Still "typing…" (Kevin, forever). */
  typing?: boolean;
  /** An offer letter after a chapter boss (12 §7.2): pick one of the choices, once. */
  offer?: { chapter: number; state: 'open' | 'done'; choices: OfferChoice[]; picked?: number };
  /** An invite-only gig offered in this thread. */
  gig?: { id: string; state: 'open' | 'accepted' | 'declined' | 'expired' | 'done'; fight: number };
}

/** What an offer letter can give: a signing bonus, a perk of guaranteed rarity, or a free hire. */
export type OfferChoice = { kind: 'cash'; cash: number } | { kind: 'perk'; atLeast: string } | { kind: 'hire'; recruit: Character };

export interface StoryState {
  v: 1;
  /** Beat ids, in the order they fired. */
  fired: string[];
  threads: Record<string, StoryThread>;
  /** Thread ids, most recent first. */
  order: string[];
  /** Reply flags (`friend.cold`…). */
  flags: string[];
  unlocks: StoryUnlock[];
  gates: FeedGate[];
  /** Hires who may fight next to you. */
  squadSlots: number;
  connections: number;
  /** The friend (12 §6.2): kept after they leave, for later beats. */
  friend?: CareerChar;
  /** Whether the friend fights next to you. */
  partner: boolean;
  /** Temps booked for the next fight, and what they've cost over the career. */
  temps: number;
  tempSpend: number;
  lossStreak: number;
  /** Career fights played (ladder and gigs). */
  fights: number;
  /** Gigs played or turned down (each is offered once), and the fight the last invite came after. */
  gigs: { seen: string[]; lastOffer: number };
  /** Threads with a new message to pop up. */
  pings: string[];
  /** The last chapter whose title card has been shown (12 §7.5). */
  chapterSeen?: number;
  /** When each nudge last wrote (fight number), for their cooldowns (12 §8.3). */
  nudged?: Record<string, number>;
}

/** Values for the `{slot}`s in story text (12 §4.1). */
export type StorySlots = Record<string, string | number>;

/** What happened outside the story state that the caller has to apply to the save. */
export type OuterEffect = Extract<StoryEffect, { kind: 'cash' | 'post' | 'starterFeed' }> | { kind: 'rehire' };

export interface StoryCtx {
  seed: string;
  /** Career fights played so far. */
  fights: number;
  stage: number;
  cash: number;
  slots: StorySlots;
  /** The country key of the delegate who writes (09): the player's nationality, or one picked for the save. */
  delegate?: string;
}

export function fillSlots(text: string, slots: StorySlots): string {
  return text.replace(/\{([a-z]+)\}/g, (m, k: string) => (k in slots ? String(slots[k]) : m));
}

export function newStory(friend?: CareerChar): StoryState {
  return { v: 1, fired: [], threads: {}, order: [], flags: [], unlocks: [], gates: [], squadSlots: 0, connections: 0, ...(friend ? { friend } : {}), partner: false, temps: 0, tempSpend: 0, lossStreak: 0, fights: 0, gigs: { seen: [], lastOffer: 0 }, pings: [] };
}

export function hasUnlock(st: StoryState, u: StoryUnlock): boolean {
  return st.unlocks.includes(u);
}

// ---------------------------------------------------------------------------
// The friend
// ---------------------------------------------------------------------------
/** The friend for a new career: a career from the friend pool other than yours, at your level and rank, one career only. */
export function makeFriend(bundle: ContentBundle, seed: string, mainCareer: string, level: number, rank: number): CareerChar {
  const F = bundle.economy.friend;
  const rng = Rng.fromSeed(`friend:${seed}`);
  const pool = F.careers.filter((c) => c !== mainCareer);
  const career = rng.pick(pool.length ? pool : F.careers);
  const f = generatedFighter(bundle, rng, `friend-${seed}`, level, rank, { ...DIFFICULTIES[1]!, spendBp: F.spendBp }, [career]);
  f.c.careers = [career];
  f.careerXp = { [career]: RANK_XP[Math.max(0, Math.min(4, rank - 1))]! };
  f.nodes = [];
  autoUnlock(bundle, f, rng, F.spendBp);
  f.loadout = ['item.meal-deal'];
  return f;
}

/** The friend's share of a fight: XP like anyone, then they spend their own points. */
export function growFriend(bundle: ContentBundle, f: CareerChar, xp: number, seed: string): GrowthReport {
  const g = grow(bundle, f, xp);
  const rng = Rng.fromSeed(`friend-grow:${seed}:${f.c.xp}`);
  while (f.c.unspentPoints > 0) {
    f.c.stats[STAT_KEYS[rng.int(STAT_KEYS.length)]!] += 1;
    f.c.unspentPoints--;
  }
  autoUnlock(bundle, f, rng, bundle.economy.friend.spendBp);
  return g;
}

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------
function ready(st: StoryState, b: StoryBeatDef): boolean {
  return !st.fired.includes(b.id) && b.after.every((a) => st.fired.includes(a));
}

/** Beats whose fight/stage/cash/loss conditions are met (checked on load and after each fight). */
export function progressDue(bundle: ContentBundle, st: StoryState, ctx: Pick<StoryCtx, 'fights' | 'stage' | 'cash'>): StoryBeatDef[] {
  return bundle.story.filter((b) => {
    if (b.trigger.kind !== 'progress' || !ready(st, b)) return false;
    const t = b.trigger;
    const tests: boolean[] = [];
    if (t.fights !== undefined) tests.push(ctx.fights >= t.fights);
    if (t.stage !== undefined) tests.push(ctx.stage >= t.stage);
    if (t.cash !== undefined) tests.push(ctx.cash >= t.cash);
    if (t.lossStreak !== undefined) tests.push(st.lossStreak >= t.lossStreak);
    return tests.length > 0 && (t.any ? tests.some(Boolean) : tests.every(Boolean));
  });
}

/** Beats waiting on the UI (a timer or the feed being scrolled): the client times them. */
export function uiDue(bundle: ContentBundle, st: StoryState): StoryBeatDef[] {
  return bundle.story.filter((b) => (b.trigger.kind === 'idle' || b.trigger.kind === 'scroll') && ready(st, b));
}

/** How a contact looks: the friend, the chapter's boss, a career's face, a crypto bro, or an icon. */
export function contactLook(bundle: ContentBundle, c: ContactDef, st: StoryState, stage: number, delegate?: string): StoryLook {
  const plain = { skin: '#e0ac69', hair: '#2b1d14', hairStyle: 0 };
  if (c.kind === 'delegate' && delegate) {
    const d = bundle.markets.find((m) => m.source === 'likes')?.cast[delegate];
    if (d) return { who: { careers: [d.career], appearance: plain, persona: d.persona } };
  }
  if (c.kind === 'friend' && st.friend) return { who: { careers: [st.friend.c.careers[st.friend.c.careers.length - 1]!], appearance: st.friend.c.appearance } };
  if (c.kind === 'boss') {
    const career = stageInfo(bundle, chapterBossStage(stage)).bossCareer;
    if (career) return { who: { careers: [career], appearance: plain } };
  }
  if (c.bro) {
    const m = bundle.markets.find((x) => x.id === 'market.crypto')?.cast[c.bro];
    if (m) return { who: { careers: [m.career], appearance: plain, persona: m.persona } };
  }
  if (c.career || c.persona) return { who: { careers: [c.career ?? 'career.teacher'], appearance: plain, ...(c.persona ? { persona: c.persona } : {}) } };
  return { icon: c.icon ?? '💬' };
}

/** The boss stage of the chapter a stage is in. */
export function chapterBossStage(stage: number): number {
  return Math.floor(stage / STAGES_PER_ARENA) * STAGES_PER_ARENA + STAGES_PER_ARENA - 1;
}

function thread(bundle: ContentBundle, st: StoryState, id: string, ctx: StoryCtx, fallback?: { name: string; sub: string; icon: string }): StoryThread {
  let t = st.threads[id];
  if (!t) {
    const c = bundle.contacts.find((x) => x.id === id);
    t = c
      ? { id, name: fillSlots(c.name, ctx.slots), sub: fillSlots(c.sub, ctx.slots), ...contactLook(bundle, c, st, ctx.stage, ctx.delegate), lines: [], read: 0 }
      : { id, name: fallback?.name ?? id, sub: fallback?.sub ?? '', icon: fallback?.icon ?? '💬', lines: [], read: 0 };
    st.threads[id] = t;
  }
  st.order = [id, ...st.order.filter((x) => x !== id)];
  return t;
}

function ping(st: StoryState, id: string): void {
  st.pings = [id, ...st.pings.filter((x) => x !== id)].slice(0, 4);
}

/**
 * Fire a beat: its lines land in the contact's thread, story effects apply,
 * and the effects only the caller can apply (cash, posts, the starter feed)
 * are returned. Mutates `st`.
 */
export function fireBeat(bundle: ContentBundle, st: StoryState, beat: StoryBeatDef, ctx: StoryCtx): OuterEffect[] {
  if (st.fired.includes(beat.id)) return [];
  st.fired.push(beat.id);
  const t = thread(bundle, st, beat.contact, ctx);
  beat.lines.forEach((l, i) => {
    const text = Array.isArray(l) ? l[Rng.fromSeed(`story:${ctx.seed}:${beat.id}:${i}`).int(l.length)]! : l;
    t.lines.push({ from: 'them', text: fillSlots(text, ctx.slots), fight: ctx.fights });
  });
  if (beat.art) t.lines.push({ from: 'them', text: '', fight: ctx.fights, art: beat.art });
  if (beat.link) t.lines.push({ from: 'them', text: '', fight: ctx.fights, link: beat.link });
  if (beat.typing) t.typing = true;
  if (beat.replies?.length) t.ask = beat.id;
  if (!beat.quiet) ping(st, t.id);
  const outer: OuterEffect[] = [];
  for (const e of beat.effects) {
    switch (e.kind) {
      case 'unlock':
        if (!st.unlocks.includes(e.what)) st.unlocks.push(e.what);
        break;
      case 'squadSlots':
        st.squadSlots = Math.max(st.squadSlots, e.n);
        break;
      case 'connections':
        st.connections += e.n;
        break;
      case 'gate':
        if (!st.gates.includes(e.feed)) st.gates.push(e.feed);
        break;
      case 'partner':
        st.partner = e.action === 'join' && !!st.friend;
        if (e.action === 'rehire' && st.friend) outer.push({ kind: 'rehire' });
        break;
      case 'post':
        // Filled here, so a post can quote the reply that led to it ({reply}).
        outer.push({ ...e, lines: e.lines.map((l) => fillSlots(l, ctx.slots)) });
        break;
      default:
        outer.push(e);
    }
  }
  return outer;
}

/** The player picks a reply: it goes in the thread, its flag is remembered, and its next beat fires. */
export function replyTo(bundle: ContentBundle, st: StoryState, threadId: string, index: number, ctx: StoryCtx): { beat?: StoryBeatDef; effects: OuterEffect[] } {
  const t = st.threads[threadId];
  const asked = t?.ask ? bundle.story.find((b) => b.id === t.ask) : undefined;
  const r = asked?.replies?.[index];
  if (!t || !asked || !r) return { effects: [] };
  delete t.ask;
  t.lines.push({ from: 'me', text: r.text, fight: ctx.fights });
  t.read = t.lines.length;
  if (r.flag && !st.flags.includes(r.flag)) st.flags.push(r.flag);
  const next = r.next ? bundle.story.find((b) => b.id === r.next) : undefined;
  if (!next || !ready(st, next)) return { effects: [] };
  return { beat: next, effects: fireBeat(bundle, st, next, { ...ctx, slots: { ...ctx.slots, reply: r.text } }) };
}

export function markRead(st: StoryState, threadId: string): void {
  const t = st.threads[threadId];
  if (t) t.read = t.lines.length;
  st.pings = st.pings.filter((x) => x !== threadId);
}

export function unreadCount(st: StoryState): number {
  return Object.values(st.threads).reduce((n, t) => n + (t.lines.length > t.read || t.ask || t.gig?.state === 'open' || t.offer?.state === 'open' ? 1 : 0), 0);
}

/** After a career fight: the loss streak and the network grow. */
export function afterFight(st: StoryState, outcome: 'win' | 'draw' | 'loss', kos: number): void {
  st.fights++;
  st.lossStreak = outcome === 'loss' ? st.lossStreak + 1 : 0;
  st.connections += outcome === 'win' ? 3 + Math.min(3, kos) : outcome === 'draw' ? 2 : 1;
}

// ---------------------------------------------------------------------------
// Gigs (12 §8.2): one-off brawls offered in a message, accepted once
// ---------------------------------------------------------------------------
/** Maybe an invite after a fight: from fight `fromFight`, at most every `everyFights`, each gig once. */
export function rollGig(bundle: ContentBundle, st: StoryState, ctx: StoryCtx): GigDef | null {
  const G = bundle.economy.gigs;
  if (!hasUnlock(st, 'easyApply') || ctx.fights < G.fromFight || ctx.fights - st.gigs.lastOffer < G.everyFights) return null;
  if (Object.values(st.threads).some((t) => t.gig?.state === 'open' || t.gig?.state === 'accepted')) return null;
  const rng = Rng.fromSeed(`gig:${ctx.seed}:${ctx.fights}`);
  if (rng.int(10000) >= G.chanceBp) return null;
  const pool = bundle.gigs.filter((g) => g.minStage <= ctx.stage && !st.gigs.seen.includes(g.id));
  return pool.length ? pool[rng.int(pool.length)]! : null;
}

export function offerGig(bundle: ContentBundle, st: StoryState, gig: GigDef, ctx: StoryCtx): void {
  st.gigs.lastOffer = ctx.fights;
  st.gigs.seen.push(gig.id);
  const t = thread(bundle, st, gig.id, ctx, gig.from);
  const slots = { ...ctx.slots, cash: gig.pay.win, gig: gig.title };
  for (const l of gig.invite) t.lines.push({ from: 'them', text: fillSlots(l, slots), fight: ctx.fights });
  t.gig = { id: gig.id, state: 'open', fight: ctx.fights };
  ping(st, t.id);
}

/** Accept or turn down an open invite. Only once: an answered invite can't be answered again. */
export function answerGig(bundle: ContentBundle, st: StoryState, gigId: string, accept: boolean, ctx: StoryCtx): boolean {
  const t = st.threads[gigId];
  const g = bundle.gigs.find((x) => x.id === gigId);
  if (!t?.gig || t.gig.state !== 'open' || !g) return false;
  t.gig.state = accept ? 'accepted' : 'declined';
  t.lines.push({ from: 'me', text: accept ? g.accept : g.decline, fight: ctx.fights });
  t.read = t.lines.length;
  return true;
}

/** Invites left open too long lapse. */
export function expireGigs(bundle: ContentBundle, st: StoryState, fights: number): void {
  for (const t of Object.values(st.threads)) {
    if (t.gig?.state === 'open' && fights - t.gig.fight >= bundle.economy.gigs.expiresAfter) {
      t.gig.state = 'expired';
      t.lines.push({ from: 'them', text: 'This opportunity has expired. We went with someone with more availability. 🙏', fight: fights });
    }
  }
}

/** The gig is played: the sender signs off in the thread. */
export function finishGig(bundle: ContentBundle, st: StoryState, gigId: string, outcome: 'win' | 'draw' | 'loss', cash: number, ctx: StoryCtx): void {
  const t = st.threads[gigId];
  const g = bundle.gigs.find((x) => x.id === gigId);
  if (!t?.gig || !g) return;
  t.gig.state = 'done';
  const lines = outcome === 'win' ? g.after.win : g.after.loss;
  const text = lines[Rng.fromSeed(`gig-after:${ctx.seed}:${gigId}`).int(lines.length)]!;
  t.lines.push({ from: 'them', text: fillSlots(text, { ...ctx.slots, cash, gig: g.title }), fight: ctx.fights });
  st.order = [gigId, ...st.order.filter((x) => x !== gigId)];
  ping(st, gigId);
}

/**
 * A gig's own fighters (its strange temps, or the other side): one career
 * each, with the boss rule's stat top-up for the slots they don't have, at
 * the main character's level plus their offset.
 */
export function gigFighters(bundle: ContentBundle, seed: string, gig: GigDef, side: 'allies' | 'opponents', level: number, rank: number): CharacterSnapshot[] {
  const list = (side === 'allies' ? gig.allies : gig.opponents) ?? [];
  const rng = Rng.fromSeed(`gig-team:${seed}:${gig.id}:${side}`);
  return list.map((m, i) => {
    const f = generatedFighter(bundle, rng, `${gig.id}-${side}-${i}`, Math.max(1, level + m.levelOffset), rank, DIFFICULTIES[1]!, [m.career]);
    const dropped = f.c.careers.length - 1;
    for (let p = 0; p < dropped * 4; p++) f.c.stats[STAT_KEYS[rng.int(STAT_KEYS.length)]!] += 1;
    for (const k of STAT_KEYS) f.c.stats[k] = Math.max(1, f.c.stats[k] + (m.statOffset ?? 0));
    f.c.careers = [m.career];
    f.careerXp = { [m.career]: RANK_XP[Math.max(0, Math.min(4, rank - 1))]! };
    f.nodes = f.nodes.filter((n) => n.startsWith(`${m.career}:`));
    f.c.name = m.name;
    f.c.personality = m.personality;
    f.c.traits = [];
    return { ...careerSnapshot(bundle, f), loadout: [], ...(m.persona ? { persona: m.persona } : {}) };
  });
}

// ---------------------------------------------------------------------------
// Progress (12 §7): job titles, offer letters
// ---------------------------------------------------------------------------
/** The job title for a ladder stage: one per chapter reached, the last one sticks. */
export function jobTitle(bundle: ContentBundle, stage: number): string {
  const t = bundle.economy.progress.titles;
  return t[Math.min(t.length - 1, Math.floor(stage / STAGES_PER_ARENA))]!;
}

/** The three choices of a chapter's offer letter (`recruit` is the free hire, generated by the caller). */
export function offerChoices(bundle: ContentBundle, chapter: number, recruit: Character): OfferChoice[] {
  const O = bundle.economy.progress.offers;
  return [{ kind: 'cash', cash: O.cashPerChapter * chapter }, { kind: 'perk', atLeast: O.perkAtLeast }, { kind: 'hire', recruit }];
}

/** After beating chapter `chapter`'s boss: the next company's talent team writes with the letter. */
export function makeOffer(bundle: ContentBundle, st: StoryState, chapter: number, recruit: Character, ctx: StoryCtx): void {
  const id = `offer.ch${chapter}`;
  if (st.threads[id]) return;
  const t = thread(bundle, st, id, ctx, { name: `Talent Team at ${ctx.slots.company ?? 'HQ'}`, sub: 'Offers · Onboarding · Lanyards', icon: '📜' });
  const lines = bundle.live.offer_letter ?? ['Congratulations, {first}! We would like to make you an offer.'];
  const rng = Rng.fromSeed(`offer:${ctx.seed}:${chapter}`);
  const slots = { ...ctx.slots, title: jobTitle(bundle, chapter * STAGES_PER_ARENA) };
  t.lines.push({ from: 'them', text: fillSlots(lines[rng.int(lines.length)]!, slots), fight: ctx.fights });
  const terms = bundle.live.offer_terms ?? ['Your new title: {title}. Pick one perk below.'];
  t.lines.push({ from: 'them', text: fillSlots(terms[rng.int(terms.length)]!, slots), fight: ctx.fights });
  t.lines.push({ from: 'them', text: '', fight: ctx.fights, art: 'offer-letter' });
  t.offer = { chapter, state: 'open', choices: offerChoices(bundle, chapter, recruit) };
  ping(st, id);
}

/** The player signs, taking choice `i`. Returns it (the caller applies it to the save), or null if already signed. */
export function signOffer(bundle: ContentBundle, st: StoryState, threadId: string, i: number, ctx: StoryCtx): OfferChoice | null {
  const t = st.threads[threadId];
  const c = t?.offer?.state === 'open' ? t.offer.choices[i] : undefined;
  if (!t?.offer || !c) return null;
  t.offer.state = 'done';
  t.offer.picked = i;
  t.lines.push({ from: 'me', text: offerLabel(c), fight: ctx.fights });
  const ack = bundle.live.offer_signed ?? ['Wonderful. Welcome aboard!'];
  t.lines.push({ from: 'them', text: fillSlots(ack[Rng.fromSeed(`offer-ack:${ctx.seed}:${threadId}`).int(ack.length)]!, { ...ctx.slots, title: jobTitle(bundle, t.offer.chapter * STAGES_PER_ARENA) }), fight: ctx.fights });
  t.read = t.lines.length;
  return c;
}

export function offerLabel(c: OfferChoice): string {
  if (c.kind === 'cash') return `💵 Signing bonus: ${c.cash}`;
  if (c.kind === 'perk') return `🎁 A ${c.atLeast}-or-better perk`;
  return `🤝 Bring ${c.recruit.name} on board, free`;
}

/** Connection milestones crossed going from `before` to `after`. */
export function milestonesCrossed(bundle: ContentBundle, before: number, after: number): number[] {
  return bundle.economy.progress.connectionMilestones.filter((m) => before < m && after >= m);
}

/**
 * A message from someone outside the scripted beats (12 §8.1: a cameo, the
 * leader of a set that crashed your fight): appended to their thread, which
 * is made with `look` the first time.
 */
export function sendMessage(st: StoryState, id: string, look: StoryLook & { name: string; sub: string }, lines: string[], fights: number, link?: StoryLine['link'], action?: StoryLine['action']): void {
  let t = st.threads[id];
  if (!t) {
    t = { id, ...look, lines: [], read: 0 };
    st.threads[id] = t;
  }
  for (const text of lines) t.lines.push({ from: 'them', text, fight: fights });
  if (link) t.lines.push({ from: 'them', text: '', fight: fights, link });
  if (action) t.lines.push({ from: 'them', text: '', fight: fights, action });
  st.order = [id, ...st.order.filter((x) => x !== id)];
  ping(st, id);
}

import { signal } from '@preact/signals';
import { bundle } from '@cc/content';
import {
  activeHrNotes,
  agencyTemp,
  pointsLeft,
  afterFight,
  answerGig,
  expireGigs,
  finishGig,
  fireBeat,
  gigFighters,
  growFriend,
  hasUnlock,
  ladderOpponents,
  ladderSize,
  makeFriend,
  newStory,
  offerGig,
  progressDue,
  replyTo,
  rollGig,
  shortName,
  tempCost,
  uiDue,
  contactLook,
  sendMessage,
  fillSlots,
  jobTitle,
  makeOffer,
  milestonesCrossed,
  signOffer,
  STAGES_PER_ARENA,
  chapterBossStage,
  type OuterEffect,
  type StoryUnlock,
  type StoryCtx,
  type StoryState,
  applyHrNotes,
  applyNationalBoost,
  canChangeNationality,
  nationalBoost,
  applyBattleToCharacter,
  battleXp,
  careerOffers,
  careerRank,
  careerSnapshot,
  chooseCareer,
  companyLabel,
  isCompanyName,
  isNameParts,
  lootSellPrice,
  rollLoot,
  formatName,
  randomCompany,
  readHrFile,
  difficulty,
  ensureRoots,
  fightPay,
  LOADOUT_SLOTS,
  shopTierAt,
  evaluateTraits,
  generateRecruit,
  grow,
  hasMilestone,
  rollCrashers,
  recruitRarity,
  relationshipDeltas,
  stageInfo,
  type ActiveHrNote,
  type CareerChar,
  type Character,
  type CompanyName,
  type NameParts,
  type LootItem,
  type DifficultyId,
  type FightPay,
  type GrowthReport,
  type NationalBoost,
} from '@cc/game-rules';
import { Rng, SIM_VERSION, simulate, type BattleInput } from '@cc/sim';
import { broSpeaker, BRO_SYMBOLS, countryName, delegateSpeaker, FEED_CAP, fightPosts, gigPost, milestonePost, starterPosts, storyDelegate, storyPost, titlePost, type FeedPost } from './feed';
import { pickPhotoMoment, type PhotoMoment } from './photo-moment';
import { lastSummit } from '../incident/likes';
import { ON_AIR } from '../news/episodes';

/**
 * Offline career mode (03 §8): one main character climbs a ladder of fights,
 * levels up, ranks up in their careers, spends skill points, and — once they
 * reach Senior rank — builds their own squad. Saved in the browser.
 */
export interface CareerSave {
  v: 1;
  seed: string;
  difficulty: DifficultyId;
  mainId: string;
  chars: Record<string, CareerChar>;
  /** Hired teammates in the squad (economy.hr.squadSize); empty slots are filled by agency temps. Other staff are on Garden Leave. */
  squad: string[];
  /** Next ladder stage (0-based). */
  stage: number;
  cash: number;
  applicants: Character[];
  /** `hr`: the HR notes in effect for our fighters, recorded when the fight was set up. */
  pending: { input: BattleInput; stage: number; hr?: FightSummary['hr']; nation?: FightSummary['nation']; gig?: string; temps?: number } | null;
  last: FightSummary | null;
  wins: number;
  losses: number;
  /** Shop items owned but not equipped (count per item id). */
  inventory: Record<string, number>;
  /** Career-home social feed, newest first (see feed.ts). */
  feed?: FeedPost[];
  /** The player's company, picked from word lists (never typed). Older saves get a random one. */
  company?: CompanyName;
  /** Loot won in fights and not being worn (worn items live on each fighter's `gear`). */
  bag?: LootItem[];
  /** The main character's country (a Summit key such as "PL"), or none: optional. Lends a small boost when it did well at the Diplomatic Incident (economy.nationality). */
  nationality?: string;
  /** When it was last changed (ms), for the cooldown. */
  nationalitySetAt?: number;
  /** The career story (12): messages, unlocks, the friend, temps, gigs. Older saves get one on load. */
  story?: StoryState;
}

/** One line of the post-fight board. */
export interface BoardRow {
  name: string;
  team: number;
  career: string;
  appearance: Character['appearance'];
  dealt: number;
  taken: number;
  kos: number;
  downs: number;
  state: 'active' | 'downed' | 'ko';
  mvp: boolean;
  used: string[];
}

export interface FightSummary {
  stage: number;
  outcome: 'win' | 'draw' | 'loss';
  cash: number;
  pay: FightPay;
  board: BoardRow[];
  /** Fighters first, then staff on Garden Leave (`leave`), who earn a share of the XP from the deckchair. */
  growth: (GrowthReport & { name: string; newTraits: string[]; milestone: boolean; leave?: boolean })[];
  /** HR notes that were in effect for our fighters (06). */
  hr?: { id: string; name: string; note: string; by: string[] }[];
  /** The nationality boost the main character fought with. */
  nation?: { country: string; tier: string; rank: number; hour: string };
  /** An invite-only gig (12 §8.2) rather than a ladder stage. */
  gig?: { id: string; title: string; from: string };
  /** Agency temps paid for this fight. */
  temps?: { n: number; cost: number };
  /** What this fight changed in the story (12 §7.4): connections gained, what opened, a new title. */
  progress?: { connections: number; opened: string[]; title?: string };
  /** The item a win dropped; `sold` is set when the bag was full and it was sold on the spot. */
  loot?: { item: LootItem; sold?: number };
  /** Critters each side summoned (summon ids, with the summoner's name for ours) and which of our fighters got spooked. */
  summons?: { mine: { by: string; summon: string }[]; theirs: string[]; spooked: { name: string; summon: string }[] };
  /** The fight's best moment for the photo post (the picture itself is rendered after, see photo.ts). */
  photo?: PhotoMoment;
  /** Gatecrashers (07) who burst in: the set, who they were (leader first), and how many our side put down. */
  crash?: { set: string; members: { name: string; persona: string; art?: string; career: string; appearance: { skin: string; hair: string; hairStyle: number } }[]; floored: number };
}

const KEY = 'cc.career.v1';
export const HIRE_COST = { common: 250, rare: 450, epic: 700 } as const;
/** Everyone on the payroll, you included (06 §2). */
export const ROSTER_CAP = bundle.economy.hr.staffCap;
/** Hires who fight next to you; the rest of the staff are on Garden Leave. */
export const SQUAD_SIZE = bundle.economy.hr.squadSize;

function load(): CareerSave | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CareerSave) : null;
  } catch {
    return null;
  }
}

export function migrate(s: CareerSave | null): CareerSave | null {
  if (!s) return s;
  s.inventory ??= {};
  s.feed ??= [];
  s.bag ??= [];
  if (!isCompanyName(s.company)) s.company = randomCompany(Rng.fromSeed(`company:${s.seed}`));
  if (!s.story) legacyStory(s);
  if (!s.feed.length && s.last?.board) s.feed = fightPosts(s, s.last);
  for (const c of Object.values(s.chars)) c.loadout ??= [];
  storyProgress(s, false);
  return s;
}

/**
 * A save from before the story (12 §10): chapter 1 counts as done, everything
 * is open, the line-up stays what it was (now with paid temps), and Karen
 * writes with a restructuring bonus.
 */
function legacyStory(s: CareerSave): void {
  const m = mainChar(s);
  const st = newStory(makeFriend(bundle, s.seed, currentCareer(m), m.c.level, careerRank(m, currentCareer(m))));
  st.fired = bundle.story.filter((b) => b.id.startsWith('story.ch1-')).map((b) => b.id);
  st.unlocks = ['messages', 'feed', 'easyApply', 'temps', 'hiring', 'nationality'];
  st.gates = ['bro', 'delegate', 'news'];
  st.squadSlots = SQUAD_SIZE;
  st.fights = s.wins + s.losses;
  st.connections = 12 + 3 * s.wins + s.losses;
  st.gigs.lastOffer = st.fights;
  st.temps = Math.max(0, SQUAD_SIZE - s.squad.length);
  s.story = st;
  const beat = bundle.story.find((b) => b.trigger.kind === 'legacy');
  if (beat) applyOuter(s, fireBeat(bundle, st, beat, storyCtx(s)));
}


export function save(s: CareerSave): void {
  career.value = { ...s };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: the career lasts for this page.
  }
}

export function abandon(): void {
  career.value = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** The player's company as shown in fights, results and the feed. */
export function companyName(s: CareerSave): string {
  return s.company ? companyLabel(s.company) : 'Your Squad';
}

export function renameCompany(s: CareerSave, company: CompanyName): void {
  if (isCompanyName(company)) save({ ...s, company });
}

/** Rename a character with parts from the name picker. */
export function renameCharacter(s: CareerSave, id: string, parts: NameParts): void {
  const cc = s.chars[id];
  if (!cc || !isNameParts(bundle, parts)) return;
  save({ ...s, chars: { ...s.chars, [id]: { ...cc, c: { ...cc.c, name: formatName(parts), nameParts: parts } } } });
}

export function mainChar(s: CareerSave): CareerChar {
  return s.chars[s.mainId]!;
}

export function currentCareer(cc: CareerChar): string {
  return cc.c.careers[cc.c.careers.length - 1]!;
}

/** Hiring is open (12 §6.3): Karen's message after the third fight. */
export function squadUnlocked(s: CareerSave): boolean {
  return !!s.story && hasUnlock(s.story, 'hiring');
}

/** Hires who may fight next to you now (seats open with the story). */
export function squadSlots(s: CareerSave): number {
  return squadUnlocked(s) ? Math.min(SQUAD_SIZE, s.story!.squadSlots) : 0;
}

/** A fresh main character for the creation screen. */
export function draftCharacter(seed: string, careerId: string): Character {
  const c = generateRecruit(bundle, Rng.fromSeed(`draft:${seed}`), 'main', { careerPool: [careerId], rarity: 'rare' });
  return c;
}

export function startCareer(main: Character, diff: DifficultyId, company: CompanyName, nationality = ''): void {
  const seed = Math.random().toString(16).slice(2, 10);
  const mc: CareerChar = { c: { ...main, id: `main-${seed}` }, careerXp: {}, nodes: [] };
  ensureRoots(bundle, mc);
  const s: CareerSave = {
    v: 1,
    seed,
    difficulty: diff,
    mainId: mc.c.id,
    chars: { [mc.c.id]: mc },
    squad: [],
    stage: 0,
    cash: 300,
    applicants: [],
    pending: null,
    last: null,
    wins: 0,
    losses: 0,
    inventory: { 'item.meal-deal': 1 },
    company,
    ...(nationality ? { nationality, nationalitySetAt: Date.now() } : {}),
    feed: [],
    story: newStory(makeFriend(bundle, seed, mc.c.careers[0]!, mc.c.level, 1)),
  };
  save(s);
}

/** Who fights next to you before any temps: the friend while they're with you, then hires in their seats. */
function regulars(s: CareerSave): CareerChar[] {
  const st = s.story;
  const mates: CareerChar[] = [];
  if (st?.partner && st.friend) mates.push(st.friend);
  for (const id of s.squad.slice(0, squadSlots(s))) {
    const cc = s.chars[id];
    if (cc) mates.push(cc);
  }
  return mates.slice(0, SQUAD_SIZE);
}

/** Seats left for agency temps. */
export function tempSeats(s: CareerSave): number {
  return s.story && hasUnlock(s.story, 'temps') ? SQUAD_SIZE - regulars(s).length : 0;
}

/** Temps who'll actually come to the next fight: the ones booked, if there's a seat and the cash for them. */
export function tempsComing(s: CareerSave): number {
  const cost = tempCost(bundle, s.stage);
  return Math.max(0, Math.min(s.story?.temps ?? 0, tempSeats(s), cost > 0 ? Math.floor(s.cash / cost) : SQUAD_SIZE));
}

/** Book (or unbook) temps for the fights ahead; they're paid as each fight starts. */
export function bookTemps(s: CareerSave, n: number): void {
  if (!s.story) return;
  save({ ...s, story: { ...s.story, temps: Math.max(0, Math.min(SQUAD_SIZE, n)) } });
}

/** Teammates for the next fight: the friend, hires in their seats, then any booked temps. Alone is allowed. */
export function lineup(s: CareerSave): CareerChar[] {
  const m = mainChar(s);
  const mates = regulars(s);
  const n = tempsComing(s);
  for (let i = 0; i < n; i++) mates.push(agencyTemp(bundle, s.seed, i, m.c.level));
  return [m, ...mates.slice(0, SQUAD_SIZE)];
}

/** Whether the next ladder fight can be started (the recruiter's message unlocks Easy Apply). */
export function canApply(s: CareerSave): boolean {
  return !s.story || hasUnlock(s.story, 'easyApply');
}

/** Hired staff not in the squad: on Garden Leave. */
export function onGardenLeave(s: CareerSave): CareerChar[] {
  return Object.values(s.chars).filter((c) => c.c.id !== s.mainId && !s.squad.includes(c.c.id));
}

/**
 * HR notes (06) in effect for each fighter in the next fight, by character id:
 * the arena, the line-up and the known opponents decide which switch on.
 */
export function lineupHr(s: CareerSave, team: CareerChar[] = lineup(s)): Map<string, ActiveHrNote[]> {
  const info = stageInfo(bundle, s.stage);
  const enemies = nextOpponents(s);
  const out = new Map<string, ActiveHrNote[]>();
  for (const cc of team) out.set(cc.c.id, activeHrNotes(bundle, cc, { arenaId: info.arenaId, allies: team.filter((x) => x !== cc), enemies, boss: info.boss }));
  return out;
}

/** The main character's nationality boost for the next fight, from the last finished Summit hour (null if none). */
export function nationBoost(s: CareerSave, now = Date.now()): NationalBoost | null {
  return nationalBoost(bundle, s.nationality, lastSummit(now));
}

/** Whether the nationality can be changed now (once a day; the first pick is free). */
export function nationalityChangeable(s: CareerSave, now = Date.now()): boolean {
  return canChangeNationality(bundle, s.nationalitySetAt, now);
}

/** Pick, change or clear the nationality ('' = none). Refused during the cooldown. */
export function setNationality(s: CareerSave, key: string, now = Date.now()): boolean {
  if ((s.nationality ?? '') === key || !nationalityChangeable(s, now)) return false;
  const next: CareerSave = { ...s, nationalitySetAt: now };
  if (key) next.nationality = key;
  else delete next.nationality;
  save(next);
  return true;
}

/** Open a personnel file: every note in it is now read. */
export function openFile(s: CareerSave, id: string): void {
  const cc = s.chars[id];
  if (!cc) return;
  const before = (cc.readNotes ?? []).length;
  readHrFile(bundle, cc);
  if ((cc.readNotes ?? []).length !== before) save({ ...s });
}

export function nextOpponents(s: CareerSave): CareerChar[] {
  return ladderOpponents(bundle, s.seed, s.stage, difficulty(s.difficulty));
}

/** How many interviewers the next stage has (1–3, gatecrashers never counted). */
export function interviewers(s: CareerSave): number {
  return ladderSize(bundle, s.stage);
}

/** Pay for the temps of a fight being set up: the cost goes, the spend is remembered. */
function payTemps(s: CareerSave, n: number): CareerSave {
  if (!n || !s.story) return s;
  const cost = n * tempCost(bundle, s.stage);
  return { ...s, cash: s.cash - cost, story: { ...s.story, tempSpend: s.story.tempSpend + cost } };
}

/** Build the battle for the next stage and remember it until results are collected. */
export function prepareFight(s: CareerSave): BattleInput {
  const info = stageInfo(bundle, s.stage);
  const team = lineup(s);
  const temps = team.filter((c) => c.temp).length;
  const hr = lineupHr(s, team);
  // Nationality: the main character only, fixed now so the fight replays the same.
  const nation = nationBoost(s);
  const input: BattleInput = {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: SIM_VERSION,
    seed: `${s.seed}:${s.stage}:${s.wins + s.losses}`,
    arenaId: info.arenaId,
    mode: 'duel_3v3',
    teams: [
      { playerId: 'you', playerName: companyName(s), rating: 1000, characters: team.map((c, i) => applyNationalBoost(applyHrNotes(careerSnapshot(bundle, c), hr.get(c.c.id) ?? []), i === 0 ? nation : null)) },
      { playerId: 'opp', playerName: info.company, rating: 1000, characters: nextOpponents(s).map((c) => careerSnapshot(bundle, c)) },
    ],
    modifiers: [],
  };
  // Gatecrashers (07): now and then, never in a boss fight or before stage `fromStage`. As strong as you are,
  // and never more of them than the bigger side has fighters.
  const m = mainChar(s);
  const sides = Math.max(...input.teams.map((t) => t.characters.length));
  const crashers = info.boss || s.stage < bundle.economy.crashers.fromStage ? undefined : rollCrashers(bundle, input.seed, info.arenaId, m.c.level, careerRank(m, currentCareer(m)), { maxSize: sides });
  if (crashers) input.crashers = crashers;
  const hrUsed = team.flatMap((c) => (hr.get(c.c.id) ?? []).map((a) => ({ id: c.c.id, name: c.c.name, note: a.note.id, by: a.by })));
  const nationUsed = nation ? { country: nation.country, tier: nation.tier.id, rank: nation.rank, hour: nation.hour } : undefined;
  save({ ...payTemps(s, temps), pending: { input, stage: s.stage, ...(hrUsed.length ? { hr: hrUsed } : {}), ...(nationUsed ? { nation: nationUsed } : {}), ...(temps ? { temps } : {}) } });
  return input;
}

/**
 * An invite-only gig (12 §8.2): your usual line-up, you alone, or you with the
 * gig's own strange temps, against its cast, in its arena. Off the ladder.
 */
export function prepareGig(s: CareerSave, gigId: string): BattleInput | null {
  const gig = bundle.gigs.find((g) => g.id === gigId);
  if (!gig) return null;
  const m = mainChar(s);
  const rank = careerRank(m, currentCareer(m));
  const team = gig.side === 'squad' ? lineup(s) : [m];
  const temps = team.filter((c) => c.temp).length;
  const hr = lineupHr(s, team);
  const nation = nationBoost(s);
  const ours = team.map((c, i) => applyNationalBoost(applyHrNotes(careerSnapshot(bundle, c), hr.get(c.c.id) ?? []), i === 0 ? nation : null));
  if (gig.side === 'cast') ours.push(...gigFighters(bundle, s.seed, gig, 'allies', m.c.level, rank));
  const input: BattleInput = {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: SIM_VERSION,
    seed: `${s.seed}:${gig.id}`,
    arenaId: gig.arena,
    mode: 'duel_3v3',
    teams: [
      { playerId: 'you', playerName: companyName(s), rating: 1000, characters: ours },
      { playerId: 'opp', playerName: gig.from.name, rating: 1000, characters: gigFighters(bundle, s.seed, gig, 'opponents', m.c.level, rank) },
    ],
    modifiers: [],
  };
  save({ ...payTemps(s, temps), pending: { input, stage: s.stage, gig: gig.id, ...(temps ? { temps } : {}) } });
  return input;
}

/** The fight whose results were collected last in this session (its photo is rendered from it). */
export let lastFight: { input: BattleInput; fight: number } | null = null;

/** Apply the pending fight's result (deterministic re-simulation, so it can't be gamed). */
export function collectResults(s: CareerSave): CareerSave {
  if (!s.pending) return s;
  const { input, stage } = s.pending;
  const gig = s.pending.gig ? bundle.gigs.find((g) => g.id === s.pending!.gig) : undefined;
  const out = simulate(input, bundle);
  const outcome: 'win' | 'draw' | 'loss' = out.result.winner === 0 ? 'win' : out.result.winner < 0 ? 'draw' : 'loss';
  const diff = difficulty(s.difficulty);
  const rel = relationshipDeltas(out.result, out.events);
  // The first ladder stages pay extra XP, so the first levels come quickly (12 §7.4).
  const early = bundle.economy.progress.earlyXp;
  const earlyBp = !gig && stage < early.stages ? early.bp : 10000;
  const growth: FightSummary['growth'] = [];
  const milestoneCheck = (cc: CareerChar): boolean => {
    const milestone = hasMilestone(bundle.economy, cc.c);
    if (milestone && !cc.c.pendingOffer) cc.c.pendingOffer = careerOffers(bundle, cc.c, bundle.careers.filter((x) => !x.deprecated).map((x) => x.id), `${s.seed}:${cc.c.id}:${cc.c.level}`);
    return milestone;
  };
  // Consumables that fired are gone; unused ones stay packed.
  const used = new Map<number, string[]>();
  for (const e of out.events) if (e.type === 'consume') used.set(e.a, [...(used.get(e.a) ?? []), e.s]);
  const board: BoardRow[] = out.result.characters.map((r) => {
    const snap = input.teams[r.team]!.characters.find((c) => c.id === r.snapshotId)!;
    return { name: r.name, team: r.team, career: snap.careers[snap.careers.length - 1]!, appearance: snap.appearance, dealt: r.counters.damageDealt, taken: r.counters.damageTaken, kos: r.counters.kos, downs: r.counters.downs, state: r.state, mvp: out.result.mvp === r.entityId, used: used.get(r.entityId) ?? [] };
  });
  for (const r of out.result.characters) {
    if (r.team !== 0) continue;
    const mvp = out.result.mvp === r.entityId;
    const xp = Math.round((battleXp(bundle.economy, outcome, r.counters.kos, mvp, false) * diff.rewardBp * earlyBp) / 100_000_000);
    const friend = s.story?.friend;
    if (friend && r.snapshotId === friend.c.id && !s.chars[friend.c.id]) {
      // The friend grows with you while they fight next to you, and spends their own points.
      const g = growFriend(bundle, friend, xp, s.seed);
      applyBattleToCharacter(friend.c, r, outcome, mvp);
      growth.push({ ...g, name: friend.c.name, newTraits: [], milestone: false });
      continue;
    }
    const cc = s.chars[r.snapshotId];
    if (!cc) continue; // agency temps and gig casts don't persist
    for (const itemId of used.get(r.entityId) ?? []) {
      const i = (cc.loadout ?? []).indexOf(itemId);
      if (i >= 0) cc.loadout!.splice(i, 1);
    }
    const g = grow(bundle, cc, xp);
    applyBattleToCharacter(cc.c, r, outcome, mvp);
    const newTraits = evaluateTraits(bundle, cc.c);
    for (const [other, d] of rel.get(cc.c.id) ?? []) cc.c.relationships[other] = Math.max(-10, Math.min(10, (cc.c.relationships[other] ?? 0) + d));
    growth.push({ ...g, name: cc.c.name, newTraits, milestone: milestoneCheck(cc) });
  }
  // Garden Leave: a share of the fight's base XP for everyone not in the line-up (06 §2).
  const fought = new Set(input.teams[0]!.characters.map((c) => c.id));
  const leaveXp = Math.round((((battleXp(bundle.economy, outcome, 0, false, false) * diff.rewardBp) / 10000) * bundle.economy.hr.gardenLeaveXpBp) / 10000);
  for (const cc of Object.values(s.chars)) {
    if (fought.has(cc.c.id) || leaveXp <= 0) continue;
    const g = grow(bundle, cc, leaveXp);
    growth.push({ ...g, name: cc.c.name, newTraits: [], milestone: milestoneCheck(cc), leave: true });
  }
  const teamKos = out.result.characters.filter((r) => r.team === 0).reduce((n, r) => n + r.counters.kos, 0);
  // Gigs pay a flat fee (before the difficulty multiplier); ladder fights pay as usual.
  const gigBase = gig ? (outcome === 'win' ? gig.pay.win : gig.pay.loss) : 0;
  const pay = gig ? { base: gigBase, stage: 0, kos: 0, koCount: teamKos, multiplier: diff.rewardBp / 10000, total: Math.round((gigBase * diff.rewardBp) / 10000) } : fightPay(outcome, stage, teamKos, diff);
  const cash = pay.total;
  // A win drops one item. Bosses and Brutal roll extra times and keep the best.
  let loot: FightSummary['loot'];
  const bag = [...(s.bag ?? [])];
  let lootCash = 0;
  if (outcome === 'win' && !gig) {
    const L = bundle.economy.loot;
    const rolls = 1 + (stageInfo(bundle, stage).boss ? L.bossExtraRolls : 0) + (s.difficulty === 'brutal' ? L.brutalExtraRolls : 0);
    const item = rollLoot(bundle, Rng.fromSeed(`${input.seed}:loot`), `loot-${s.seed}-${stage}-${s.wins}`, rolls);
    if (bag.length >= L.bagCap) {
      lootCash = lootSellPrice(bundle, item);
      loot = { item, sold: lootCash };
    } else {
      bag.push(item);
      loot = { item };
    }
  }
  const next: CareerSave = {
    ...s,
    bag,
    // A gig never moves you up the ladder (or changes its record, which seeds the ladder's fights).
    stage: outcome === 'win' && !gig ? stage + 1 : s.stage,
    cash: s.cash + cash + lootCash,
    pending: null,
    wins: s.wins + (outcome === 'win' && !gig ? 1 : 0),
    losses: s.losses + (outcome === 'loss' && !gig ? 1 : 0),
    applicants: outcome === 'win' && !gig ? [] : s.applicants,
    last: null,
  };
  // Who summoned what, and who ran from it (for the feed).
  const byEntity = new Map(out.result.characters.map((c) => [c.entityId, c]));
  const summons: NonNullable<FightSummary['summons']> = { mine: [], theirs: [], spooked: [] };
  const critterDef = new Map<number, string>();
  for (const e of out.events) {
    if (e.type === 'summon') {
      critterDef.set(e.b, e.s);
      const who = byEntity.get(e.a);
      if (!who) continue;
      if (who.team === 0) {
        if (!summons.mine.some((m) => m.by === who.name && m.summon === e.s)) summons.mine.push({ by: who.name, summon: e.s });
      } else if (!summons.theirs.includes(e.s)) summons.theirs.push(e.s);
    } else if (e.type === 'panic' && e.s.startsWith('fear:')) {
      const who = byEntity.get(e.a);
      const what = critterDef.get(e.b);
      if (who?.team === 0 && what && !summons.spooked.some((x) => x.name === who.name)) summons.spooked.push({ name: who.name, summon: what });
    }
  }
  // Gatecrashers: who came, and how many of them our side floored.
  const crashEv = out.events.find((e) => e.type === 'crash');
  let crash: FightSummary['crash'];
  if (crashEv && input.crashers) {
    const ours = new Set(out.result.characters.filter((c) => c.team === 0).map((c) => c.entityId));
    const crew = new Set(out.events.filter((e) => e.type === 'spawn' && e.v === input.teams.length).map((e) => e.a));
    const floored = new Set(out.events.filter((e) => e.type === 'downed' && crew.has(e.b) && ours.has(e.a)).map((e) => e.b)).size;
    const members = input.crashers.characters.slice(0, crashEv.v).map((c) => ({ name: c.name, persona: c.persona ?? '', art: c.personaArt, career: c.careers[0]!, appearance: c.appearance }));
    crash = { set: crashEv.s, members, floored };
  }
  // The previous fight's photo steers this one away from the same kind of shot and the same face.
  const photo = pickPhotoMoment(input, [s.mainId], s.last?.photo) ?? undefined;
  const temps = s.pending.temps ? { n: s.pending.temps, cost: s.pending.temps * tempCost(bundle, stage) } : undefined;
  next.last = { stage, outcome, cash, pay, board, growth, ...(s.pending.hr?.length ? { hr: s.pending.hr } : {}), ...(s.pending.nation ? { nation: s.pending.nation } : {}), ...(loot ? { loot } : {}), ...(summons.mine.length || summons.theirs.length ? { summons } : {}), ...(photo ? { photo } : {}), ...(crash ? { crash } : {}), ...(gig ? { gig: { id: gig.id, title: gig.title, from: gig.from.name } } : {}), ...(temps ? { temps } : {}) };
  const fresh = gig ? gigPost(next, next.last, gig) : fightPosts(next, next.last);
  next.feed = [...fresh, ...(s.feed ?? [])].slice(0, FEED_CAP);
  // The story (12): the network grows, a gig is signed off, invites lapse or arrive, and any beats now due fire.
  if (next.story) {
    const st = structuredClone(next.story);
    next.story = st;
    const before = { connections: st.connections, unlocks: [...st.unlocks], seats: st.squadSlots };
    afterFight(st, outcome, teamKos);
    const ctx = storyCtx(next);
    if (gig) finishGig(bundle, st, gig.id, outcome, cash, ctx);
    expireGigs(bundle, st, st.fights);
    const invite = gig ? null : rollGig(bundle, st, ctx);
    if (invite) offerGig(bundle, st, invite, ctx);
    // A chapter boss beaten: the next company's talent team sends an offer letter (12 §7.2).
    const bossWin = !gig && outcome === 'win' && stageInfo(bundle, stage).boss;
    if (bossWin) makeOffer(bundle, st, Math.floor(stage / STAGES_PER_ARENA) + 1, offerRecruit(next, Math.floor(stage / STAGES_PER_ARENA) + 1), ctx);
    storyProgress(next, false);
    // Connection milestones get a post, below the fight's own posts.
    const after = next.story!;
    const crossed = milestonesCrossed(bundle, before.connections, after.connections);
    if (crossed.length) next.feed.splice(fresh.length, 0, ...crossed.map((n) => milestonePost(next, n)));
    storyCameos(next, after, { bossWin, chapter: Math.floor(stage / STAGES_PER_ARENA) + 1 });
    storyNudges(next, after, outcome);
    const opened = [...after.unlocks.filter((u) => !before.unlocks.includes(u)).map((u) => UNLOCK_NAMES[u]), ...(after.squadSlots > before.seats ? [`Squad seat ${after.squadSlots}`] : [])];
    next.last.progress = { connections: after.connections - before.connections, opened, ...(bossWin ? { title: jobTitle(bundle, next.stage) } : {}) };
  }
  if (photo && next.feed[0]?.photo) lastFight = { input, fight: next.feed[0].fight };
  save(next);
  return next;
}

/** Three job applicants near the main character's level (regenerated after each win). */
export function applicants(s: CareerSave): Character[] {
  if (s.applicants.length) return s.applicants;
  const rng = Rng.fromSeed(`hire:${s.seed}:${s.stage}`);
  const m = mainChar(s);
  const list = [0, 1, 2].map((i) => {
    const c = generateRecruit(bundle, rng, `hire-${s.seed}-${s.stage}-${i}`, { rarity: recruitRarity(rng) });
    c.level = Math.max(1, m.c.level - 1);
    for (let p = 1; p < c.level; p++) c.unspentPoints++;
    return c;
  });
  save({ ...s, applicants: list });
  return list;
}

export function rarityOf(c: Character): keyof typeof HIRE_COST {
  const total = Object.values(c.stats).reduce((a, b) => a + b, 0);
  return total >= 66 ? 'epic' : total >= 63 ? 'rare' : 'common';
}

export function hire(s: CareerSave, c: Character): string | null {
  const cost = HIRE_COST[rarityOf(c)];
  if (!squadUnlocked(s)) return 'Hiring opens soon: watch your messages';
  if (s.cash < cost) return `Needs $${cost}`;
  if (Object.keys(s.chars).length >= ROSTER_CAP) return `Roster is full (${ROSTER_CAP})`;
  const cc: CareerChar = { c, careerXp: {}, nodes: [] };
  ensureRoots(bundle, cc);
  const squad = s.squad.length < squadSlots(s) ? [...s.squad, c.id] : s.squad;
  save({ ...s, cash: s.cash - cost, chars: { ...s.chars, [c.id]: cc }, squad, applicants: s.applicants.filter((x) => x.id !== c.id) });
  return null;
}

export function toggleSquad(s: CareerSave, id: string): string | null {
  if (s.squad.includes(id)) {
    save({ ...s, squad: s.squad.filter((x) => x !== id) });
    return null;
  }
  const seats = squadSlots(s);
  if (s.squad.length >= seats) return seats < SQUAD_SIZE ? `Only ${seats} seat${seats === 1 ? '' : 's'} on your squad for now: send someone on Garden Leave first` : 'Squad is full: send someone on Garden Leave first';
  save({ ...s, squad: [...s.squad, id] });
  return null;
}

export function dismiss(s: CareerSave, id: string): void {
  if (id === s.mainId) return;
  const chars = { ...s.chars };
  // Whatever they had packed goes back into the stockroom.
  const inventory = { ...s.inventory };
  for (const itemId of chars[id]?.loadout ?? []) inventory[itemId] = (inventory[itemId] ?? 0) + 1;
  const bag = [...(s.bag ?? []), ...(chars[id]?.gear ?? [])];
  delete chars[id];
  save({ ...s, chars, inventory, bag, squad: s.squad.filter((x) => x !== id) });
}

export function pickCareer(s: CareerSave, charId: string, careerId: string): string | null {
  const cc = s.chars[charId];
  if (!cc) return 'Unknown character';
  const res = chooseCareer(bundle, cc.c, careerId);
  if (res.error) return res.error;
  cc.c.pendingOffer = null;
  ensureRoots(bundle, cc);
  save({ ...s });
  return null;
}

// ---------------------------------------------------------------------------
// Shop & loadouts
// ---------------------------------------------------------------------------
/** The shop sells consumables; gear now comes from winning fights (see loot). */
export function shopStock(s: CareerSave) {
  return (bundle.shopItems ?? []).filter((i) => i.kind === 'consumable' && i.tier <= shopTierAt(s.stage)).sort((a, b) => (a.kind === b.kind ? a.price - b.price : a.kind === 'consumable' ? -1 : 1));
}

export function owned(s: CareerSave, itemId: string): number {
  const packed = Object.values(s.chars).reduce((n, c) => n + (c.loadout ?? []).filter((x) => x === itemId).length, 0);
  return (s.inventory[itemId] ?? 0) + packed;
}

export function buy(s: CareerSave, itemId: string): string | null {
  const item = bundle.shopItems.find((i) => i.id === itemId);
  if (!item) return 'Unknown item';
  if (s.cash < item.price) return `Needs $${item.price}`;
  if (item.kind === 'gear' && owned(s, itemId) >= Object.keys(s.chars).length) return 'You already have one for everyone';
  save({ ...s, cash: s.cash - item.price, inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 } });
  return null;
}

export function equip(s: CareerSave, charId: string, itemId: string): string | null {
  const cc = s.chars[charId];
  if (!cc) return 'Unknown character';
  cc.loadout ??= [];
  if (cc.loadout.length >= LOADOUT_SLOTS) return `Only ${LOADOUT_SLOTS} items per fighter`;
  if ((s.inventory[itemId] ?? 0) <= 0) return 'None left — buy one in the shop';
  const item = bundle.shopItems.find((i) => i.id === itemId);
  if (item?.kind === 'gear' && cc.loadout.includes(itemId)) return 'Already wearing one';
  cc.loadout.push(itemId);
  save({ ...s, inventory: { ...s.inventory, [itemId]: s.inventory[itemId]! - 1 } });
  return null;
}

export function unequip(s: CareerSave, charId: string, slot: number): void {
  const cc = s.chars[charId];
  const itemId = cc?.loadout?.[slot];
  if (!cc || !itemId) return;
  cc.loadout!.splice(slot, 1);
  save({ ...s, inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 } });
}

// ---------------------------------------------------------------------------
// Loot: the bag, wearing items and selling them
// ---------------------------------------------------------------------------
export function equipGear(s: CareerSave, charId: string, uid: string): string | null {
  const cc = s.chars[charId];
  const item = (s.bag ?? []).find((x) => x.uid === uid);
  if (!cc || !item) return 'Item not found';
  const slots = bundle.economy.loot.slots;
  if ((cc.gear ?? []).length >= slots) return `Only ${slots} perks per fighter — unassign one first`;
  save({ ...s, bag: s.bag!.filter((x) => x.uid !== uid), chars: { ...s.chars, [charId]: { ...cc, gear: [...(cc.gear ?? []), item] } } });
  return null;
}

export function unequipGear(s: CareerSave, charId: string, uid: string): void {
  const cc = s.chars[charId];
  const item = cc?.gear?.find((x) => x.uid === uid);
  if (!cc || !item) return;
  save({ ...s, bag: [...(s.bag ?? []), item], chars: { ...s.chars, [charId]: { ...cc, gear: cc.gear!.filter((x) => x.uid !== uid) } } });
}

/** Sell an item from the bag. Returns the cash it fetched (0 if it wasn't there). */
export function sellLoot(s: CareerSave, uid: string): number {
  const item = (s.bag ?? []).find((x) => x.uid === uid);
  if (!item) return 0;
  const price = lootSellPrice(bundle, item);
  save({ ...s, cash: s.cash + price, bag: s.bag!.filter((x) => x.uid !== uid) });
  return price;
}

/** Record the player's reaction / comments on a saved feed post. */
export function setPostMine(s: CareerSave, id: string, mine: NonNullable<FeedPost['mine']>): void {
  const feed = s.feed ?? [];
  const i = feed.findIndex((p) => p.id === id);
  if (i < 0) return;
  const next = [...feed];
  next[i] = { ...feed[i]!, mine };
  save({ ...s, feed: next });
}

// ---------------------------------------------------------------------------
// The story (12): messages, beats, replies and gigs
// ---------------------------------------------------------------------------
/** Values for the `{slot}`s in story text. */
function storySlots(s: CareerSave): Record<string, string | number> {
  const m = mainChar(s);
  const info = stageInfo(bundle, s.stage);
  const boss = stageInfo(bundle, chapterBossStage(s.stage));
  // The boss of the chapter just finished (chapter 1's before any is done).
  const last = stageInfo(bundle, Math.max(STAGES_PER_ARENA, Math.floor(s.stage / STAGES_PER_ARENA) * STAGES_PER_ARENA) - 1);
  const f = s.story?.friend;
  const del = storyDelegate(s);
  const loc = (id: string) => bundle.locale[`${id}.name`] ?? id;
  return {
    me: m.c.name,
    first: shortName(bundle, m.c.name),
    friend: f?.c.name ?? 'your friend',
    friendfirst: f ? shortName(bundle, f.c.name) : 'your friend',
    company: info.company,
    next: info.company,
    arena: loc(info.arenaId).toLowerCase(),
    cash: s.cash,
    tempspend: s.story?.tempSpend ?? 0,
    tempcost: tempCost(bundle, s.stage),
    hirecost: Math.min(...Object.values(HIRE_COST)),
    boss: boss.bossName ?? boss.company,
    bosscompany: boss.company,
    title: jobTitle(bundle, s.stage),
    lastboss: last.bossName ?? last.company,
    mycompany: companyName(s),
    ...(del ? { delegate: COUNTRY_CAST?.cast[del]?.name ?? del, country: countryName(del) } : {}),
  };
}

const COUNTRY_CAST = bundle.markets.find((m) => m.source === 'likes');

export function storyCtx(s: CareerSave): StoryCtx {
  const del = storyDelegate(s);
  return { seed: s.seed, fights: s.story?.fights ?? s.wins + s.losses, stage: s.stage, cash: s.cash, slots: storySlots(s), ...(del ? { delegate: del } : {}) };
}

/** Apply what a beat did outside the story: cash, posts in the feed, the starter feed. Mutates `s`. */
function applyOuter(s: CareerSave, effects: OuterEffect[], beatId = ''): void {
  for (const e of effects) {
    if (e.kind === 'cash') s.cash += e.n;
    else if (e.kind === 'starterFeed') s.feed = [...(s.feed ?? []), ...starterPosts(s)].slice(0, FEED_CAP);
    else if (e.kind === 'post') s.feed = [storyPost(s, e, beatId), ...(s.feed ?? [])].slice(0, FEED_CAP);
    else if (e.kind === 'rehire' && s.story?.friend && !s.chars[s.story.friend.c.id]) {
      // The friend comes back (12 §8, chapter 4): on the staff for good, free, in a seat if there is one.
      const f = s.story.friend;
      s.chars = { ...s.chars, [f.c.id]: f };
      if (s.squad.length < squadSlots(s)) s.squad = [...s.squad, f.c.id];
    }
  }
}

/** Fire every progress beat now due (a beat can make the next one due). Mutates `s`; saves it when `persist`. */
export function storyProgress(s: CareerSave, persist = true): CareerSave {
  if (!s.story) return s;
  let fired = 0;
  for (let guard = 0; guard < 20; guard++) {
    const due = progressDue(bundle, s.story, { fights: s.story.fights, stage: s.stage, cash: s.cash });
    if (!due.length) break;
    if (fired === 0) s.story = structuredClone(s.story);
    for (const b of due) applyOuter(s, fireBeat(bundle, s.story, b, storyCtx(s)), b.id);
    fired += due.length;
  }
  if (persist && fired) save(s);
  return s;
}

function withStory(s: CareerSave, fn: (st: StoryState, next: CareerSave) => void): void {
  if (!s.story) return;
  const next: CareerSave = { ...s, story: structuredClone(s.story) };
  fn(next.story!, next);
  storyProgress(next, false);
  save(next);
}

/** A beat the UI was timing (an idle wait, the feed being scrolled) is due now. */
export function fireStoryBeat(s: CareerSave, beatId: string): void {
  const beat = bundle.story.find((b) => b.id === beatId);
  if (!beat || s.story?.fired.includes(beatId)) return;
  withStory(s, (st, next) => applyOuter(next, fireBeat(bundle, st, beat, storyCtx(next)), beat.id));
}

/** The player picks reply `i` in a thread. */
export function replyStory(s: CareerSave, threadId: string, i: number): void {
  withStory(s, (st, next) => {
    const r = replyTo(bundle, st, threadId, i, storyCtx(next));
    applyOuter(next, r.effects, r.beat?.id);
  });
}

/** A thread has been opened: everything in it is read, its pop-up goes. */
export function readThread(s: CareerSave, threadId: string): void {
  const t = s.story?.threads[threadId];
  if (!t || (t.read === t.lines.length && !s.story!.pings.includes(threadId))) return;
  withStory(s, (st) => {
    st.threads[threadId]!.read = st.threads[threadId]!.lines.length;
    st.pings = st.pings.filter((x) => x !== threadId);
  });
}

/** Dismiss a pop-up without opening the thread. */
export function dismissPing(s: CareerSave, threadId: string): void {
  if (!s.story?.pings.includes(threadId)) return;
  withStory(s, (st) => (st.pings = st.pings.filter((x) => x !== threadId)));
}

/** Accept an invite-only gig (once) and set its fight up. */
export function acceptGig(s: CareerSave, gigId: string): BattleInput | null {
  if (!s.story || s.pending) return null;
  const st = structuredClone(s.story);
  if (!answerGig(bundle, st, gigId, true, storyCtx(s))) return null;
  return prepareGig({ ...s, story: st }, gigId);
}

export function declineGig(s: CareerSave, gigId: string): void {
  withStory(s, (st, next) => answerGig(bundle, st, gigId, false, storyCtx(next)));
}

/** Anyone on the payroll, or the friend. */
export function charById(s: CareerSave, id: string): CareerChar | undefined {
  return s.chars[id] ?? (s.story?.friend?.c.id === id ? s.story.friend : undefined);
}

/** "Skip the intro" (12 §4.3): play the opening beats at once, taking the first reply each time, until Easy Apply is open. */
export function skipIntro(s: CareerSave): void {
  withStory(s, (st, next) => {
    for (let guard = 0; guard < 20 && !hasUnlock(st, 'easyApply'); guard++) {
      const ask = Object.values(st.threads).find((t) => t.ask);
      if (ask) {
        const r = replyTo(bundle, st, ask.id, 0, storyCtx(next));
        applyOuter(next, r.effects, r.beat?.id);
        continue;
      }
      const due = uiDue(bundle, st)[0];
      if (!due) break;
      applyOuter(next, fireBeat(bundle, st, due, storyCtx(next)), due.id);
    }
    // One more round for the reply that follows Easy Apply (the friend joining).
    const ask = Object.values(st.threads).find((t) => t.ask);
    if (ask) {
      const r = replyTo(bundle, st, ask.id, 0, storyCtx(next));
      applyOuter(next, r.effects, r.beat?.id);
    }
    st.pings = [];
  });
}

const UNLOCK_NAMES: Record<StoryUnlock, string> = { messages: 'Messaging', feed: 'Your feed', easyApply: 'Easy Apply', temps: 'Agency temps', hiring: 'Hiring', nationality: 'Nationality (the Summit Hall)' };

/** The free hire in a chapter's offer letter: a rare applicant (epic from `epicHireFromChapter`), a level behind you. */
function offerRecruit(s: CareerSave, chapter: number): Character {
  const rng = Rng.fromSeed(`offer-hire:${s.seed}:${chapter}`);
  const rarity = chapter >= bundle.economy.progress.offers.epicHireFromChapter ? 'epic' : 'rare';
  const c = generateRecruit(bundle, rng, `offer-${s.seed}-${chapter}`, { rarity });
  c.level = Math.max(1, mainChar(s).c.level - 1);
  for (let p = 1; p < c.level; p++) c.unspentPoints++;
  return c;
}

/**
 * Sign an offer letter, taking choice `i`: the bonus goes in the wallet, the
 * perk in the bag (sold if it's full), the hire on the staff. Posts the
 * promotion. Returns a line for a toast, or an error (nothing signed).
 */
export function acceptOffer(s: CareerSave, threadId: string, i: number): { ok: boolean; text: string } {
  const t = s.story?.threads[threadId];
  const c = t?.offer?.state === 'open' ? t.offer.choices[i] : undefined;
  if (!t?.offer || !c) return { ok: false, text: 'This offer has already been signed' };
  if (c.kind === 'hire' && Object.keys(s.chars).length >= ROSTER_CAP) return { ok: false, text: `Your staff is full (${ROSTER_CAP}): let someone go first, or pick another perk` };
  let text = '';
  withStory(s, (st, next) => {
    signOffer(bundle, st, threadId, i, storyCtx(next));
    if (c.kind === 'cash') {
      next.cash += c.cash;
      text = `💵 +${c.cash} signing bonus`;
    } else if (c.kind === 'perk') {
      const item = rollLoot(bundle, Rng.fromSeed(`offer-perk:${s.seed}:${threadId}`), `offer-${s.seed}-${threadId}`, 1, c.atLeast as LootItem['rarity']);
      const bag = [...(next.bag ?? [])];
      if (bag.length >= bundle.economy.loot.bagCap) {
        next.cash += lootSellPrice(bundle, item);
        text = 'Your perks inbox was full, so the perk was cashed out';
      } else {
        next.bag = [...bag, item];
        text = '🎁 A new perk is in your bag';
      }
    } else {
      const cc: CareerChar = { c: c.recruit, careerXp: {}, nodes: [] };
      ensureRoots(bundle, cc);
      next.chars = { ...next.chars, [c.recruit.id]: cc };
      if (next.squad.length < squadSlots(next)) next.squad = [...next.squad, c.recruit.id];
      text = `🤝 ${c.recruit.name} joins the staff`;
    }
    next.feed = [titlePost(next, jobTitle(bundle, t.offer!.chapter * STAGES_PER_ARENA), t.offer!.chapter), ...(next.feed ?? [])].slice(0, FEED_CAP);
  });
  return { ok: true, text };
}

/** The chapter title card has been seen. */
export function seeChapter(s: CareerSave, chapter: number): void {
  if (!s.story || (s.story.chapterSeen ?? 0) >= chapter) return;
  save({ ...s, story: { ...s.story, chapterSeen: chapter } });
}

/**
 * Cameos outside the scripted chapters (12 §8.1). The leader of the first
 * set that gatecrashes your fight writes once; and from chapter 5, each
 * chapter boss beaten brings a message from the other shows in turn: a
 * crypto bro, your delegate, or Brock with the episode on air. Mutates `st`.
 */
function storyCameos(s: CareerSave, st: StoryState, at: { bossWin: boolean; chapter: number }): void {
  const ctx = storyCtx(s);
  const rng = Rng.fromSeed(`cameo:${s.seed}:${st.fights}`);
  const say = (key: string, slots: Record<string, string | number>) => {
    const l = bundle.live[key] ?? [];
    return l.length ? [fillSlots(l[rng.int(l.length)]!, { ...ctx.slots, ...slots })] : [];
  };
  const crash = s.last?.crash;
  const lead = crash?.members[0];
  if (crash && lead && !st.flags.includes('crash.met')) {
    st.flags.push('crash.met');
    const name = (id: string) => bundle.locale[`${id}.name`] ?? id;
    sendMessage(st, `crash.${crash.set}`, { name: lead.name, sub: `${name(lead.persona)} · ${name(crash.set)}`, who: { careers: [lead.career], appearance: lead.appearance, persona: lead.persona, ...(lead.art ? { art: lead.art } : {}) } }, say('cameo_crash', { leader: lead.name }), st.fights);
  }
  if (!at.bossWin || at.chapter < 4) return;
  const ep = ON_AIR[0];
  const kinds = ['bro', 'delegate', 'news'].filter((k) => k !== 'news' || ep);
  const kind = kinds[at.chapter % kinds.length];
  if (kind === 'news' && ep) {
    const c = bundle.contacts.find((x) => x.id === 'contact.brock')!;
    sendMessage(st, c.id, { name: c.name, sub: c.sub, ...contactLook(bundle, c, st, s.stage) }, say('cameo_news', { headline: ep.headline }), st.fights, 'news');
  } else if (kind === 'delegate' && ctx.delegate) {
    const d = delegateSpeaker(ctx.delegate);
    if (d) sendMessage(st, 'contact.delegate', { name: d.author, sub: d.sub, ...(d.who ? { who: d.who } : {}) }, say('cameo_delegate', { name: d.author, country: countryName(ctx.delegate) }), st.fights, 'incident');
  } else if (BRO_SYMBOLS.length) {
    const sym = BRO_SYMBOLS[rng.int(BRO_SYMBOLS.length)]!;
    const b = broSpeaker(sym);
    if (b) sendMessage(st, sym === 'ETH' ? 'contact.gavin' : `bro.${sym}`, { name: b.author, sub: b.sub, ...(b.who ? { who: b.who } : {}) }, say('cameo_bro', { name: b.author }), st.fights, 'crypto');
  }
}

/**
 * The career in play, loaded and brought up to date (migrated, story beats due
 * fired). Made last, after every constant the migration uses.
 */
export const career = signal<CareerSave | null>(migrate(load()));

/**
 * Nudges (12 §8.3). The career coach writes when someone has points to spend
 * (a career milestone, skill points, stat points) or perks sit unassigned in
 * the bag; the supermarket pushes a consumable, mostly after a lost fight.
 * Each has a cooldown in fights. Mutates `st`.
 */
export function storyNudges(s: CareerSave, st: StoryState, outcome: 'win' | 'draw' | 'loss'): void {
  if (!hasUnlock(st, 'easyApply')) return;
  const N = bundle.economy.nudges;
  const rng = Rng.fromSeed(`nudge:${s.seed}:${st.fights}`);
  const nudged = (st.nudged ??= {});
  const ctx = storyCtx(s);
  const look = (id: string) => {
    const c = bundle.contacts.find((x) => x.id === id)!;
    return { name: c.name, sub: c.sub, ...contactLook(bundle, c, st, s.stage) };
  };
  const line = (key: string, slots: Record<string, string | number>) => {
    const l = bundle.live[key] ?? [];
    return l.length ? [fillSlots(l[rng.int(l.length)]!, { ...ctx.slots, ...slots })] : [];
  };
  // The coach: the first thing worth nagging about, main character first.
  if (st.fights - (nudged.coach ?? 0) >= N.coachGap && rng.int(10000) < N.coachBp) {
    const people = [mainChar(s), ...Object.values(s.chars).filter((c) => c.c.id !== s.mainId)];
    const freeGear = [mainChar(s), ...s.squad.map((id) => s.chars[id]).filter((c): c is CareerChar => !!c)].some((c) => (c.gear ?? []).length < bundle.economy.loot.slots);
    let nag: { key: string; who: CareerChar; points: number; to: 'skills' | 'perks' } | null = null;
    for (const cc of people) {
      const skill = cc.c.careers.reduce((n, cid) => n + pointsLeft(bundle, cc, cid), 0);
      if (cc.c.pendingOffer) nag = { key: 'nudge_coach_career', who: cc, points: 1, to: 'skills' };
      else if (skill > 0) nag = { key: 'nudge_coach_skills', who: cc, points: skill, to: 'skills' };
      else if (cc.c.unspentPoints > 0) nag = { key: 'nudge_coach_stats', who: cc, points: cc.c.unspentPoints, to: 'skills' };
      if (nag) break;
    }
    const bag = (s.bag ?? []).length;
    if (!nag && bag > 0 && freeGear) nag = { key: 'nudge_coach_perks', who: mainChar(s), points: bag, to: 'perks' };
    if (nag) {
      const who = nag.who.c.id === s.mainId ? 'you' : nag.who.c.name;
      sendMessage(st, 'contact.coach', look('contact.coach'), line(nag.key, { name: who, points: nag.points, s: nag.points === 1 ? '' : 's' }), st.fights, undefined, { to: nag.to, ...(nag.to === 'skills' ? { id: nag.who.c.id } : {}) });
      nudged.coach = st.fights;
    }
  }
  // The supermarket: a consumable you can afford, when someone in the line-up has room to pack it.
  const odds = outcome === 'loss' ? N.shopAfterLossBp : N.shopBp;
  if (st.fights - (nudged.shop ?? 0) >= N.shopGap && rng.int(10000) < odds) {
    const room = lineup(s).some((c) => !c.temp && (c.loadout ?? []).length < LOADOUT_SLOTS);
    const stock = shopStock(s).filter((i) => i.price <= s.cash);
    if (room && stock.length) {
      const item = stock[rng.int(stock.length)]!;
      const name = bundle.locale[`${item.id}.name`] ?? item.id;
      sendMessage(st, 'contact.store', look('contact.store'), line(outcome === 'loss' ? 'nudge_shop_loss' : 'nudge_shop', { item: name, price: item.price }), st.fights, undefined, { to: 'shop' });
      nudged.shop = st.fights;
    }
  }
}

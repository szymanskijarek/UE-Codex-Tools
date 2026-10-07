import { bundle } from '@cc/content';
import { careerRank, grantableAbilities, marketFighter, RANKS, shortName, stageInfo } from '@cc/game-rules';
import { Rng } from '@cc/sim';
import { nameOf } from '../i18n';
import { lootName, lootStatsText, RARITY_NAMES } from './Loot';
import { companyName, currentCareer, mainChar, type CareerSave, type FightSummary } from './model';

/**
 * The career home's social feed. After every fight a handful of posts are
 * written from the result — your humble-brag or cope, teammates and temps,
 * the company you fought, well-meaning strangers, level-ups and promotions —
 * picked from ~300 templates in live.json (`feed_*`). Posts are kept in the
 * save (newest first) so the feed builds up over a career.
 */
export interface FeedPost {
  id: string;
  /** Fight number the post came from (0 = career start). */
  fight: number;
  author: string;
  sub: string;
  /** Portrait for people; companies and shops get an icon square instead. */
  who?: { careers: string[]; appearance: { skin: string; hair: string; hairStyle: number }; persona?: string; art?: string };
  icon?: string;
  text: string;
  tags?: string;
  promoted?: boolean;
  reacts: number;
  comments: number;
  /** What the post is about — drives who comments and how people react. */
  mood?: Mood;
  /** Who wrote it. */
  by?: 'me' | 'staff' | 'temp' | 'company' | 'stranger' | 'crasher' | 'bro' | 'delegate';
  /** Crypto Bros (08): the ticker of the bro who wrote it. */
  bro?: string;
  /** Diplomatic Incident (09): the country of the delegate who wrote it. */
  del?: string;
  /** A link preview under the post (the Crypto Bros or Diplomatic Incident page). */
  link?: { href: string; title: string; blurb: string; art?: string };
  /** Gatecrashers (07): the set that crashed the fight, and its members (they turn up in the comments). */
  crash?: string;
  crew?: { name: string; career: string; persona: string; art?: string; appearance: { skin: string; hair: string; hairStyle: number } }[];
  /** The people from that fight's other team (they turn up in the comments). */
  cast?: { name: string; career: string; appearance: { skin: string; hair: string; hairStyle: number } }[];
  company?: string;
  /** A fight photo post: shows the latest fight photo (photo.ts) while it is this fight's. */
  photo?: boolean;
  /** The player's own reaction and comments on this post. */
  mine?: { react?: ReactionKind; said?: string[] };
}

export type Mood = 'win' | 'loss' | 'draw' | 'news' | 'beaten' | 'gloat' | 'network' | 'company' | 'temp' | 'perk' | 'crash' | 'bro' | 'delegate' | 'institution';
export type ReactionKind = 'like' | 'celebrate' | 'love' | 'insightful' | 'funny' | 'support';
export const REACTIONS: [ReactionKind, string, string][] = [
  ['like', '👍', 'Like'],
  ['celebrate', '👏', 'Celebrate'],
  ['support', '🤲', 'Support'],
  ['love', '❤️', 'Love'],
  ['insightful', '💡', 'Insightful'],
  ['funny', '😂', 'Funny'],
];

const MOOD_OF: Record<string, Mood> = {
  feed_win: 'win',
  feed_win_big: 'win',
  feed_flawless: 'win',
  feed_mvp_me: 'win',
  feed_boss_win: 'win',
  feed_star: 'win',
  feed_item: 'win',
  feed_loss: 'loss',
  feed_boss_loss: 'loss',
  feed_teammate_loss: 'loss',
  feed_draw: 'draw',
  feed_temp_win: 'temp',
  feed_temp_loss: 'temp',
  feed_rankup: 'news',
  feed_levelup: 'news',
  feed_trait: 'news',
  feed_beaten: 'beaten',
  feed_gloat: 'gloat',
  feed_network: 'network',
  feed_network_win: 'network',
  feed_network_loss: 'network',
  feed_hiring: 'company',
  feed_shop: 'company',
  feed_perk_epic: 'perk',
  feed_perk_legendary: 'perk',
  feed_perk_ability: 'perk',
  feed_summon_brag: 'win',
  feed_photo_air_us: 'win',
  feed_photo_air_them: 'win',
  feed_photo_hit_us: 'win',
  feed_photo_hit_them: 'loss',
  feed_photo_move_us: 'win',
  feed_photo_move_them: 'loss',
  feed_photo_ouch_us: 'loss',
  feed_photo_ouch_them: 'win',
  feed_photo_spooked_us: 'loss',
  feed_photo_spooked_them: 'win',
  feed_photo_finisher_us: 'loss',
  feed_photo_finisher_them: 'win',
  feed_photo_critter_us: 'loss',
  feed_photo_critter_them: 'win',
  feed_photo_finisher_item_us: 'loss',
  feed_photo_finisher_item_them: 'win',
  feed_photo_finisher_move_us: 'loss',
  feed_photo_finisher_move_them: 'win',
  feed_photo_ouch_item_us: 'loss',
  feed_photo_ouch_item_them: 'win',
  feed_photo_ouch_move_us: 'loss',
  feed_photo_ouch_move_them: 'win',
  feed_summon_complain: 'news',
  feed_spooked: 'loss',
  feed_crashed: 'crash',
};

export const FEED_CAP = 150;

const PERSONAS: [string, string][] = [
  ['Brad Hustleton', 'Chief Synergy Officer · Keynote speaker'],
  ['Karen Whitfield', 'Talent Acquisition · Hiring 🔥'],
  ['Dev Patel', 'Growth Hacker · Ex-intern · Future CEO'],
  ['Siobhan Kelly', 'Resilience Coach · I fell so you can rise'],
  ['Tom Brennan', 'Thought Leader (self-appointed)'],
  ['Priya Nair', 'VP of Vibes'],
  ['Marcus Lee', 'Serial Entrepreneur · 0 exits'],
  ['Olga Petrova', 'Ex-bouncer · Now in HR'],
  ['Gary Mills', 'Retired forklift champion'],
  ['Aisha Bello', 'Agile Coach · Scrum Master · Karate Master'],
  ['Kev', 'Just Kev'],
  ['Dr Helen Stone', 'Workplace Injury Specialist'],
  ['Jonny Park', 'Ninja · Rockstar · Guru · Unemployed'],
  ['Fran Doyle', 'Recruiter · DM me'],
  ['Rob Carter', 'Sales · Closer · Hugger'],
  ['Lena Vogel', 'Productivity Influencer · 4am club'],
  ['Sam Okoye', 'Head of People (and punching)'],
  ['Chad Brightwell', 'Founder · Stealth mode · Also stealth income'],
  ['Deborah Finch', 'Retired · Reads every comment'],
  ['Ravi Shah', 'Ex-Big 4 · Now sells candles'],
  ['Moira Quinn', 'Chief Happiness Officer · Currently unhappy'],
  ['Pete Walsh', 'LinkedIn Top Voice (self-nominated)'],
  ['Yuki Tanaka', 'Disruptor · Disrupted 3 weddings'],
  ['Barry from Accounts', 'Accounts'],
  ['Nadia Hussein', 'Mindfulness Coach · Black belt'],
];
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#5c3a21'];
const HAIRS = ['#2b1d14', '#6a4e23', '#b55239', '#e6c229', '#1a1a1a', '#9e9e9e'];
const TAGS: Record<string, string[]> = {
  win: ['#Grateful #Teamwork #Leadership', '#Winning #Blessed', '#Hustle #NeverSettle', '#Synergy #Results', '#TeamWork #DreamWork'],
  loss: ['#Resilience #GrowthMindset', '#FailForward', '#Ouch #Learning', '#Comeback #Mindset', '#Vulnerability'],
  draw: ['#Balance #Alignment', '#WinWin #LoseLose'],
  news: ['#NewRole', '#CareerGrowth', '#Promotion #Grateful', '#LevelUp'],
  company: ['#Culture #Hiring', '#WeAreFamily', '#Values', '#Accountability'],
  bro: ['#NFA #DYOR', '#WAGMI #Grindset', '#ToTheMoon #Blessed', '#HODL #Leadership', '#FewUnderstand', '#DiamondHands #Mindset'],
  delegate: ['#Diplomacy #Leadership', '#PointOfOrder', '#Summit #Grateful', '#DiplomaticIncident', '#InternationalRelations #Buffet', '#Resolution #Teamwork'],
  institution: ['#Statement', '#DeeplyConcerned', '#Stakeholders #Process', '#PressRelease', '#Governance #Impact', '#DiplomaticIncident'],
};

/** Crypto Bros (08): the market floor's cast, and where the floor lives. */
const CRYPTO = bundle.markets.find((m) => m.id === 'market.crypto');
const BRO_SYMBOLS = CRYPTO ? Object.keys(CRYPTO.cast).sort() : [];
/** The single-file build has no second page: send players to the site. */
export const CRYPTO_URL = import.meta.env?.VITE_INLINE === '1' ? 'https://careercrash.org/cryptobro/' : '/cryptobro/';

/** Diplomatic Incident (09): the countries floor's delegates, and where it lives. */
const COUNTRIES = bundle.markets.find((m) => m.source === 'likes');
const DEL_KEYS = COUNTRIES ? Object.keys(COUNTRIES.cast).sort() : [];
export const INCIDENT_URL = import.meta.env?.VITE_INLINE === '1' ? 'https://careercrash.org/incident/' : '/incident/';
const UK_NATIONS: Record<string, string> = { ENG: 'England', SCO: 'Scotland', WAL: 'Wales' };
/** A country's name (English: the feed is in English). */
function countryName(key: string): string {
  if (UK_NATIONS[key]) return UK_NATIONS[key]!;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(key) ?? key;
  } catch {
    return key;
  }
}

/** Diplomatic Incident (09 §7.2): the institutions that barge into the Summit Hall, and the fights that bring each to mind. */
const INSTITUTIONS = COUNTRIES?.institutions?.list.filter((i) => !i.off).flatMap((i) => bundle.crashers.find((c) => c.id === i.set) ?? []) ?? [];
const INST_LEAN: Record<string, { win?: number; loss?: number; draw?: number; kos?: number; flawless?: number }> = {
  'crasher.un': { kos: 3, draw: 2 },
  'crasher.icc': { kos: 4 },
  'crasher.nato': { win: 1, draw: 1 },
  'crasher.big-tech': { win: 2 },
  'crasher.raters': { win: 2, flawless: 3 },
  'crasher.federation': { win: 2 },
  'crasher.lenders': { loss: 3 },
  'crasher.health': { loss: 2, kos: 1 },
  'crasher.big-oil': { kos: 1 },
  'crasher.brussels': { draw: 2 },
};

/** A made-up but stable look for an institution member until their art exists. */
function instWho(name: string, career: string, persona: string): NonNullable<FeedPost['who']> {
  const r = Rng.fromSeed(`inst-look:${name}`);
  return { careers: [career], appearance: { skin: SKINS[r.int(SKINS.length)]!, hair: HAIRS[r.int(HAIRS.length)]!, hairStyle: r.int(6) }, persona };
}

/** A delegate as a feed author: name, job line and their own portrait. */
function delegateSpeaker(key: string): Pick<FeedPost, 'author' | 'sub' | 'who'> | null {
  const m = COUNTRIES?.cast[key];
  if (!COUNTRIES || !m) return null;
  const f = marketFighter(bundle, COUNTRIES, { symbol: key, changeBp: 0, capRank: 1, score: 0, pumping: false, dumping: false, leveraged: false });
  return { author: m.name, sub: `${nameOf(m.persona)} · Diplomatic Incident`, who: { careers: [m.career], appearance: f.appearance, persona: m.persona } };
}

/** A bro as a feed author: name, job line and portrait (their own art once it's painted). */
function broSpeaker(sym: string): Pick<FeedPost, 'author' | 'sub' | 'who'> | null {
  const m = CRYPTO?.cast[sym];
  if (!CRYPTO || !m) return null;
  // The same face as on the floor: build the fighter at a neutral score.
  const f = marketFighter(bundle, CRYPTO, { symbol: sym, changeBp: 0, capRank: 1, score: 0, pumping: false, dumping: false, leveraged: false });
  return { author: m.name, sub: `${nameOf(m.persona)} · $${sym} · Not financial advice`, who: { careers: [m.career], appearance: f.appearance, persona: m.persona } };
}

function fill(text: string, slots: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(slots[k] ?? k)).replace(/\b([Aa]) ([aeiouAEIOU])/g, '$1n $2');
}

function persona(rng: Rng): Pick<FeedPost, 'author' | 'sub' | 'who'> {
  const [author, sub] = PERSONAS[rng.int(PERSONAS.length)]!;
  const careers = bundle.careers.filter((c) => !c.deprecated && !c.boss);
  return { author, sub, who: { careers: [careers[rng.int(careers.length)]!.id], appearance: { skin: SKINS[rng.int(SKINS.length)]!, hair: HAIRS[rng.int(HAIRS.length)]!, hairStyle: rng.int(6) } } };
}

/** Posts written after a fight, newest first. `s` is the save after the fight was applied. */
export function fightPosts(s: CareerSave, r: FightSummary): FeedPost[] {
  const fightNo = (s.feed?.find((p) => p.fight > 0)?.fight ?? 0) + 1;
  const rng = Rng.fromSeed(`feed:${s.seed}:${fightNo}:${r.stage}:${r.outcome}`);
  const pick = <T>(a: T[]): T => a[rng.int(a.length)]!;
  const chance = (p: number) => rng.int(1000) < p * 1000;
  const lines = (key: string) => bundle.live[key] ?? [];
  const info = stageInfo(bundle, r.stage);
  const m = mainChar(s);
  const board = r.board ?? [];
  const mine = board.filter((b) => b.team === 0);
  const meRow = mine.find((b) => b.name === m.c.name);
  const others = mine.filter((b) => b !== meRow);
  const star = [...others].sort((a, b) => b.dealt - a.dealt)[0];
  const usedItems = (meRow?.used ?? []).concat(...others.map((o) => o.used));
  const slots: Record<string, string | number> = {
    me: m.c.name,
    company: info.company,
    kos: mine.reduce((n, b) => n + b.kos, 0),
    star: star?.name ?? 'the team',
    stardealt: star?.dealt ?? 0,
    mvp: board.find((b) => b.mvp)?.name ?? m.c.name,
    dealt: meRow?.dealt ?? 0,
    taken: meRow?.taken ?? 0,
    stage: r.stage + 1,
    arena: nameOf(info.arenaId).toLowerCase(),
    next: stageInfo(bundle, s.stage).company,
    cash: r.cash,
    career: nameOf(currentCareer(m)),
    fights: fightNo,
    boss: info.bossName ?? info.company,
    bossjob: info.bossCareer ? nameOf(info.bossCareer) : 'boss',
  };
  const out: FeedPost[] = [];
  let n = 0;
  const cast = board.filter((b) => b.team !== 0).map((b) => ({ name: b.name, career: b.career, appearance: b.appearance }));
  const add = (p: Omit<FeedPost, 'id' | 'fight' | 'reacts' | 'comments' | 'text'> & { reacts?: number; comments?: number; mood?: Mood }, key: string, extra: Record<string, string | number> = {}, own?: string[]) => {
    const list = own ?? lines(key);
    if (!list.length) return;
    const mood = p.mood ?? MOOD_OF[key] ?? 'network';
    out.push({ reacts: 10 + rng.int(300), comments: rng.int(45), ...p, id: `${fightNo}-${n++}`, fight: fightNo, text: fill(pick(list), { ...slots, ...extra }), mood, cast, company: info.company });
  };
  const meWho = { careers: [currentCareer(m)], appearance: m.c.appearance };
  const headline = (id: string) => {
    const cc = s.chars[id];
    if (!cc) return 'Agency temp · #OpenToWork';
    const cid = currentCareer(cc);
    return `${RANKS[careerRank(cc, cid) - 1]} ${nameOf(cid)} at ${companyName(s)}`;
  };
  const tagsFor = r.outcome === 'win' ? TAGS.win! : r.outcome === 'loss' ? TAGS.loss! : TAGS.draw!;

  // 1. Your own post about the fight.
  const kos = Number(slots.kos);
  const flawless = r.outcome === 'win' && mine.every((b) => b.downs === 0);
  let mineKey = r.outcome === 'win' ? 'feed_win' : r.outcome === 'loss' ? 'feed_loss' : 'feed_draw';
  if (info.boss && r.outcome !== 'draw' && chance(0.6)) mineKey = r.outcome === 'win' ? 'feed_boss_win' : 'feed_boss_loss';
  else if (r.outcome === 'win') {
    if (flawless && chance(0.35)) mineKey = 'feed_flawless';
    else if (kos >= 3 && chance(0.4)) mineKey = 'feed_win_big';
    else if (meRow?.mvp && chance(0.45)) mineKey = 'feed_mvp_me';
  }
  add({ by: 'me', author: m.c.name, sub: headline(m.c.id), who: meWho, tags: pick(tagsFor), reacts: 40 + rng.int(400), comments: 3 + rng.int(60) }, (mineKey));

  // 1b. Epic and Legendary perks get the full humblebrag (plus one about the borrowed move, if any).
  const perk = r.loot?.item;
  if (perk && (perk.rarity === 'epic' || perk.rarity === 'legendary')) {
    const extra = {
      perk: lootName(perk),
      rarity: RARITY_NAMES[perk.rarity],
      stats: lootStatsText(perk),
      ability: perk.ability ? nameOf(perk.ability) : '',
      abilitycareer: perk.ability ? nameOf(grantableAbilities(bundle).get(perk.ability)) : '',
      company_me: companyName(s),
    };
    const legendary = perk.rarity === 'legendary';
    const post = { by: 'me' as const, author: m.c.name, sub: headline(m.c.id), who: meWho, tags: legendary ? '#Legendary #BenefitsInKind #Humbled' : '#Perks #Grateful', reacts: (legendary ? 900 : 300) + rng.int(legendary ? 4000 : 900), comments: (legendary ? 60 : 20) + rng.int(120) };
    add(post, legendary ? 'feed_perk_legendary' : 'feed_perk_epic', extra);
    if (perk.ability) add({ ...post, tags: '#CareerPivot #TransferableSkills', reacts: 120 + rng.int(600), comments: 8 + rng.int(40) }, 'feed_perk_ability', extra);
  }

  // 2. Promotions, level-ups and new traits.
  for (const g of r.growth) {
    const cc = s.chars[g.id];
    if (!cc) continue;
    const who = { careers: [currentCareer(cc)], appearance: cc.c.appearance };
    const extra = { rank: RANKS[g.rankAfter - 1] ?? '', career: nameOf(g.career), level: cc.c.level };
    if (g.rankAfter > g.rankBefore) add({ by: cc.c.id === m.c.id ? 'me' : 'staff', author: cc.c.name, sub: headline(cc.c.id), who, tags: pick(TAGS.news!), reacts: 80 + rng.int(500), comments: 10 + rng.int(80) }, 'feed_rankup', extra);
    else if (g.levelsGained > 0 && chance(0.7)) add({ by: cc.c.id === m.c.id ? 'me' : 'staff', author: cc.c.name, sub: headline(cc.c.id), who }, 'feed_levelup', extra);
    for (const tr of g.newTraits) add({ by: cc.c.id === m.c.id ? 'me' : 'staff', author: cc.c.name, sub: headline(cc.c.id), who }, 'feed_trait', { ...extra, trait: nameOf(tr) });
  }

  // 3. Teammates and agency temps.
  for (const o of others) {
    const hired = Object.values(s.chars).find((c) => c.c.name === o.name);
    const who = { careers: [o.career], appearance: o.appearance };
    const extra = { selfdealt: o.dealt };
    if (hired) {
      if (chance(r.outcome === 'win' ? 0.6 : 0.5)) add({ by: 'staff', author: o.name, sub: headline(hired.c.id), who }, (r.outcome === 'win' ? 'feed_star' : 'feed_teammate_loss'), extra);
    } else if (chance(0.45)) add({ by: 'temp', author: o.name, sub: `${nameOf(o.career)} · Agency temp · #OpenToWork`, who }, (r.outcome === 'win' ? 'feed_temp_win' : 'feed_temp_loss'), extra);
  }

  // 4. The company you fought.
  const companyKey = r.outcome === 'win' ? 'feed_beaten' : r.outcome === 'loss' ? 'feed_gloat' : chance(0.5) ? 'feed_beaten' : 'feed_gloat';
  add({ by: 'company', author: info.company, sub: `${nameOf(info.arenaId)} · ${300 + rng.int(9000)} followers`, icon: info.company[0], tags: chance(0.5) ? pick(TAGS.company!) : undefined }, (companyKey));

  // 4b. Critters: bragging about ours, complaining about theirs, owning up to running from one.
  const sm = r.summons;
  if (sm) {
    const critter = (id: string) => nameOf(id).toLowerCase();
    const brag = sm.mine[0];
    if (brag && chance(0.75)) {
      const cc = Object.values(s.chars).find((c) => c.c.name === brag.by);
      add({ by: cc?.c.id === m.c.id ? 'me' : 'staff', author: brag.by, sub: cc ? headline(cc.c.id) : 'Agency temp · #OpenToWork', who: cc ? { careers: [currentCareer(cc)], appearance: cc.c.appearance } : undefined, tags: '#Delegation #TeamPlayer' }, 'feed_summon_brag', { critter: critter(brag.summon) });
    }
    if (sm.theirs.length && chance(0.5)) add({ by: 'me', author: m.c.name, sub: headline(m.c.id), who: meWho }, 'feed_summon_complain', { critter: critter(pick(sm.theirs)) });
    const sp = sm.spooked[0];
    if (sp && chance(0.8)) {
      const cc = Object.values(s.chars).find((c) => c.c.name === sp.name);
      if (cc) add({ by: cc.c.id === m.c.id ? 'me' : 'staff', author: cc.c.name, sub: headline(cc.c.id), who: { careers: [currentCareer(cc)], appearance: cc.c.appearance }, tags: '#Vulnerability #MentalHealthMatters' }, 'feed_spooked', { critter: critter(sp.summon) });
    }
  }

  // 4c. Gatecrashers (07): the leader's take on it, and usually yours.
  const cr = r.crash;
  const set = cr && bundle.crashers.find((c) => c.id === cr.set);
  if (cr && set && cr.members[0]) {
    const lead = cr.members[0];
    const crew = cr.members.map((x) => ({ name: x.name, career: x.career, persona: x.persona, ...(x.art ? { art: x.art } : {}), appearance: x.appearance }));
    const extra = { leader: lead.name, title: nameOf(lead.persona), floored: cr.floored };
    add({ by: 'crasher', author: lead.name, sub: `${nameOf(lead.persona)} · ${nameOf(set.id)}`, who: { careers: [lead.career], appearance: lead.appearance, persona: lead.persona }, crash: set.id, crew, mood: 'crash', reacts: 300 + rng.int(3000), comments: 20 + rng.int(150) }, 'crash_post', extra, set.posts);
    if (chance(0.7)) add({ by: 'me', author: m.c.name, sub: headline(m.c.id), who: meWho, crash: set.id, crew, tags: '#Gatecrashed', reacts: 100 + rng.int(900), comments: 10 + rng.int(80) }, 'feed_crashed', extra);
  }

  // 5. Strangers with opinions, and the odd item testimonial.
  add({ by: 'stranger', ...persona(rng) }, (r.outcome === 'loss' ? 'feed_network_loss' : r.outcome === 'win' ? 'feed_network_win' : 'feed_network'));
  if (chance(0.6)) add({ by: 'stranger', ...persona(rng), tags: chance(0.3) ? '#ThoughtLeadership' : undefined }, 'feed_network');
  if (usedItems.length && chance(0.5)) add({ by: 'me', author: m.c.name, sub: headline(m.c.id), who: meWho }, 'feed_item', { item: nameOf(pick(usedItems)).toLowerCase() });

  // 6. The fight photo: one close-up of the best moment, always at the top.
  const ph = r.photo;
  let photo: FeedPost | undefined;
  if (ph) {
    // A final blow with nobody to credit (a machine, a hazard) is just an ouch.
    const kind = ph.kind === 'ko' || ph.kind === 'crit' ? 'hit' : ph.kind === 'hurt' || (ph.kind === 'finisher' && !ph.withName) ? 'ouch' : ph.kind;
    const tags: Record<typeof kind, string> = {
      air: '#Airtime #NewHeights',
      move: '#SkillsShowcase',
      ouch: '#Resilience #Candid',
      spooked: '#Wildlife #Unfiltered',
      hit: '#Impact #Results',
      finisher: '#FinalNotice #Closure',
      critter: '#BringYourPetToWork #Wildlife',
    };
    const before = out.length;
    // {by}: whoever landed the blow, or the critter's owner; {other}: the second person in the shot; {critter}: the animal.
    const extra = { name: ph.name, by: ph.withName || 'someone', other: ph.withName || 'someone', critter: ph.critter ? nameOf(ph.critter).toLowerCase() : 'small animal', what: ph.what ?? '' };
    // Say what they were hit with, most of the time: "{name} has been formally introduced to {what}".
    const withWhat = ph.what && ph.whatKind && ph.withName && (kind === 'finisher' || kind === 'ouch') && chance(0.75) ? `_${ph.whatKind}` : '';
    add({ by: 'me', author: m.c.name, sub: headline(m.c.id), who: meWho, photo: true, tags: tags[kind], reacts: 200 + rng.int(1500), comments: 10 + rng.int(90) }, `feed_photo_${kind}${withWhat}_${ph.team === 0 ? 'us' : 'them'}`, extra);
    if (out.length > before) photo = out.pop();
  }

  // The photo and your post lead, then any perk brag; the rest are shuffled like a real timeline.
  const [first, ...later] = out;
  const perks = later.filter((p) => p.mood === 'perk');
  const rest = later.filter((p) => p.mood !== 'perk');
  for (let i = rest.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  const posts = [...(photo ? [photo] : []), ...(first ? [first] : []), ...perks, ...rest];

  // 7. A crypto bro (08) slides in, 2nd or 3rd: an "opportunity", a flex, some wisdom, or your fight.
  const sym = BRO_SYMBOLS.length ? pick(BRO_SYMBOLS) : '';
  const bro = sym ? broSpeaker(sym) : null;
  if (bro) {
    const about = r.outcome === 'win' ? 'bro_post_about_win' : r.outcome === 'loss' ? 'bro_post_about_loss' : '';
    const kinds = ['bro_post_opportunity', 'bro_post_opportunity', 'bro_post_flex', 'bro_post_flex', 'bro_post_wisdom', ...(about ? [about] : [])];
    const key = pick(kinds);
    const list = lines(key);
    if (list.length) {
      const blurbs = lines('bro_link');
      posts.splice(Math.min(posts.length, 1 + rng.int(2)), 0, {
        id: `${fightNo}-bro`,
        fight: fightNo,
        ...bro,
        by: 'bro',
        bro: sym,
        mood: 'bro',
        text: fill(pick(list), { ...slots, sym, name: bro.author }),
        tags: pick(TAGS.bro!),
        reacts: 400 + rng.int(6000),
        comments: 15 + rng.int(200),
        cast,
        company: info.company,
        link: { href: CRYPTO_URL, title: 'Crypto Bros · careercrash.org/cryptobro', blurb: blurbs.length ? pick(blurbs) : 'Watch the bros brawl live' },
      });
    }
  }

  // 8. A country's delegate (09) posts from the Summit Hall: always the first time, then about every other fight.
  const firstTime = !(s.feed ?? []).some((p) => p.by === 'delegate');
  const key = DEL_KEYS.length && (firstTime || chance(0.5)) ? pick(DEL_KEYS) : '';
  const del = key ? delegateSpeaker(key) : null;
  if (del) {
    const about = r.outcome === 'win' ? 'incident_post_about_win' : r.outcome === 'loss' ? 'incident_post_about_loss' : '';
    const kinds = firstTime ? ['incident_post_invite'] : ['incident_post_invite', 'incident_post_invite', 'incident_post_flex', 'incident_post_flex', ...(about ? [about] : [])];
    const list = lines(pick(kinds));
    if (list.length) {
      const blurbs = lines('incident_link');
      const bro = posts.findIndex((p) => p.by === 'bro');
      posts.splice(Math.min(posts.length, (bro >= 0 ? bro + 1 : 1) + (firstTime ? 0 : rng.int(2))), 0, {
        id: `${fightNo}-del`,
        fight: fightNo,
        ...del,
        by: 'delegate',
        del: key,
        mood: 'delegate',
        text: fill(pick(list), { ...slots, country: countryName(key), name: del.author }),
        tags: pick(TAGS.delegate!),
        reacts: 300 + rng.int(5000),
        comments: 12 + rng.int(150),
        cast,
        company: info.company,
        link: { href: `${INCIDENT_URL}?c=${key.toLowerCase()}`, title: `Diplomatic Incident · ${countryName(key)} needs you`, blurb: blurbs.length ? pick(blurbs) : 'Forty countries brawl live' },
      });
    }
  }

  // 9. An institution (09 §7.2) has a statement about your fight: the first time from the second fight on, then about one fight in three.
  // Which one depends on the fight: the ICC and the UN after a lot of knockouts, the Lenders after a loss, the Raters after a flawless win.
  const firstInst = !(s.feed ?? []).some((p) => p.mood === 'institution');
  if (INSTITUTIONS.length && fightNo >= 2 && (firstInst || chance(0.3))) {
    const many = Number(slots.kos) >= 3;
    const weights = INSTITUTIONS.map((c) => {
      const l = INST_LEAN[c.id] ?? {};
      return 1 + (l[r.outcome] ?? 0) + (many ? (l.kos ?? 0) : 0) + (flawless ? (l.flawless ?? 0) : 0);
    });
    let roll = rng.int(weights.reduce((a, b) => a + b, 0));
    const set = INSTITUTIONS[weights.findIndex((w) => (roll -= w) < 0)] ?? INSTITUTIONS[0]!;
    const own = lines(`feed_inst_${set.id.replace('crasher.', '')}`);
    const list = [...own, ...own, ...set.posts];
    if (list.length) {
      const lead = set.leader;
      const crew = [lead.name, ...set.henchmen.names].map((name, i) => {
        const mm = i === 0 ? lead : set.henchmen;
        const who = instWho(name, mm.career, mm.persona);
        return { name, career: mm.career, persona: mm.persona, appearance: who.appearance };
      });
      const blurbs = lines('incident_inst_link');
      const del = posts.findIndex((p) => p.by === 'delegate');
      posts.splice(Math.min(posts.length, (del >= 0 ? del + 1 : 1) + rng.int(2)), 0, {
        id: `${fightNo}-inst`,
        fight: fightNo,
        by: 'crasher',
        author: lead.name,
        sub: `${nameOf(lead.persona)} · ${nameOf(set.id)}`,
        who: instWho(lead.name, lead.career, lead.persona),
        crash: set.id,
        crew,
        mood: 'institution',
        text: fill(pick(list), { ...slots, arena: 'Summit Hall' }),
        tags: pick(TAGS.institution!),
        reacts: 500 + rng.int(8000),
        comments: 20 + rng.int(300),
        cast,
        company: info.company,
        link: { href: INCIDENT_URL, title: `Diplomatic Incident · ${nameOf(set.id)} dropped by`, blurb: blurbs.length ? pick(blurbs) : 'Watch the institutions barge in', art: `${lead.art.icon}🏛️` },
      });
    }
  }
  return posts;
}

/** A few posts to fill the feed before the first fight. */
export function starterPosts(s: CareerSave): FeedPost[] {
  const m = mainChar(s);
  const rng = Rng.fromSeed(`feed-start:${s.seed}`);
  const network = bundle.live.feed_network ?? [];
  const slots = { arena: nameOf(stageInfo(bundle, 0).arenaId).toLowerCase(), career: nameOf(currentCareer(m)) };
  const posts: FeedPost[] = [
    {
      id: 'start-0',
      fight: 0,
      author: m.c.name,
      sub: `Trainee ${nameOf(currentCareer(m))} at ${companyName(s)}`,
      who: { careers: [currentCareer(m)], appearance: m.c.appearance },
      text: `🎉 I'm excited to announce I'm starting a new position as Trainee ${nameOf(currentCareer(m))} at ${companyName(s)}! First fight: ${stageInfo(bundle, 0).company}. Wish me luck (and a meal deal).`,
      tags: '#NewBeginnings #OpenToBrawls',
      mood: 'news',
      by: 'me',
      reacts: 30 + rng.int(80),
      comments: 4 + rng.int(12),
    },
  ];
  for (let i = 0; i < 4 && network.length; i++) posts.push({ id: `start-${i + 1}`, fight: 0, mood: 'network', by: 'stranger', ...persona(rng), text: fill(network[rng.int(network.length)]!, slots), reacts: 5 + rng.int(200), comments: rng.int(30) });
  return posts;
}

/** Sponsored posts slotted into the timeline live: the next company hiring, and the shop. */
export function promotedPosts(s: CareerSave): FeedPost[] {
  const rng = Rng.fromSeed(`feed-promo:${s.seed}:${s.stage}:${s.wins + s.losses}`);
  const info = stageInfo(bundle, s.stage);
  const m = mainChar(s);
  const pick = (key: string) => {
    const l = bundle.live[key] ?? [''];
    return fill(l[rng.int(l.length)]!, { me: m.c.name, next: info.company, arena: nameOf(info.arenaId).toLowerCase() });
  };
  const out: FeedPost[] = [{ id: `promo-hiring-${s.stage}`, fight: -1, mood: 'company', by: 'company', company: info.company, author: info.company, sub: `${nameOf(info.arenaId)} · ${200 + rng.int(9000)} followers`, icon: info.company[0], text: pick('feed_hiring'), promoted: true, reacts: 5 + rng.int(60), comments: rng.int(8) }];
  out.push({ id: `promo-shop-${s.stage}`, fight: -1, mood: 'company', by: 'company', author: 'Corner Shop', sub: 'Retail · Open till late', icon: '🛒', text: pick('feed_shop'), promoted: true, reacts: 3 + rng.int(30), comments: 0 });
  return out;
}

// ---------------------------------------------------------------------------
// Reactions and comment threads
// ---------------------------------------------------------------------------
export interface FeedComment {
  author: string;
  sub: string;
  who?: FeedPost['who'];
  icon?: string;
  text: string;
  likes: number;
  /** A reply from the post's author. */
  reply?: boolean;
  /** Written by the player. */
  mine?: boolean;
}

export interface Discussion {
  /** Most common reactions first. */
  reactions: [ReactionKind, number][];
  total: number;
  reactedBy: string;
  comments: FeedComment[];
  commentCount: number;
}

const REACT_WEIGHTS: Record<Mood, Partial<Record<ReactionKind, number>>> = {
  win: { like: 5, celebrate: 5, love: 2, funny: 1 },
  loss: { support: 6, like: 3, love: 1, funny: 1 },
  draw: { like: 4, support: 2, funny: 2 },
  news: { celebrate: 7, like: 3, love: 2 },
  beaten: { funny: 5, like: 2, support: 1 },
  gloat: { like: 3, funny: 2, celebrate: 2 },
  network: { like: 4, insightful: 5, funny: 1 },
  company: { like: 4, funny: 2, insightful: 1 },
  temp: { like: 4, support: 2, celebrate: 1 },
  perk: { celebrate: 6, love: 3, funny: 3, insightful: 1 },
  crash: { funny: 7, like: 2, insightful: 1, support: 1 },
  bro: { insightful: 5, funny: 6, like: 2, celebrate: 1 },
  delegate: { funny: 6, like: 4, celebrate: 2, insightful: 1 },
  institution: { funny: 7, insightful: 3, like: 2, support: 1 },
};

type Speaker = Pick<FeedComment, 'author' | 'sub' | 'who' | 'icon'>;

/**
 * Who reacted and what they said under a post. Generated on demand from the
 * post id (the same post always has the same thread), so saves stay small;
 * the player's own reaction and comments come from `p.mine`.
 */
export function discussion(p: FeedPost, s: CareerSave): Discussion {
  const rng = Rng.fromSeed(`talk:${s.seed}:${p.id}`);
  const pick = <T>(a: T[]): T => a[rng.int(a.length)]!;
  const mood = p.mood ?? 'network';
  const m = mainChar(s);

  // Reactions: split the count by what suits the post, plus the player's own.
  const w = REACT_WEIGHTS[mood];
  const kinds = Object.keys(w) as ReactionKind[];
  const sum = kinds.reduce((n, k) => n + w[k]!, 0);
  const counts = new Map<ReactionKind, number>();
  for (const k of kinds) counts.set(k, Math.round((p.reacts * w[k]! * (0.6 + rng.int(80) / 100)) / sum));
  if (p.mine?.react) counts.set(p.mine.react, (counts.get(p.mine.react) ?? 0) + 1);
  const reactions = [...counts].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const total = reactions.reduce((n, [, c]) => n + c, 0);

  // The people who might chip in.
  const person = (cc: (typeof s.chars)[string]): Speaker => {
    const cid = currentCareer(cc);
    return { author: cc.c.name, sub: `${RANKS[careerRank(cc, cid) - 1]} ${nameOf(cid)}`, who: { careers: [cid], appearance: cc.c.appearance } };
  };
  const me = person(m);
  const staff = Object.values(s.chars)
    .filter((c) => c.c.name !== p.author && c.c.id !== m.c.id)
    .map(person);
  const rivals: Speaker[] = (p.cast ?? []).filter((x) => x.name !== p.author).map((x) => ({ author: x.name, sub: `${nameOf(x.career)} at ${p.company ?? 'a rival firm'}`, who: { careers: [x.career], appearance: x.appearance } }));
  const stranger = (): Speaker => persona(rng);
  const reactedBy = p.mine?.react ? 'You' : (staff.length && rng.int(2) ? pick(staff).author : stranger().author);

  const first = shortName(bundle, p.author);
  const slots = { first, author: p.author, company: p.company ?? 'them', me: m.c.name, arena: 'arena', sym: p.bro ?? 'BTC' };
  // Gatecrashers' own lines: what the henchmen say under the post.
  const crashSet = p.crash ? bundle.crashers.find((c) => c.id === p.crash) : undefined;
  const say = (key: string, extra: Record<string, string> = {}) => {
    const l = (key === 'crash_crew' ? crashSet?.comments : undefined) ?? bundle.live[key] ?? bundle.live.feed_c_generic ?? ['Nice.'];
    return fill(l[rng.int(l.length)]!, { ...slots, ...extra });
  };
  const own = p.by === 'me';
  // [speaker source, template] options by what the post is about.
  const opts: [() => Speaker | null, string][] = [];
  const fromStaff = () => (staff.length ? pick(staff) : null);
  const fromRivals = () => (rivals.length ? pick(rivals) : null);
  const meIfNotAuthor = () => (own ? null : me);
  const crew: Speaker[] = (p.crew ?? []).filter((x) => x.name !== p.author).map((x) => ({ author: x.name, sub: `${nameOf(x.persona)} · ${crashSet ? nameOf(crashSet.id) : 'Gatecrasher'}`, who: { careers: [x.career], appearance: x.appearance, persona: x.persona, ...(x.art ? { art: x.art } : {}) } }));
  const fromCrew = () => (crew.length ? pick(crew) : null);
  // Crypto Bros (08): the other bros pile in under each other's posts.
  const bros: Speaker[] = p.bro ? BRO_SYMBOLS.filter((x) => x !== p.bro).flatMap((x) => broSpeaker(x) ?? []) : [];
  const fromBros = () => (bros.length ? pick(bros) : null);
  // Diplomatic Incident (09): other delegates object under each other's posts.
  const dels: Speaker[] = p.del ? DEL_KEYS.filter((x) => x !== p.del).flatMap((x) => delegateSpeaker(x) ?? []) : [];
  const fromDels = () => (dels.length ? pick(dels) : null);
  switch (mood) {
    case 'institution': {
      // Their own people defend them, delegates object, everyone else has seen this before.
      const delegates = () => (DEL_KEYS.length ? delegateSpeaker(DEL_KEYS[rng.int(DEL_KEYS.length)]!) : null);
      opts.push([fromCrew, 'crash_crew'], [fromCrew, 'crash_crew'], [delegates, 'feed_c_inst_del'], [delegates, 'feed_c_inst_del'], [meIfNotAuthor, 'feed_c_inst_me'], [stranger, 'feed_c_inst'], [stranger, 'feed_c_inst'], [stranger, 'feed_c_inst']);
      break;
    }
    case 'delegate':
      opts.push([fromDels, 'feed_c_del_rival'], [fromDels, 'feed_c_del_rival'], [meIfNotAuthor, 'feed_c_del_me'], [fromStaff, 'feed_c_del'], [stranger, 'feed_c_del'], [stranger, 'feed_c_del'], [stranger, 'feed_c_del']);
      break;
    case 'bro':
      opts.push([fromBros, 'feed_c_bro_rival'], [fromBros, 'feed_c_bro_rival'], [meIfNotAuthor, 'feed_c_bro_me'], [fromStaff, 'feed_c_bro'], [stranger, 'feed_c_bro'], [stranger, 'feed_c_bro'], [stranger, 'feed_c_bro']);
      break;
    case 'crash':
      // The henchmen pile in under their leader's post; on yours, they still turn up.
      if (p.by === 'crasher') opts.push([fromCrew, 'crash_crew'], [fromCrew, 'crash_crew'], [meIfNotAuthor, 'feed_c_crash_me'], [fromStaff, 'feed_c_crash'], [stranger, 'feed_c_crash'], [stranger, 'feed_c_crash']);
      else opts.push([fromCrew, 'crash_crew'], [fromStaff, 'feed_c_crash_about'], [stranger, 'feed_c_crash_about'], [stranger, 'feed_c_crash_about'], [stranger, 'feed_c_generic']);
      break;
    case 'win':
      opts.push([fromStaff, own ? 'feed_c_teammate' : 'feed_c_congrats'], [meIfNotAuthor, 'feed_c_congrats'], [fromRivals, 'feed_c_rival_win'], [fromRivals, 'feed_c_rival_win'], [stranger, 'feed_c_congrats'], [stranger, 'feed_c_congrats'], [stranger, 'feed_c_recruiter'], [stranger, 'feed_c_generic']);
      break;
    case 'loss':
      opts.push([fromStaff, 'feed_c_teammate_loss'], [meIfNotAuthor, 'feed_c_teammate_loss'], [fromRivals, 'feed_c_rival_loss'], [fromRivals, 'feed_c_rival_loss'], [stranger, 'feed_c_support'], [stranger, 'feed_c_support'], [stranger, 'feed_c_recruiter']);
      break;
    case 'draw':
      opts.push([fromStaff, 'feed_c_teammate_loss'], [fromRivals, 'feed_c_rival_win'], [stranger, 'feed_c_support'], [stranger, 'feed_c_generic']);
      break;
    case 'news':
      opts.push([fromStaff, 'feed_c_news'], [meIfNotAuthor, 'feed_c_news'], [stranger, 'feed_c_news'], [stranger, 'feed_c_news'], [stranger, 'feed_c_recruiter']);
      break;
    case 'beaten':
      opts.push([() => me, 'feed_c_beaten'], [fromStaff, 'feed_c_beaten'], [stranger, 'feed_c_beaten'], [stranger, 'feed_c_generic']);
      break;
    case 'gloat':
      opts.push([() => me, 'feed_c_gloat'], [fromStaff, 'feed_c_gloat'], [stranger, 'feed_c_generic'], [stranger, 'feed_c_company']);
      break;
    case 'company':
      opts.push([fromStaff, 'feed_c_company'], [stranger, 'feed_c_company'], [stranger, 'feed_c_company']);
      break;
    case 'temp':
      opts.push([fromStaff, 'feed_c_temp'], [stranger, 'feed_c_temp'], [stranger, 'feed_c_generic']);
      break;
    case 'perk':
      opts.push([fromStaff, 'feed_c_perk'], [fromRivals, 'feed_c_perk'], [stranger, 'feed_c_perk'], [stranger, 'feed_c_perk'], [stranger, 'feed_c_perk_hr'], [stranger, 'feed_c_perk_hr'], [stranger, 'feed_c_recruiter']);
      break;
    default:
      opts.push([fromStaff, 'feed_c_generic'], [meIfNotAuthor, 'feed_c_generic'], [stranger, 'feed_c_generic'], [stranger, 'feed_c_generic']);
  }
  const author: Speaker = { author: p.author, sub: p.sub, who: p.who, icon: p.icon };
  const comments: FeedComment[] = [];
  const want = Math.min(Math.max(1, p.comments), 1 + rng.int(3) + (p.comments > 20 ? 1 : 0));
  const seen = new Set([p.author]);
  for (let tries = 0; comments.filter((c) => !c.reply).length < want && tries < 20; tries++) {
    const [src, key] = pick(opts);
    const who = src();
    if (!who || seen.has(who.author)) continue;
    seen.add(who.author);
    comments.push({ ...who, text: say(key), likes: rng.int(40) });
    if (rng.int(10) < 4) comments.push({ ...author, text: say(mood === 'bro' ? 'feed_c_bro_reply' : mood === 'delegate' ? 'feed_c_del_reply' : mood === 'institution' ? 'feed_c_inst_reply' : 'feed_c_reply', { commenter: shortName(bundle, who.author) }), likes: rng.int(12), reply: true });
  }
  // The player's own comments, each answered by the author (or a passer-by on your own posts).
  (p.mine?.said ?? []).forEach((text, i) => {
    comments.push({ ...me, text, likes: 0, mine: true });
    const r = Rng.fromSeed(`reply:${p.id}:${i}`);
    const l = bundle.live.feed_c_reply ?? ['Thanks!'];
    if (!own) comments.push({ ...author, text: fill(l[r.int(l.length)]!, { commenter: first === shortName(bundle, m.c.name) ? 'you' : shortName(bundle, m.c.name) }), likes: r.int(5), reply: true });
    else {
      const g = bundle.live.feed_c_generic ?? ['Agree.'];
      comments.push({ ...persona(r), text: g[r.int(g.length)]!, likes: r.int(5) });
    }
  });
  return { reactions, total, reactedBy, comments, commentCount: Math.max(p.comments, comments.length) + (p.mine?.said?.length ?? 0) };
}

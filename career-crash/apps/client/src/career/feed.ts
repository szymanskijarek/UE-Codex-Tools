import { bundle } from '@cc/content';
import { careerRank, RANKS, stageInfo } from '@cc/game-rules';
import { Rng } from '@cc/sim';
import { nameOf } from '../i18n';
import { currentCareer, mainChar, type CareerSave, type FightSummary } from './model';

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
  who?: { careers: string[]; appearance: { skin: string; hair: string; hairStyle: number } };
  icon?: string;
  text: string;
  tags?: string;
  promoted?: boolean;
  reacts: number;
  comments: number;
  /** What the post is about — drives who comments and how people react. */
  mood?: Mood;
  /** Who wrote it. */
  by?: 'me' | 'staff' | 'temp' | 'company' | 'stranger';
  /** The people from that fight's other team (they turn up in the comments). */
  cast?: { name: string; career: string; appearance: { skin: string; hair: string; hairStyle: number } }[];
  company?: string;
  /** The player's own reaction and comments on this post. */
  mine?: { react?: ReactionKind; said?: string[] };
}

export type Mood = 'win' | 'loss' | 'draw' | 'news' | 'beaten' | 'gloat' | 'network' | 'company' | 'temp';
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
};

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
  const add = (p: Omit<FeedPost, 'id' | 'fight' | 'reacts' | 'comments' | 'text'> & { reacts?: number; comments?: number }, key: string, extra: Record<string, string | number> = {}) => {
    const list = lines(key);
    if (!list.length) return;
    const mood = MOOD_OF[key] ?? 'network';
    out.push({ reacts: 10 + rng.int(300), comments: rng.int(45), ...p, id: `${fightNo}-${n++}`, fight: fightNo, text: fill(pick(list), { ...slots, ...extra }), mood, cast, company: info.company });
  };
  const meWho = { careers: [currentCareer(m)], appearance: m.c.appearance };
  const headline = (id: string) => {
    const cc = s.chars[id];
    if (!cc) return 'Agency temp · #OpenToWork';
    const cid = currentCareer(cc);
    return `${RANKS[careerRank(cc, cid) - 1]} ${nameOf(cid)} · ${nameOf(cc.c.personality)}`;
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

  // 5. Strangers with opinions, and the odd item testimonial.
  add({ by: 'stranger', ...persona(rng) }, (r.outcome === 'loss' ? 'feed_network_loss' : r.outcome === 'win' ? 'feed_network_win' : 'feed_network'));
  if (chance(0.6)) add({ by: 'stranger', ...persona(rng), tags: chance(0.3) ? '#ThoughtLeadership' : undefined }, 'feed_network');
  if (usedItems.length && chance(0.5)) add({ by: 'me', author: m.c.name, sub: headline(m.c.id), who: meWho }, 'feed_item', { item: nameOf(pick(usedItems)).toLowerCase() });

  // Your post leads; the rest are shuffled like a real timeline.
  const [first, ...rest] = out;
  for (let i = rest.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  return first ? [first, ...rest] : rest;
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
      sub: `Trainee ${nameOf(currentCareer(m))} · ${nameOf(m.c.personality)}`,
      who: { careers: [currentCareer(m)], appearance: m.c.appearance },
      text: `🎉 I'm excited to announce I'm starting a new position as Trainee ${nameOf(currentCareer(m))}! First fight: ${stageInfo(bundle, 0).company}. Wish me luck (and a meal deal).`,
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

  const first = p.author.split(' ')[0]!;
  const slots = { first, author: p.author, company: p.company ?? 'them', me: m.c.name, arena: 'arena' };
  const say = (key: string, extra: Record<string, string> = {}) => {
    const l = bundle.live[key] ?? bundle.live.feed_c_generic ?? ['Nice.'];
    return fill(l[rng.int(l.length)]!, { ...slots, ...extra });
  };
  const own = p.by === 'me';
  // [speaker source, template] options by what the post is about.
  const opts: [() => Speaker | null, string][] = [];
  const fromStaff = () => (staff.length ? pick(staff) : null);
  const fromRivals = () => (rivals.length ? pick(rivals) : null);
  const meIfNotAuthor = () => (own ? null : me);
  switch (mood) {
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
    if (rng.int(10) < 4) comments.push({ ...author, text: say('feed_c_reply', { commenter: who.author.split(' ')[0]! }), likes: rng.int(12), reply: true });
  }
  // The player's own comments, each answered by the author (or a passer-by on your own posts).
  (p.mine?.said ?? []).forEach((text, i) => {
    comments.push({ ...me, text, likes: 0, mine: true });
    const r = Rng.fromSeed(`reply:${p.id}:${i}`);
    const l = bundle.live.feed_c_reply ?? ['Thanks!'];
    if (!own) comments.push({ ...author, text: fill(l[r.int(l.length)]!, { commenter: first === m.c.name.split(' ')[0] ? 'you' : m.c.name.split(' ')[0]! }), likes: r.int(5), reply: true });
    else {
      const g = bundle.live.feed_c_generic ?? ['Agree.'];
      comments.push({ ...persona(r), text: g[r.int(g.length)]!, likes: r.int(5) });
    }
  });
  return { reactions, total, reactedBy, comments, commentCount: Math.max(p.comments, comments.length) + (p.mine?.said?.length ?? 0) };
}

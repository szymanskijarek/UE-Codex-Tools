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
}

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
  const careers = bundle.careers.filter((c) => !c.deprecated);
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
  };
  const out: FeedPost[] = [];
  let n = 0;
  const add = (p: Omit<FeedPost, 'id' | 'fight' | 'reacts' | 'comments' | 'text'> & { reacts?: number; comments?: number }, list: string[], extra: Record<string, string | number> = {}) => {
    if (!list.length) return;
    out.push({ reacts: 10 + rng.int(300), comments: rng.int(45), ...p, id: `${fightNo}-${n++}`, fight: fightNo, text: fill(pick(list), { ...slots, ...extra }) });
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
  add({ author: m.c.name, sub: headline(m.c.id), who: meWho, tags: pick(tagsFor), reacts: 40 + rng.int(400), comments: 3 + rng.int(60) }, lines(mineKey));

  // 2. Promotions, level-ups and new traits.
  for (const g of r.growth) {
    const cc = s.chars[g.id];
    if (!cc) continue;
    const who = { careers: [currentCareer(cc)], appearance: cc.c.appearance };
    const extra = { rank: RANKS[g.rankAfter - 1] ?? '', career: nameOf(g.career), level: cc.c.level };
    if (g.rankAfter > g.rankBefore) add({ author: cc.c.name, sub: headline(cc.c.id), who, tags: pick(TAGS.news!), reacts: 80 + rng.int(500), comments: 10 + rng.int(80) }, lines('feed_rankup'), extra);
    else if (g.levelsGained > 0 && chance(0.7)) add({ author: cc.c.name, sub: headline(cc.c.id), who }, lines('feed_levelup'), extra);
    for (const tr of g.newTraits) add({ author: cc.c.name, sub: headline(cc.c.id), who }, lines('feed_trait'), { ...extra, trait: nameOf(tr) });
  }

  // 3. Teammates and agency temps.
  for (const o of others) {
    const hired = Object.values(s.chars).find((c) => c.c.name === o.name);
    const who = { careers: [o.career], appearance: o.appearance };
    const extra = { selfdealt: o.dealt };
    if (hired) {
      if (chance(r.outcome === 'win' ? 0.6 : 0.5)) add({ author: o.name, sub: headline(hired.c.id), who }, lines(r.outcome === 'win' ? 'feed_star' : 'feed_teammate_loss'), extra);
    } else if (chance(0.45)) add({ author: o.name, sub: `${nameOf(o.career)} · Agency temp · #OpenToWork`, who }, lines(r.outcome === 'win' ? 'feed_temp_win' : 'feed_temp_loss'), extra);
  }

  // 4. The company you fought.
  const companyKey = r.outcome === 'win' ? 'feed_beaten' : r.outcome === 'loss' ? 'feed_gloat' : chance(0.5) ? 'feed_beaten' : 'feed_gloat';
  add({ author: info.company, sub: `${nameOf(info.arenaId)} · ${300 + rng.int(9000)} followers`, icon: info.company[0], tags: chance(0.5) ? pick(TAGS.company!) : undefined }, lines(companyKey));

  // 5. Strangers with opinions, and the odd item testimonial.
  add({ ...persona(rng) }, lines(r.outcome === 'loss' ? 'feed_network_loss' : r.outcome === 'win' ? 'feed_network_win' : 'feed_network'));
  if (chance(0.6)) add({ ...persona(rng), tags: chance(0.3) ? '#ThoughtLeadership' : undefined }, lines('feed_network'));
  if (usedItems.length && chance(0.5)) add({ author: m.c.name, sub: headline(m.c.id), who: meWho }, lines('feed_item'), { item: nameOf(pick(usedItems)).toLowerCase() });

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
      reacts: 30 + rng.int(80),
      comments: 4 + rng.int(12),
    },
  ];
  for (let i = 0; i < 4 && network.length; i++) posts.push({ id: `start-${i + 1}`, fight: 0, ...persona(rng), text: fill(network[rng.int(network.length)]!, slots), reacts: 5 + rng.int(200), comments: rng.int(30) });
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
  const out: FeedPost[] = [{ id: 'promo-hiring', fight: -1, author: info.company, sub: `${nameOf(info.arenaId)} · ${200 + rng.int(9000)} followers`, icon: info.company[0], text: pick('feed_hiring'), promoted: true, reacts: 5 + rng.int(60), comments: rng.int(8) }];
  out.push({ id: 'promo-shop', fight: -1, author: 'Corner Shop', sub: 'Retail · Open till late', icon: '🛒', text: pick('feed_shop'), promoted: true, reacts: 3 + rng.int(30), comments: 0 });
  return out;
}

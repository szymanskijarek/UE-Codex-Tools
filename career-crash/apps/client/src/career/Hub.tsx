import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { careerRank, DIFFICULTIES, difficulty, RANKS, SQUAD_UNLOCK_RANK, stageInfo, STAGES_PER_ARENA, type CareerChar, type DifficultyId } from '@cc/game-rules';
import { Rng } from '@cc/sim';
import { nameOf } from '../i18n';
import { arenaArt } from '../replay/arena-art';
import { currentReplay, navigate } from '../state';
import { Portrait } from '../ui/components';
import { levelProgress, Loadout, RankBar, skillAlert } from './Career';
import { abandon, applicants, currentCareer, lineup, mainChar, nextOpponents, prepareFight, save, squadUnlocked, type CareerSave } from './model';
import { PuppetView } from './PuppetView';

/**
 * The career home, styled after a professional networking site: a profile card
 * (full-body preview on the arena banner), the next fight as a job posting, a
 * feed of humble-brags about recent fights, and "people you may know" (squad
 * applicants).
 */
function headline(cc: CareerChar): string {
  const cid = currentCareer(cc);
  return `${RANKS[careerRank(cc, cid) - 1]} ${nameOf(cid)} · ${nameOf(cc.c.personality)} · Open to brawls`;
}

interface Post {
  who: { name: string; careers: string[]; appearance: CareerChar['c']['appearance'] } | null;
  author: string;
  sub: string;
  text: string;
  tags?: string;
  promoted?: boolean;
  reacts: number;
  comments: number;
  icon?: string;
}

function feed(s: CareerSave): Post[] {
  const rng = Rng.fromSeed(`feed:${s.seed}:${s.stage}:${s.wins}:${s.losses}`);
  const pick = <T,>(a: T[]): T => a[rng.int(a.length)]!;
  const m = mainChar(s);
  const posts: Post[] = [];
  const r = s.last;
  const me = { name: m.c.name, careers: [currentCareer(m)], appearance: m.c.appearance };
  if (r) {
    const company = stageInfo(bundle, r.stage).company;
    const mine = r.board?.filter((b) => b.team === 0) ?? [];
    const kos = mine.reduce((n, b) => n + b.kos, 0);
    const star = [...mine].sort((a, b) => b.dealt - a.dealt).find((b) => b.name !== m.c.name);
    const text =
      r.outcome === 'win'
        ? pick([
            `I'm humbled and honoured to announce that our team took down ${company} today. ${kos} KO${kos === 1 ? '' : 's'}, zero regrets.${star ? ` Couldn't have done it without ${star.name}, who dealt ${star.dealt} damage. Legend.` : ''}`,
            `Agree? 👇 Winning against ${company} isn't about fists. It's about synergy. (It was mostly fists.)`,
            `Stage ${r.stage + 1}: ✅. Another day, another ${company} lying on the floor. Grateful for this journey.`,
          ])
        : r.outcome === 'loss'
          ? pick([
              `Today I got knocked flat by ${company}. And that's okay. Here are 5 things it taught me about B2B sales 🧵`,
              `Failure is just success that hasn't been punched yet. Back at it tomorrow, ${company}.`,
              `Some days you're the stapler. Some days you're the paper. Tough one against ${company} today.`,
            ])
          : `Honoured to share a hard-fought draw with ${company}. We both lost, and we both grew.`;
    posts.push({ who: me, author: m.c.name, sub: headline(m), text, tags: r.outcome === 'win' ? '#Grateful #Teamwork #Leadership' : '#Resilience #GrowthMindset', reacts: 40 + rng.int(300), comments: 2 + rng.int(40) });
    for (const g of r.growth) {
      const cc = s.chars[g.id];
      if (!cc) continue;
      const who = { name: cc.c.name, careers: [currentCareer(cc)], appearance: cc.c.appearance };
      if (g.rankAfter > g.rankBefore)
        posts.push({ who, author: cc.c.name, sub: headline(cc), text: `🎉 I'm happy to share that I'm starting a new position as ${RANKS[g.rankAfter - 1]} ${nameOf(g.career)}!`, tags: '#NewRole', reacts: 80 + rng.int(400), comments: 10 + rng.int(60) });
      else if (g.levelsGained > 0)
        posts.push({ who, author: cc.c.name, sub: headline(cc), text: `Levelled up to Level ${cc.c.level} 💪 Personal growth is a marathon, not a sprint. Except the bit where you run from a forklift.`, reacts: 20 + rng.int(150), comments: rng.int(20) });
      for (const tr of g.newTraits) posts.push({ who, author: cc.c.name, sub: headline(cc), text: `Just got endorsed for "${nameOf(tr)}" 🏷️ Thanks, everyone who watched it happen.`, reacts: 15 + rng.int(90), comments: rng.int(12) });
    }
  }
  const next = stageInfo(bundle, s.stage);
  posts.push({
    who: null,
    icon: next.company[0],
    author: next.company,
    sub: `${nameOf(next.arenaId)} · ${200 + rng.int(9000)} followers`,
    text: pick([
      `We're hiring! Looking for rockstar ninjas who can take a punch. Competitive salary (lunch). Fast-paced environment (we will chase you).`,
      `Culture is everything at ${next.company}. That's why we fight every new starter in the ${nameOf(next.arenaId).toLowerCase()}.`,
      `Heard ${m.c.name} is coming for us. Our door is open. Our fists are also open. Then closed. Into fists.`,
    ]),
    promoted: true,
    reacts: 5 + rng.int(60),
    comments: rng.int(8),
  });
  if (!Object.values(s.inventory).some((n) => n > 0) && !(m.loadout ?? []).length)
    posts.push({ who: null, icon: '🛒', author: 'Corner Shop', sub: 'Retail · Open till late', text: 'Meal deals, energy drinks, steel-toe boots. Everything a working professional needs to survive a Tuesday. Pack up to 3 per fighter.', promoted: true, reacts: 3 + rng.int(30), comments: 0 });
  return posts;
}

function PostCard({ p }: { p: Post }) {
  const [liked, setLiked] = useState(false);
  return (
    <article class="li-card li-post">
      <header>
        {p.who ? <Portrait c={p.who} size={44} /> : <span class="li-logo-sq">{p.icon}</span>}
        <div class="grow">
          <b>{p.author}</b>
          <div class="muted small">{p.sub}</div>
          <div class="muted tiny">{p.promoted ? 'Promoted' : 'Just now · 🌐'}</div>
        </div>
      </header>
      <p>{p.text}</p>
      {p.tags && <p class="li-tags">{p.tags}</p>}
      <div class="li-counts muted small">
        <span>
          👍❤️👏 {p.reacts + (liked ? 1 : 0)}
        </span>
        <span>
          {p.comments} comment{p.comments === 1 ? '' : 's'}
        </span>
      </div>
      <div class="li-actions">
        <button class={liked ? 'on' : ''} onClick={() => setLiked(!liked)}>
          👍 Like
        </button>
        <button disabled title="Nobody reads the comments">
          💬 Comment
        </button>
        <button disabled title="Coming soon">
          🔁 Repost
        </button>
      </div>
    </article>
  );
}

function Person({ cc, tag }: { cc: CareerChar; tag?: string }) {
  const cid = currentCareer(cc);
  return (
    <div class="li-person">
      <Portrait c={cc.c} size={40} />
      <div class="grow">
        <b>{cc.c.name}</b> {tag && <span class="li-pill">{tag}</span>} <Loadout ids={cc.loadout} />
        <div class="muted small">
          {RANKS[careerRank(cc, cid) - 1]} {nameOf(cid)} · Lv {cc.c.level}
        </div>
      </div>
    </div>
  );
}

export function Hub({ save: s }: { save: CareerSave }) {
  const m = mainChar(s);
  const cid = currentCareer(m);
  const [hype, setHype] = useState(1);
  const info = stageInfo(bundle, s.stage);
  const diff = difficulty(s.difficulty);
  const opp = nextOpponents(s);
  const mine = lineup(s);
  const unlocked = squadUnlocked(s);
  const art = arenaArt(info.arenaId);
  const chapter = Math.floor(s.stage / STAGES_PER_ARENA);
  const viewers = 13 + s.wins * 7 + s.losses * 3;
  const fight = () => {
    const input = prepareFight(s);
    currentReplay.value = { id: 'career', input, title: `Stage ${s.stage + 1} · vs ${info.company}`, back: '/career/results' };
    navigate('/replay/career');
  };
  const people = unlocked ? applicants(s).slice(0, 3) : [];
  return (
    <section class="li-page">
      {s.pending && (
        <div class="li-card li-alert">
          <b>A fight is waiting for its results.</b>{' '}
          <button class="li-btn primary" onClick={() => navigate('/career/results')}>
            Collect results
          </button>
        </div>
      )}
      <div class="li-grid">
        <aside class="li-left">
          <div class="li-card li-profile">
            <div class="li-banner" style={art ? { backgroundImage: `url(${art.url})` } : undefined} />
            <button class="puppet-btn li-avatar" title="Show us a move" onClick={() => setHype((h) => h + 1)}>
              <PuppetView careerId={cid} personality={m.c.personality} appearance={m.c.appearance} size={170} hype={hype} voiceId={m.c.id} />
            </button>
            <div class="li-body">
              <h1>{m.c.name}</h1>
              <div class="li-headline">{headline(m)}</div>
              <div class="muted small">
                {nameOf(info.arenaId)} area · Level {m.c.level} · <span class="li-link">
                  {s.wins + s.losses} fight{s.wins + s.losses === 1 ? '' : 's'}
                </span>
              </div>
              <div class="xpbar" title="Level progress">
                <div style={{ width: `${levelProgress(m)}%` }} />
              </div>
              <RankBar cc={m} careerId={cid} />
              <div class="li-open">
                <b>Open to work</b>
                <div class="small">Brawler, Punching Bag, Team Player roles</div>
              </div>
              <div class="li-stats small">
                <div>
                  <span>Profile viewers</span>
                  <b>{viewers}</b>
                </div>
                <div>
                  <span>Record</span>
                  <b>
                    {s.wins}W {s.losses}L
                  </b>
                </div>
                <div>
                  <span>Wallet</span>
                  <b>💵 {s.cash}</b>
                </div>
              </div>
              <div class="li-row">
                <button class={`li-btn primary ${skillAlert(m) ? 'alert' : ''}`} onClick={() => navigate(`/career/skills/${m.c.id}`)}>
                  🌳 Skills & endorsements
                </button>
                <button class="li-btn" onClick={() => navigate('/career/shop')}>
                  🛒 Shop
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div class="li-center">
          <div class="li-card li-job">
            <header>
              <span class="li-logo-sq big">{info.company[0]}</span>
              <div class="grow">
                <h2>
                  Brawler (Stage {s.stage + 1}) {info.boss && <span class="li-pill red">Boss fight</span>}
                </h2>
                <div>
                  {info.company} · {nameOf(info.arenaId)} · On-site
                </div>
                <div class="muted small">
                  {diff.name} · Pays 💵 {Math.round(150 * (diff.rewardBp / 10000))}+ · {12 + ((s.stage * 7) % 80)} applicants
                </div>
              </div>
            </header>
            <div class="ladder">
              {Array.from({ length: STAGES_PER_ARENA * 2 }, (_, i) => chapter * STAGES_PER_ARENA + i).map((st) => (
                <span class={`rung ${st < s.stage ? 'done' : st === s.stage ? 'now' : ''} ${stageInfo(bundle, st).boss ? 'boss' : ''}`} title={`Stage ${st + 1} · ${nameOf(stageInfo(bundle, st).arenaId)}`}>
                  {st < s.stage ? '✓' : stageInfo(bundle, st).boss ? '☠' : st + 1}
                </span>
              ))}
            </div>
            <div class="grid two">
              <div>
                <h3>Your application</h3>
                {mine.map((cc, i) => (
                  <Person cc={cc} tag={i === 0 ? 'You' : cc.temp ? 'Agency temp' : undefined} />
                ))}
              </div>
              <div>
                <h3>Meet the hiring team</h3>
                {opp.map((cc) => (
                  <Person cc={cc} />
                ))}
              </div>
            </div>
            <div class="li-row">
              <button class="li-btn primary big" onClick={fight} disabled={!!s.pending}>
                🥊 Easy Apply (Fight!)
              </button>
              <button class="li-btn" onClick={() => navigate('/career/squad')} title={unlocked ? 'Build your squad' : `Unlocks at ${RANKS[SQUAD_UNLOCK_RANK - 1]} rank`}>
                {unlocked ? '👥 Edit squad' : `🔒 Squad at ${RANKS[SQUAD_UNLOCK_RANK - 1]}`}
              </button>
            </div>
          </div>

          <div class="li-sort muted small">
            <span>Sort by: </span>
            <b>Top</b>
          </div>
          {feed(s).map((p) => (
            <PostCard p={p} />
          ))}
        </div>

        <aside class="li-right">
          <div class="li-card">
            <h3>People you may know</h3>
            {unlocked ? (
              <>
                {people.map((c) => (
                  <div class="li-person">
                    <Portrait c={c} size={40} />
                    <div class="grow">
                      <b>{c.name}</b>
                      <div class="muted small">
                        {nameOf(c.careers[0])} · Lv {c.level}
                      </div>
                      <button class="li-btn small" onClick={() => navigate('/career/squad')}>
                        ＋ Connect
                      </button>
                    </div>
                  </div>
                ))}
                <button class="li-link-btn" onClick={() => navigate('/career/squad')}>
                  Show all →
                </button>
              </>
            ) : (
              <p class="muted small">
                Reach <b>{RANKS[SQUAD_UNLOCK_RANK - 1]}</b> rank to grow your network and hire your own squad. Until then, the agency sends temps.
              </p>
            )}
          </div>
          <div class="li-card">
            <h3>Career Crash News</h3>
            <ul class="li-news">
              <li>
                <b>Meal deal prices hold steady</b>
                <span class="muted tiny">Top news · {1200 + s.stage * 37} readers</span>
              </li>
              <li>
                <b>{info.company} "not worried" about {m.c.name}</b>
                <span class="muted tiny">{2 + (s.stage % 5)}h ago · {400 + s.wins * 11} readers</span>
              </li>
              <li>
                <b>Study: fighters who pack a snack last longer</b>
                <span class="muted tiny">1d ago · 3,021 readers</span>
              </li>
              <li>
                <b>Forklift licences: are they worth it?</b>
                <span class="muted tiny">2d ago · 912 readers</span>
              </li>
            </ul>
          </div>
          <details class="li-card settings">
            <summary>Career settings</summary>
            <label class="field">
              Difficulty
              <select value={s.difficulty} onChange={(e) => save({ ...s, difficulty: (e.target as HTMLSelectElement).value as DifficultyId })}>
                {DIFFICULTIES.map((d) => (
                  <option value={d.id}>
                    {d.name} — {d.blurb}
                  </option>
                ))}
              </select>
            </label>
            <button
              class="li-btn small"
              onClick={() => {
                if (window.confirm(`Abandon ${m.c.name}'s career? This deletes the save.`)) {
                  abandon();
                  navigate('/career');
                }
              }}
            >
              🗑️ Abandon career
            </button>
          </details>
        </aside>
      </div>
    </section>
  );
}

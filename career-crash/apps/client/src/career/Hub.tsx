import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { careerRank, DIFFICULTIES, difficulty, RANKS, SQUAD_UNLOCK_RANK, stageInfo, STAGES_PER_ARENA, type CareerChar, type DifficultyId } from '@cc/game-rules';
import { nameOf } from '../i18n';
import { arenaArt } from '../replay/arena-art';
import { currentReplay, navigate } from '../state';
import { Portrait } from '../ui/components';
import { levelProgress, Loadout, RankBar, skillAlert } from './Career';
import { abandon, applicants, currentCareer, lineup, mainChar, nextOpponents, prepareFight, save, squadUnlocked, type CareerSave } from './model';
import { PuppetView } from './PuppetView';
import { promotedPosts, starterPosts, type FeedPost } from './feed';

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

/** "Just now", "1 fight ago", ... */
function ago(n: number): string {
  return n <= 0 ? 'Just now' : `${n} fight${n === 1 ? '' : 's'} ago`;
}

/** Your saved posts (newest first) with the sponsored ones slotted in. */
function timeline(s: CareerSave): FeedPost[] {
  const saved = s.feed?.length ? s.feed : starterPosts(s);
  const [hiring, shop] = promotedPosts(s);
  const out = [...saved];
  out.splice(Math.min(2, out.length), 0, hiring!);
  if (!Object.values(s.inventory).some((n) => n > 0) && !(mainChar(s).loadout ?? []).length) out.splice(Math.min(5, out.length), 0, shop!);
  return out;
}

const PAGE = 5;

function Feed({ s }: { s: CareerSave }) {
  const [shown, setShown] = useState(PAGE);
  const posts = timeline(s);
  const fights = s.feed?.find((p) => p.fight > 0)?.fight ?? 0;
  const more = posts.length - shown;
  return (
    <>
      {posts.slice(0, shown).map((p) => (
        <PostCard key={p.id} p={p} fights={fights} />
      ))}
      {more > 0 ? (
        <button class="li-card li-more" onClick={() => setShown(shown + 10)}>
          Show more posts ({more}) ▾
        </button>
      ) : (
        shown > PAGE && (
          <button class="li-card li-more" onClick={() => setShown(PAGE)}>
            Show fewer posts ▴
          </button>
        )
      )}
    </>
  );
}

function PostCard({ p, fights }: { p: FeedPost; fights: number }) {
  const [liked, setLiked] = useState(false);
  return (
    <article class="li-card li-post">
      <header>
        {p.who ? <Portrait c={p.who} size={44} /> : <span class="li-logo-sq">{p.icon}</span>}
        <div class="grow">
          <b>{p.author}</b>
          <div class="muted small">{p.sub}</div>
          <div class="muted tiny">{p.promoted ? 'Promoted' : `${ago(fights - p.fight)} · 🌐`}</div>
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
          <Feed s={s} />
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

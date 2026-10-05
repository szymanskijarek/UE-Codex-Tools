import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { careerRank, DIFFICULTIES, isNameParts, partsFromName, difficulty, RANKS, SQUAD_UNLOCK_RANK, stageInfo, STAGES_PER_ARENA, hrMood, type ActiveHrNote, type CareerChar, type DifficultyId } from '@cc/game-rules';
import { descOf, nameOf } from '../i18n';
import { arenaArt } from '../replay/arena-art';
import { navigate } from '../state';
import { Portrait } from '../ui/components';
import { levelProgress, Loadout, RankBar, skillAlert } from './Career';
import { CompanyPicker } from './CompanyPicker';
import { NamePicker } from './NamePicker';
import { HrChips } from './File';
import { startNextFight } from './CoreActions';
import { GearIcons } from './Loot';
import { abandon, applicants, companyName, renameCharacter, renameCompany, setPostMine, currentCareer, lineup, lineupHr, mainChar, nextOpponents, save, squadUnlocked, type CareerSave } from './model';
import { developing, fightPhoto } from './photo';
import { PuppetView } from './PuppetView';
import { discussion, promotedPosts, REACTIONS, starterPosts, type FeedPost, type ReactionKind } from './feed';

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
        <PostCard key={p.id} p={p} fights={fights} s={s} />
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

function PostCard({ p, fights, s }: { p: FeedPost; fights: number; s: CareerSave }) {
  const [mine, setMine] = useState(p.mine ?? {});
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const post = { ...p, mine };
  const talk = discussion(post, s);
  const update = (next: NonNullable<FeedPost['mine']>) => {
    setMine(next);
    setPostMine(s, p.id, next);
  };
  const react = (k: ReactionKind) => update({ ...mine, react: mine.react === k ? undefined : k });
  const current = REACTIONS.find(([k]) => k === mine.react);
  const shown = open ? talk.comments : talk.comments.slice(0, 1);
  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    update({ ...mine, said: [...(mine.said ?? []), text.slice(0, 280)] });
    setDraft('');
    setOpen(true);
  };
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
      {p.photo && fightPhoto.value?.fight === p.fight && <img class="li-photo" src={fightPhoto.value.url} alt={`Fight photo: ${p.text}`} />}
      {p.photo && developing.value === p.fight && fightPhoto.value?.fight !== p.fight && <div class="li-photo li-photo-wait">📸 Developing…</div>}
      {p.link && (
        <a class="li-linkcard" href={p.link.href} {...(p.link.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
          <span class="li-linkcard-art" aria-hidden="true">
            📈🥊
          </span>
          <span>
            <b>{p.link.blurb}</b>
            <small>{p.link.title}</small>
          </span>
        </a>
      )}
      {p.tags && <p class="li-tags">{p.tags}</p>}
      <div class="li-counts muted small">
        <span class="li-reacts" title={talk.reactions.map(([k, n]) => `${REACTIONS.find(([x]) => x === k)?.[2]}: ${n}`).join(' · ')}>
          <span class="li-react-icons">
            {talk.reactions.slice(0, 3).map(([k]) => (
              <span>{REACTIONS.find(([x]) => x === k)?.[1]}</span>
            ))}
          </span>
          {talk.total > 1 ? `${talk.reactedBy} and ${talk.total - 1} others` : talk.reactedBy}
        </span>
        <button class="li-link-btn" onClick={() => setOpen(!open)}>
          {talk.commentCount} comment{talk.commentCount === 1 ? '' : 's'}
        </button>
      </div>
      <div class="li-actions">
        <span class="li-react-wrap">
          <button class={mine.react ? 'on' : ''} onClick={() => react(mine.react ?? 'like')}>
            {current ? `${current[1]} ${current[2]}` : '👍 Like'}
          </button>
          <span class="li-react-pick">
            {REACTIONS.map(([k, icon, label]) => (
              <button title={label} class={mine.react === k ? 'on' : ''} onClick={() => react(k)}>
                {icon}
              </button>
            ))}
          </span>
        </span>
        <button onClick={() => setOpen(true)}>💬 Comment</button>
        <button disabled title="Coming soon">
          🔁 Repost
        </button>
      </div>
      {shown.length > 0 && (
        <div class="li-thread">
          {!open && <div class="muted tiny">Most relevant ▾</div>}
          {shown.map((c) => (
            <div class={`li-comment ${c.reply ? 'reply' : ''} ${c.mine ? 'mine' : ''}`}>
              {c.who ? <Portrait c={c.who} size={c.reply ? 26 : 32} /> : <span class="li-logo-sq sm">{c.icon}</span>}
              <div class="li-bubble">
                <b>{c.author}</b>
                {c.author === p.author && <span class="li-pill">Author</span>}
                <div class="muted tiny">{c.sub}</div>
                <div>{c.text}</div>
                <div class="muted tiny li-c-meta">
                  {c.likes > 0 ? `👍 ${c.likes} · ` : ''}Reply
                </div>
              </div>
            </div>
          ))}
          {!open && talk.comments.length > 1 && (
            <button class="li-link-btn" onClick={() => setOpen(true)}>
              Load more comments ({talk.comments.length - 1})
            </button>
          )}
        </div>
      )}
      {open && (
        <form
          class="li-compose"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Portrait c={mainChar(s).c} size={32} />
          <input value={draft} maxLength={280} placeholder="Add a comment…" onInput={(e) => setDraft((e.target as HTMLInputElement).value)} />
          <button class="li-btn primary small" type="submit" disabled={!draft.trim()}>
            Post
          </button>
        </form>
      )}
    </article>
  );
}

function Person({ cc, tag, hr }: { cc: CareerChar; tag?: string; hr?: ActiveHrNote[] }) {
  const cid = currentCareer(cc);
  // A Senior Move this fighter has unlocked (from stage 10 some opponents bring one): shown as a teaser.
  const seniorCareer = cc.c.careers.find((x) => cc.nodes.includes(`${x}:senior`));
  const senior = seniorCareer ? bundle.careers.find((x) => x.id === seniorCareer)?.senior : undefined;
  return (
    <div class="li-person">
      <Portrait c={cc.c} size={40} mood={(hr && hrMood(hr)) ?? 'neutral'} />
      <div class="grow">
        <b>{cc.c.name}</b> {tag && <span class="li-pill">{tag}</span>} <Loadout ids={cc.loadout} /> <GearIcons gear={cc.gear} />
        <div class="muted small">
          {RANKS[careerRank(cc, cid) - 1]} {nameOf(cid)} · Lv {cc.c.level}
        </div>
        {hr && <HrChips cc={cc} active={hr} />}
        {senior && (
          <div class="small li-senior" title="Senior Move: unlocked at the top rank of a career">
            ✨ Senior Move: <b>{nameOf(senior)}</b>
          </div>
        )}
      </div>
    </div>
  );
}

/** The arena's boss on a boss stage: who they are and the moves to watch for. */
function BossCard({ career, name }: { career: string; name: string }) {
  const c = bundle.careers.find((x) => x.id === career);
  if (!c) return null;
  const moves = [c.active, ...(c.extraActives ?? [])];
  return (
    <div class="li-boss">
      <Portrait c={{ careers: [career], appearance: { skin: '#e0ac69', hair: '#2b1d14', hairStyle: 0 } }} size={64} mood="angry" />
      <div class="grow">
        <div>
          <b>Final interview with {name}</b> · {nameOf(career)}
        </div>
        <div class="muted small">{descOf(career)}</div>
        <div class="small li-boss-moves">
          {moves.map((m) => (
            <span key={m} class="li-pill red" title={descOf(m)}>
              {nameOf(m)}
            </span>
          ))}
          <span class="li-pill" title={descOf(c.passive)}>
            {nameOf(c.passive)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Hub({ save: s }: { save: CareerSave }) {
  const m = mainChar(s);
  const cid = currentCareer(m);
  const [hype, setHype] = useState(1);
  const [editCompany, setEditCompany] = useState(false);
  const [editName, setEditName] = useState(false);
  const nameParts = (isNameParts(bundle, m.c.nameParts) ? m.c.nameParts : null) ?? partsFromName(bundle, m.c.name) ?? { pre: [], first: bundle.names.first[0]!, last: bundle.names.last[0]!, post: [] };
  const info = stageInfo(bundle, s.stage);
  const diff = difficulty(s.difficulty);
  const opp = nextOpponents(s);
  const mine = lineup(s);
  const mineHr = lineupHr(s, mine);
  const unlocked = squadUnlocked(s);
  const art = arenaArt(info.arenaId);
  const chapter = Math.floor(s.stage / STAGES_PER_ARENA);
  const viewers = 13 + s.wins * 7 + s.losses * 3;
  const fight = () => startNextFight(s);
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
              <h1>
                {m.c.name}{' '}
                <button class="ghost small li-rename" title="Change your name and titles" onClick={() => setEditName(!editName)}>
                  {editName ? 'Done' : '✏️'}
                </button>
              </h1>
              {editName && <NamePicker value={nameParts} onChange={(n) => renameCharacter(s, m.c.id, n)} />}
              <div class="li-headline">{headline(m)}</div>
              <div class="li-company small">
                🏢 {companyName(s)}
                <button class="ghost small" title="Rename your company" onClick={() => setEditCompany(!editCompany)}>
                  {editCompany ? 'Done' : '✏️'}
                </button>
              </div>
              {editCompany && s.company && <CompanyPicker value={s.company} onChange={(c) => renameCompany(s, c)} />}
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
                <button class="li-btn primary" onClick={fight} disabled={!!s.pending} title="Straight to the next fight">
                  🥊 Easy Apply
                </button>
                <button class={`li-btn primary ${skillAlert(m) ? 'alert' : ''}`} onClick={() => navigate(`/career/skills/${m.c.id}`)}>
                  🌳 Skills & endorsements
                </button>
                <button class="li-btn" onClick={() => navigate('/career/perks')}>
                  🎁 Perks{s.bag?.length ? ` (${s.bag.length})` : ''}
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
            {info.bossCareer && <BossCard career={info.bossCareer} name={info.bossName ?? ''} />}
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
                  <Person cc={cc} tag={i === 0 ? 'You' : cc.temp ? 'Agency temp' : undefined} hr={mineHr.get(cc.c.id)} />
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

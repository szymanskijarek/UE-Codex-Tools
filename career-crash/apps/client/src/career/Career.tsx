import { useMemo, useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { careerRank, DIFFICULTIES, difficulty, pointsLeft, RANK_XP, RANKS, SQUAD_UNLOCK_RANK, stageInfo, STAGES_PER_ARENA, type CareerChar, type DifficultyId } from '@cc/game-rules';
import { abilitySummary, descOf, nameOf } from '../i18n';
import { currentReplay, navigate, notify } from '../state';
import { Card, CareerChip, Portrait } from '../ui/components';
import { abandon, career, collectResults, currentCareer, draftCharacter, lineup, mainChar, nextOpponents, prepareFight, save, squadUnlocked, startCareer, type CareerSave } from './model';
import { SkillsScreen } from './Skills';
import { SquadScreen } from './Squad';

/** Career mode router: #/career, #/career/skills/:id, #/career/squad, #/career/results. */
export function CareerScreen({ sub, arg }: { sub?: string; arg?: string }) {
  const s = career.value;
  if (!s) return <CreateCharacter />;
  if (sub === 'skills') return <SkillsScreen save={s} id={arg ?? s.mainId} />;
  if (sub === 'squad') return <SquadScreen save={s} />;
  if (sub === 'results') return <Results save={s} />;
  return <Hub save={s} />;
}

// ---------------------------------------------------------------------------
// Character creation
// ---------------------------------------------------------------------------
const STARTERS = bundle.careers.filter((c) => c.tier === 1 && c.unlock.type === 'default' && !c.deprecated);

function styleOf(careerId: string): string {
  const d = bundle.careers.find((c) => c.id === careerId)?.defense ?? {};
  const p = d.parryBp ?? 0;
  const e = d.evadeBp ?? 0;
  const dash = d.dashBp ?? 0;
  if (dash >= 1200) return '💨 Dasher';
  if (p >= 400) return '🛡️ Parrier';
  if (e >= 300) return '🌀 Dodger';
  if (p < 0 || e < -150) return '🐢 Soaks hits';
  return '⚖️ All-rounder';
}

function CreateCharacter() {
  const [careerId, setCareerId] = useState<string>('');
  const [seed, setSeed] = useState(() => Math.random().toString(16).slice(2, 8));
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [diff, setDiff] = useState<DifficultyId>('normal');
  const draft = useMemo(() => (careerId ? draftCharacter(seed, careerId) : null), [seed, careerId]);

  if (!careerId || !draft) {
    return (
      <section>
        <h1>Start your career</h1>
        <p class="lead">Pick the job your fighter starts in. Every job has its own moves, a skill tree to grow into and a fighting style.</p>
        <div class="career-grid">
          {STARTERS.map((c) => (
            <button class="career-card" onClick={() => setCareerId(c.id)} style={{ borderColor: c.art.color }}>
              <Portrait c={{ careers: [c.id], appearance: { skin: '#e0ac69', hair: '#3b2a1a', hairStyle: 0 } }} size={64} />
              <div class="cc-body">
                <b>
                  {c.art.icon} {nameOf(c.id)}
                </b>
                <span class="muted small">{styleOf(c.id)}</span>
                <span class="small">
                  <b>{nameOf(c.active)}</b>: {abilitySummary(c.active)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const shown = { ...draft, name: name || draft.name, personality: personality || draft.personality };
  const start = () => {
    startCareer(shown, diff);
    notify(`Welcome aboard, ${shown.name}!`, 'good');
    navigate('/career');
  };
  const c = bundle.careers.find((x) => x.id === careerId)!;
  return (
    <section>
      <button class="ghost small" onClick={() => setCareerId('')}>
        ← Pick another job
      </button>
      <div class="row hero">
        <Portrait c={shown} size={96} />
        <div class="grow">
          <h1>{shown.name}</h1>
          <CareerChip id={careerId} /> <span class="muted small">{styleOf(careerId)}</span>
          <p class="small">
            Starts with <b>{nameOf(c.active)}</b>. Unlocks <b>{nameOf(c.passive)}</b>
            {c.extraActives?.length ? (
              <>
                {' '}
                and <b>{c.extraActives.map((a) => nameOf(a)).join(', ')}</b>
              </>
            ) : null}{' '}
            as they rank up.
          </p>
        </div>
      </div>
      <div class="grid two">
        <Card>
          <h2>Who are they?</h2>
          <label class="field">
            Name
            <div class="row">
              <input value={shown.name} maxLength={24} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
              <button
                class="ghost small"
                title="New face, name and stats"
                onClick={() => {
                  setSeed(Math.random().toString(16).slice(2, 8));
                  setName('');
                }}
              >
                🎲
              </button>
            </div>
          </label>
          <label class="field">
            Personality
            <select value={shown.personality} onChange={(e) => setPersonality((e.target as HTMLSelectElement).value)}>
              {bundle.personalities.map((p) => (
                <option value={p.id}>{nameOf(p.id)}</option>
              ))}
            </select>
          </label>
          <p class="muted small">{descOf(shown.personality)}</p>
          <StatBars stats={shown.stats} />
        </Card>
        <Card>
          <h2>Difficulty</h2>
          <div class="diff-list">
            {DIFFICULTIES.map((d) => (
              <button class={`pick ${diff === d.id ? 'on' : ''}`} onClick={() => setDiff(d.id)}>
                <div>
                  <b>{d.name}</b>
                  <div class="muted small">{d.blurb}</div>
                  <div class="small">Rewards ×{(d.rewardBp / 10000).toFixed(1)}</div>
                </div>
              </button>
            ))}
          </div>
          <p class="muted small">You can change difficulty later from the career hub.</p>
        </Card>
      </div>
      <button class="primary big" onClick={start}>
        🥊 Start career
      </button>
    </section>
  );
}

export function StatBars({ stats, onPlus }: { stats: Record<string, number>; onPlus?: (k: string) => void }) {
  return (
    <div class="stats compact">
      {Object.entries(stats).map(([k, v]) => (
        <div class="stat">
          <span class="label">{t(k)}</span>
          <div class="bar">
            <div style={{ width: `${Math.min(100, v * 6)}%` }} />
          </div>
          <b>{v}</b>
          {onPlus ? (
            <button class="plus" onClick={() => onPlus(k)} title={`+1 ${t(k)}`}>
              +
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

const STAT_NAMES: Record<string, string> = { interactionSpeed: 'Handiness' };
function t(k: string): string {
  return STAT_NAMES[k] ?? k[0]!.toUpperCase() + k.slice(1);
}

// ---------------------------------------------------------------------------
// Hub
// ---------------------------------------------------------------------------
export function RankBar({ cc, careerId }: { cc: CareerChar; careerId: string }) {
  const xp = cc.careerXp[careerId] ?? 0;
  const r = careerRank(cc, careerId);
  const lo = RANK_XP[r - 1]!;
  const hi = RANK_XP[r] ?? lo;
  const pct = hi > lo ? Math.min(100, ((xp - lo) / (hi - lo)) * 100) : 100;
  return (
    <div class="rankbar" title={hi > lo ? `${xp - lo}/${hi - lo} career XP to ${RANKS[r]}` : 'Top rank'}>
      <span class="rank-name">{RANKS[r - 1]}</span>
      <div class="xpbar gold">
        <div style={{ width: `${pct}%` }} />
      </div>
      <span class="muted small">{hi > lo ? RANKS[r] : '★'}</span>
    </div>
  );
}

function levelProgress(cc: CareerChar): number {
  const econ = bundle.economy;
  const need = (l: number) => econ.xp.curve.a + econ.xp.curve.b * l + econ.xp.curve.c * l * l;
  let base = 0;
  for (let l = 1; l < cc.c.level; l++) base += need(l);
  return Math.min(100, ((cc.c.xp - base) / need(cc.c.level)) * 100);
}

export function skillAlert(cc: CareerChar): boolean {
  return cc.c.unspentPoints > 0 || !!cc.c.pendingOffer || cc.c.careers.some((cid) => pointsLeft(bundle, cc, cid) > 0);
}

function FighterRow({ cc, tag }: { cc: CareerChar; tag?: string }) {
  const cid = currentCareer(cc);
  const skills = cc.nodes.filter((n) => !n.endsWith(':active')).length;
  return (
    <div class="fighter-row">
      <Portrait c={cc.c} size={40} />
      <div class="grow">
        <b>{cc.c.name}</b> {tag && <span class="badge">{tag}</span>}
        <div class="muted small">
          Lv {cc.c.level} · {nameOf(cid)} ({RANKS[careerRank(cc, cid) - 1]}) · {skills} skill{skills === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}

function Hub({ save: s }: { save: CareerSave }) {
  const m = mainChar(s);
  const cid = currentCareer(m);
  const info = stageInfo(bundle, s.stage);
  const diff = difficulty(s.difficulty);
  const opp = nextOpponents(s);
  const mine = lineup(s);
  const unlocked = squadUnlocked(s);
  const fight = () => {
    const input = prepareFight(s);
    currentReplay.value = { id: 'career', input, title: `Stage ${s.stage + 1} · vs ${info.company}`, back: '/career/results' };
    navigate('/replay/career');
  };
  const chapter = Math.floor(s.stage / STAGES_PER_ARENA);
  return (
    <section>
      {s.pending && (
        <Card class="highlight">
          <b>A fight is waiting for its results.</b>{' '}
          <button class="primary small" onClick={() => navigate('/career/results')}>
            Collect results
          </button>
        </Card>
      )}
      <div class="row hero">
        <Portrait c={m.c} size={96} />
        <div class="grow">
          <h1>{m.c.name}</h1>
          <div class="muted">
            Level {m.c.level} · {nameOf(m.c.personality)} · {s.wins}W {s.losses}L · 💵 {s.cash}
          </div>
          <div class="row">
            <CareerChip id={cid} />
            <RankBar cc={m} careerId={cid} />
          </div>
          <div class="xpbar" title="Level progress">
            <div style={{ width: `${levelProgress(m)}%` }} />
          </div>
        </div>
      </div>
      <div class="cta-row">
        <button class={`ghost ${skillAlert(m) ? 'alert' : ''}`} onClick={() => navigate(`/career/skills/${m.c.id}`)}>
          🌳 Skills & stats
        </button>
        <button class={`ghost ${unlocked ? '' : 'locked'}`} onClick={() => navigate('/career/squad')} title={unlocked ? 'Build your squad' : `Unlocks at ${RANKS[SQUAD_UNLOCK_RANK - 1]} rank`}>
          {unlocked ? '👥 Squad' : `🔒 Squad (${RANKS[SQUAD_UNLOCK_RANK - 1]} rank)`}
        </button>
      </div>

      <Card class="next-fight">
        <div class="row">
          <h2 class="grow">
            Stage {s.stage + 1}: {info.company} {info.boss && <span class="badge red">BOSS</span>}
          </h2>
          <span class="badge">{nameOf(info.arenaId)}</span>
          <span class={`badge ${s.difficulty === 'brutal' || s.difficulty === 'hard' ? 'red' : s.difficulty === 'relaxed' ? 'green' : 'gold'}`}>{diff.name}</span>
        </div>
        <div class="ladder">
          {Array.from({ length: STAGES_PER_ARENA * 2 }, (_, i) => chapter * STAGES_PER_ARENA + i).map((st) => (
            <span class={`rung ${st < s.stage ? 'done' : st === s.stage ? 'now' : ''} ${stageInfo(bundle, st).boss ? 'boss' : ''}`} title={`Stage ${st + 1} · ${nameOf(stageInfo(bundle, st).arenaId)}`}>
              {st < s.stage ? '✓' : stageInfo(bundle, st).boss ? '☠' : st + 1}
            </span>
          ))}
        </div>
        <div class="grid two">
          <div>
            <h3>Your squad</h3>
            {mine.map((cc, i) => (
              <FighterRow cc={cc} tag={i === 0 ? 'You' : cc.temp ? 'Agency temp' : undefined} />
            ))}
          </div>
          <div>
            <h3>{info.company}</h3>
            {opp.map((cc) => (
              <FighterRow cc={cc} />
            ))}
          </div>
        </div>
        <button class="primary big" onClick={fight} disabled={!!s.pending}>
          🥊 Fight!
        </button>
      </Card>

      <details class="settings">
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
          class="ghost small"
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
    </section>
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
function Results({ save: s0 }: { save: CareerSave }) {
  const [s] = useState(() => (s0.pending ? collectResults(s0) : s0));
  const r = s.last;
  if (!r) {
    return (
      <section>
        <p>No fight results to show.</p>
        <a href="#/career">Back to your career</a>
      </section>
    );
  }
  const title = r.outcome === 'win' ? '🏆 Victory!' : r.outcome === 'draw' ? '🤝 Draw' : '💥 Defeat';
  return (
    <section>
      <h1>{title}</h1>
      <p class="lead">
        Stage {r.stage + 1} {r.outcome === 'win' ? 'cleared' : 'still to beat'} · 💵 +{r.cash}
      </p>
      {r.unlockedSquad && (
        <Card class="highlight">
          <h2>👥 Squad building unlocked!</h2>
          <p>
            {mainChar(s).c.name} made {RANKS[SQUAD_UNLOCK_RANK - 1]}. You can now hire your own teammates and send them in instead of agency temps.
          </p>
          <button class="primary" onClick={() => navigate('/career/squad')}>
            Build your squad
          </button>
        </Card>
      )}
      <div class="grid two">
        {r.growth.map((g) => (
          <Card>
            <h3>{g.name}</h3>
            <div>+{g.xp} XP · Level {s.chars[g.id]?.c.level}</div>
            {s.chars[g.id] && <RankBar cc={s.chars[g.id]!} careerId={g.career} />}
            {g.levelsGained > 0 && <div class="good">⬆️ Level up! +{g.levelsGained} stat point{g.levelsGained === 1 ? '' : 's'}</div>}
            {g.rankAfter > g.rankBefore && (
              <div class="good">
                🎖️ {nameOf(g.career)} rank: {RANKS[g.rankAfter - 1]}! +{(g.rankAfter - g.rankBefore) * 2} skill points
              </div>
            )}
            {g.newTraits.map((tr) => (
              <div>
                🏷️ New trait: <b>{nameOf(tr)}</b>
              </div>
            ))}
            {g.milestone && <div class="good">✨ Career milestone — pick a new job on their skills page!</div>}
          </Card>
        ))}
      </div>
      <div class="cta-row">
        <button class="primary" onClick={() => navigate('/career')}>
          Continue
        </button>
        <button class="ghost" onClick={() => navigate(`/career/skills/${s.mainId}`)}>
          🌳 Spend points
        </button>
      </div>
    </section>
  );
}

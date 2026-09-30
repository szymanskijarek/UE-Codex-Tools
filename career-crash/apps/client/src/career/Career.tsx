import { useMemo, useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { careerRank, DIFFICULTIES, pointsLeft, formatName, partsFromName, randomCompany, RANK_XP, RANKS, SQUAD_UNLOCK_RANK, stageInfo, type CareerChar, type CompanyName, type DifficultyId, type NameParts } from '@cc/game-rules';
import { Rng } from '@cc/sim';
import { abilitySummary, descOf, nameOf } from '../i18n';
import { navigate, notify } from '../state';
import { Card, CareerChip, Portrait } from '../ui/components';
import { type BoardRow, career, collectResults, sellLoot, companyName, currentCareer, draftCharacter, mainChar, startCareer, type CareerSave } from './model';
import { CompanyPicker } from './CompanyPicker';
import { NamePicker } from './NamePicker';
import { GearScreen } from './Gear';
import { Hub } from './Hub';
import { LootCard } from './Loot';
import { PuppetView } from './PuppetView';
import { ShopScreen } from './Shop';
import { SkillsScreen } from './Skills';
import { SquadScreen } from './Squad';

/** Career mode router: #/career, #/career/skills/:id, #/career/squad, #/career/shop, #/career/perks/:id, #/career/results. */
export function CareerScreen({ sub, arg }: { sub?: string; arg?: string }) {
  const s = career.value;
  if (!s) return <CreateCharacter />;
  if (sub === 'skills') return <SkillsScreen save={s} id={arg ?? s.mainId} />;
  if (sub === 'squad') return <SquadScreen save={s} />;
  if (sub === 'shop') return <ShopScreen save={s} />;
  if (sub === 'perks' || sub === 'gear') return <GearScreen save={s} charId={arg} />;
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
  const [parts, setParts] = useState<NameParts | null>(null);
  const [personality, setPersonality] = useState('');
  const [diff, setDiff] = useState<DifficultyId>('normal');
  const [hype, setHype] = useState(1);
  const [company, setCompany] = useState<CompanyName>(() => randomCompany(Rng.fromSeed(Math.random().toString(16))));
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

  const nameParts = parts ?? partsFromName(bundle, draft.name) ?? { pre: [], first: bundle.names.first[0]!, last: bundle.names.last[0]!, post: [] };
  const shown = { ...draft, name: formatName(nameParts), nameParts, personality: personality || draft.personality };
  const start = () => {
    startCareer(shown, diff, company);
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
        <button class="puppet-btn" title="Show us a move" onClick={() => setHype((h) => h + 1)}>
          <PuppetView careerId={careerId} personality={shown.personality} appearance={shown.appearance} size={220} hype={hype} voiceId={shown.id} />
        </button>
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
          <div class="field">
            Name
            <NamePicker value={nameParts} onChange={setParts} />
          </div>
          <button
            class="ghost small"
            title="New face, name and stats"
            onClick={() => {
              setSeed(Math.random().toString(16).slice(2, 8));
              setParts(null);
              setHype((h) => h + 1);
            }}
          >
            🎲 New face and stats
          </button>
          <label class="field">
            Personality
            <select value={shown.personality} onChange={(e) => {
                setPersonality((e.target as HTMLSelectElement).value);
                setHype((h) => h + 1);
              }}>
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
      <Card>
        <h2>Your company</h2>
        <p class="muted small">Your squad fights under this name, and other players will see it.</p>
        <CompanyPicker value={company} onChange={setCompany} />
      </Card>
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

export function levelProgress(cc: CareerChar): number {
  const econ = bundle.economy;
  const need = (l: number) => econ.xp.curve.a + econ.xp.curve.b * l + econ.xp.curve.c * l * l;
  let base = 0;
  for (let l = 1; l < cc.c.level; l++) base += need(l);
  return Math.min(100, ((cc.c.xp - base) / need(cc.c.level)) * 100);
}

export function skillAlert(cc: CareerChar): boolean {
  return cc.c.unspentPoints > 0 || !!cc.c.pendingOffer || cc.c.careers.some((cid) => pointsLeft(bundle, cc, cid) > 0);
}

/** Packed items as a row of icons. */
export function Loadout({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null;
  return (
    <span class="loadout-icons">
      {ids.map((id) => (
        <span title={nameOf(id)}>{bundle.shopItems.find((i) => i.id === id)?.icon ?? '❔'}</span>
      ))}
    </span>
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
  const m = mainChar(s);
  return (
    <section>
      <div class="row hero">
        <PuppetView careerId={currentCareer(m)} personality={r.outcome === 'win' ? m.c.personality : 'personality.lazy'} appearance={m.c.appearance} size={170} hype={r.outcome === 'win' ? 1 : 0} voiceId={m.c.id} lines="bark_win" mood={r.outcome === 'loss' ? 'hurt' : 'neutral'} />
        <div class="grow">
          <h1>{title}</h1>
          <p class="lead">
            Stage {r.stage + 1} {r.outcome === 'win' ? 'cleared' : 'still to beat'} · 💵 +{r.cash}
          </p>
          {r.pay && (
            <div class="pay small">
              <span>{r.outcome === 'win' ? 'Win' : r.outcome === 'draw' ? 'Draw' : 'Turning up'} 💵 {r.pay.base}</span>
              {r.pay.stage > 0 && <span>Stage bonus 💵 {r.pay.stage}</span>}
              {r.pay.koCount > 0 && (
                <span>
                  {r.pay.koCount} KO{r.pay.koCount === 1 ? '' : 's'} 💵 {r.pay.kos}
                </span>
              )}
              {r.pay.multiplier !== 1 && <span>Difficulty ×{r.pay.multiplier.toFixed(2).replace(/0$/, '')}</span>}
              <b>= 💵 {r.pay.total}</b>
            </div>
          )}
        </div>
      </div>
      {r.loot && <LootDrop drop={r.loot} />}
      {r.board && (
        <Card>
          <h2>Match summary</h2>
          <Board rows={r.board.filter((b) => b.team === 0)} title={companyName(s)} />
          <Board rows={r.board.filter((b) => b.team !== 0)} title={stageInfo(bundle, r.stage).company} />
        </Card>
      )}
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

/** The item a win dropped: keep it (it's in the bag) or sell it on the spot. */
function LootDrop({ drop }: { drop: NonNullable<CareerSave['last']>['loot'] & object }) {
  const [sold, setSold] = useState(drop.sold ?? 0);
  const inBag = !sold && !!career.value?.bag?.some((x) => x.uid === drop.item.uid);
  return (
    <Card class="highlight">
      <h2>🎁 Perk unlocked</h2>
      <p class="muted small">Tax-free. Allegedly.</p>
      <LootCard it={drop.item}>
        {inBag && (
          <>
            <button class="primary small" onClick={() => navigate('/career/perks')}>
              Assign it
            </button>
            <button class="ghost small" onClick={() => career.value && setSold(sellLoot(career.value, drop.item.uid))}>
              Cash out 💵 {bundle.economy.loot.rarities.find((x) => x.id === drop.item.rarity)!.sellPrice}
            </button>
          </>
        )}
      </LootCard>
      {sold > 0 && <p class="muted small">{drop.sold ? 'Your perks inbox was full, so it was cashed out for' : 'Cashed out for'} 💵 {sold}.</p>}
    </Card>
  );
}

function Board({ rows, title }: { rows: BoardRow[]; title: string }) {
  return (
    <table class="board">
      <thead>
        <tr>
          <th class="left">{title}</th>
          <th title="Damage dealt">
            ⚔️<span class="board-label"> Dealt</span>
          </th>
          <th title="Damage received">
            🩹<span class="board-label"> Taken</span>
          </th>
          <th title="Enemies knocked out">
            💀<span class="board-label"> KOs</span>
          </th>
          <th title="Times floored">
            ⬇️<span class="board-label"> Downs</span>
          </th>
          <th title="Items used">🎒</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr class={b.state === 'ko' ? 'out' : ''}>
            <td class="left">
              <Portrait c={{ careers: [b.career], appearance: b.appearance }} size={28} mood={b.state === 'ko' ? 'hurt' : b.mvp ? 'neutral' : b.team === 0 ? 'neutral' : 'angry'} /> {b.name} {b.mvp && <span class="badge gold">MVP</span>}
              {b.state === 'ko' && <span class="muted small"> · KO'd</span>}
            </td>
            <td>{b.dealt}</td>
            <td>{b.taken}</td>
            <td>{b.kos}</td>
            <td>{b.downs}</td>
            <td>
              {b.used.map((id) => (
                <span title={nameOf(id)}>{bundle.shopItems.find((i) => i.id === id)?.icon}</span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

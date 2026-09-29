import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { allocatePoints, careerRank, pointsLeft, RANKS, skillPointsAt, skillTree, unlockBlocker, unlockNode, type SkillNode } from '@cc/game-rules';
import { abilitySummary, nameOf } from '../i18n';
import { navigate, notify } from '../state';
import { Card, CareerChip, Portrait } from '../ui/components';
import { RankBar, StatBars } from './Career';
import { pickCareer, save, type CareerSave } from './model';

const KIND_ICON: Record<SkillNode['kind'], string> = { ability: '⚡', passive: '🧠', stats: '📈', reflex: '🌀', capstone: '👑' };

function nodeTitle(n: SkillNode): string {
  return n.ability ? nameOf(n.ability) : n.kind === 'capstone' ? 'Mastery' : n.kind === 'reflex' ? 'Reflexes' : 'Training';
}

function nodeDesc(n: SkillNode): string {
  if (n.ability) return abilitySummary(n.ability);
  return n.label ?? '';
}

/** Skills & stats for one career-mode character: stat points, career milestones and a tree per career. */
export function SkillsScreen({ save: s, id }: { save: CareerSave; id: string }) {
  const cc = s.chars[id];
  const [tab, setTab] = useState(0);
  if (!cc) {
    return (
      <section>
        <p>That character isn't on your staff.</p>
        <a href="#/career">Back</a>
      </section>
    );
  }
  const careers = cc.c.careers;
  const cid = careers[Math.min(tab, careers.length - 1)]!;
  const tree = skillTree(bundle, cid);
  const tiers = [...new Set(tree.map((n) => n.tier))].sort();
  const left = pointsLeft(bundle, cc, cid);
  const rank = careerRank(cc, cid);

  const plus = (k: string) => {
    const err = allocatePoints(bundle, cc.c, { [k]: 1 });
    if (err) notify(err, 'error');
    else save({ ...s });
  };
  const unlock = (n: SkillNode) => {
    const err = unlockNode(bundle, cc, n.id);
    if (err) notify(err, 'error');
    else {
      notify(`${nodeTitle(n)} unlocked!`, 'good');
      save({ ...s });
    }
  };

  return (
    <section>
      <button class="ghost small" onClick={() => navigate(id === s.mainId ? '/career' : '/career/squad')}>
        ← {id === s.mainId ? 'Career' : 'Squad'}
      </button>
      <div class="row hero">
        <Portrait c={cc.c} size={80} />
        <div class="grow">
          <h1>{cc.c.name}</h1>
          <div class="muted">
            Level {cc.c.level} · {nameOf(cc.c.personality)}
            {cc.c.traits.length > 0 && <> · {cc.c.traits.map((t) => nameOf(t)).join(', ')}</>}
          </div>
        </div>
      </div>

      {cc.c.pendingOffer && (
        <Card class="highlight">
          <h2>✨ Career milestone: pick a new job</h2>
          <p class="muted small">Your old skills stay. The new job brings its own moves and a fresh skill tree starting at Trainee.</p>
          <div class="career-grid">
            {cc.c.pendingOffer.map((o) => (
              <button
                class="career-card"
                onClick={() => {
                  const err = pickCareer(s, id, o);
                  if (err) notify(err, 'error');
                  else notify(`${cc.c.name} is now also a ${nameOf(o)}!`, 'good');
                }}
              >
                <Portrait c={{ careers: [o], appearance: cc.c.appearance }} size={56} />
                <div class="cc-body">
                  <b>{nameOf(o)}</b>
                  <span class="small">
                    <b>{nameOf(bundle.careers.find((c) => c.id === o)?.active)}</b>: {abilitySummary(bundle.careers.find((c) => c.id === o)?.active)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2>
          Stats {cc.c.unspentPoints > 0 && <span class="badge gold">{cc.c.unspentPoints} point{cc.c.unspentPoints === 1 ? '' : 's'} to spend</span>}
        </h2>
        <StatBars stats={cc.c.stats} onPlus={cc.c.unspentPoints > 0 ? plus : undefined} />
        <p class="muted small">One point per level. Skill-tree perks add on top in fights.</p>
      </Card>

      <Card>
        <div class="tabs-inline">
          {careers.map((c, i) => (
            <button class={`tab ${c === cid ? 'on' : ''}`} onClick={() => setTab(i)}>
              {nameOf(c)} {pointsLeft(bundle, cc, c) > 0 && <span class="dot" />}
            </button>
          ))}
        </div>
        <div class="row">
          <CareerChip id={cid} />
          <RankBar cc={cc} careerId={cid} />
          <span class={`badge ${left > 0 ? 'gold' : ''}`}>
            {left} / {skillPointsAt(rank)} skill points
          </span>
        </div>
        <p class="muted small">
          Career XP comes from fighting as a {nameOf(careers[careers.length - 1])}. Each rank ({RANKS.join(' → ')}) gives 2 skill points and opens the next row.
        </p>
        <div class="tree">
          {tiers.map((tier) => (
            <div class="tree-tier">
              <div class="tier-label">{RANKS[Math.min(4, Math.max(...tree.filter((n) => n.tier === tier).map((n) => n.rank)) - 1)]}</div>
              <div class="tier-nodes">
                {tree
                  .filter((n) => n.tier === tier)
                  .map((n) => {
                    const owned = cc.nodes.includes(n.id);
                    const why = owned ? null : unlockBlocker(bundle, cc, n);
                    const state = owned ? 'owned' : why ? 'locked' : 'open';
                    return (
                      <button class={`skill ${state} ${n.kind}`} disabled={state !== 'open'} onClick={() => unlock(n)} title={why ?? (owned ? 'Unlocked' : `Unlock for ${n.cost} point${n.cost === 1 ? '' : 's'}`)}>
                        <span class="skill-icon">{KIND_ICON[n.kind]}</span>
                        <span class="skill-body">
                          <b>{nodeTitle(n)}</b>
                          <span class="small">{nodeDesc(n)}</span>
                          <span class="skill-foot small">{owned ? '✓ Unlocked' : why ? `🔒 ${why}` : `Unlock · ${n.cost} pt${n.cost === 1 ? '' : 's'}`}</span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

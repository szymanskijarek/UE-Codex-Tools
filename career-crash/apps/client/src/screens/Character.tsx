import { useEffect, useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { STAT_KEYS, type StatKey } from '@cc/content-schema';
import { careerSlots, cumulativeXp, hasMilestone } from '@cc/game-rules';
import { finalStats, indexContent } from '@cc/sim';
import { api } from '../api';
import { descOf, nameOf, STAT_LABELS } from '../i18n';
import { act, me, navigate, notify } from '../state';
import { Card, CareerChain, CareerChip, Empty, Portrait } from '../ui/components';

export function CharacterScreen({ id }: { id: string }) {
  const m = me.value;
  const c = m?.roster.find((x) => x.id === id);
  const [offer, setOffer] = useState<{ offer: string[]; rerollCost: number } | null>(null);
  const [alloc, setAlloc] = useState<Partial<Record<StatKey, number>>>({});
  useEffect(() => {
    setOffer(c?.pendingOffer ? { offer: c.pendingOffer, rerollCost: 0 } : null);
    setAlloc({});
  }, [id, c?.pendingOffer?.join()]);
  if (!m || !c) return <Empty>Character not found. <a href="#/roster">Back to staff</a></Empty>;

  const econ = bundle.economy;
  const snapStats = finalStats(indexContent(bundle), {
    ...c,
    held: c.held,
    accessory: c.accessory,
    stats: c.stats,
    rivals: [],
    friends: [],
  });
  const nextXp = cumulativeXp(econ, c.level + 1);
  const curXp = cumulativeXp(econ, c.level);
  const spent = Object.values(alloc).reduce((s, v) => s + (v ?? 0), 0);
  const milestone = hasMilestone(econ, c);
  const slots = careerSlots(econ, c.level);
  const nextSlotLevel = econ.careerSlotLevels.find((l) => l > c.level);
  const held = m.player.inventory.filter((i) => bundle.equipment.find((e) => e.id === i)?.slot === 'held');
  const acc = m.player.inventory.filter((i) => bundle.equipment.find((e) => e.id === i)?.slot === 'accessory');
  const rels = Object.entries(c.relationships).filter(([, v]) => Math.abs(v) >= 3);

  return (
    <section>
      <button class="ghost small" onClick={() => navigate('/roster')}>
        ← Staff
      </button>
      <div class="row hero">
        <Portrait c={c} size={88} />
        <div>
          <h1>{c.name}</h1>
          <div class="muted">
            Level {c.level} · {nameOf(c.personality)} — {descOf(c.personality)}
          </div>
          <CareerChain careers={c.careers} />
          <div class="xpbar" title={`${c.xp - curXp}/${nextXp - curXp} XP`}>
            <div style={{ width: `${Math.min(100, ((c.xp - curXp) / Math.max(1, nextXp - curXp)) * 100)}%` }} />
          </div>
        </div>
      </div>

      <Card class={milestone ? 'highlight' : ''}>
        <h2>
          Career path <span class="muted small">{c.careers.length}/5 · slots unlocked {slots}</span>
        </h2>
        {c.careers.map((cid, i) => (
          <div class="row">
            <span class="step">{i + 1}</span>
            <CareerChip id={cid} />
            <span class="muted small">
              {descOf(cid)} <b>{nameOf(bundle.careers.find((x) => x.id === cid)?.active)}</b>
              {i === 0 && ' · origin (passive +50%)'}
            </span>
          </div>
        ))}
        {c.masteries.map((mm) => (
          <div class="row">
            <span class="step">🏅</span>
            <b>{nameOf(mm)}</b>
            <span class="muted small">{descOf(mm)}</span>
          </div>
        ))}
        {milestone ? (
          offer ? (
            <>
              <h3>Choose the next career — this is permanent</h3>
              <div class="grid three">
                {offer.offer.map((cid) => (
                  <Card class="offer">
                    <CareerChip id={cid} />
                    <p class="small">{descOf(cid)}</p>
                    <p class="small muted">Active: {nameOf(bundle.careers.find((x) => x.id === cid)?.active)}</p>
                    <button
                      class="primary"
                      onClick={async () => {
                        const r = await act(() => api.chooseCareer(c.id, cid), `${c.name} is now a ${nameOf(cid)}!`);
                        if (r?.masteries.length) notify(`🏅 Hidden mastery unlocked: ${r.masteries.map(nameOf).join(', ')}!${r.discoveries.length ? ' First in the world!' : ''}`, 'good');
                      }}
                    >
                      Become {nameOf(cid)}
                    </button>
                  </Card>
                ))}
              </div>
              <button class="ghost" onClick={async () => setOffer(await act(() => api.offer(c.id, true)))}>
                🎲 Reroll {offer.rerollCost ? `(💵 ${offer.rerollCost})` : '(free)'}
              </button>
            </>
          ) : (
            <button class="primary" onClick={async () => setOffer(await act(() => api.offer(c.id)))}>
              🎓 See career offers
            </button>
          )
        ) : (
          c.careers.length < 5 && <p class="muted small">Next career milestone at level {nextSlotLevel}.</p>
        )}
      </Card>

      <Card>
        <h2>
          Stats {c.unspentPoints > 0 && <span class="badge gold">{c.unspentPoints - spent} to spend</span>}
        </h2>
        <div class="stats">
          {STAT_KEYS.map((k) => (
            <div class="stat">
              <span class="label">{STAT_LABELS[k]}</span>
              <div class="bar">
                <div style={{ width: `${Math.min(100, (snapStats[k] / 20) * 100)}%` }} />
              </div>
              <span class="val">
                {snapStats[k]}
                {alloc[k] ? <span class="good"> +{alloc[k]}</span> : ''}
              </span>
              {c.unspentPoints - spent > 0 && (c.allocated[k] ?? 0) + (alloc[k] ?? 0) < econ.maxPointsPerStat && (
                <button class="tiny" onClick={() => setAlloc({ ...alloc, [k]: (alloc[k] ?? 0) + 1 })}>
                  +
                </button>
              )}
            </div>
          ))}
        </div>
        {spent > 0 && (
          <div class="row">
            <button class="primary" onClick={async () => (await act(() => api.allocate(c.id, alloc), 'Stats updated')) && setAlloc({})}>
              Confirm
            </button>
            <button class="ghost" onClick={() => setAlloc({})}>
              Reset
            </button>
          </div>
        )}
      </Card>

      <Card>
        <h2>Equipment</h2>
        <label class="field">
          Held item
          <select value={c.held ?? ''} onChange={(e) => act(() => api.equip(c.id, { held: (e.target as HTMLSelectElement).value || null }), 'Equipped')}>
            <option value="">{c.held ? `Unequip ${nameOf(c.held)}` : '— bare hands —'}</option>
            {c.held && <option value={c.held}>{nameOf(c.held)} (equipped)</option>}
            {held.map((i) => (
              <option value={i}>{nameOf(i)}</option>
            ))}
          </select>
        </label>
        <label class="field">
          Accessory
          <select value={c.accessory ?? ''} onChange={(e) => act(() => api.equip(c.id, { accessory: (e.target as HTMLSelectElement).value || null }), 'Equipped')}>
            <option value="">{c.accessory ? `Unequip ${nameOf(c.accessory)}` : '— none —'}</option>
            {c.accessory && <option value={c.accessory}>{nameOf(c.accessory)} (equipped)</option>}
            {acc.map((i) => (
              <option value={i}>{nameOf(i)}</option>
            ))}
          </select>
        </label>
        <p class="muted small">
          Buy more in the <a href="#/office">Office shop</a>.
        </p>
      </Card>

      <Card>
        <h2>Traits &amp; history</h2>
        {c.traits.length === 0 && <p class="muted small">No traits yet — they emerge from what happens in battle.</p>}
        {c.traits.map((tr) => (
          <div class="row">
            <span class="badge">{nameOf(tr)}</span>
            <button class="tiny" onClick={() => act(() => api.lockTrait(c.id, tr, !c.lockedTraits.includes(tr)))}>
              {c.lockedTraits.includes(tr) ? '🔒 locked' : '🔓 lock'}
            </button>
          </div>
        ))}
        <p class="small">
          {c.lifetime.battles} battles · {c.lifetime.wins}W {c.lifetime.losses}L {c.lifetime.draws}D · {c.lifetime.kos} KOs · {c.lifetime.revives} revives · {c.lifetime.mvps} MVPs · best
          streak {c.lifetime.bestWinStreak}
        </p>
        {rels.length > 0 && (
          <p class="small">
            {rels.map(([other, v]) => (
              <span class={`badge ${v < 0 ? 'red' : 'green'}`}>
                {v < 0 ? '😠 rival' : '🤝 friend'} {other.slice(-6)}
              </span>
            ))}
          </p>
        )}
      </Card>

      <button
        class="ghost danger"
        onClick={async () => {
          if (!confirm(`Retire ${c.name}? They leave your staff permanently.`)) return;
          if (await act(() => api.retire(c.id), `${c.name} retired`)) navigate('/roster');
        }}
      >
        Retire
      </button>
    </section>
  );
}

import { useEffect, useState } from 'preact/hooks';
import type { OpponentDTO } from '@cc/protocol';
import type { BattleMode } from '@cc/sim';
import { api } from '../api';
import { nameOf } from '../i18n';
import { act, currentReplay, me, navigate, notify, refreshMe } from '../state';
import { Card, CareerChain, Empty, Portrait } from '../ui/components';

const SIZE: Record<string, number> = { duel_3v3: 3, duel_5v5: 5 };

export function Fight() {
  const m = me.value;
  const [mode, setMode] = useState<BattleMode>('duel_3v3');
  const [picked, setPicked] = useState<string[]>([]);
  const [opps, setOpps] = useState<OpponentDTO[] | null>(null);
  const [busy, setBusy] = useState(false);
  const size = SIZE[mode]!;

  useEffect(() => {
    if (!m) return;
    const def = m.defences.find((d) => d.mode === mode);
    setPicked(def ? def.characterIds.filter((i) => m.roster.some((c) => c.id === i)) : m.roster.slice(0, size).map((c) => c.id));
  }, [mode, m?.roster.length]);

  useEffect(() => {
    if (!m || m.roster.length < size) return;
    api
      .opponents(mode)
      .then((r) => setOpps(r.opponents))
      .catch((e: Error) => notify(e.message, 'error'));
  }, [mode, !!m]);

  if (!m) return <Empty>Connect to the server to fight other players, or use the <a href="#/sandbox">Sandbox</a>.</Empty>;
  if (m.roster.length < size) return <Empty>You need {size} staff for this mode.</Empty>;

  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < size ? [...picked, id] : picked);

  const attack = async (o: OpponentDTO) => {
    if (picked.length !== size) return notify(`Pick ${size} fighters`, 'error');
    setBusy(true);
    try {
      const r = await api.attack({ mode, opponentId: o.playerId, characterIds: picked });
      const lv = r.progress.filter((p) => p.levelsGained > 0).length;
      const traits = r.progress.flatMap((p) => p.newTraits);
      notify(
        `${r.record.summary.winner === 'attacker' ? 'Victory!' : r.record.summary.winner === 'draw' ? 'Draw.' : 'Defeat.'} +💵${r.rewards.cash} +⭐${r.rewards.rep} · rating ${r.ratingDelta >= 0 ? '+' : ''}${r.ratingDelta}` +
          (lv ? ` · ${lv} level-up${lv > 1 ? 's' : ''}` : '') +
          (traits.length ? ` · new trait: ${traits.map(nameOf).join(', ')}` : ''),
        r.record.summary.winner === 'attacker' ? 'good' : 'info',
      );
      currentReplay.value = { id: r.record.id, input: r.record.input, resultHash: r.record.resultHash, title: `${r.record.summary.attackerName} vs ${r.record.summary.defenderName}`, back: '/fight' };
      setOpps(null);
      void refreshMe();
      navigate(`/replay/${r.record.id}`);
    } catch (e) {
      notify((e as Error).message, 'error');
      setOpps((await api.opponents(mode, true).catch(() => ({ opponents: [] }))).opponents);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1>Fight</h1>
      <div class="segmented">
        {(['duel_3v3', 'duel_5v5'] as BattleMode[]).map((md) => (
          <button class={md === mode ? 'on' : ''} onClick={() => setMode(md)} disabled={m.roster.length < SIZE[md]!}>
            {SIZE[md]}v{SIZE[md]}
          </button>
        ))}
      </div>
      <Card>
        <h2>
          Your team <span class="muted small">{picked.length}/{size}</span>
        </h2>
        <div class="pick-grid">
          {m.roster.map((c) => (
            <button class={`pick ${picked.includes(c.id) ? 'on' : ''}`} onClick={() => toggle(c.id)}>
              <Portrait c={c} size={40} />
              <span>
                <b>{c.name.split(' ')[0]}</b> Lv{c.level}
                <CareerChain careers={c.careers} />
              </span>
            </button>
          ))}
        </div>
        <button class="ghost" disabled={picked.length !== size} onClick={() => act(() => api.setDefence(mode, picked), 'Defence uploaded — it will fight while you are away')}>
          🛡️ Use as my defence
        </button>
      </Card>
      <h2>
        Opponents{' '}
        <button class="tiny" onClick={async () => setOpps((await api.opponents(mode, true)).opponents)}>
          ↻
        </button>
      </h2>
      {!opps && <p class="muted">Finding opponents…</p>}
      <div class="grid three">
        {opps?.map((o) => (
          <Card class={`opp ${o.difficulty}`}>
            <div class="row">
              <b class="grow">{o.playerName}</b>
              <span class={`badge ${o.difficulty === 'hard' ? 'red' : o.difficulty === 'easy' ? 'green' : 'gold'}`}>{o.difficulty}</span>
            </div>
            <div class="muted small">
              rating {o.rating} · power {o.power}
              {o.ghost && ' · 🤖 bot'}
            </div>
            {o.preview.map((p) => (
              <div class="small">
                {p.name} (Lv {p.level}) <CareerChain careers={p.careers} />
              </div>
            ))}
            <button class="primary" disabled={busy || m.player.wallet.tickets < 1 || picked.length !== size} onClick={() => attack(o)}>
              {busy ? 'Fighting…' : 'Attack 🎟️1'}
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}

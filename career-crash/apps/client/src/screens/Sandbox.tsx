import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { generateRecruit, toSnapshot } from '@cc/game-rules';
import { Rng, SIM_VERSION, type BattleInput, type BattleMode, type CharacterSnapshot } from '@cc/sim';
import { nameOf } from '../i18n';
import { currentReplay, navigate } from '../state';
import { Card, Portrait } from '../ui/components';

interface Slot {
  careers: string[];
  personality: string;
  held: string;
}

const careers = [...bundle.careers].sort((a, b) => a.tier - b.tier || nameOf(a.id).localeCompare(nameOf(b.id)));
const personalities = bundle.personalities.map((p) => p.id);
const helds = bundle.equipment.filter((e) => e.slot === 'held').map((e) => e.id);

const PRESETS: { name: string; a: string[][]; b: string[][] }[] = [
  { name: 'Fire vs Water', a: [['career.chef'], ['career.chef'], ['career.delivery-driver']], b: [['career.firefighter'], ['career.plumber'], ['career.paramedic']] },
  { name: 'Wet & Wired', a: [['career.plumber'], ['career.janitor'], ['career.electrician']], b: [['career.farmer'], ['career.builder'], ['career.security-guard']] },
  { name: 'Talkers vs Doers', a: [['career.lawyer'], ['career.journalist'], ['career.influencer']], b: [['career.mechanic'], ['career.builder'], ['career.farmer']] },
  { name: 'Pixel Pals', a: [['career.barista'], ['career.hairdresser'], ['career.mime']], b: [['career.lifeguard'], ['career.personal-trainer'], ['career.gardener']] },
  { name: 'Pixel VIPs', a: [['career.politician'], ['career.tv-host'], ['career.food-critic']], b: [['career.astronaut'], ['career.conspiracy-podcaster'], ['career.psychologist']] },
  { name: 'Pixel Workshop', a: [['career.plumber'], ['career.mechanic'], ['career.engineer']], b: [['career.life-coach'], ['career.mime'], ['career.barista']] },
  { name: 'Masters', a: [['career.chef', 'career.firefighter', 'career.paramedic'], ['career.electrician', 'career.mechanic', 'career.engineer'], ['career.teacher', 'career.psychologist', 'career.life-coach']], b: [['career.lawyer', 'career.journalist', 'career.politician'], ['career.dj', 'career.tv-host'], ['career.police-officer', 'career.taxi-driver']] },
];

function randomSlot(rng: Rng): Slot {
  const c = rng.pick(careers.filter((x) => x.tier === 1));
  return { careers: [c.id], personality: rng.pick(personalities), held: c.art.heldItem ?? '' };
}

function snapshot(slot: Slot, id: string, rng: Rng): CharacterSnapshot {
  const base = toSnapshot(generateRecruit(bundle, rng, id));
  const masteries = bundle.masteries.filter((m) => m.requires.careers.every((c) => slot.careers.includes(c))).map((m) => m.id);
  return { ...base, careers: slot.careers, masteries: masteries.slice(0, 2), personality: slot.personality, held: slot.held || null, level: 1 + (slot.careers.length - 1) * 8 };
}

/** Local battles with no server: build two teams, pick an arena, watch (04 Gate 3 — "is it funny?"). */
export function Sandbox() {
  const [seed, setSeed] = useState(() => Math.random().toString(16).slice(2, 10));
  const [mode, setMode] = useState<BattleMode>('duel_3v3');
  const [arena, setArena] = useState(bundle.arenas[0]!.id);
  const size = mode === 'duel_5v5' ? 5 : 3;
  const [teams, setTeams] = useState<Slot[][]>(() => {
    const rng = Rng.fromSeed(seed);
    return [Array.from({ length: 5 }, () => randomSlot(rng)), Array.from({ length: 5 }, () => randomSlot(rng))];
  });

  const update = (ti: number, si: number, patch: Partial<Slot>) => setTeams(teams.map((t, i) => (i === ti ? t.map((s, j) => (j === si ? { ...s, ...patch } : s)) : t)));
  const randomize = () => {
    const rng = Rng.fromSeed(Math.random().toString(16));
    setTeams([Array.from({ length: 5 }, () => randomSlot(rng)), Array.from({ length: 5 }, () => randomSlot(rng))]);
    setSeed(Math.random().toString(16).slice(2, 10));
  };
  const preset = (p: (typeof PRESETS)[number]) => {
    const rng = Rng.fromSeed(p.name);
    const mk = (list: string[][]) => [...list, ...Array.from({ length: 5 - list.length }, () => [rng.pick(careers.filter((x) => x.tier === 1)).id])].map((cs) => ({ careers: cs, personality: rng.pick(personalities), held: bundle.careers.find((c) => c.id === cs[cs.length - 1])?.art.heldItem ?? '' }));
    setTeams([mk(p.a), mk(p.b)]);
    setMode('duel_3v3');
  };

  const fight = () => {
    const rng = Rng.fromSeed(`sandbox:${seed}`);
    const teamSnaps = mode === 'ffa'
      ? [...teams[0]!.slice(0, 3), ...teams[1]!.slice(0, 3)].map((s, i) => ({ playerId: `p${i}`, playerName: `Player ${i + 1}`, rating: 1000, characters: [snapshot(s, `ffa${i}`, rng)] }))
      : teams.map((t, ti) => ({ playerId: `sandbox-${ti}`, playerName: ti === 0 ? 'Blue Team' : 'Red Team', rating: 1000, characters: t.slice(0, size).map((s, i) => snapshot(s, `t${ti}c${i}`, rng)) }));
    const input: BattleInput = { schemaVersion: 1, contentHash: bundle.hash, simVersion: SIM_VERSION, seed, arenaId: arena, mode, teams: teamSnaps, modifiers: [] };
    currentReplay.value = { id: 'local', input, title: `Sandbox · seed ${seed}`, back: '/sandbox' };
    navigate('/replay/local');
  };

  return (
    <section>
      <h1>Sandbox</h1>
      <p class="muted">Build any teams and watch them fight — runs entirely in your browser with the same deterministic simulation as the server.</p>
      <div class="row wrap">
        <label class="field">
          Mode
          <select value={mode} onChange={(e) => setMode((e.target as HTMLSelectElement).value as BattleMode)}>
            <option value="duel_3v3">3v3</option>
            <option value="duel_5v5">5v5</option>
            <option value="ffa">Free-for-all (6)</option>
          </select>
        </label>
        <label class="field">
          Arena
          <select value={arena} onChange={(e) => setArena((e.target as HTMLSelectElement).value)}>
            {bundle.arenas.map((a) => (
              <option value={a.id}>{nameOf(a.id)}</option>
            ))}
          </select>
        </label>
        <label class="field">
          Seed
          <input value={seed} onInput={(e) => setSeed((e.target as HTMLInputElement).value)} />
        </label>
      </div>
      <div class="row wrap">
        {PRESETS.map((p) => (
          <button class="ghost small" onClick={() => preset(p)}>
            {p.name}
          </button>
        ))}
        <button class="ghost small" onClick={randomize}>
          🎲 Random
        </button>
      </div>
      <div class="grid two">
        {teams.map((t, ti) => (
          <Card class={`team-edit t${ti}`}>
            <h2>{ti === 0 ? '🔵 Blue' : '🔴 Red'}</h2>
            {t.slice(0, mode === 'ffa' ? 3 : size).map((s, si) => (
              <div class="slot">
                <Portrait c={{ careers: s.careers, appearance: { skin: '#e0ac69', hair: '#3b2a1a', hairStyle: si } }} size={34} />
                {[0, 1, 2].map((ci) => (
                  <select
                    value={s.careers[ci] ?? ''}
                    onChange={(e) => {
                      const v = (e.target as HTMLSelectElement).value;
                      const next = [...s.careers];
                      if (v) next[ci] = v;
                      else next.splice(ci);
                      update(ti, si, { careers: next.filter(Boolean) });
                    }}
                    disabled={ci > s.careers.length}
                  >
                    {ci > 0 && <option value="">{ci === s.careers.length ? '+ career' : '—'}</option>}
                    {careers.map((c) => (
                      <option value={c.id}>
                        {nameOf(c.id)}
                        {c.tier > 1 ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                ))}
                <select value={s.personality} onChange={(e) => update(ti, si, { personality: (e.target as HTMLSelectElement).value })}>
                  {personalities.map((p) => (
                    <option value={p}>{nameOf(p)}</option>
                  ))}
                </select>
                <select value={s.held} onChange={(e) => update(ti, si, { held: (e.target as HTMLSelectElement).value })}>
                  <option value="">bare hands</option>
                  {helds.map((h) => (
                    <option value={h}>{nameOf(h)}</option>
                  ))}
                </select>
              </div>
            ))}
          </Card>
        ))}
      </div>
      <button class="primary big" onClick={fight}>
        🥊 Fight!
      </button>
    </section>
  );
}

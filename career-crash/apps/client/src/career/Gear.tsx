import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { LOOT_RARITIES } from '@cc/content-schema/constants';
import { lootSellPrice, shortName } from '@cc/game-rules';
import { navigate, notify } from '../state';
import { Card } from '../ui/components';
import { LootCard, RARITY_NAMES } from './Loot';
import { equipGear, lineup, sellLoot, unequipGear, type CareerSave } from './model';

/** Worn gear per fighter, the bag of won items, and selling. */
export function GearScreen({ save: s }: { save: CareerSave }) {
  const team = lineup(s).filter((c) => !c.temp);
  const [who, setWho] = useState(s.mainId);
  const target = s.chars[who] ?? s.chars[s.mainId]!;
  const L = bundle.economy.loot;
  const bag = [...(s.bag ?? [])].sort((a, b) => LOOT_RARITIES.indexOf(b.rarity) - LOOT_RARITIES.indexOf(a.rarity));
  const total = L.rarities.reduce((n, r) => n + r.weight, 0);
  const worn = target.gear ?? [];
  return (
    <section>
      <button class="ghost small" onClick={() => navigate('/career')}>
        ← Career
      </button>
      <h1>🎒 Gear</h1>
      <p class="muted">
        💵 {s.cash} · Every win drops an item. Each fighter wears up to {L.slots}; the rest wait in your bag ({bag.length}/{L.bagCap}) or sell for cash to spend on consumables.
      </p>
      <div class="grid two">
        <Card>
          <h2>Wearing</h2>
          <div class="tabs-inline">
            {team.map((c) => (
              <button class={`tab ${c.c.id === target.c.id ? 'on' : ''}`} onClick={() => setWho(c.c.id)}>
                {shortName(bundle, c.c.name)} {(c.gear ?? []).length}/{L.slots}
              </button>
            ))}
          </div>
          {worn.map((it) => (
            <LootCard it={it}>
              <button class="ghost small" onClick={() => unequipGear(s, target.c.id, it.uid)}>
                Take off
              </button>
            </LootCard>
          ))}
          {Array.from({ length: L.slots - worn.length }, () => (
            <div class="loot-card empty muted small">Empty slot — pick something from the bag</div>
          ))}
          <h3>Drop odds per win</h3>
          <div class="loot-odds small">
            {L.rarities.map((r) => (
              <div>
                <b style={{ color: r.color }}>{RARITY_NAMES[r.id]}</b>
                <span>+{r.points} stats</span>
                <span>{((r.weight * 100) / total).toFixed(r.weight * 100 < total ? 1 : 0)}%</span>
                <span class="muted">{r.abilityBp ? `${r.abilityBp / 100}% ability` : 'no ability'}</span>
              </div>
            ))}
          </div>
          <p class="muted small">Bosses and Brutal difficulty roll twice and keep the better item.</p>
        </Card>
        <Card>
          <h2>Bag</h2>
          {bag.length === 0 && <p class="muted small">Nothing yet — win a fight to get your first item.</p>}
          {bag.map((it) => (
            <LootCard it={it}>
              <button
                class="primary small"
                onClick={() => {
                  const err = equipGear(s, target.c.id, it.uid);
                  if (err) notify(err, 'error');
                }}
              >
                Wear ({shortName(bundle, target.c.name)})
              </button>
              <button class="ghost small" onClick={() => notify(`Sold for 💵 ${sellLoot(s, it.uid)}`, 'good')}>
                Sell 💵 {lootSellPrice(bundle, it)}
              </button>
            </LootCard>
          ))}
        </Card>
      </div>
    </section>
  );
}

import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { LOOT_RARITIES } from '@cc/content-schema/constants';
import { lootSellPrice, shortName } from '@cc/game-rules';
import { navigate, notify } from '../state';
import { Card } from '../ui/components';
import { LootCard, RARITY_NAMES } from './Loot';
import { equipGear, mainChar, sellLoot, unequipGear, type CareerSave } from './model';

/**
 * Perks & Benefits: loot in LinkedIn language. What each fighter (you and every
 * hire, in the squad or on the bench) has been assigned, the unclaimed perks, and cashing out.
 */
export function GearScreen({ save: s, charId }: { save: CareerSave; charId?: string }) {
  const team = [mainChar(s), ...Object.values(s.chars).filter((c) => c.c.id !== s.mainId && !c.temp)];
  const [who, setWho] = useState(charId && s.chars[charId] ? charId : s.mainId);
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
      <h1>🎁 Perks & Benefits</h1>
      <p class="muted">
        💵 {s.cash} · Every win comes with a tax-free* perk. Each fighter, hires included, can hold {L.slots}; the rest stay unclaimed ({bag.length}/{L.bagCap}) or cash out for consumables money.
        <br />
        <span class="small">*Not financial advice. Please consult your accountant, who is also in a fight.</span>
      </p>
      <div class="grid two">
        <Card>
          <h2>Benefits package</h2>
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
                Unassign
              </button>
            </LootCard>
          ))}
          {Array.from({ length: L.slots - worn.length }, () => (
            <div class="loot-card empty muted small">Open position — assign an unclaimed perk</div>
          ))}
          <h3>Perk odds per win</h3>
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
          <p class="muted small">Bosses and Brutal difficulty roll twice and keep the better perk.</p>
        </Card>
        <Card>
          <h2>Unclaimed perks</h2>
          {bag.length === 0 && <p class="muted small">Nothing yet — win a fight to unlock your first perk.</p>}
          {bag.map((it) => (
            <LootCard it={it}>
              <button
                class="primary small"
                onClick={() => {
                  const err = equipGear(s, target.c.id, it.uid);
                  if (err) notify(err, 'error');
                }}
              >
                Assign to {shortName(bundle, target.c.name)}
              </button>
              <button class="ghost small" onClick={() => notify(`Cashed out for 💵 ${sellLoot(s, it.uid)}`, 'good')}>
                Cash out 💵 {lootSellPrice(bundle, it)}
              </button>
            </LootCard>
          ))}
        </Card>
      </div>
    </section>
  );
}

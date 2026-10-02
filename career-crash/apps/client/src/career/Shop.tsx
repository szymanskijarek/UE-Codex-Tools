import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { LOADOUT_SLOTS, shopTierAt, shortName } from '@cc/game-rules';
import { nameOf, t } from '../i18n';
import { notify } from '../state';
import { Card } from '../ui/components';
import { buy, equip, lineup, owned, shopStock, unequip, type CareerSave } from './model';
import { PageHead } from './CoreActions';
import { PuppetView } from './PuppetView';

function when(itemId: string): string {
  const it = bundle.shopItems.find((i) => i.id === itemId);
  if (!it || it.kind === 'gear') return 'Always on';
  return it.trigger?.when === 'start' ? 'At kick-off' : `Below ${Math.round((it.trigger?.hpBp ?? 5000) / 100)}% HP`;
}

/** The shop, the stockroom and each fighter's three loadout slots. */
export function ShopScreen({ save: s }: { save: CareerSave }) {
  const team = lineup(s).filter((c) => !c.temp);
  const [who, setWho] = useState(s.mainId);
  const [hype, setHype] = useState(0);
  const target = s.chars[who] ?? s.chars[s.mainId]!;
  const stock = shopStock(s);
  const stash = Object.entries(s.inventory).filter(([, n]) => n > 0);
  const tier = shopTierAt(s.stage);
  return (
    <section>
      <PageHead back="/career" backLabel="Home" title="🛒 Corner Shop">
        💵 {s.cash} · Each fighter carries up to {LOADOUT_SLOTS} items. Consumables fire once in a fight and are used up. Stat-boosting gear comes as a perk for winning fights: see <a href="#/career/perks">🎁 Perks & Benefits</a>.
        {tier < 3 && ' More stock arrives as you climb the ladder.'}
      </PageHead>

      <div class="grid two">
        <Card>
          <h2>Loadout</h2>
          <div class="tabs-inline">
            {team.map((c) => (
              <button class={`tab ${c.c.id === target.c.id ? 'on' : ''}`} onClick={() => setWho(c.c.id)}>
                {shortName(bundle, c.c.name)}
              </button>
            ))}
          </div>
          <div class="row">
            <PuppetView careerId={target.c.careers[target.c.careers.length - 1]!} personality={target.c.personality} appearance={target.c.appearance} size={150} hype={hype} voiceId={target.c.id} lines="menu_equip" />
            <div class="grow">
              <b>{target.c.name}</b>
              <div class="slots">
                {Array.from({ length: LOADOUT_SLOTS }, (_, i) => {
                  const itemId = target.loadout?.[i];
                  const it = itemId ? bundle.shopItems.find((x) => x.id === itemId) : null;
                  return (
                    <button class={`slot-item ${it ? 'full' : ''}`} title={it ? `${nameOf(it.id)} — click to unpack` : 'Empty slot'} onClick={() => itemId && unequip(s, target.c.id, i)}>
                      <span class="slot-icon">{it?.icon ?? '＋'}</span>
                      <span class="small">{it ? nameOf(it.id) : 'Empty'}</span>
                      {it && <span class="muted small">{when(it.id)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <h3>Stockroom</h3>
          {stash.length === 0 && <p class="muted small">Nothing in stock — buy something from the shop.</p>}
          <div class="stash">
            {stash.map(([id, n]) => {
              const it = bundle.shopItems.find((x) => x.id === id);
              return (
                <button
                  class="stash-item"
                  title={t(`${id}.desc`, '')}
                  onClick={() => {
                    const err = equip(s, target.c.id, id);
                    if (err) notify(err, 'error');
                    else setHype((h) => h + 1);
                  }}
                >
                  {it?.icon} {nameOf(id)} <b>×{n}</b>
                </button>
              );
            })}
          </div>
          <p class="muted small">Click an item in the stockroom to pack it for {shortName(bundle, target.c.name)}; click a slot to unpack.</p>
        </Card>

        <Card>
          <h2>For sale</h2>
          {(['consumable'] as const).map((kind) => (
            <>
              <h3>🍔 Consumables</h3>
              <div class="shop-list">
                {stock
                  .filter((i) => i.kind === kind)
                  .map((i) => (
                    <div class="shop-item">
                      <span class="shop-icon">{i.icon}</span>
                      <div class="grow">
                        <b>{nameOf(i.id)}</b> <span class="muted small">· {when(i.id)}</span>
                        <div class="small">{t(`${i.id}.desc`, '')}</div>
                        {owned(s, i.id) > 0 && <div class="muted small">You have {owned(s, i.id)}</div>}
                      </div>
                      <button
                        class="primary small"
                        disabled={s.cash < i.price}
                        onClick={() => {
                          const err = buy(s, i.id);
                          if (err) notify(err, 'error');
                          else notify(`Bought ${nameOf(i.id)}`, 'good');
                        }}
                      >
                        💵 {i.price}
                      </button>
                    </div>
                  ))}
              </div>
            </>
          ))}
        </Card>
      </div>
    </section>
  );
}

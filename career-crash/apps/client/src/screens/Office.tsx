import { useEffect, useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { rosterSlotCost } from '@cc/game-rules';
import type { ApplicantDTO, JobBoardDTO, ShopDTO } from '@cc/protocol';
import { api } from '../api';
import { descOf, nameOf } from '../i18n';
import { act, me } from '../state';
import { Card, CareerChain, CareerChip, Empty, Portrait } from '../ui/components';

export function Office() {
  const m = me.value;
  const [tab, setTab] = useState<'hire' | 'jobs' | 'shop'>('hire');
  const [apps, setApps] = useState<ApplicantDTO[]>([]);
  const [jobs, setJobs] = useState<JobBoardDTO | null>(null);
  const [shop, setShop] = useState<ShopDTO | null>(null);
  const reload = async () => {
    const [a, j, s] = await Promise.all([api.recruits(), api.jobs(), api.shop()]);
    setApps(a.applicants);
    setJobs(j);
    setShop(s);
  };
  useEffect(() => {
    if (m) void reload();
  }, [!!m]);
  if (!m) return <Empty>Connect to the server to hire staff.</Empty>;
  const econ = bundle.economy;

  return (
    <section>
      <h1>Office</h1>
      <div class="segmented">
        <button class={tab === 'hire' ? 'on' : ''} onClick={() => setTab('hire')}>
          👔 Applicants
        </button>
        <button class={tab === 'jobs' ? 'on' : ''} onClick={() => setTab('jobs')}>
          📋 Job board
        </button>
        <button class={tab === 'shop' ? 'on' : ''} onClick={() => setTab('shop')}>
          🛒 Shop
        </button>
      </div>
      {tab === 'hire' && (
        <>
          <p class="muted">
            Today’s applicants. Staff {m.roster.length}/{m.player.rosterSlots}.{' '}
            {m.player.rosterSlots < econ.rosterSlots.max && (
              <button class="tiny" onClick={() => act(() => api.buySlot(), 'New desk purchased')}>
                + desk (💵 {rosterSlotCost(econ, m.player.rosterSlots + 1)})
              </button>
            )}
          </p>
          <div class="grid three">
            {apps.map((a) => (
              <Card class={`applicant ${a.rarity}`}>
                <div class="row">
                  <Portrait c={a.character} />
                  <div>
                    <b>{a.character.name}</b>
                    <div class="muted small">
                      {a.rarity} · {nameOf(a.character.personality)}
                    </div>
                    <CareerChain careers={a.character.careers} />
                  </div>
                </div>
                <p class="small">{descOf(a.character.careers[0]!)}</p>
                <button class="primary" disabled={a.hired} onClick={async () => (await act(() => api.hire(a.index), `${a.character.name} hired!`)) && reload()}>
                  {a.hired ? 'Hired' : `Hire 💵 ${a.cost}`}
                </button>
              </Card>
            ))}
          </div>
        </>
      )}
      {tab === 'jobs' && jobs && (
        <>
          <p class="muted">Unlock careers with ⭐ reputation. Unlocked careers can be offered at milestones.</p>
          <div class="grid three">
            {jobs.careers
              .filter((c) => !c.unlocked)
              .map((c) => (
                <Card>
                  <CareerChip id={c.id} />
                  <p class="small">{descOf(c.id)}</p>
                  {!c.eligible && <p class="small muted">Nobody on staff meets the prerequisites yet.</p>}
                  <button class="primary" onClick={async () => (await act(() => api.unlockJob(c.id), `${nameOf(c.id)} unlocked`)) && reload()}>
                    Unlock ⭐ {c.cost}
                  </button>
                </Card>
              ))}
          </div>
          <h3>Unlocked</h3>
          <div class="chips">
            {jobs.careers
              .filter((c) => c.unlocked)
              .map((c) => (
                <CareerChip id={c.id} small />
              ))}
          </div>
        </>
      )}
      {tab === 'shop' && shop && (
        <>
          <p class="muted">Today’s stock. Everything comes from everyday life.</p>
          <div class="grid three">
            {shop.items.map((i) => {
              const def = bundle.equipment.find((e) => e.id === i.id)!;
              return (
                <Card>
                  <b>{nameOf(i.id)}</b>
                  <div class="muted small">
                    {def.slot} · {def.rarity}
                    {def.attack && ` · dmg ${def.attack.base} · reach ${(def.attack.rangeMm / 1000).toFixed(1)}m`}
                  </div>
                  {def.statMods && (
                    <div class="small">
                      {Object.entries(def.statMods)
                        .map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`)
                        .join(', ')}
                    </div>
                  )}
                  <button class="primary" onClick={() => act(() => api.buy(i.id), `Bought ${nameOf(i.id)}`)}>
                    Buy 💵 {i.price}
                  </button>
                </Card>
              );
            })}
          </div>
          <p class="small muted">Inventory: {m.player.inventory.length ? m.player.inventory.map(nameOf).join(', ') : 'empty'}</p>
        </>
      )}
    </section>
  );
}

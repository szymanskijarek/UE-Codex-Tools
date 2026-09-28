import { bundle } from '@cc/content';
import { hasMilestone } from '@cc/game-rules';
import { nameOf } from '../i18n';
import { me, navigate } from '../state';
import { Card, CareerChain, Empty, Portrait } from '../ui/components';

export function Roster() {
  const m = me.value;
  if (!m) return <Empty>Sign in to manage your staff. The <a href="#/sandbox">Sandbox</a> works offline.</Empty>;
  const defence = new Set(m.defences.flatMap((d) => d.characterIds));
  return (
    <section>
      <h1>
        Staff <span class="muted">{m.roster.length}/{m.player.rosterSlots}</span>
      </h1>
      <div class="grid">
        {m.roster.map((c) => (
          <Card class="char-card" onClick={() => navigate(`/character/${c.id}`)}>
            <div class="row">
              <Portrait c={c} />
              <div class="grow">
                <b>{c.name}</b>
                <div class="muted small">
                  Lv {c.level} · {nameOf(c.personality)}
                  {defence.has(c.id) && ' · 🛡️ defending'}
                </div>
                <CareerChain careers={c.careers} />
              </div>
            </div>
            <div class="badges">
              {hasMilestone(bundle.economy, c) && <span class="badge gold">🎓 milestone</span>}
              {c.unspentPoints > 0 && <span class="badge">+{c.unspentPoints} pts</span>}
              {c.masteries.map((mm) => (
                <span class="badge purple">🏅 {nameOf(mm)}</span>
              ))}
              {c.traits.map((tr) => (
                <span class="badge">{nameOf(tr)}</span>
              ))}
            </div>
            <div class="muted small">
              {c.lifetime.wins}W {c.lifetime.losses}L · {c.lifetime.kos} KOs
            </div>
          </Card>
        ))}
      </div>
      <p class="muted">
        Hire more staff at the <a href="#/office">Office</a>.
      </p>
    </section>
  );
}

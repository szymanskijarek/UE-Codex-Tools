import { bundle } from '@cc/content';
import { hasMilestone } from '@cc/game-rules';
import { api } from '../api';
import { t } from '../i18n';
import { act, me, navigate, online } from '../state';
import { Card, CareerChain, Portrait } from '../ui/components';

export function Home() {
  const m = me.value;
  if (!m) {
    return (
      <section>
        <h1>Career Crash</h1>
        <p class="lead">Ordinary people. Extraordinary careers. Ridiculous fights.</p>
        {online.value === 'offline' ? (
          <Card>
            <p>
              The game server isn’t reachable. Start it with <code>pnpm dev:worker</code>, or try the <a href="#/sandbox">Sandbox</a> — battles run right in your browser.
            </p>
          </Card>
        ) : (
          <p class="muted">Signing you in…</p>
        )}
      </section>
    );
  }
  const p = m.player;
  const pend = m.pending;
  const hasPending = pend.cash > 0 || pend.rep > 0;
  const milestones = m.roster.filter((c) => hasMilestone(bundle.economy, c));
  const unspent = m.roster.filter((c) => c.unspentPoints > 0);
  return (
    <section>
      <h1>{p.displayName}</h1>
      <p class="lead">
        {t(`league.${p.league}`)} league · rating {p.rating} · {p.winsToday} win{p.winsToday === 1 ? '' : 's'} today
      </p>
      {(hasPending || pend.defences.wins + pend.defences.losses + pend.defences.draws > 0) && (
        <Card class="highlight">
          <h2>While you were away</h2>
          <p>
            {pend.defences.wins + pend.defences.losses + pend.defences.draws > 0 && (
              <>
                Your defence fought {pend.defences.wins + pend.defences.losses + pend.defences.draws} time(s): {pend.defences.wins}W {pend.defences.losses}L {pend.defences.draws}D.{' '}
              </>
            )}
            {pend.offlineHours > 0 && <>Your staff worked {pend.offlineHours}h of shifts. </>}
          </p>
          <p class="big">
            +💵 {pend.cash} · +⭐ {pend.rep}
          </p>
          <button class="primary" onClick={() => act(() => api.collect(), 'Collected!')} disabled={!hasPending}>
            Collect
          </button>
          {m.unreadReports > 0 && (
            <button onClick={() => navigate('/reports')} class="ghost">
              Watch {m.unreadReports} defence replay{m.unreadReports === 1 ? '' : 's'}
            </button>
          )}
        </Card>
      )}
      {milestones.length > 0 && (
        <Card>
          <h2>🎓 Career milestones ready</h2>
          {milestones.map((c) => (
            <div class="row clickable" onClick={() => navigate(`/character/${c.id}`)}>
              <Portrait c={c} size={40} />
              <div>
                <b>{c.name}</b> (Lv {c.level}) can take a new career
                <CareerChain careers={c.careers} />
              </div>
            </div>
          ))}
        </Card>
      )}
      {unspent.length > 0 && (
        <Card>
          <h2>📈 Unspent stat points</h2>
          {unspent.map((c) => (
            <div class="row clickable" onClick={() => navigate(`/character/${c.id}`)}>
              <Portrait c={c} size={32} /> {c.name}: {c.unspentPoints} point{c.unspentPoints === 1 ? '' : 's'}
            </div>
          ))}
        </Card>
      )}
      {m.roster.every((c) => c.lifetime.battles === 0) && (
        <Card>
          <h2>How it works</h2>
          <ol class="small">
            <li>
              Your <b>staff</b> are ordinary people with careers. They fight on their own — you never control them directly.
            </li>
            <li>
              <b>Fight</b> other players’ defence teams. Each attack costs a 🎟️ ticket and earns 💵 cash, ⭐ reputation and XP.
            </li>
            <li>
              Levelling up unlocks <b>career milestones</b>: a Chef might become a Firefighter, then a Paramedic… some combinations hide secret masteries.
            </li>
            <li>
              Your <b>defence</b> fights while you are away. Come back to collect rewards and watch the replays.
            </li>
          </ol>
        </Card>
      )}
      <div class="cta-row">
        <button class="primary big" onClick={() => navigate('/fight')}>
          🥊 Challenge players ({p.wallet.tickets} 🎟️)
        </button>
        <button class="ghost" onClick={() => navigate('/roster')}>
          👥 Manage staff
        </button>
      </div>
    </section>
  );
}

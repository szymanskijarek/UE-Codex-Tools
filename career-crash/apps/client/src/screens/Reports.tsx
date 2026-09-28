import { useEffect, useState } from 'preact/hooks';
import type { LeaderboardDTO, ReportDTO } from '@cc/protocol';
import { api } from '../api';
import { t } from '../i18n';
import { currentReplay, me, navigate, notify, refreshMe } from '../state';
import { Card, Empty } from '../ui/components';

type HistoryRow = { id: string; createdAt: number; defenderName: string; outcome: string; ratingDelta: number; headline: string | null };

export function Reports() {
  const m = me.value;
  const [reports, setReports] = useState<ReportDTO[] | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [board, setBoard] = useState<LeaderboardDTO | null>(null);
  useEffect(() => {
    if (!m) return;
    void Promise.all([api.reports(), api.history(), api.leaderboard()])
      .then(([r, h, b]) => {
        setReports(r.reports);
        setHistory(h.battles);
        setBoard(b);
        void refreshMe();
      })
      .catch((e: Error) => notify(e.message, 'error'));
  }, [!!m]);
  if (!m) return <Empty>Connect to the server to see your battle reports.</Empty>;

  const open = async (id: string) => {
    const r = await api.battle(id);
    currentReplay.value = { id, input: r.input, resultHash: r.resultHash, title: `${r.summary.attackerName} vs ${r.summary.defenderName}`, back: '/reports' };
    navigate(`/replay/${id}`);
  };
  const when = (ms: number) => new Date(ms).toLocaleString();

  return (
    <section>
      <h1>Reports</h1>
      <h2>🛡️ Your defence</h2>
      {reports?.length === 0 && <p class="muted">Nobody has attacked you yet.</p>}
      {reports?.map((r) => (
        <Card class="clickable" onClick={() => open(r.id)}>
          <div class="row">
            <span class={`badge ${r.outcome === 'win' ? 'green' : r.outcome === 'loss' ? 'red' : 'gold'}`}>{r.outcome.toUpperCase()}</span>
            <b class="grow">vs {r.attackerName}</b>
            <span class="muted small">
              {r.ratingDelta >= 0 ? '+' : ''}
              {r.ratingDelta} · {when(r.createdAt)}
            </span>
          </div>
          {r.headline && <p class="headline small">“{r.headline}”</p>}
        </Card>
      ))}
      <h2>⚔️ Your attacks</h2>
      {history?.length === 0 && <p class="muted">No attacks yet.</p>}
      {history?.map((r) => (
        <Card class="clickable" onClick={() => open(r.id)}>
          <div class="row">
            <span class={`badge ${r.outcome === 'win' ? 'green' : r.outcome === 'loss' ? 'red' : 'gold'}`}>{r.outcome.toUpperCase()}</span>
            <b class="grow">vs {r.defenderName}</b>
            <span class="muted small">
              {r.ratingDelta >= 0 ? '+' : ''}
              {r.ratingDelta} · {when(r.createdAt)}
            </span>
          </div>
          {r.headline && <p class="headline small">“{r.headline}”</p>}
        </Card>
      ))}
      <h2>🏆 Leaderboard</h2>
      <Card>
        <table class="table">
          <tbody>
            {board?.entries.map((e, i) => (
              <tr class={e.playerId === m.player.id ? 'me' : ''}>
                <td>{i + 1}</td>
                <td>{e.displayName}</td>
                <td>{t(`league.${e.league}`)}</td>
                <td>{e.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

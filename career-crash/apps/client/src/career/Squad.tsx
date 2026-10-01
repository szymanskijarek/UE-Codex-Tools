import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { careerRank, hrMood, RANK_XP, RANKS, SQUAD_UNLOCK_RANK, stageInfo, unreadHrNotes, type CareerChar } from '@cc/game-rules';
import { abilitySummary, nameOf } from '../i18n';
import { navigate, notify } from '../state';
import { Card, CareerChip, Portrait } from '../ui/components';
import { PuppetView } from './PuppetView';
import { Loadout, RankBar, skillAlert } from './Career';
import { HrChips } from './File';
import { GearIcons } from './Loot';
import { applicants, currentCareer, dismiss, hire, HIRE_COST, lineup, lineupHr, mainChar, onGardenLeave, rarityOf, ROSTER_CAP, SQUAD_SIZE, squadUnlocked, toggleSquad, type CareerSave } from './model';

const LEAVE_PCT = Math.round(bundle.economy.hr.gardenLeaveXpBp / 100);

/**
 * Squad builder (06 §2): hire applicants, pick the two who fight with you,
 * send the rest on Garden Leave, and read everyone's personnel file.
 */
export function SquadScreen({ save: s }: { save: CareerSave }) {
  const m = mainChar(s);
  const [hype, setHype] = useState(1);
  if (!squadUnlocked(s)) {
    const cid = currentCareer(m);
    const need = RANK_XP[SQUAD_UNLOCK_RANK - 1]!;
    return (
      <section>
        <button class="ghost small" onClick={() => navigate('/career')}>
          ← Career
        </button>
        <Card class="locked-card">
          <h1>🔒 Squad building</h1>
          <p>
            Agency temps fight alongside {m.c.name} for now. Reach <b>{RANKS[SQUAD_UNLOCK_RANK - 1]}</b> rank as a {nameOf(cid)} to hire and train your own teammates.
          </p>
          <RankBar cc={m} careerId={cid} />
          <p class="muted small">
            {m.careerXp[cid] ?? 0} / {need} career XP · rank {careerRank(m, cid)} of 5
          </p>
          <button class="ghost small" onClick={() => navigate(`/career/file/${m.c.id}`)}>
            📁 Read your own personnel file
          </button>
        </Card>
      </section>
    );
  }
  const staff = Object.values(s.chars).filter((c) => c.c.id !== s.mainId);
  const squad = staff.filter((c) => s.squad.includes(c.c.id));
  const leave = onGardenLeave(s);
  const pool = applicants(s);
  const team = lineup(s);
  const hr = lineupHr(s, team);
  const info = stageInfo(bundle, s.stage);
  const row = (cc: CareerChar, inSquad: boolean) => {
    const cid = currentCareer(cc);
    const unread = unreadHrNotes(bundle, cc).length;
    const mood = inSquad ? (hrMood(hr.get(cc.c.id) ?? []) ?? 'neutral') : 'neutral';
    return (
      <div class={`staff-row ${inSquad ? '' : 'on-leave'}`}>
        <Portrait c={cc.c} size={48} mood={mood} />
        <div class="grow">
          <b>{cc.c.name}</b> <GearIcons gear={cc.gear} />
          <div class="muted small">
            Lv {cc.c.level} · {nameOf(cc.c.personality)} · {RANKS[careerRank(cc, cid) - 1]} {nameOf(cid)}
          </div>
          {mood !== 'neutral' && <div class="hr-warning small">😠 Unhappy with the line-up</div>}
        </div>
        <div class="row-actions">
          <button class={`ghost small ${unread ? 'alert' : ''}`} title={unread ? `${unread} unread HR note${unread === 1 ? '' : 's'}` : 'Personnel file'} onClick={() => navigate(`/career/file/${cc.c.id}`)}>
            📁 File
          </button>
          <button class={`ghost small ${skillAlert(cc) ? 'alert' : ''}`} onClick={() => navigate(`/career/skills/${cc.c.id}`)}>
            🌳 Skills
          </button>
          <button class="ghost small" onClick={() => navigate(`/career/perks/${cc.c.id}`)}>
            🎁 Perks
          </button>
          <button
            class="ghost small"
            onClick={() => {
              const err = toggleSquad(s, cc.c.id);
              if (err) notify(err, 'error');
              else notify(inSquad ? `${cc.c.name} is off on Garden Leave. Deckchair secured.` : `${cc.c.name} is back at work.`, 'good');
            }}
          >
            {inSquad ? '🌷 Garden Leave' : '💼 Back to work'}
          </button>
          <button
            class="ghost small"
            title="Let them go"
            onClick={() => {
              if (window.confirm(`Let ${cc.c.name} go?`)) dismiss(s, cc.c.id);
            }}
          >
            ✖
          </button>
        </div>
      </div>
    );
  };
  return (
    <section>
      <button class="ghost small" onClick={() => navigate('/career')}>
        ← Career
      </button>
      <h1>👥 Squad</h1>
      <p class="muted">
        {SQUAD_SIZE} teammates fight with {m.c.name}; empty slots are filled by agency temps. Everyone else is on 🌷 Garden Leave. 💵 {s.cash} · staff {staff.length + 1}/{ROSTER_CAP}
      </p>

      <Card>
        <h2>Next fight line-up</h2>
        <p class="muted small">
          Stage {s.stage + 1}: {info.company} at the {nameOf(info.arenaId)}
          {info.boss ? ' (boss fight)' : ''}. HR notes depend on the arena, the opponents and who you put together.
        </p>
        <div class="squad-slots">
          {team.map((cc, i) => {
            const active = hr.get(cc.c.id) ?? [];
            const mood = hrMood(active) ?? 'neutral';
            return (
              <div class={`squad-slot ${cc.temp ? 'temp' : ''}`}>
                <PuppetView
                  careerId={cc.c.careers[cc.c.careers.length - 1]!}
                  personality={cc.c.personality}
                  appearance={cc.c.appearance}
                  size={130}
                  hype={cc.temp ? 0 : hype}
                  flip={i > 0}
                  voiceId={cc.c.id}
                  talk={hype > 1 ? i === team.map((x) => !x.temp).lastIndexOf(true) : i === 0}
                  lines={hype > 1 ? 'menu_hire' : 'menu_hello'}
                  mood={mood}
                />
                <b>{cc.c.name}</b>
                {!cc.temp && <Loadout ids={cc.loadout} />}
                <span class="muted small">{i === 0 ? 'You' : cc.temp ? 'Agency temp' : `Lv ${cc.c.level} ${nameOf(currentCareer(cc))}`}</span>
                {!cc.temp && <HrChips cc={cc} active={active} />}
                {!cc.temp && (
                  <button class={`ghost small ${unreadHrNotes(bundle, cc).length ? 'alert' : ''}`} onClick={() => navigate(`/career/file/${cc.c.id}`)}>
                    📁 File
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2>💼 In the squad</h2>
        {staff.length === 0 && <p class="muted">No one hired yet. Pick someone from the applicants below.</p>}
        {staff.length > 0 && squad.length === 0 && <p class="muted">Nobody: agency temps will cover. Bring someone back from Garden Leave.</p>}
        {squad.map((cc) => row(cc, true))}
      </Card>

      {leave.length > 0 && (
        <Card class="garden-leave">
          <h2>🌷 Garden Leave</h2>
          <p class="muted small">Still on the payroll, "between projects". They pick up {LEAVE_PCT}% of each fight's XP from online courses taken in a deckchair.</p>
          {leave.map((cc) => row(cc, false))}
        </Card>
      )}

      <Card>
        <h2>Applicants</h2>
        <p class="muted small">New applicants turn up after every win. Personnel files are sealed until you hire.</p>
        <div class="grid three">
          {pool.map((c) => {
            const rarity = rarityOf(c);
            const career = bundle.careers.find((x) => x.id === c.careers[0]);
            return (
              <div class={`applicant ${rarity}`}>
                <div class="row">
                  <Portrait c={c} size={56} />
                  <div>
                    <b>{c.name}</b>
                    <div class="muted small">
                      Lv {c.level} · {nameOf(c.personality)}
                    </div>
                    <span class={`badge ${rarity === 'epic' ? 'purple' : rarity === 'rare' ? 'gold' : ''}`}>{rarity}</span>
                  </div>
                </div>
                <CareerChip id={c.careers[0]!} small />
                <p class="small">
                  <b>{nameOf(career?.active)}</b>: {abilitySummary(career?.active)}
                </p>
                <p class="small hr-sealed">📁 Personnel file: sealed</p>
                <button
                  class="primary small"
                  disabled={s.cash < HIRE_COST[rarity]}
                  onClick={() => {
                    const err = hire(s, c);
                    if (err) notify(err, 'error');
                    else {
                      notify(s.squad.length < SQUAD_SIZE ? `${c.name} joins the squad!` : `${c.name} is hired, and starts on Garden Leave.`, 'good');
                      setHype((h) => h + 1);
                    }
                  }}
                >
                  Hire · 💵 {HIRE_COST[rarity]}
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

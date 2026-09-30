import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { careerRank, RANK_XP, RANKS, SQUAD_UNLOCK_RANK } from '@cc/game-rules';
import { abilitySummary, nameOf } from '../i18n';
import { navigate, notify } from '../state';
import { Card, CareerChip, Portrait } from '../ui/components';
import { PuppetView } from './PuppetView';
import { Loadout, RankBar, skillAlert } from './Career';
import { GearIcons } from './Loot';
import { applicants, currentCareer, dismiss, hire, HIRE_COST, lineup, mainChar, rarityOf, ROSTER_CAP, squadUnlocked, toggleSquad, type CareerSave } from './model';

/** Squad builder: hire applicants, choose the two teammates who fight with you, manage their skills. */
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
        </Card>
      </section>
    );
  }
  const staff = Object.values(s.chars).filter((c) => c.c.id !== s.mainId);
  const pool = applicants(s);
  const team = lineup(s);
  return (
    <section>
      <button class="ghost small" onClick={() => navigate('/career')}>
        ← Career
      </button>
      <h1>👥 Squad</h1>
      <p class="muted">
        Two teammates fight with {m.c.name}. Empty slots are filled by agency temps. 💵 {s.cash} · staff {staff.length + 1}/{ROSTER_CAP}
      </p>

      <Card>
        <h2>Next fight line-up</h2>
        <div class="squad-slots">
          {team.map((cc, i) => (
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
              />
              <b>{cc.c.name}</b>
              {!cc.temp && <Loadout ids={cc.loadout} />}
              <span class="muted small">{i === 0 ? 'You' : cc.temp ? 'Agency temp' : `Lv ${cc.c.level} ${nameOf(currentCareer(cc))}`}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2>Your staff</h2>
        {staff.length === 0 && <p class="muted">No one hired yet — pick someone from the applicants below.</p>}
        {staff.map((cc) => {
          const inSquad = s.squad.includes(cc.c.id);
          const cid = currentCareer(cc);
          return (
            <div class="staff-row">
              <Portrait c={cc.c} size={48} />
              <div class="grow">
                <b>{cc.c.name}</b> {inSquad && <span class="badge green">In squad</span>} <GearIcons gear={cc.gear} />
                <div class="muted small">
                  Lv {cc.c.level} · {nameOf(cc.c.personality)} · {RANKS[careerRank(cc, cid) - 1]} {nameOf(cid)}
                </div>
              </div>
              <div class="row-actions">
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
                  }}
                >
                  {inSquad ? 'Bench' : 'Add to squad'}
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
        })}
      </Card>

      <Card>
        <h2>Applicants</h2>
        <p class="muted small">New applicants turn up after every win.</p>
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
                <button
                  class="primary small"
                  disabled={s.cash < HIRE_COST[rarity]}
                  onClick={() => {
                    const err = hire(s, c);
                    if (err) notify(err, 'error');
                    else {
                      notify(`${c.name} joins the team!`, 'good');
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

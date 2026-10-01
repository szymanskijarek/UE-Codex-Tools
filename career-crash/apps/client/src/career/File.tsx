import { useEffect, useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import type { HrNoteDef } from '@cc/content-schema';
import { careerRank, describeHrEffect, describeHrWhen, hrDirection, hrMood, hrNotesOf, RANKS, unreadHrNotes, type ActiveHrNote, type CareerChar } from '@cc/game-rules';
import { descOf, nameOf } from '../i18n';
import { navigate } from '../state';
import { Card } from '../ui/components';
import { PuppetView } from './PuppetView';
import { currentCareer, lineup, lineupHr, onGardenLeave, openFile, type CareerSave } from './model';

const TONE: Record<HrNoteDef['tone'], { label: string; cls: string }> = {
  buff: { label: 'Commendation', cls: 'buff' },
  debuff: { label: 'Concern', cls: 'debuff' },
  mixed: { label: 'Mixed feedback', cls: 'mixed' },
};

const arrow = (n: HrNoteDef): string => (hrDirection(n) > 0 ? '▲' : hrDirection(n) < 0 ? '▼' : '◆');

/**
 * The HR notes in effect for one fighter in the next fight, as small chips:
 * read notes say what they do, unread ones only hint (06 §4).
 */
export function HrChips({ cc, active }: { cc: CareerChar; active: readonly ActiveHrNote[] }) {
  if (!active.length) return null;
  const read = new Set(cc.readNotes ?? []);
  return (
    <div class="hr-chips">
      {active.map(({ note, by }) =>
        read.has(note.id) ? (
          <span class={`hr-chip ${TONE[note.tone].cls}`} title={`${describeHrWhen(bundle, note)}${by.length ? ` (${by.join(', ')})` : ''}`}>
            {arrow(note)} {nameOf(note.id)}: {describeHrEffect(bundle, note)}
          </span>
        ) : (
          <span class={`hr-chip unread ${TONE[note.tone].cls}`} title="Open their personnel file to find out">
            📁 {arrow(note)} Something in their file
          </span>
        ),
      )}
    </div>
  );
}

/** Personnel File: the character sheet where HR notes are revealed (06 §4). */
export function FileScreen({ save: s, charId }: { save: CareerSave; charId?: string }) {
  const cc = s.chars[charId ?? s.mainId];
  // What was unread when the file was opened gets a "new" stamp for this visit.
  const [fresh] = useState(() => new Set(cc ? unreadHrNotes(bundle, cc).map((n) => n.id) : []));
  useEffect(() => {
    if (cc) openFile(s, cc.c.id);
  }, [cc?.c.id]);
  if (!cc) {
    return (
      <section>
        <p>No such person on the payroll.</p>
        <a href="#/career/squad">Back to your squad</a>
      </section>
    );
  }
  const team = lineup(s);
  const inLineup = team.some((x) => x.c.id === cc.c.id);
  const active = inLineup ? (lineupHr(s, team).get(cc.c.id) ?? []) : [];
  const activeIds = new Map(active.map((a) => [a.note.id, a.by]));
  const mood = hrMood(active) ?? 'neutral';
  const leave = onGardenLeave(s).some((x) => x.c.id === cc.c.id);
  const cid = currentCareer(cc);
  const status = cc.c.id === s.mainId ? 'Founder' : leave ? '🌷 On Garden Leave' : '💼 In the squad';
  return (
    <section>
      <button class="ghost small" onClick={() => navigate('/career/squad')}>
        ← Squad
      </button>
      <div class="hr-folder">
        <div class="hr-tab">PERSONNEL FILE · CONFIDENTIAL</div>
        <div class="row hr-head">
          <PuppetView careerId={cid} personality={cc.c.personality} appearance={cc.c.appearance} size={150} mood={mood} voiceId={cc.c.id} />
          <div class="grow">
            <h1>{cc.c.name}</h1>
            <p class="lead">
              {RANKS[careerRank(cc, cid) - 1]} {nameOf(cid)} · Lv {cc.c.level}
            </p>
            <div class="hr-facts small">
              <span>
                <b>Status:</b> {status}
              </span>
              <span>
                <b>Personality:</b> {nameOf(cc.c.personality)}
              </span>
              <span>
                <b>Employment history:</b> {cc.c.careers.map((x) => nameOf(x)).join(' → ')}
              </span>
              {cc.c.traits.length > 0 && (
                <span>
                  <b>Earned on the job:</b> {cc.c.traits.map((t) => nameOf(t)).join(', ')}
                </span>
              )}
            </div>
            {mood !== 'neutral' && <p class="hr-warning small">⚠️ Not happy with the current line-up. See the notes marked "in effect".</p>}
          </div>
        </div>

        {cc.c.careers.map((career) => (
          <Card class="hr-section">
            <h2>HR notes: {nameOf(career)}</h2>
            {hrNotesOf(bundle, [career]).map((n) => {
              const by = activeIds.get(n.id);
              return (
                <div class={`hr-note ${TONE[n.tone].cls}`}>
                  <div class="hr-note-head">
                    <b>
                      {arrow(n)} {nameOf(n.id)}
                    </b>
                    <span class={`hr-stamp ${TONE[n.tone].cls}`}>{TONE[n.tone].label}</span>
                    {fresh.has(n.id) && <span class="hr-stamp new">New</span>}
                  </div>
                  <p class="hr-desc">“{descOf(n.id)}”</p>
                  <div class="small">
                    <b>When:</b> {describeHrWhen(bundle, n)} · <b>Effect:</b> {describeHrEffect(bundle, n)}
                  </div>
                  {by && <div class="hr-live small">● In effect next fight{by.length ? ` (${by.join(', ')})` : ''}</div>}
                </div>
              );
            })}
          </Card>
        ))}
        <p class="muted small">HR notes only apply in career fights. Opening the file is the only way to read them; new careers bring new notes.</p>
      </div>
    </section>
  );
}

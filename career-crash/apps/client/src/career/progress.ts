import { bundle } from '@cc/content';
import { careerSlots, chapterBossStage, jobTitle, shopTierAt, stageInfo, type StoryUnlock } from '@cc/game-rules';
import { mainChar, type CareerSave } from './model';

/**
 * "Next up" (12 §7.1): what opens next and how far away it is, worked out
 * from the save and the content only, so it never promises anything that
 * isn't coming.
 */
export interface NextUp {
  icon: string;
  text: string;
}

const UNLOCKS: Record<StoryUnlock, [string, string]> = {
  messages: ['💬', 'Messaging'],
  feed: ['📰', 'Your feed'],
  easyApply: ['🥊', 'Easy Apply'],
  temps: ['🪪', 'Agency temps'],
  hiring: ['🤝', 'Hiring'],
  nationality: ['🌍', 'Nationality'],
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export function nextUps(s: CareerSave, max = 3): NextUp[] {
  const st = s.story;
  const out: NextUp[] = [];
  // 1. What the story opens next, from beats still to come that wait on fights or the ladder.
  if (st) {
    for (const b of bundle.story) {
      if (st.fired.includes(b.id) || b.trigger.kind !== 'progress') continue;
      const opens = b.effects.flatMap((e) => (e.kind === 'unlock' && !st.unlocks.includes(e.what) ? [UNLOCKS[e.what]] : e.kind === 'squadSlots' && e.n > st.squadSlots ? [['💺', `Squad seat ${e.n}`] as [string, string]] : []));
      // A beat that opens something new and a seat (hiring) is one line, not two.
      if (opens.length > 1) opens.splice(1);
      if (!opens.length) continue;
      const t = b.trigger;
      const when = t.fights !== undefined && t.fights > st.fights ? `in ${plural(t.fights - st.fights, 'fight')}` : t.stage !== undefined && t.stage > s.stage ? `in ${plural(t.stage - s.stage, 'win')}` : 'soon';
      for (const [icon, what] of opens) out.push({ icon, text: `${what} opens ${when}` });
    }
  }
  // 2. The chapter's final interview, and the offer letter and title it brings.
  const bossStage = chapterBossStage(s.stage);
  const boss = stageInfo(bundle, bossStage);
  const wins = bossStage - s.stage;
  const next = jobTitle(bundle, bossStage + 1);
  out.push({ icon: '☠️', text: wins <= 0 ? `Final interview next: beat ${boss.bossName ?? boss.company} for an offer letter and the title ${next}` : `Final interview with ${boss.bossName ?? boss.company} in ${plural(wins, 'win')}, then the title ${next}` });
  // 3. The Corner Shop restocking.
  const tier = shopTierAt(s.stage);
  for (let at = s.stage + 1; at < s.stage + 20; at++) {
    if (shopTierAt(at) > tier) {
      out.push({ icon: '🛒', text: `The Corner Shop restocks in ${plural(at - s.stage, 'win')}` });
      break;
    }
  }
  // 4. The next career slot.
  const m = mainChar(s);
  const slots = careerSlots(bundle.economy, m.c.level);
  const at = bundle.economy.careerSlotLevels[slots];
  if (at) out.push({ icon: '🎓', text: `A ${['second', 'third', 'fourth', 'fifth'][slots - 1] ?? 'new'} career at level ${at} (${plural(at - m.c.level, 'level')} to go)` });
  // 5. The next connection milestone.
  if (st) {
    const goal = bundle.economy.progress.connectionMilestones.find((n) => n > st.connections);
    if (goal) out.push({ icon: '🏅', text: `${goal} connections badge: ${goal - st.connections} to go` });
  }
  return out.slice(0, max);
}

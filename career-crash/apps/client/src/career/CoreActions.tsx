import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { bundle } from '@cc/content';
import { pointsLeft, stageInfo, type CareerChar } from '@cc/game-rules';
import { currentReplay, navigate } from '../state';
import { collectResults, lastFight, prepareFight, squadUnlocked, type CareerSave } from './model';
import { captureFightPhoto, fightPhoto } from './photo';

/**
 * The core loop in one place (fight → results → spend points / hire → fight):
 * the shared "next fight" action, the action row shown after a fight, the
 * floating Easy Apply button on phones and the compact page header.
 */

/** Something to spend: stat or skill points, or a career milestone to pick. */
export function needsPoints(cc: CareerChar): boolean {
  return cc.c.unspentPoints > 0 || !!cc.c.pendingOffer || cc.c.careers.some((cid) => pointsLeft(bundle, cc, cid) > 0);
}

/** Who has points to spend (the main character first), if anyone. */
function pointsTarget(s: CareerSave): CareerChar | undefined {
  const main = s.chars[s.mainId];
  return main && needsPoints(main) ? main : Object.values(s.chars).find(needsPoints);
}

/** Develop the fight photo for results that were just collected (the post shows it once it's ready). */
export function developPhoto(s: CareerSave): void {
  const f = lastFight;
  const r = s.last;
  if (f && r?.photo && s.feed?.[0]?.fight === f.fight && fightPhoto.value?.fight !== f.fight) void captureFightPhoto(f.input, r.photo, f.fight);
}

/**
 * Start the next ladder fight from anywhere. A fight still waiting for its
 * results is settled first (pay, XP, loot and the feed all happen as usual).
 */
export function startNextFight(s: CareerSave): void {
  let cur = s;
  if (cur.pending) {
    cur = collectResults(cur);
    developPhoto(cur);
  }
  const info = stageInfo(bundle, cur.stage);
  const input = prepareFight(cur);
  currentReplay.value = { id: 'career', input, title: `Stage ${cur.stage + 1} · vs ${info.company}`, back: '/career/results' };
  navigate('/replay/career');
}

/**
 * The core loop as one row of buttons: next fight first, then whatever needs
 * attention (points to spend, the squad), then home. Wraps to two columns on phones.
 */
export function CoreActions({ s, here }: { s: CareerSave; here?: 'results' | 'replay' }) {
  const who = pointsTarget(s);
  return (
    <div class="core-actions">
      <button class="li-btn primary big" onClick={() => startNextFight(s)}>
        🥊 Easy Apply{here === 'replay' ? ': next fight' : ` · Stage ${s.stage + 1}`}
      </button>
      {who && (
        <button class="li-btn alert" onClick={() => navigate(`/career/skills/${who.c.id}`)}>
          🌳 Spend points
        </button>
      )}
      {squadUnlocked(s) && (
        <button class="li-btn" onClick={() => navigate('/career/squad')}>
          👥 Squad
        </button>
      )}
      <button class="li-btn" onClick={() => navigate('/career')}>
        🏠 Home
      </button>
    </div>
  );
}

/**
 * Floating Easy Apply on phones: one tap to the next fight from any career
 * screen, sitting above the bottom bar instead of crowding it. With `afterScroll`
 * it only shows once the page's own fight button has scrolled away.
 */
export function EasyApplyFab({ s, afterScroll = 0 }: { s: CareerSave; afterScroll?: number }) {
  const [shown, setShown] = useState(afterScroll === 0);
  useEffect(() => {
    if (!afterScroll) return;
    const on = () => setShown(window.scrollY > afterScroll);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [afterScroll]);
  if (!shown) return null;
  return (
    <button class="easy-fab" onClick={() => (s.pending ? navigate('/career/results') : startNextFight(s))} aria-label={s.pending ? 'Collect results' : 'Easy Apply: next fight'}>
      {s.pending ? '📋 Results' : `🥊 Easy Apply`}
    </button>
  );
}

/** Compact page header: back button and title on one line, a short note under it. */
export function PageHead({ back, backLabel, title, children }: { back: string; backLabel: string; title: ComponentChildren; children?: ComponentChildren }) {
  return (
    <header class="page-head">
      <div class="page-head-row">
        <button class="li-btn small" onClick={() => navigate(back)} aria-label={`Back to ${backLabel}`}>
          ← {backLabel}
        </button>
        <h1>{title}</h1>
      </div>
      {children && <p class="page-head-note muted small">{children}</p>}
    </header>
  );
}

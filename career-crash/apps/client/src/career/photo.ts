import { signal } from '@preact/signals';
import type { BattleInput } from '@cc/sim';
import { ReplayPlayer } from '../replay/player';
import { BattleRenderer } from '../replay/renderer';
import type { PhotoMoment } from './photo-moment';

/**
 * The fight photo: one close-up from each career fight, posted at the top of
 * the after-fight feed. The moment is picked from the replay (somebody
 * airborne beats a knockout, which beats a big hit or a signature move; our
 * side is preferred), then that frame is rendered in a hidden renderer and
 * cropped around the fighter. Only the latest photo is kept, in localStorage;
 * older photo posts keep their caption and lose the picture.
 */
export interface FightPhoto {
  fight: number;
  url: string;
}

const KEY = 'cc.career.photo';
/** How far before the moment to start playing, so flights and swings are mid-animation. */
const LEAD_TICKS = 14;

function load(): FightPhoto | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FightPhoto) : null;
  } catch {
    return null;
  }
}

export const fightPhoto = signal<FightPhoto | null>(load());
/** The fight whose photo is being rendered right now (the post shows a placeholder meanwhile). */
export const developing = signal<number | null>(null);

let busy = false;

/**
 * Render the moment off screen and keep it as this fight's photo. Safe to call
 * and forget: failures (no WebGL, art missing) just leave the post without a picture.
 */
export async function captureFightPhoto(input: BattleInput, moment: PhotoMoment, fight: number): Promise<void> {
  if (busy) return;
  busy = true;
  developing.value = fight;
  const host = document.createElement('div');
  // Off screen but laid out at a desktop size, so the renderer frames the whole arena.
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1200px;height:800px;pointer-events:none;';
  document.body.appendChild(host);
  const renderer = new BattleRenderer(input);
  renderer.sfx.muted = true;
  try {
    await renderer.mount(host);
    const player = new ReplayPlayer(input);
    player.seek(Math.max(0, moment.tick - LEAD_TICKS));
    player.drainEvents();
    renderer.resetFx();
    renderer.render(player, 50, []);
    while (player.tick < moment.tick && !player.done) {
      player.advance(50);
      renderer.render(player, 50, player.drainEvents());
    }
    renderer.photoMode = true;
    renderer.render(player, 0, []);
    const url = renderer.photo(moment.id);
    if (!url) {
      console.warn('Fight photo: nothing to frame', moment, renderer.photoDebug(moment.id));
      return;
    }
    const photo = { fight, url };
    fightPhoto.value = photo;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(photo));
    } catch {
      // Storage full or blocked: the photo still shows until the page reloads.
    }
  } catch (e) {
    console.warn('Fight photo failed', e);
  } finally {
    renderer.destroy();
    host.remove();
    busy = false;
    developing.value = null;
  }
}

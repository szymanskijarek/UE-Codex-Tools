import { Sfx } from '../replay/audio';

/**
 * One shared audio context for the menus (character previews talking). It's
 * unlocked on the first tap/click anywhere, as browsers require, and follows
 * the same mute setting as fights.
 */
export const menuSfx = new Sfx();
if (typeof window !== 'undefined') {
  const unlock = () => menuSfx.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}

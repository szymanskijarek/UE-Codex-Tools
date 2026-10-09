/**
 * The weekly minigames (10 §5). Each one is a self-contained module the studio
 * mounts after the hand-off: it gets an element to draw in and calls `done`
 * when the player is finished. It owns everything inside that element and must
 * clean up after itself when the returned function is called.
 */
import type { Episode } from '../episode';
import { testCard } from './test-card';

export interface MinigameContext {
  episode: Episode;
  /** The player finished; `score` and `line` go on the sign-off card. */
  done(result: { score?: number; line: string }): void;
}

export interface Minigame {
  id: string;
  /** Shown on the hand-off card: "THIS WEEK: <title>". */
  title: string;
  /** One line under it: what to do. */
  blurb: string;
  mount(el: HTMLElement, ctx: MinigameContext): () => void;
}

export const MINIGAMES: Minigame[] = [testCard];

export const minigameById = (id: string) => MINIGAMES.find((m) => m.id === id);

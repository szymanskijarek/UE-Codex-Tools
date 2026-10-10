/**
 * The weekly minigames (10 §5). Each one is a self-contained module the studio
 * mounts after the hand-off: it gets an element to draw in and calls `done`
 * when the player is finished. It owns everything inside that element and must
 * clean up after itself when the returned function is called.
 *
 * The registry only holds what the hand-off card needs; each game's code, CSS
 * and art are a separate chunk, fetched by `load()` while the open plays.
 */
import type { Sfx } from '../../replay/audio';
import type { Episode } from '../episode';

export interface MinigameContext {
  episode: Episode;
  /** The player finished; `score` and `line` go on the sign-off card. */
  done(result: { score?: number; line: string }): void;
  /** The studio's sound effects (they follow the page's sound switch). */
  sfx?: Sfx;
}

export interface Minigame {
  mount(el: HTMLElement, ctx: MinigameContext): () => void;
}

export interface MinigameEntry {
  id: string;
  /** Shown on the hand-off card: "THIS WEEK: <title>". */
  title: string;
  /** One line under it: what to do. */
  blurb: string;
  /** The game itself, as its own chunk (cached after the first call). */
  load(): Promise<Minigame>;
}

const once = (f: () => Promise<Minigame>) => {
  let p: Promise<Minigame> | undefined;
  return () => (p ??= f());
};

export const MINIGAMES: MinigameEntry[] = [
  { id: 'test-card', title: 'Please Stand By', blurb: 'Tap the test card until the signal comes back.', load: once(() => import('./test-card').then((m) => m.testCard)) },
  { id: 'chair', title: 'Spinning With Intent', blurb: "You are Jeff's recalled chair. Find Brock. Hit Brock.", load: once(() => import('./chair').then((m) => m.chair)) },
  { id: 'wrestle', title: 'Wrestle the Bird', blurb: 'Grab, block or duck on the beat. Protect the trousers.', load: once(() => import('./wrestle').then((m) => m.wrestle)) },
];

export const minigameById = (id: string) => MINIGAMES.find((m) => m.id === id);

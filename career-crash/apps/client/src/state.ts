import { signal } from '@preact/signals';
import type { MeResponse } from '@cc/protocol';
import type { BattleInput } from '@cc/sim';
import { api, ApiError, hasSession, signIn } from './api';

export const me = signal<MeResponse | null>(null);
export const online = signal<'unknown' | 'online' | 'offline'>('unknown');
export const toast = signal<{ text: string; kind: 'info' | 'error' | 'good' } | null>(null);

/** A battle to show in the replay screen (from the server or the local sandbox). */
export const currentReplay = signal<{ id: string; input: BattleInput; resultHash?: string; title: string; back: string } | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function notify(text: string, kind: 'info' | 'error' | 'good' = 'info'): void {
  toast.value = { text, kind };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = null), 3500);
}

/** Standalone build (single HTML file, no server): only the Sandbox is available. */
export const STANDALONE = import.meta.env.VITE_STANDALONE === '1';

export async function refreshMe(): Promise<void> {
  if (STANDALONE) {
    online.value = 'offline';
    return;
  }
  try {
    if (!hasSession()) await signIn();
    me.value = await api.me();
    online.value = 'online';
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await signIn();
      me.value = await api.me();
      online.value = 'online';
      return;
    }
    online.value = 'offline';
  }
}

/** Run an API action, show errors as toasts, refresh the player afterwards. */
export async function act<T>(fn: () => Promise<T>, success?: string): Promise<T | null> {
  try {
    const r = await fn();
    if (success) notify(success, 'good');
    await refreshMe();
    return r;
  } catch (e) {
    notify(e instanceof Error ? e.message : String(e), 'error');
    return null;
  }
}

export function navigate(path: string): void {
  // Same page (e.g. the career home after creating a character): no hashchange fires, so scroll here.
  if (window.location.hash.replace(/^#/, '') === path) scrollToTop();
  window.location.hash = path;
}

/** Every screen opens at the top, including steps inside a screen that don't change the URL. */
export function scrollToTop(): void {
  window.scrollTo(0, 0);
  // Once more after the new screen has rendered (a long page may still have been laid out).
  requestAnimationFrame(() => window.scrollTo(0, 0));
}

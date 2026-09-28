import { bundle } from '@cc/content';

/** Display name for any content id (careers, props, abilities, ...). */
export function nameOf(id: string | null | undefined): string {
  if (!id) return '—';
  return bundle.locale[`${id}.name`] ?? id.replace(/^[a-z]+\./, '').replace(/-/g, ' ');
}

export function descOf(id: string): string {
  return bundle.locale[`${id}.desc`] ?? '';
}

export function t(key: string, fallback = key): string {
  return bundle.locale[key] ?? fallback;
}

export const STATUS_ICONS: Record<string, string> = {
  'status.burning': '🔥',
  'status.wet': '💧',
  'status.electrified': '⚡',
  'status.slipping': '🍌',
  'status.stunned': '💫',
  'status.knocked-down': '💤',
  'status.caffeinated': '☕',
  'status.crash': '🥱',
  'status.foamed': '🫧',
  'status.inspired': '✨',
  'status.embarrassed': '😳',
  'status.lectured': '📢',
  'status.slowed': '🐌',
  'status.cold': '🧊',
  'status.sticky': '🍯',
  'status.armoured': '🛡️',
  'status.distracted': '📱',
  'status.live': '⚡',
};

export const STAT_LABELS: Record<string, string> = {
  health: 'Health',
  energy: 'Energy',
  speed: 'Speed',
  strength: 'Strength',
  throwing: 'Throwing',
  intelligence: 'Intelligence',
  awareness: 'Awareness',
  confidence: 'Confidence',
  luck: 'Luck',
  charisma: 'Charisma',
  recovery: 'Recovery',
  interactionSpeed: 'Interaction',
};

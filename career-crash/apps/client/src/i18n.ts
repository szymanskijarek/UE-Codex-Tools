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

/** One-line summary of what an ability does, from its effects (for skill trees and pickers). */
export function abilitySummary(id: string | null | undefined): string {
  if (!id) return '';
  const desc = bundle.locale[`${id}.desc`];
  if (desc) return desc;
  const ab = bundle.abilities.find((a) => a.id === id);
  if (!ab) return '';
  if (ab.kind === 'passive') {
    const p = ab.passive;
    const bits: string[] = [];
    for (const [k, v] of Object.entries(p?.statMods ?? {})) if (v) bits.push(`${v > 0 ? '+' : ''}${v} ${k === 'interactionSpeed' ? 'handiness' : k}`);
    if (p?.immuneTo?.length) bits.push(`immune to ${p.immuneTo.map((x) => nameOf(x).toLowerCase()).join(', ')}`);
    if (p?.tags?.length) bits.push(p.tags.map((x) => x.replace(/^[a-z]+:/, '').replace(/-/g, ' ')).join(', '));
    return bits.length ? `Passive: ${bits.join('; ')}` : 'Passive bonus';
  }
  const parts: string[] = [];
  for (const e of ab.effects ?? []) {
    switch (e.type) {
      case 'damage':
        parts.push(`${e.amount} ${e.damageType === 'blunt' ? '' : e.damageType + ' '}damage`);
        break;
      case 'heal':
        parts.push(`heals ${e.amount}`);
        break;
      case 'applyStatus':
        parts.push(nameOf(e.status).toLowerCase());
        break;
      case 'knockdown':
        parts.push('knocks down');
        break;
      case 'knockback':
        parts.push('shoves back');
        break;
      case 'toss':
        parts.push(e.direction === 'behind' ? 'throws them over the shoulder' : e.direction === 'up' ? 'launches them' : 'throws them');
        break;
      case 'spawnProp':
        parts.push(`drops a ${nameOf(e.prop).toLowerCase()}`);
        break;
      case 'dash':
        parts.push('dashes in');
        break;
      case 'pull':
        parts.push('pulls them in');
        break;
      case 'taunt':
        parts.push('taunts');
        break;
      case 'morale':
        parts.push(e.amount < 0 ? 'crushes morale' : 'boosts morale');
        break;
      default:
        break;
    }
  }
  const tg = ab.targeting?.type;
  const who = tg === 'circleSelf' || tg === 'circleTarget' || tg === 'cone' ? 'Area: ' : tg === 'self' ? 'Self: ' : tg === 'ally' ? 'Ally: ' : '';
  const text = [...new Set(parts.filter(Boolean))].slice(0, 4).join(', ');
  return text ? who + text[0]!.toUpperCase() + text.slice(1) : 'Special move';
}

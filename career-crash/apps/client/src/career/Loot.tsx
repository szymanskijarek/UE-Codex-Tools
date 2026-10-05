import type { ComponentChildren } from 'preact';
import { bundle } from '@cc/content';
import { grantableAbilities, rarityDef, type LootItem } from '@cc/game-rules';
import { abilitySummary, nameOf } from '../i18n';

export const RARITY_NAMES = { normal: 'Normal', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as const;

const STAT_NAMES: Record<string, string> = {
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
  interactionSpeed: 'Handiness',
};

export function lootIcon(it: LootItem): string {
  return bundle.loot.find((b) => b.id === it.base)?.icon ?? '🎁';
}

/** "Lucky Socks", or "Lucky Socks of Flower Power" when it grants an ability. */
export function lootName(it: LootItem): string {
  return it.ability ? `${nameOf(it.base)} of ${nameOf(it.ability)}` : nameOf(it.base);
}

export function lootStatsText(it: LootItem): string {
  return Object.entries(it.stats)
    .map(([k, v]) => `+${v} ${STAT_NAMES[k] ?? k}`)
    .join(' · ');
}

/** One-line description for tooltips. */
export function lootTitle(it: LootItem): string {
  const owner = it.ability ? grantableAbilities(bundle).get(it.ability) : undefined;
  return `${RARITY_NAMES[it.rarity]} ${lootName(it)}: ${lootStatsText(it)}${it.ability ? ` · grants ${nameOf(it.ability)} (${nameOf(owner)})` : ''}`;
}

export function LootCard({ it, children }: { it: LootItem; children?: ComponentChildren }) {
  const color = rarityDef(bundle, it.rarity).color;
  const owner = it.ability ? grantableAbilities(bundle).get(it.ability) : undefined;
  return (
    <div class="loot-card" style={{ borderColor: color }}>
      <span class="loot-icon" style={{ background: `${color}22` }}>
        {lootIcon(it)}
      </span>
      <div class="grow">
        <b>{lootName(it)}</b>
        <div class="small">
          <span class="loot-rarity" style={{ color }}>
            {RARITY_NAMES[it.rarity]}
          </span>{' '}
          · {lootStatsText(it)}
        </div>
        {it.ability && (
          <div class="small loot-ability">
            ✨ Grants <b>{nameOf(it.ability)}</b> <span class="muted">({nameOf(owner)} move)</span>
            <div class="muted">{abilitySummary(it.ability)}</div>
          </div>
        )}
      </div>
      {children && <div class="loot-actions">{children}</div>}
    </div>
  );
}

/** Small rarity-coloured icons for the gear a fighter wears (hover for details). */
export function GearIcons({ gear }: { gear?: LootItem[] }) {
  if (!gear?.length) return null;
  return (
    <span class="gear-icons">
      {gear.map((it) => (
        <span title={lootTitle(it)} style={{ borderColor: rarityDef(bundle, it.rarity).color }}>
          {lootIcon(it)}
        </span>
      ))}
    </span>
  );
}

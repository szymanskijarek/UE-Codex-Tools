import type {
  AbilityDef,
  ArenaDef,
  CareerDef,
  ContentBundle,
  EquipmentDef,
  MasteryDef,
  PersonalityDef,
  PropDef,
  RuleDef,
  RuleEvent,
  StatusDef,
  SynergyDef,
  TraitDef,
} from '@cc/content-schema';

/** Fast lookups over a compiled bundle. Built once per bundle and cached. */
export interface ContentIndex {
  bundle: ContentBundle;
  statuses: Map<string, StatusDef>;
  abilities: Map<string, AbilityDef>;
  careers: Map<string, CareerDef>;
  masteries: Map<string, MasteryDef>;
  props: Map<string, PropDef>;
  arenas: Map<string, ArenaDef>;
  personalities: Map<string, PersonalityDef>;
  traits: Map<string, TraitDef>;
  equipment: Map<string, EquipmentDef>;
  /** Rules by event, sorted by priority desc then id. */
  rulesByEvent: Map<RuleEvent, RuleDef[]>;
  /** Contact/touching rules in a fixed order; bit i of an entity's masks refers to contactRules[i]. */
  contactRules: RuleDef[];
  contactRuleBit: Map<string, number>;
  /** Synergies by attacker career. */
  synergiesByAttacker: Map<string, SynergyDef[]>;
}

const cache = new WeakMap<ContentBundle, ContentIndex>();

function byId<T extends { id: string }>(arr: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
}

export function indexContent(bundle: ContentBundle): ContentIndex {
  const hit = cache.get(bundle);
  if (hit) return hit;
  const rulesByEvent = new Map<RuleEvent, RuleDef[]>();
  const sorted = [...bundle.rules].sort((x, y) => y.priority - x.priority || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  for (const r of sorted) {
    const list = rulesByEvent.get(r.when.event) ?? [];
    list.push(r);
    rulesByEvent.set(r.when.event, list);
  }
  const contactRules = sorted.filter((r) => r.when.event === 'contact' || r.when.event === 'touching');
  const contactRuleBit = new Map(contactRules.map((r, i) => [r.id, i]));
  const synergiesByAttacker = new Map<string, SynergyDef[]>();
  for (const sy of [...(bundle.synergies ?? [])].sort((p, q) => (p.id < q.id ? -1 : 1))) {
    const l = synergiesByAttacker.get(sy.attacker) ?? [];
    l.push(sy);
    synergiesByAttacker.set(sy.attacker, l);
  }
  const idx: ContentIndex = {
    bundle,
    statuses: byId(bundle.statuses),
    abilities: byId(bundle.abilities),
    careers: byId(bundle.careers),
    masteries: byId(bundle.masteries),
    props: byId(bundle.props),
    arenas: byId(bundle.arenas),
    personalities: byId(bundle.personalities),
    traits: byId(bundle.traits),
    equipment: byId(bundle.equipment),
    rulesByEvent,
    contactRules,
    contactRuleBit,
    synergiesByAttacker,
  };
  cache.set(bundle, idx);
  return idx;
}

export function must<T>(m: Map<string, T>, id: string, what: string): T {
  const v = m.get(id);
  if (!v) throw new Error(`Unknown ${what}: ${id}`);
  return v;
}

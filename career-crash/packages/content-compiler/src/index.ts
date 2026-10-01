/**
 * Content compiler (01 §5.4): validates every JSON file against its schema,
 * resolves references, enforces the tag vocabulary, power budgets (02 §9) and
 * locale coverage, then emits a single hashed bundle.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  COLLECTIONS,
  HR_ALLY_KEYS,
  HR_BAD_STATUSES,
  HR_GOOD_STATUSES,
  STAT_KEYS,
  economySchema,
  localeSchema,
  liveSchema,
  furnitureSchema,
  namesSchema,
  tagsFileSchema,
  type CollectionName,
  type ContentBundle,
  type StatMods,
} from '@cc/content-schema';
import { hash64 } from '@cc/sim';

export interface CompileResult {
  bundle: ContentBundle | null;
  errors: string[];
}

function readJson(path: string, errors: string[]): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`${path}: invalid JSON (${(e as Error).message})`);
    return undefined;
  }
}

function jsonFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => join(dir, f))
      .filter((p) => statSync(p).isFile());
  } catch {
    return [];
  }
}

function sum(mods: StatMods | undefined, positiveOnly = false): number {
  let s = 0;
  for (const k of STAT_KEYS) {
    const v = mods?.[k] ?? 0;
    if (!positiveOnly || v > 0) s += v;
  }
  return s;
}

/** Walks any value and reports referenced status/prop ids inside effects. */
function collectEffectRefs(v: unknown, out: { statuses: Set<string>; props: Set<string>; summons?: Set<string> }): void {
  if (Array.isArray(v)) {
    for (const x of v) collectEffectRefs(x, out);
    return;
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.type === 'string') {
      if ((o.type === 'applyStatus' || o.type === 'removeStatus') && typeof o.status === 'string') out.statuses.add(o.status);
      if (o.type === 'spawnProp' && typeof o.prop === 'string') out.props.add(o.prop);
      if (o.type === 'summon' && out.summons) for (const k of ['summon', 'alt']) if (typeof o[k] === 'string') out.summons.add(o[k]);
    }
    for (const x of Object.values(o)) collectEffectRefs(x, out);
  }
}

function collectTags(v: unknown, out: Set<string>): void {
  if (Array.isArray(v)) {
    for (const x of v) collectTags(x, out);
    return;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (['tags', 'hasAll', 'hasAny', 'hasNone', 'triggerTags', 'preferTargetsWithTags', 'requireTargetTags', 'blockedBy'].includes(k) && Array.isArray(x)) {
        for (const t of x) if (typeof t === 'string') out.add(t);
      } else collectTags(x, out);
    }
  }
}

export function compileContent(dataDir: string): CompileResult {
  const errors: string[] = [];
  const rel = (p: string): string => relative(dataDir, p);

  const tagsFile = tagsFileSchema.safeParse(readJson(join(dataDir, 'tags.json'), errors));
  if (!tagsFile.success) errors.push(`tags.json: ${tagsFile.error.message}`);
  const economy = economySchema.safeParse(readJson(join(dataDir, 'economy.json'), errors));
  if (!economy.success) errors.push(`economy.json: ${economy.error.message}`);
  const names = namesSchema.safeParse(readJson(join(dataDir, 'names.json'), errors));
  if (!names.success) errors.push(`names.json: ${names.error.message}`);
  const furniture = furnitureSchema.safeParse(readJson(join(dataDir, 'furniture.json'), errors));
  if (!furniture.success) errors.push(`furniture.json: ${furniture.error.message}`);
  const live = liveSchema.safeParse(readJson(join(dataDir, 'live.json'), errors));
  if (!live.success) errors.push(`live.json: ${live.error.message}`);
  const locale = localeSchema.safeParse(readJson(join(dataDir, 'locales', 'en.json'), errors));
  if (!locale.success) errors.push(`locales/en.json: ${locale.error.message}`);

  const collections = {} as Record<CollectionName, { id: string }[]>;
  const seen = new Map<string, string>();
  for (const name of Object.keys(COLLECTIONS) as CollectionName[]) {
    const schema = COLLECTIONS[name];
    const items: { id: string }[] = [];
    for (const file of jsonFiles(join(dataDir, name))) {
      const raw = readJson(file, errors);
      if (raw === undefined) continue;
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach((item, i) => {
        const parsed = schema.safeParse(item);
        if (!parsed.success) {
          const issues = parsed.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; ');
          errors.push(`${rel(file)}[${i}] (${(item as { id?: string })?.id ?? '?'}): ${issues}`);
          return;
        }
        const id = (parsed.data as { id: string }).id;
        if (seen.has(id)) errors.push(`${rel(file)}: duplicate id ${id} (also in ${seen.get(id)})`);
        seen.set(id, rel(file));
        items.push(parsed.data as { id: string });
      });
    }
    items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    collections[name] = items;
  }
  if (errors.length > 0 || !tagsFile.success || !economy.success || !names.success || !furniture.success || !live.success || !locale.success) return { bundle: null, errors };

  const bundle: ContentBundle = {
    version: 1,
    hash: '',
    tags: [...tagsFile.data.tags].sort(),
    statuses: collections.statuses as ContentBundle['statuses'],
    abilities: collections.abilities as ContentBundle['abilities'],
    careers: collections.careers as ContentBundle['careers'],
    masteries: collections.masteries as ContentBundle['masteries'],
    props: collections.props as ContentBundle['props'],
    rules: collections.rules as ContentBundle['rules'],
    arenas: collections.arenas as ContentBundle['arenas'],
    personalities: collections.personalities as ContentBundle['personalities'],
    traits: collections.traits as ContentBundle['traits'],
    equipment: collections.equipment as ContentBundle['equipment'],
    detectors: collections.detectors as ContentBundle['detectors'],
    economy: economy.data,
    locale: locale.data,
    names: names.data,
    live: live.data.templates,
    synergies: collections.synergies as ContentBundle['synergies'],
    shopItems: collections.shopItems as ContentBundle['shopItems'],
    loot: collections.loot as ContentBundle['loot'],
    summons: collections.summons as ContentBundle['summons'],
    hrNotes: collections.hrNotes as ContentBundle['hrNotes'],
    furniture: furniture.data,
  };
  // Every standing obstacle takes its art's real-world footprint.
  for (const a of bundle.arenas)
    for (const o of a.obstacles ?? []) {
      if (o.belt) continue;
      const missing = o.art.filter((x) => !furniture.data[x]?.fp);
      if (missing.length) errors.push(`${a.id}: obstacle art ${missing.join(', ')} has no footprint in furniture.json`);
      else o.fp = o.art.map((x) => furniture.data[x]!.fp!);
    }

  errors.push(...validateBundle(bundle));
  if (errors.length > 0) return { bundle: null, errors };
  const { hash: _h, ...rest } = bundle;
  bundle.hash = hash64(JSON.stringify(rest));
  return { bundle, errors };
}

/** Cross-reference, vocabulary, budget and locale checks. Exported for tests. */
export function validateBundle(b: ContentBundle): string[] {
  const errors: string[] = [];
  const ids = (arr: { id: string }[]): Set<string> => new Set(arr.map((x) => x.id));
  const abilities = new Map(b.abilities.map((a) => [a.id, a]));
  const careers = ids(b.careers);
  const statuses = ids(b.statuses);
  const props = ids(b.props);
  const equipment = ids(b.equipment);
  const traits = ids(b.traits);
  const tagVocab = new Set(b.tags);

  const needAbility = (where: string, id: string, kind: 'active' | 'passive'): void => {
    const a = abilities.get(id);
    if (!a) errors.push(`${where}: unknown ability ${id}`);
    else if (a.kind !== kind) errors.push(`${where}: ${id} must be a ${kind} ability`);
  };

  for (const c of b.careers) {
    needAbility(c.id, c.passive, 'passive');
    needAbility(c.id, c.active, 'active');
    for (const a of c.extraActives ?? []) needAbility(c.id, a, 'active');
    if (c.senior) needAbility(c.id, c.senior, 'active');
    if (c.art.heldItem && !equipment.has(c.art.heldItem)) errors.push(`${c.id}: unknown held item ${c.art.heldItem}`);
    for (const group of c.prerequisites?.anyOf ?? []) for (const p of group) if (!careers.has(p)) errors.push(`${c.id}: unknown prerequisite ${p}`);
    for (const r of c.interactionRules ?? []) if (!b.rules.some((x) => x.id === r)) errors.push(`${c.id}: unknown rule ${r}`);
    // Budgets (02 §9)
    const pos = sum(c.statMods, true);
    const net = sum(c.statMods);
    // Bosses are meant to outclass a career: a bigger budget, but still a cap.
    const netCap = c.boss ? 9 : c.tier + 2;
    const posCap = c.boss ? 12 : 6;
    if (pos > posCap) errors.push(`${c.id}: positive stat mods ${pos} exceed budget ${posCap}`);
    if (net > netCap) errors.push(`${c.id}: net stat mods ${net} exceed tier ${c.tier} budget ${netCap}`);
  }
  for (const a of b.arenas) {
    if (!a.boss) continue;
    const boss = b.careers.find((c) => c.id === a.boss!.career);
    if (!boss) errors.push(`${a.id}: unknown boss career ${a.boss.career}`);
    else if (!boss.boss) errors.push(`${a.id}: boss ${a.boss.career} is not marked boss: true`);
  }
  for (const p of b.personalities) if (p.ability) needAbility(p.id, p.ability, 'active');
  for (const sy of b.synergies) for (const c of [sy.attacker, sy.victim]) if (!careers.has(c)) errors.push(`${sy.id}: unknown career ${c}`);
  for (const m of b.masteries) {
    needAbility(m.id, m.passive, 'passive');
    for (const a of m.grantsAbilities) needAbility(m.id, a, 'active');
    for (const c of m.requires.careers) if (!careers.has(c)) errors.push(`${m.id}: unknown career ${c}`);
    const net = sum(abilities.get(m.passive)?.passive?.statMods);
    if (net > 2) errors.push(`${m.id}: mastery passive net stats ${net} exceed budget 2`);
  }
  for (const e of b.equipment) {
    const base = e.attack?.base ?? 0;
    const cap = e.rarity === 'common' ? 12 : 14;
    if (base > cap) errors.push(`${e.id}: attack base ${base} exceeds ${e.rarity} cap ${cap}`);
    for (const s of e.immuneTo ?? []) if (!statuses.has(s)) errors.push(`${e.id}: unknown status ${s}`);
  }
  for (const t of b.traits) {
    for (const k of STAT_KEYS) {
      const v = t.statMods?.[k] ?? 0;
      if (v < -1 || v > 1) errors.push(`${t.id}: trait stat mod ${k}=${v} outside [-1, 1]`);
    }
    for (const x of t.exclusive ?? []) if (!traits.has(x)) errors.push(`${t.id}: unknown exclusive trait ${x}`);
  }
  for (const a of b.abilities) {
    if (a.kind === 'active' && (!a.targeting || !a.aiHints || !a.effects?.length)) errors.push(`${a.id}: active abilities need targeting, aiHints and effects`);
    if (a.kind === 'passive' && !a.passive) errors.push(`${a.id}: passive abilities need a "passive" block`);
    for (const s of a.passive?.immuneTo ?? []) if (!statuses.has(s)) errors.push(`${a.id}: unknown status ${s}`);
  }
  for (const ar of b.arenas) {
    for (const p of ar.props) if (!props.has(p.prop)) errors.push(`${ar.id}: unknown prop ${p.prop}`);
    const [W, H] = ar.sizeMm;
    const cells = Math.ceil(W / ar.navCellMm) * Math.ceil(H / ar.navCellMm);
    if (cells > 65535) errors.push(`${ar.id}: nav grid too large (${cells} cells)`);
    for (const h of ar.hazards) if (h.action.spawn && !props.has(h.action.spawn.prop)) errors.push(`${ar.id}/${h.id}: unknown prop ${h.action.spawn.prop}`);
    if (ar.suddenDeath.action.spawn && !props.has(ar.suddenDeath.action.spawn.prop)) errors.push(`${ar.id}: unknown sudden-death prop`);
  }
  for (const p of b.props) {
    for (const s of p.onBreak?.spawn ?? []) if (!props.has(s)) errors.push(`${p.id}: unknown onBreak prop ${s}`);
    if (p.leak && !props.has(p.leak.spill)) errors.push(`${p.id}: unknown leak prop ${p.leak.spill}`);
    if (p.use?.spawn && !props.has(p.use.spawn)) errors.push(`${p.id}: unknown use.spawn prop ${p.use.spawn}`);
  }
  for (const r of b.rules) if (r.when.status && !statuses.has(r.when.status)) errors.push(`${r.id}: unknown status ${r.when.status}`);

  // Effects anywhere in content must reference existing statuses/props.
  const refs = { statuses: new Set<string>(), props: new Set<string>(), summons: new Set<string>() };
  collectEffectRefs([b.statuses, b.abilities, b.props, b.rules, b.arenas, b.equipment, b.synergies, b.shopItems, b.summons], refs);
  for (const s of refs.statuses) if (!statuses.has(s)) errors.push(`effect references unknown status ${s}`);
  for (const p of refs.props) if (!props.has(p)) errors.push(`effect references unknown prop ${p}`);
  const summonIds = new Set(b.summons.map((x) => x.id));
  for (const x of refs.summons) if (!summonIds.has(x)) errors.push(`effect references unknown summon ${x}`);
  for (const x of b.summons) {
    if (x.art.held && !b.equipment.some((e) => e.id === x.art.held)) errors.push(`${x.id}: unknown held item ${x.art.held}`);
    if (x.kind === 'animal' && !x.art.sprite) errors.push(`${x.id}: animals need art.sprite`);
  }

  errors.push(...validateHrNotes(b));

  // Tag vocabulary (01 §5.2): every used tag must be declared.
  const used = new Set<string>();
  collectTags([b.statuses, b.abilities, b.careers, b.props, b.rules, b.traits, b.equipment, b.summons], used);
  for (const x of b.summons) if (x.scares) used.add(x.scares);
  for (const t of [...used].sort()) if (!tagVocab.has(t)) errors.push(`tag "${t}" is used but not declared in tags.json`);

  // Locale coverage.
  const needKey = (k: string): void => {
    if (!(k in b.locale)) errors.push(`locale: missing key ${k}`);
  };
  for (const coll of [b.statuses, b.abilities, b.careers, b.masteries, b.props, b.arenas, b.personalities, b.traits, b.equipment, b.shopItems, b.loot, b.summons]) for (const x of coll) needKey(`${x.id}.name`);
  for (const it of b.shopItems) {
    needKey(`${it.id}.desc`);
    if (it.kind === 'consumable' && (!it.trigger || !it.effects?.length)) errors.push(`${it.id}: consumables need a trigger and effects`);
  }
  for (const c of b.careers) needKey(`${c.id}.desc`);
  for (const n of b.hrNotes) {
    needKey(`${n.id}.name`);
    needKey(`${n.id}.desc`);
  }
  for (const d of b.detectors) for (const t of d.templates) needKey(t);
  for (const l of b.economy.leagues) needKey(`league.${l.id}`);

  // Structural monetisation guard (03 §6.1) lives in game-rules; here we just keep
  // cosmetics out of stat-bearing content by construction (no cosmetic collection is compiled).
  return errors;
}

/** HR notes (06 §3.3): references, budget, tone, coverage. */
function validateHrNotes(b: ContentBundle): string[] {
  const errors: string[] = [];
  const careers = new Map(b.careers.map((c) => [c.id, c]));
  const has = (arr: { id: string }[], id: string): boolean => arr.some((x) => x.id === id);
  const tags = new Set(b.tags);
  const good = new Set<string>(HR_GOOD_STATUSES);
  const bad = new Set<string>(HR_BAD_STATUSES);
  const perCareer = new Map<string, number>();
  for (const n of b.hrNotes) {
    const c = careers.get(n.career);
    if (!c) errors.push(`${n.id}: unknown career ${n.career}`);
    else if (c.boss) errors.push(`${n.id}: bosses have no personnel file`);
    perCareer.set(n.career, (perCareer.get(n.career) ?? 0) + 1);
    const w = n.when;
    for (const x of w.arena ?? []) if (!has(b.arenas, x)) errors.push(`${n.id}: unknown arena ${x}`);
    for (const x of [...(w.ally ?? []), ...(w.enemy ?? [])]) if (!careers.has(x)) errors.push(`${n.id}: unknown career ${x}`);
    for (const x of w.ally ?? []) if (x === n.career) errors.push(`${n.id}: a note can't be about working with their own career`);
    for (const x of [...(w.allyTag ?? []), ...(w.enemyTag ?? [])]) if (!tags.has(x)) errors.push(`${n.id}: tag "${x}" is not declared in tags.json`);
    for (const x of w.allyPersonality ?? []) if (!has(b.personalities, x)) errors.push(`${n.id}: unknown personality ${x}`);
    for (const x of w.gear ?? []) if (!has(b.loot, x)) errors.push(`${n.id}: unknown loot kind ${x}`);
    for (const x of w.consumable ?? []) if (!b.shopItems.some((i) => i.id === x && i.kind === 'consumable')) errors.push(`${n.id}: unknown consumable ${x}`);
    let plus = 0;
    let minus = 0;
    for (const k of STAT_KEYS) {
      const v = n.stats?.[k] ?? 0;
      if (v < -3 || v > 3) errors.push(`${n.id}: stat ${k}=${v} outside [-3, 3]`);
      if (v > 0) plus += v;
      else minus -= v;
    }
    if (plus + minus > 4) errors.push(`${n.id}: ${plus + minus} stat points exceed the budget of 4`);
    const st = n.status?.status;
    if (st && !good.has(st) && !bad.has(st)) errors.push(`${n.id}: status ${st} is not on the HR allow-list`);
    const goodSide = plus > 0 || (st !== undefined && good.has(st));
    const badSide = minus > 0 || (st !== undefined && bad.has(st));
    if (n.tone === 'buff' && badSide) errors.push(`${n.id}: a buff can't have minus stats or a bad status`);
    if (n.tone === 'debuff' && goodSide) errors.push(`${n.id}: a debuff can't have plus stats or a good status`);
    if (n.tone === 'mixed' && !(goodSide && badSide)) errors.push(`${n.id}: a mixed note needs a good side and a bad side`);
    const allyCaused = HR_ALLY_KEYS.some((k) => w[k] !== undefined);
    if (n.mood && (!allyCaused || n.tone === 'buff')) errors.push(`${n.id}: mood is only for debuffs a teammate causes`);
  }
  for (const c of b.careers) if (!c.boss && !c.deprecated && (perCareer.get(c.id) ?? 0) < 2) errors.push(`${c.id}: needs at least 2 HR notes (has ${perCareer.get(c.id) ?? 0})`);
  return errors;
}

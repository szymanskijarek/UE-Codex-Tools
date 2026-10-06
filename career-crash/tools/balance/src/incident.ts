import type { ContentBundle } from '@cc/content-schema';
import { addInfluence, countriesDef, countryKeys, emptyInfluence, sessionInput, tallySession, type LikeTally } from '@cc/game-rules';
import { Rng, simulate } from '@cc/sim';

/**
 * Diplomatic Incident (09 §11) balance checks.
 *
 * `pnpm balance --incident-flat [--sessions=96]`: every country with the same
 * likes. Influence per walk-on against the average, so a delegate's borrowed
 * career and moves can be evened out with `statBonus` (target: all within ±25%).
 *
 * `pnpm balance --incident [--hours=12] [--sessions=6]`: hours with a long-tail
 * spread of likes (a few big countries, many small). How often the most-liked
 * country wins the hour (target 40–60% with 40 countries) and makes the top 3 (≥ 85%), and
 * whether everyone gets on the floor.
 */
export function incidentFlatReport(bundle: ContentBundle, sessions: number): string {
  const def = countriesDef(bundle);
  const keys = countryKeys(def);
  const flat = Object.fromEntries(keys.map((k) => [k, 100]));
  const pts = new Map(keys.map((k) => [k, 0]));
  const on = new Map(keys.map((k) => [k, 0]));
  let walkOns = 0;
  let kos = 0;
  for (let s = 0; s < sessions; s++) {
    const hour = `2026-09-${String(1 + (s % 28)).padStart(2, '0')}T${String(s % 24).padStart(2, '0')}`;
    const { input } = sessionInput(bundle, def, hour, s % 11, flat);
    const out = simulate(input, bundle);
    walkOns += out.events.filter((e) => e.type === 'walkon').length;
    for (const r of tallySession(def, input.teams.map((t) => t.playerId), out.events, input.endless!.ticks)) {
      pts.set(r.key, pts.get(r.key)! + r.points);
      on.set(r.key, on.get(r.key)! + r.walkOns);
      kos += r.kos;
    }
  }
  const per = keys.map((k) => [k, pts.get(k)! / Math.max(1, on.get(k)!)] as const);
  const avg = per.reduce((n, [, v]) => n + v, 0) / per.length;
  const rows = per.map(([k, v]) => [k, v / avg] as const).sort((a, b) => a[1] - b[1]);
  const out = [`Flat likes, ${sessions} sessions: ${(walkOns / sessions).toFixed(1)} walk-ons and ${(kos / sessions).toFixed(1)} KOs per session.`, '', '| Country | Share | statBonus |', '|---|---|---|'];
  for (const [k, v] of rows) out.push(`| ${k} | ${v.toFixed(2)}${v < 0.75 || v > 1.25 ? ' ⚠️' : ''} | ${def.cast[k]!.statBonus ?? 0} |`);
  return out.join('\n');
}

/** A long-tail hour of likes: a few countries with most of them, a tail with few, some with none. */
function longTail(keys: string[], seed: string): LikeTally {
  const rng = Rng.fromSeed(seed);
  const order = [...keys];
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return Object.fromEntries(order.map((k, i) => [k, i >= keys.length - 3 ? 0 : Math.floor(20000 / (i + 1)) + rng.int(50)]));
}

export function incidentReport(bundle: ContentBundle, hours: number, sessions: number): string {
  const def = countriesDef(bundle);
  const keys = countryKeys(def);
  let wins = 0;
  let top3 = 0;
  let allOn = 0;
  let top5Won = 0;
  for (let h = 0; h < hours; h++) {
    const hour = `2026-08-${String(1 + (h % 28)).padStart(2, '0')}T${String((h * 5) % 24).padStart(2, '0')}`;
    const tally = longTail(keys, `incident-balance:${h}`);
    const best = [...keys].sort((a, b) => tally[b]! - tally[a]! || (a < b ? -1 : 1))[0]!;
    let table = emptyInfluence(keys);
    const seen = new Set<string>();
    for (let s = 0; s < sessions; s++) {
      // Likes build up over the hour: each session sees its share so far.
      const sofar = Object.fromEntries(keys.map((k) => [k, Math.floor((tally[k]! * (s + 1)) / sessions)]));
      const { input } = sessionInput(bundle, def, hour, s, sofar);
      const out = simulate(input, bundle);
      const rows = tallySession(def, input.teams.map((t) => t.playerId), out.events, input.endless!.ticks);
      for (const r of rows) if (r.walkOns > 0) seen.add(r.key);
      table = addInfluence(def, table, rows);
    }
    const ranked = [...table].sort((a, b) => b.points - a.points);
    if (ranked[0]!.key === best) wins++;
    if (ranked.slice(0, 3).some((r) => r.key === best)) top3++;
    if (seen.size === keys.length) allOn++;
    const byLikes = [...keys].sort((a, b) => tally[b]! - tally[a]! || (a < b ? -1 : 1));
    if (byLikes.slice(0, 5).includes(ranked[0]!.key)) top5Won++;
  }
  const pct = (n: number) => `${Math.round((n * 100) / hours)}%`;
  return [
    `${hours} hours of ${sessions} sessions, long-tail likes:`,
    `- most-liked country wins the hour: **${pct(wins)}** (target 40–60% with 40 countries)`,
    `- most-liked country in the top 3: **${pct(top3)}** (target ≥ 85%)`,
    `- the hour's winner is one of the 5 most-liked: **${pct(top5Won)}**`,
    `- every country on the floor at least once: **${pct(allOn)}**`,
  ].join('\n');
}

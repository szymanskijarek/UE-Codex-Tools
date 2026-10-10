/**
 * Who talks how (cast bible 11 §10): the parts of a character's voice a
 * script can be checked against. Each rule is a slip that breaks the
 * character, like Philippa saying "pants" for trousers or Kevin speaking.
 * `voiceFlags` lists them for an episode; a line that breaks voice on
 * purpose says why in `offVoice` and is left alone.
 *
 * Words only catch the obvious. The rest (Brock is never sarcastic,
 * Philippa makes one awkward attempt at warmth, nobody is cruel) is in the
 * skill, `.claude/skills/broken-news-voice/SKILL.md`.
 */
import { isAction, type Episode, type Seat } from './episode';

interface Rule {
  /** What the line must not do. */
  test: (text: string, heat: number) => boolean;
  why: string;
  /** Also applies to stage directions (for those who mustn't speak at all). */
  actions?: true;
}

const words = (list: string[]) => new RegExp(`\\b(${list.join('|')})\\b`, 'i');

/** American English in a British mouth. */
const AMERICANISMS = words(['pants', 'awesome', 'buddy', 'folks', 'y\'all', 'gotten', 'mom', 'vacation', 'elevator', 'apartment', 'sidewalk', 'cookies?', 'math', 'gas station', 'color', 'favor(ite)?', 'honor', 'center', 'theater', 'neighbor']);
/** British English in an American mouth. */
const BRITICISMS = words(['trousers', 'mum', 'rubbish', 'queue', 'cheers', 'bloody', 'biscuits?', 'colour', 'favour(ite)?', 'honour', 'centre', 'theatre', 'neighbour', 'jumper', 'loo']);
/** Nobody is cruel or mocks who someone is (cast bible 11 §1). */
const CRUEL = words(['stupid', 'idiot', 'moron', 'ugly', 'fat', 'loser', 'shut up', 'dumb']);

const british: Rule = { test: (t) => AMERICANISMS.test(t), why: 'is British: says it the British way (trousers, mum, colour…)' };
const american: Rule = { test: (t) => BRITICISMS.test(t), why: 'is American: says it the American way (pants, mom, color…)' };
const kind: Rule = { test: (t) => CRUEL.test(t), why: 'is never cruel (cast bible 11 §1): bicker, never sneer' };
const silent: Rule = { test: (t) => !isAction({ who: 'guest', heat: 0, text: t }), why: 'never speaks: only stage directions in (brackets)', actions: true };

/** Who's speaking on a line, by cast id: the anchors, the reporter, the guest's art, Jeff. */
export function speakerOf(ep: Episode, who: Seat): string {
  if (who === 'us') return 'brock';
  if (who === 'uk') return 'philippa';
  if (who === 'field') return ep.field?.reporter ?? 'field';
  if (who === 'guest') return ep.guest?.art ?? ep.guest?.name.toLowerCase() ?? 'guest';
  return 'jeff';
}

export const VOICE: Record<string, { name: string; rules: Rule[] }> = {
  brock: {
    name: 'Brock',
    rules: [
      american,
      kind,
      { test: (t) => /featherstonehaugh|fanshaw/i.test(t), why: 'never gets her surname right: he mangles it (Feather-Stone-Hog…) or sticks to "Philippa"' },
      { test: (t) => /\bjeff\b/i.test(t) && /\b(fault|blame|fired|useless|careful)\b/i.test(t), why: 'never blames Jeff: "Great drop, buddy!"' },
    ],
  },
  philippa: {
    name: 'Philippa',
    rules: [british, kind, { test: (t, h) => h < 3 && t.includes('!'), why: 'is flat and precise: no exclamation marks before the swing' }, { test: (t) => /\bstets\b/i.test(t), why: 'calls him Brock, never "Stets" (that\'s Chase)' }],
  },
  rupert: { name: 'Rupert', rules: [british, kind, { test: (t, h) => h < 2 && t.includes('!'), why: 'reports with grave calm: no exclamation marks until it gets personal' }] },
  chase: { name: 'Chase', rules: [american, kind] },
  hamish: { name: 'Hamish', rules: [kind, { test: (t) => words(['color', 'favor(ite)?', 'center', 'theater', 'mom']).test(t), why: 'is a New Zealander: British spellings and words' }] },
  bev: { name: 'Bev', rules: [kind, { test: (t) => words(['sex', 'naked', 'boobs?', 'breasts?', 'arse', 'ass', 'shag\\w*']).test(t), why: 'is innuendo only: a double meaning or a {bleep}, never the explicit word' }] },
  jeff: { name: 'Jeff', rules: [kind, { test: (t) => t.length > 70, why: 'only ever shouts one short line from off screen' }] },
  kevin: { name: 'Kevin', rules: [silent] },
  marcel: { name: 'Marcel', rules: [silent] },
};

/** Every line that breaks its speaker's voice, unless it says why in `offVoice`. */
export function voiceFlags(ep: Episode): string[] {
  const out: string[] = [];
  ep.beats.forEach((b, i) => {
    if (b.offVoice) return;
    const v = VOICE[speakerOf(ep, b.who)];
    if (!v) return;
    // Stage directions aren't speech, except for the ones who mustn't speak at all.
    const text = b.text.replaceAll('{bleep}', '');
    for (const r of v.rules) if ((r.actions || !isAction(b)) && r.test(text, b.heat)) out.push(`line ${i + 1}: ${v.name} ${r.why}`);
  });
  return out;
}

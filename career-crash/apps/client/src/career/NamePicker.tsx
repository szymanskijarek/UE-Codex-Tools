import { useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { formatName, MAX_NAME_PREFIXES, MAX_NAME_SUFFIXES, randomNameParts, type NameParts } from '@cc/game-rules';
import { Rng } from '@cc/sim';

type Step = { key: keyof NameParts; title: string; words: string[]; multi?: number };

const STEPS: Step[] = [
  { key: 'pre', title: 'Before', words: bundle.names.prefixes, multi: MAX_NAME_PREFIXES },
  { key: 'first', title: 'First name', words: [...bundle.names.first].sort((a, b) => a.localeCompare(b)) },
  { key: 'last', title: 'Last name', words: [...bundle.names.last].sort((a, b) => a.localeCompare(b)) },
  { key: 'post', title: 'After', words: bundle.names.suffixes, multi: MAX_NAME_SUFFIXES },
];

/**
 * Name builder: titles before (any number up to the cap, or none), first name,
 * last name, titles after. Titles appear in the order they were tapped.
 */
export function NamePicker({ value, onChange }: { value: NameParts; onChange: (n: NameParts) => void }) {
  const [step, setStep] = useState(1);
  const [filter, setFilter] = useState('');
  const cur = STEPS[step]!;
  const q = filter.trim().toLowerCase();
  const words = q ? cur.words.filter((w) => w.toLowerCase().includes(q)) : cur.words;
  const go = (i: number) => {
    setStep(i);
    setFilter('');
  };
  const picked = (w: string) => (cur.multi ? (value[cur.key] as string[]).includes(w) : value[cur.key] === w);
  const tap = (w: string) => {
    if (cur.multi) {
      const list = value[cur.key] as string[];
      const next = list.includes(w) ? list.filter((x) => x !== w) : list.length < cur.multi ? [...list, w] : list;
      onChange({ ...value, [cur.key]: next });
    } else {
      onChange({ ...value, [cur.key]: w });
      if (step < STEPS.length - 1) go(step + 1);
    }
  };
  const summary = (s: Step) => {
    const v = value[s.key];
    return Array.isArray(v) ? (v.length ? v.join(s.key === 'post' ? ', ' : ' ') : 'none') : v;
  };
  const full = cur.multi && (value[cur.key] as string[]).length >= cur.multi;
  return (
    <div class="name-picker">
      <div class="company-preview">
        <b>{formatName(value)}</b>
        <button class="ghost small" title="Random name with titles" onClick={() => onChange(randomNameParts(bundle, Rng.fromSeed(Math.random().toString(16)), true))}>
          🎲
        </button>
      </div>
      <div class="segmented company-steps">
        {STEPS.map((s, i) => (
          <button class={`small ${i === step ? 'on' : ''}`} onClick={() => go(i)}>
            {s.title}: <span class="muted">{summary(s)}</span>
          </button>
        ))}
      </div>
      <div class="name-tools">
        <input placeholder={`Search ${cur.words.length} ${cur.title.toLowerCase()}…`} value={filter} onInput={(e) => setFilter((e.target as HTMLInputElement).value)} />
        {cur.multi && (
          <span class="muted small">
            {full ? `Max ${cur.multi} — tap one to remove it` : `Pick up to ${cur.multi}, or none`}
            {(value[cur.key] as string[]).length > 0 && (
              <button class="ghost small" onClick={() => onChange({ ...value, [cur.key]: [] })}>
                Clear
              </button>
            )}
          </span>
        )}
      </div>
      <div class="company-words">
        {words.map((w) => (
          <button class={`chip ${picked(w) ? 'on' : ''}`} disabled={!!full && !picked(w)} onClick={() => tap(w)}>
            {w}
          </button>
        ))}
        {!words.length && <span class="muted small">No matches.</span>}
      </div>
    </div>
  );
}

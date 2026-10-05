import { useState } from 'preact/hooks';
import { COMPANY_ADJECTIVES, COMPANY_NOUNS, COMPANY_SUFFIXES, companyLabel, randomCompany, type CompanyName } from '@cc/game-rules';
import { Rng } from '@cc/sim';

const STEPS = [
  { key: 'adj', title: 'Adjective', words: COMPANY_ADJECTIVES },
  { key: 'noun', title: 'Noun', words: COMPANY_NOUNS },
  { key: 'suffix', title: 'Suffix', words: COMPANY_SUFFIXES },
] as const;

/** Three-step company name builder: adjective, noun, legal suffix. Picking a word moves to the next step. */
export function CompanyPicker({ value, onChange }: { value: CompanyName; onChange: (c: CompanyName) => void }) {
  const [step, setStep] = useState(0);
  const cur = STEPS[step]!;
  const label = companyLabel(value);
  return (
    <div class="company-picker">
      <div class="company-preview">
        <span class="li-logo-sq">{label[0]}</span>
        <b>{label}</b>
        <button class="ghost small" title="Random name" onClick={() => onChange(randomCompany(Rng.fromSeed(Math.random().toString(16))))}>
          🎲
        </button>
      </div>
      <div class="segmented company-steps">
        {STEPS.map((s, i) => (
          <button class={`small ${i === step ? 'on' : ''}`} onClick={() => setStep(i)}>
            {i + 1} · {s.title}: <span class="muted">{value[s.key]}</span>
          </button>
        ))}
      </div>
      <div class="company-words">
        {cur.words.map((w) => (
          <button
            class={`chip ${value[cur.key] === w ? 'on' : ''}`}
            onClick={() => {
              onChange({ ...value, [cur.key]: w });
              if (step < STEPS.length - 1) setStep(step + 1);
            }}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

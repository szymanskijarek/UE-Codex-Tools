import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const simBannedGlobals = ['Date', 'performance', 'setTimeout', 'setInterval', 'crypto', 'Intl', 'fetch', 'window', 'document', 'process'].map(
  (name) => ({ name, message: 'packages/sim must be deterministic and I/O free (docs/career-crash/01 §4.1).' }),
);
const simBannedProps = ['random', 'sin', 'cos', 'tan', 'atan', 'atan2', 'pow', 'exp', 'log', 'hypot'].map((property) => ({
  object: 'Math',
  property,
  message: 'Non-deterministic or transcendental math is banned in packages/sim (01 §4.1). Use core/math.ts.',
}));

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/dist-standalone/**', '**/dist-web/**', '**/.wrangler/**', 'packages/content/dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['packages/sim/src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...simBannedGlobals],
      'no-restricted-properties': ['error', ...simBannedProps],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.property.name='sort'][arguments.length=0]", message: 'sort() needs an explicit comparator in sim.' },
        { selector: "CallExpression[callee.property.name='toLocaleString']", message: 'Locale APIs are banned in sim.' },
        { selector: "BinaryExpression[operator='**']", message: 'Use integer math helpers in sim.' },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@cc/game-rules', '@cc/protocol', '@cc/commentary', '@cc/client', '@cc/worker', 'node:*'], message: 'sim may only depend on @cc/content-schema (01 §2).' }] },
      ],
    },
  },
  {
    files: ['packages/content-schema/src/**/*.ts', 'packages/commentary/src/**/*.ts', 'packages/game-rules/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@cc/client', '@cc/worker', 'node:*'], message: 'Pure packages must not depend on apps or Node APIs (01 §2).' }] }],
    },
  },
);

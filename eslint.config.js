import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    '**/dist/**',
    '**/node_modules/**',
    '**/components/ui/*.tsx',
    // The server is a separate package; it has its own tsconfig and
    // jest config. We only lint frontend code from the root.
    'server/**',
  ]),
  {
    files: ['src/components/ui/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Security-critical rules
      '@typescript-eslint/no-explicit-any': 'warn',
      // Unused vars with underscore prefix allowed
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // React hooks rules
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      // set-state-in-effect is often valid for initialization - downgrade to warn
      'react-hooks/set-state-in-effect': 'warn',
      // React Compiler rules (eslint-plugin-react-hooks 7.x) - the
      // project doesn't run the compiler yet, so the strictest
      // factory / memoization rules report false positives for
      // legitimate render-time factories. Downgrade to warn until
      // the compiler is on.
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/component-hook-factories': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/capitalized-calls': 'warn',
      // Fast-refresh helper export warnings are noisy in test-only
      // utility files. Keep as warning, not error.
      'react-refresh/only-export-components': 'warn',
    },
  },
])

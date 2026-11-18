import shared, { tsStylistic, vueConventions } from '@jwill89/lint-web'

// The shared front-end rules (@jwill89/lint-web): Vue 3 + TypeScript strictTypeChecked,
// template accessibility, the Vue conventions (<script setup lang="ts"> only, typed refs, no
// inline styles) and typescript-eslint's stylistic set, with Prettier's conflict list. Build
// and tooling config files are not linted.
export default [
  {
    name: 'kit/ignores',
    ignores: [
      'dist/**',
      'playground-dist/**',
      'coverage/**',
      'shared/**',
      'test-results/**',
      'playwright-report/**',
      '**/*.config.ts',
      '**/*.config.js',
    ],
  },
  ...shared,
  vueConventions,
  tsStylistic,
]

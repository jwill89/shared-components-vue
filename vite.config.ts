import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { vitestDefaults } from './shared/test/web/vitest.js'

// The package build (`npm run build`): Vite's library mode bundles src/bundle.ts (the exports
// and the tokens) into one ES module and every style, the tokens' and the components', into one
// stylesheet that an app imports once. Vue and Reka UI stay imports, so an app's copy of each is
// the one that runs. vue-tsc writes the type declarations after it, from src/index.ts alone
// (tsconfig.build.json).
//
// Nothing is lowered or minified here: the app's own build does both for the browsers it
// serves, in one pass with its own styles. Lowered here, the tokens' light-dark() would become
// lightningcss's stand-in, which reads variables only the app's pass writes.
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'esnext',
    minify: false,
    cssMinify: false,
    lib: {
      entry: fileURLToPath(new URL('./src/bundle.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rolldownOptions: {
      external: ['vue', /^reka-ui(\/|$)/],
    },
    sourcemap: true,
  },
  // The shared test settings, on jsdom: the components mounted with @vue/test-utils, and the
  // token and stylesheet checks, which read the source files under Node. `npm run
  // test:coverage` fails below the floor, set a little under what the specs reach. Raise it as
  // specs land; never lower it.
  test: vitestDefaults({
    include: ['src/__tests__/**/*.spec.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    floor: { statements: 95, branches: 90, functions: 95, lines: 95 },
    // The entry files only re-export.
    coverageExclude: ['src/index.ts', 'src/bundle.ts'],
  }),
})

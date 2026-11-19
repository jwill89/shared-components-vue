import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { vitestDefaults } from './shared/test/web/vitest.js'

// The package build (`npm run build`): Vite's library mode bundles src/bundle.ts (the exports
// and the tokens) into one ES module and every style, the tokens' and the components', into one
// stylesheet that an app imports once. Vue and Reka UI stay imports, so an app's copy of each is
// the one that runs. src/tokens/contrast.ts is a second entry, `/contrast`, which an app's tests
// import to measure the kit's color pairs in its own colors; it imports nothing, so it shares no
// code with the first. vue-tsc writes the type declarations after it, from the two entries'
// sources (tsconfig.build.json).
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
      entry: {
        index: fileURLToPath(new URL('./src/bundle.ts', import.meta.url)),
        // Beside its declaration, which vue-tsc writes at dist/tokens/contrast.d.ts.
        'tokens/contrast': fileURLToPath(new URL('./src/tokens/contrast.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
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
    floor: { statements: 98, branches: 95, functions: 98, lines: 98 },
    // The entry files only re-export.
    coverageExclude: ['src/index.ts', 'src/bundle.ts'],
  }),
})

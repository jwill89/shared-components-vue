import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The playground (`npm run dev`, and `npm run build:playground` for the end-to-end run). It
// imports the kit by its package name, as an app does, and the names point at the source, so a
// change to a component shows at once: the package at src/index.ts, and its stylesheet at
// kit-source.css, the global stylesheets bundle.ts gathers (each component brings its own styles
// along when it is imported).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: /^@jwill89\/shared-components-vue$/,
        replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      },
      {
        find: /^@jwill89\/shared-components-vue\/editor$/,
        replacement: fileURLToPath(new URL('../src/editor/index.ts', import.meta.url)),
      },
      {
        find: /^@jwill89\/shared-components-vue\/style\.css$/,
        replacement: fileURLToPath(new URL('./kit-source.css', import.meta.url)),
      },
    ],
  },
  build: {
    outDir: fileURLToPath(new URL('../playground-dist', import.meta.url)),
    emptyOutDir: true,
  },
})

import { defineConfig } from '@playwright/test'
import { playwrightDefaults } from './shared/test/e2e/playwright.js'

const PLAYGROUND_PORT = 4207
const PLAYGROUND_URL = `http://127.0.0.1:${String(PLAYGROUND_PORT)}`

// The end-to-end run (`npm run test:e2e`), on the shared Playwright settings: the playground,
// built and served by `vite preview`. Locally on Windows it drives the installed Edge. The port
// is strict: a server left from another run would answer the tests with its own build.
export default defineConfig({
  ...playwrightDefaults,
  use: { ...playwrightDefaults.use, baseURL: PLAYGROUND_URL },
  webServer: {
    command: `npm run build:playground -- --logLevel warn && npx vite preview --config playground/vite.config.ts --host 127.0.0.1 --port ${String(PLAYGROUND_PORT)} --strictPort`,
    url: PLAYGROUND_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})

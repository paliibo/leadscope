import { defineConfig, devices } from '@playwright/test'

/**
 * A dedicated port, not 3000. `reuseExistingServer` will happily bind to
 * whatever is already listening, and on a machine running any other Next app
 * the whole suite silently tests the wrong application.
 */
const PORT = Number(process.env.E2E_PORT ?? 3177)
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /**
   * Two workers, not the CPU count. Everything shares one Node process and one
   * SQLite file, and the live simulator is writing to it throughout; past two
   * parallel browsers the app stops hydrating inside the assertion timeouts and
   * the suite starts failing on contention rather than on defects.
   */
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // The app ships a ~260kB first-load bundle and hydrates before any control
  // responds. Five seconds is not enough headroom on a loaded machine, and the
  // resulting failures look like defects rather than contention.
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // The mobile spec asserts a layout that only exists below `lg`.
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile',
      // Pixel 5 rather than an iPhone profile: it runs on Chromium, so CI needs
      // one browser download instead of two for what is a layout check.
      use: { ...devices['Pixel 5'] },
      // The desktop specs drive a sidebar that is off screen on a phone; they
      // would fail for the wrong reason rather than catching anything.
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // A cold production build on a loaded machine regularly passes three
    // minutes; the previous 180s budget failed the whole suite before a single
    // test ran.
    timeout: 300_000,
    // Its own build output, so an e2e run and a running dev server can coexist.
    env: { PORT: String(PORT), NEXT_DIST_DIR: '.next-e2e' },
  },
})

import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for StreamWave end-to-end tests.
 *
 * Requires a running dev server before test execution:
 *   npm run dev   (starts Next.js :3000 + Fastify :3001)
 *
 * Run with: npm run test:e2e
 * Run headed: npx playwright test --headed
 * Debug:      npx playwright test --debug
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // auth state is shared; run sequentially to avoid conflicts
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Give the app time to respond — dev SSR can be slow on first request
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Playwright will not start a dev server automatically.
  // Ensure `npm run dev` is running before executing e2e tests.
})

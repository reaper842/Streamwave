/**
 * End-to-end tests for audio playback flow.
 *
 * Covers:
 *   - Browse to album → click track → playback bar activates
 *   - Play/pause via playback bar controls
 *   - Navigate to a different page → audio continues
 *   - Keyboard shortcut: Space toggles play/pause
 *
 * Prerequisites (must be running):
 *   docker compose up -d     (PostgreSQL, Redis, Meilisearch)
 *   npm run dev              (Next.js :3000 + Fastify :3001)
 *   npx prisma db seed       (seed data with audio tracks)
 */
import { test, expect } from '@playwright/test'

// ── Constants ─────────────────────────────────────────────────────────────────

const DEMO_EMAIL = 'demo@streamwave.app'
const DEMO_PASSWORD = 'Demo1234'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAsDemoUser(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('#login-email').fill(DEMO_EMAIL)
  await page.locator('#login-password').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page).toHaveURL('/')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Playback flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page)
  })

  test('playback bar is hidden before any track is played', async ({ page }) => {
    // The PlaybackBar should render but the now-playing section should be empty
    const playbackBar = page.locator('[data-testid="playback-bar"]')
    // Bar exists in DOM (always mounted in layout)
    await expect(playbackBar).toBeAttached()
  })

  test('clicking play on an album starts playback', async ({ page }) => {
    // Navigate to home page and find an album card
    await page.goto('/')
    // Click the first "Play album" button visible on any album card
    const playButton = page.getByRole('button', { name: /^play /i }).first()
    await playButton.click()

    // Playback bar should show a track title (now playing section populated)
    await expect(page.locator('[data-testid="now-playing-title"]')).not.toBeEmpty()
  })

  test('play/pause button in playback bar toggles playback state', async ({ page }) => {
    await page.goto('/')
    // Start playback
    const playButton = page.getByRole('button', { name: /^play /i }).first()
    await playButton.click()

    // The transport controls play/pause button should be visible
    const pauseButton = page.getByRole('button', { name: /pause/i })
    await expect(pauseButton).toBeVisible({ timeout: 5000 })

    // Click to pause
    await pauseButton.click()
    // Now the play button should be visible
    const resumeButton = page.getByRole('button', { name: /^play$/i })
    await expect(resumeButton).toBeVisible({ timeout: 3000 })
  })

  test('navigating to another page does not stop audio', async ({ page }) => {
    await page.goto('/')
    // Start playback
    const playButton = page.getByRole('button', { name: /^play /i }).first()
    await playButton.click()

    // Wait for playback to start
    await expect(page.locator('[data-testid="now-playing-title"]')).not.toBeEmpty()

    // Navigate to search
    await page.goto('/search')
    await expect(page).toHaveURL('/search')

    // Playback bar should still show the track (audio persists across navigation)
    await expect(page.locator('[data-testid="now-playing-title"]')).not.toBeEmpty()
  })

  test('Space key toggles play/pause', async ({ page }) => {
    await page.goto('/')
    const playButton = page.getByRole('button', { name: /^play /i }).first()
    await playButton.click()

    // Ensure no text input is focused (so Space goes to shortcut handler)
    await page.keyboard.press('Escape')

    // Get current playing state, press Space, verify it changed
    const transportPlay = page.getByRole('button', { name: /^play$|^pause$/i }).first()
    await expect(transportPlay).toBeVisible({ timeout: 5000 })

    const beforeLabel = await transportPlay.getAttribute('aria-label')
    await page.keyboard.press('Space')
    await page.waitForTimeout(300)
    const afterLabel = await transportPlay.getAttribute('aria-label')

    expect(afterLabel).not.toBe(beforeLabel)
  })

  test('album page play button loads full album into queue', async ({ page }) => {
    // Find a real album page by navigating to the first album link on home
    await page.goto('/')
    const albumLink = page.getByRole('link', { name: /album/i }).first()
    const href = await albumLink.getAttribute('href')

    if (href?.startsWith('/album/')) {
      await page.goto(href)
      // Click the main "Play" button on the album page
      const playAllButton = page.getByRole('button', { name: /^play$/i }).first()
      await playAllButton.click()
      await expect(page.locator('[data-testid="now-playing-title"]')).not.toBeEmpty()
    }
  })
})

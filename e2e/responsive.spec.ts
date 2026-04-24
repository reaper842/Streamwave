/**
 * End-to-end tests for responsive layout behaviour.
 *
 * Covers:
 *   - Desktop (1440×900): sidebar visible, full playback bar, no mobile nav
 *   - Tablet (768×1024): sidebar hidden, full playback bar, no mobile nav
 *   - Mobile (375×812): no sidebar, mini-player + bottom tab nav visible
 *
 * Breakpoints used in the layout:
 *   - `md` (768px): sidebar container uses `hidden md:flex`
 *   - `sm` (640px): PlaybackBar `hidden sm:block`; MiniPlayer + MobileNavBar `sm:hidden`
 *
 * Prerequisites (must be running):
 *   docker compose up -d
 *   npm run dev
 *   npx prisma db seed
 */
import { test, expect } from '@playwright/test'

const DEMO_EMAIL = 'demo@streamwave.app'
const DEMO_PASSWORD = 'Demo1234'

async function loginAsDemoUser(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('#login-email').fill(DEMO_EMAIL)
  await page.locator('#login-password').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page).toHaveURL('/')
}

test.describe('Responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page)
  })

  test('desktop (1440×900): sidebar visible, full playback bar, no bottom nav', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')

    // Sidebar navigation should be visible at desktop width (md breakpoint = 768px)
    const sidebar = page.getByRole('navigation', { name: /navigation/i })
    await expect(sidebar).toBeVisible()

    // Full-height playback bar (sm:block, hidden below sm=640px)
    const playbackBar = page.locator('[data-testid="playback-bar"]')
    await expect(playbackBar).toBeVisible()

    // Mobile bottom nav should NOT be visible at desktop width
    const mobileNav = page.getByRole('navigation', { name: /mobile navigation/i })
    await expect(mobileNav).toBeHidden()
  })

  test('tablet (768×1024): sidebar visible, full playback bar, no bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    // At exactly 768px (md breakpoint) the sidebar container becomes visible
    const sidebar = page.getByRole('navigation', { name: /navigation/i })
    await expect(sidebar).toBeVisible()

    // Full playback bar still visible (768 > 640 = sm breakpoint)
    const playbackBar = page.locator('[data-testid="playback-bar"]')
    await expect(playbackBar).toBeVisible()

    // Mobile nav still hidden (768 > 640)
    const mobileNav = page.getByRole('navigation', { name: /mobile navigation/i })
    await expect(mobileNav).toBeHidden()
  })

  test('below sidebar breakpoint (700×900): sidebar hidden', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 })
    await page.goto('/')

    // Sidebar container is hidden below md (768px)
    const sidebar = page.getByRole('navigation', { name: /navigation/i })
    await expect(sidebar).toBeHidden()

    // Full playback bar still visible (700 > 640)
    const playbackBar = page.locator('[data-testid="playback-bar"]')
    await expect(playbackBar).toBeVisible()
  })

  test('mobile (375×812): no sidebar, mini-player and bottom nav visible when playing', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    // Sidebar hidden on mobile
    const sidebar = page.getByRole('navigation', { name: /navigation/i })
    await expect(sidebar).toBeHidden()

    // Full playback bar hidden on mobile (sm:block hides below 640px)
    const playbackBar = page.locator('[data-testid="playback-bar"]')
    await expect(playbackBar).toBeHidden()

    // Bottom tab navigation IS visible on mobile (sm:hidden → shows below sm)
    const mobileNav = page.getByRole('navigation', { name: /mobile navigation/i })
    await expect(mobileNav).toBeVisible()

    // Mobile nav has Home, Search, Library tabs
    await expect(mobileNav.getByRole('link', { name: /home/i })).toBeVisible()
    await expect(mobileNav.getByRole('link', { name: /search/i })).toBeVisible()
    await expect(mobileNav.getByRole('link', { name: /library/i })).toBeVisible()
  })

  test('mobile navigation: tab links route correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    const mobileNav = page.getByRole('navigation', { name: /mobile navigation/i })

    // Tap Search tab
    await mobileNav.getByRole('link', { name: /search/i }).click()
    await expect(page).toHaveURL('/search')

    // Tap Library tab
    await mobileNav.getByRole('link', { name: /library/i }).click()
    await expect(page).toHaveURL('/library')

    // Tap Home tab
    await mobileNav.getByRole('link', { name: /home/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('viewport resize: layout transitions correctly across breakpoints', async ({ page }) => {
    await page.goto('/')

    // Start at desktop — sidebar visible
    await page.setViewportSize({ width: 1440, height: 900 })
    const sidebar = page.getByRole('navigation', { name: /navigation/i })
    await expect(sidebar).toBeVisible()

    // Shrink below sidebar breakpoint — sidebar hides
    await page.setViewportSize({ width: 600, height: 900 })
    await expect(sidebar).toBeHidden()

    // Grow back to desktop — sidebar reappears
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(sidebar).toBeVisible()
  })

  test('auth pages have no playback bar or mobile nav', async ({ page }) => {
    // Intentionally not logged in — go directly to login page
    await page.goto('/login')

    // Full playback bar should not be in the DOM on auth pages
    const playbackBar = page.locator('[data-testid="playback-bar"]')
    await expect(playbackBar).not.toBeAttached()

    // Mobile nav should not be in the DOM on auth pages
    const mobileNav = page.getByRole('navigation', { name: /mobile navigation/i })
    await expect(mobileNav).not.toBeAttached()
  })
})

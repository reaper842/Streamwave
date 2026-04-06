/**
 * End-to-end tests for the StreamWave authentication flow.
 *
 * Covers: register → verify protected page accessible → logout → redirect to /login
 *
 * Prerequisites (must be running before executing this suite):
 *   docker compose up -d     (PostgreSQL, Redis, Meilisearch)
 *   npm run dev              (Next.js :3000 + Fastify :3001)
 *
 * A unique email is generated per run so the test is repeatable without
 * needing a database reset between runs.
 */
import { test, expect } from '@playwright/test'

// ── Test data ──────────────────────────────────────────────────────────────────

const DISPLAY_NAME = 'E2E Test User'
const EMAIL = `e2e_${Date.now()}@test.streamwave.invalid`
const PASSWORD = 'E2eTest1!'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navigate to /login and confirm the page loaded. */
async function goToLogin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await expect(page.getByLabel('Email address')).toBeVisible()
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Authentication flow', () => {
  test('redirects unauthenticated users from / to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects unauthenticated users from /search to /login', async ({ page }) => {
    await page.goto('/search')
    await expect(page).toHaveURL(/\/login/)
  })

  test('register: creates account and lands on home page', async ({ page }) => {
    await page.goto('/signup')

    await page.locator('#signup-name').fill(DISPLAY_NAME)
    await page.locator('#signup-email').fill(EMAIL)
    await page.locator('#signup-password').fill(PASSWORD)

    await page.getByRole('button', { name: /sign up/i }).click()

    // After successful registration the app redirects to the home page
    await expect(page).toHaveURL('/')
    // The greeting heading should be visible (Good morning/afternoon/evening)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /morning|afternoon|evening/i,
    )
  })

  test('login page is accessible without authentication', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
  })

  test('login: authenticates with valid credentials and lands on home page', async ({ page }) => {
    await goToLogin(page)

    await page.locator('#login-email').fill(EMAIL)
    await page.locator('#login-password').fill(PASSWORD)
    await page.getByRole('button', { name: /log in/i }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /morning|afternoon|evening/i,
    )
  })

  test('login: shows error for wrong password', async ({ page }) => {
    await goToLogin(page)

    await page.locator('#login-email').fill(EMAIL)
    await page.locator('#login-password').fill('WrongPassword9!')
    await page.getByRole('button', { name: /log in/i }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('authenticated: protected routes are accessible after login', async ({ page }) => {
    // Log in first
    await goToLogin(page)
    await page.locator('#login-email').fill(EMAIL)
    await page.locator('#login-password').fill(PASSWORD)
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page).toHaveURL('/')

    // Navigate to /search — should stay there, not redirect to login
    await page.goto('/search')
    await expect(page).toHaveURL('/search')
    // Should NOT be redirected to login
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('session persists on page reload', async ({ page }) => {
    await goToLogin(page)
    await page.locator('#login-email').fill(EMAIL)
    await page.locator('#login-password').fill(PASSWORD)
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page).toHaveURL('/')

    // Hard reload
    await page.reload()
    // Must still be on the home page — not redirected to login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /morning|afternoon|evening/i,
    )
  })

  test('logout: redirects to /login and protected routes are blocked again', async ({ page }) => {
    // Log in
    await goToLogin(page)
    await page.locator('#login-email').fill(EMAIL)
    await page.locator('#login-password').fill(PASSWORD)
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page).toHaveURL('/')

    // Open the user menu (TopBar avatar button)
    await page.getByRole('button', { name: /user menu/i }).click()

    // Click "Log out"
    await page.getByRole('menuitem', { name: /log out/i }).click()

    // Should land on /login
    await expect(page).toHaveURL(/\/login/)

    // Navigating to a protected route should redirect back to /login
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})

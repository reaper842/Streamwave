import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

/**
 * Vitest config for frontend/client unit tests.
 * Uses jsdom environment so browser APIs (localStorage, navigator, etc.) are available.
 * Howler.js is mocked at the module level in each test file.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    globals: true,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    },
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/__tests__/**/*.test.ts'],
    globals: true,
    setupFiles: ['server/test/setup.ts'],
    /**
     * Override environment variables for every test worker.
     * These values are injected into process.env BEFORE any module is loaded,
     * so module-level constants (JWT_SECRET, BCRYPT_COST) pick them up automatically.
     *
     * DATABASE_URL and REDIS_URL are loaded from .env.local by the setup file.
     */
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-32-chars-minimum!!',
      NEXTAUTH_SECRET: 'test-jwt-secret-32-chars-minimum!!',
      NEXTAUTH_URL: 'http://localhost:3000',
      BCRYPT_COST: '4', // cost 4 ≈ 1ms vs 12 ≈ 400ms — keeps test suite fast
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // Next.js dev mode compiles each route on first hit, and this one test
  // walks through ~7 distinct routes in sequence on a cold server — the
  // default 30s per-test budget was getting consumed by earlier compiles
  // before later assertions got their share. 120s total, 30s per assertion.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'MOCK_MODE=1 NEXT_PUBLIC_MOCK_MODE=1 pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});

import { defineConfig, devices } from '@playwright/test';

// E2E for the static site (Try-It widget). Serves site/ and runs the e2e/ specs.
// Not part of `npm test` (vitest). Run: npm run test:e2e
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx --yes serve site -l 4321',
    url: 'http://127.0.0.1:4321/try-it.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

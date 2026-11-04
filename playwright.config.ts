import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // The Vite development server compiles the image-heavy landing/member pages
  // on first request. Serial browser tests avoid competing cold-start requests
  // and keep CI deterministic on small runners.
  workers: 1,
  use: { baseURL, trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

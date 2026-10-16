import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // The Vite development server compiles the image-heavy landing/member pages
  // on first request. Serial browser tests avoid competing cold-start requests
  // and keep CI deterministic on small runners.
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

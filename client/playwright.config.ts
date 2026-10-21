import { defineConfig } from '@playwright/test';

// Requires the API (port 4000) and a seeded database. See README → "End-to-end tests".
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});

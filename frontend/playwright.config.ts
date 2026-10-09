import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4434',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },
  // Même client compilé et même CSP Helmet que l’image publiée.
  webServer: {
    command: 'PORT=4434 CLIENT_DIST=../frontend/dist/frontend/browser node ../scripts/test-server.cjs',
    url: 'http://127.0.0.1:4434/health',
    timeout: 60000,
  },
});

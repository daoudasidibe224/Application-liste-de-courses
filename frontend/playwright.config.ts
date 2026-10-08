import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4534',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },
  webServer: [
    {
      command: 'PORT=4434 node ../scripts/test-server.cjs',
      url: 'http://127.0.0.1:4434/health',
    },
    {
      command:
        'npm start -- --host 127.0.0.1 --port 4534 --proxy-config proxy.e2e.json',
      url: 'http://127.0.0.1:4534',
      timeout: 60000,
    },
  ],
});

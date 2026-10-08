import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, use: { baseURL: 'http://127.0.0.1:4314', launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {} },
  webServer: [
    { command: 'node ../scripts/test-server.cjs', url: 'http://127.0.0.1:3000/health' },
    { command: 'npm start -- --host 127.0.0.1 --port 4314', url: 'http://127.0.0.1:4314', timeout: 60000 }
  ]
});

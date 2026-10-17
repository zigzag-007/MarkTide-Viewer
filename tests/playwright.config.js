const path = require('node:path');
const { defineConfig, devices } = require('playwright/test');

const port = Number(process.env.MARKTIDE_TEST_PORT || 4173);
const browserExecutable = process.env.MARKTIDE_BROWSER_EXECUTABLE;
const artifactRoot = process.env.MARKTIDE_TEST_ARTIFACT_DIR || __dirname;

module.exports = defineConfig({
  testDir: path.resolve(__dirname, 'e2e'),
  outputDir: path.resolve(artifactRoot, 'test-results'),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.resolve(artifactRoot, 'playwright-report') }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: 'only-on-failure',
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://127.0.0.1:${port}`,
          localStorage: [
            { name: 'marktide-whats-new-dismissed', value: 'v1.8.2' },
          ],
        },
      ],
    },
    trace: 'retain-on-failure',
    video: 'off',
  },
  expect: {
    timeout: 10_000,
  },
  timeout: 45_000,
  webServer: {
    command: `node server/run-static-server.js --port ${port}`,
    cwd: __dirname,
    url: `http://127.0.0.1:${port}/index.html`,
    reuseExistingServer: false,
    timeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: browserExecutable ? { executablePath: browserExecutable } : {},
      },
    },
  ],
});

/**
 * Playwright Configuration for E2E Testing
 * @see https://playwright.dev/docs/test-configuration
 */

const { defineConfig, devices } = require('@playwright/test');

// CI optimization: only run Chromium in CI unless full suite requested
const isCI = !!process.env.CI;
const runFullSuite = process.env.FULL_BROWSER_SUITE === 'true';

module.exports = defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: isCI,

  // Retry on CI only
  retries: isCI ? 2 : 0,

  // Opt out of parallel tests on CI for stability, use sharding instead
  workers: isCI ? 2 : undefined,

  // Reporter to use
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html'], ['list']],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.TEST_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test (saves disk I/O)
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video only on failure (saves disk I/O)
    video: 'retain-on-failure',

    // Navigation timeout
    navigationTimeout: 15000,

    // Action timeout
    actionTimeout: 10000,
  },

  // Configure projects - Chromium only in CI for speed, full suite locally or on demand
  projects: isCI && !runFullSuite
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        // Test against mobile viewports
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12'] },
        },
      ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    // In CI, pass required env vars to the server
    env: isCI ? {
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-session-secret-for-e2e',
      PORT: '3000',
    } : undefined,
  },
});

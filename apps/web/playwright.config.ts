import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests/playwright",
  testMatch: "**/*.spec.ts",
  timeout: 60 * 1000, // Increased for slow initial compilation
  expect: {
    timeout: 10000, // Increased for slow page loads
  },
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : 4, // Use 4 workers locally for parallel execution
  reporter: "html",
  use: {
    actionTimeout: 0,
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env["CI"],
    env: {
      ...process.env,
      BYPASS_TOOL_AUTH: "true",
    },
  },
};

export default config;

import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// Only load dotenv files when not in CI
// CI environments set environment variables directly
if (!process.env.CI) {
  // Load environment variables in order of precedence:
  // 1. .env.test (test-specific)
  // 2. .env.local (local overrides)
  // 3. ../../.env (root project env)
  dotenv.config({ path: path.resolve(__dirname, ".env.test") });
  dotenv.config({ path: path.resolve(__dirname, ".env.local") });
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

// Check for required environment variables (only fail in local development)
const requiredEnvVars = ["DATABASE_URL", "AUTH_SECRET", "NEXTAUTH_URL"];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

// Only exit if we're not in CI and variables are missing
// In CI, these are set by the GitHub Actions workflow
if (!process.env.CI && missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables for Playwright tests:");
  missingEnvVars.forEach((v) => console.error(`  - ${v}`));
  console.error("\nPlease set these in one of:");
  console.error("  1. .env.test (recommended for test-specific config)");
  console.error("  2. .env.local (for local overrides)");
  console.error("  3. Environment variables");
  console.error("\nSee .env.test.example for a template.");
  process.exit(1);
}

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
      NEXT_PUBLIC_BYPASS_TOOL_AUTH: "true",
      // Always provide string values - empty string if not set
      // The dev server will load from .env.local if these are empty
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
    },
  },
};

export default config;

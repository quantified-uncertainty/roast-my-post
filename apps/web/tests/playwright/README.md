# Playwright Tests

## Setup

Before running Playwright tests, you need to:

1. **Set up environment variables:**
   ```bash
   # Copy the example file
   cp .env.test.example .env.test
   
   # Edit .env.test and set:
   # - DATABASE_URL (your PostgreSQL connection string)
   # - AUTH_SECRET (any random string for testing)
   # - NEXTAUTH_URL (http://localhost:3000)
   ```

2. **Build required packages:**
   ```bash
   pnpm --filter @roast/domain run build
   pnpm --filter @roast/db run build
   pnpm --filter @roast/ai run build
   ```

3. **Run tests:**
   ```bash
   # Run all Playwright tests
   pnpm --filter @roast/web exec playwright test
   
   # Run specific test file
   pnpm --filter @roast/web exec playwright test tests/playwright/setup-verification.spec.ts
   
   # Run with UI mode for debugging
   pnpm --filter @roast/web exec playwright test --ui
   ```

## Test Structure

- `setup-verification.spec.ts` - Basic tests to verify Playwright setup and auth bypass
- `tools-auth.spec.ts` - Tool authentication and authorization tests
- `tools-e2e-validation.spec.ts` - End-to-end validation of tool functionality
- `auth-helpers.ts` - Shared authentication utilities

## Environment Variables

The Playwright config automatically loads environment variables in this order:
1. `.env.test` - Test-specific configuration (highest priority)
2. `.env.local` - Local overrides
3. `../../.env` - Root project configuration

## Auth Bypass

Tests run with `BYPASS_TOOL_AUTH=true` by default, which allows testing tool functionality without full authentication setup. This is configured in `playwright.config.ts`.

## Troubleshooting

### Missing Environment Variables
If you see an error about missing environment variables, make sure you've created `.env.test` with the required values.

### Module Not Found Errors
If you see "Module not found: Can't resolve '@roast/ai'" or similar errors, rebuild the packages:
```bash
pnpm --filter @roast/domain run build
pnpm --filter @roast/db run build
pnpm --filter @roast/ai run build
```

### Tests Timing Out
Some tests may take longer on first run due to Next.js compilation. The timeout is set to 60 seconds in `playwright.config.ts`.
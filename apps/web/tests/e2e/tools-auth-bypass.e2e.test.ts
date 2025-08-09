/**
 * E2E tests for tool authentication bypass functionality
 * Tests the complete flow from UI to API with bypass enabled
 */

import { test, expect } from '@playwright/test';

// Only run these tests in development with bypass enabled
const shouldRunBypassTests = process.env.BYPASS_TOOL_AUTH === 'true' && 
                            process.env.NODE_ENV !== 'production';

test.describe('Tool Authentication Bypass', () => {
  test.beforeEach(async ({ page }) => {
    if (!shouldRunBypassTests) {
      test.skip();
    }
  });

  test('should access math verification tool without login', async ({ page }) => {
    // Navigate to the tool page
    await page.goto('/tools/check-math-with-mathjs');
    
    // Should not see login prompt
    await expect(page.locator('text=Sign In')).not.toBeVisible();
    await expect(page.locator('text=Log In')).not.toBeVisible();
    
    // Should see the tool interface
    await expect(page.locator('h1:has-text("Math Verification")')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="mathematical"]')).toBeVisible();
  });

  test('should verify correct mathematical statement without authentication', async ({ page }) => {
    await page.goto('/tools/check-math-with-mathjs');
    
    // Enter a mathematical statement
    await page.fill('textarea[placeholder*="mathematical"]', '2 + 2 = 4');
    
    // Click verify button
    await page.click('button:has-text("Check Statement"), button:has-text("Verify Statement")');
    
    // Wait for result
    await page.waitForSelector('text=Verified True', { timeout: 10000 });
    
    // Check result details
    await expect(page.locator('text=The statement "2 + 2 = 4" is mathematically correct')).toBeVisible();
  });

  test('should identify incorrect mathematical statement without authentication', async ({ page }) => {
    await page.goto('/tools/check-math-with-mathjs');
    
    // Enter an incorrect statement
    await page.fill('textarea[placeholder*="mathematical"]', '2 + 2 = 5');
    
    // Click verify button
    await page.click('button:has-text("Check Statement"), button:has-text("Verify Statement")');
    
    // Wait for result
    await page.waitForSelector('text=Verified False', { timeout: 10000 });
    
    // Check error is shown
    await expect(page.locator('text=incorrect')).toBeVisible();
  });

  test('should handle complex mathematical expressions', async ({ page }) => {
    await page.goto('/tools/check-math-with-mathjs');
    
    const testCases = [
      { statement: 'sqrt(144) = 12', expected: 'Verified True' },
      { statement: '5 km + 3000 m = 8 km', expected: 'Verified True' },
      { statement: '10% of 50 is 5', expected: 'Verified True' },
      { statement: 'sin(90 degrees) = 1', expected: 'Verified True' },
    ];
    
    for (const testCase of testCases) {
      // Clear and enter new statement
      await page.fill('textarea[placeholder*="mathematical"]', '');
      await page.fill('textarea[placeholder*="mathematical"]', testCase.statement);
      
      // Click verify
      await page.click('button:has-text("Check Statement"), button:has-text("Verify Statement")');
      
      // Wait for and verify result
      await page.waitForSelector(`text=${testCase.expected}`, { timeout: 10000 });
      
      // Clear result for next test
      await page.reload();
    }
  });

  test('should provide example statements that work without auth', async ({ page }) => {
    await page.goto('/tools/check-math-with-mathjs');
    
    // Check if example buttons are present
    const exampleButton = page.locator('button:has-text("2 + 2 = 4")').first();
    
    if (await exampleButton.isVisible()) {
      // Click an example
      await exampleButton.click();
      
      // Check if it fills the input
      const input = page.locator('textarea[placeholder*="mathematical"]');
      await expect(input).toHaveValue('2 + 2 = 4');
      
      // Verify it works
      await page.click('button:has-text("Check Statement"), button:has-text("Verify Statement")');
      await page.waitForSelector('text=Verified True', { timeout: 10000 });
    }
  });

  test('should show error for invalid input without crashing', async ({ page }) => {
    await page.goto('/tools/check-math-with-mathjs');
    
    // Enter invalid mathematical syntax
    await page.fill('textarea[placeholder*="mathematical"]', 'this is not math');
    
    // Click verify
    await page.click('button:has-text("Check Statement"), button:has-text("Verify Statement")');
    
    // Should show cannot verify or error message
    await page.waitForSelector('text=Cannot Verify, text=error', { timeout: 10000 });
  });
});

test.describe('Tool Authentication Required (Production Mode)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run auth tests only in Chromium');
  
  test('should require authentication when bypass is disabled', async ({ page }) => {
    // This test assumes BYPASS_TOOL_AUTH is not set or false
    if (process.env.BYPASS_TOOL_AUTH === 'true') {
      test.skip();
    }
    
    await page.goto('/tools/check-math-with-mathjs');
    
    // Enter a statement
    await page.fill('textarea[placeholder*="mathematical"]', '2 + 2 = 4');
    
    // Try to verify
    await page.click('button:has-text("Check Statement"), button:has-text("Verify Statement")');
    
    // Should show authentication error
    await page.waitForSelector('text=Not authenticated, text=Sign in, text=Log in', { timeout: 5000 });
  });
});
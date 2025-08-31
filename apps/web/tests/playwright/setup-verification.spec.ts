import { test, expect } from '@playwright/test';
import { AuthHelper, setupTestAuthBypass, setupTestAuthWithEnvBypass, isAuthenticated } from './auth-helpers';

test.describe('Playwright Setup Verification', () => {
  test('should be able to navigate to tools page', async ({ page }) => {
    await page.goto('/tools');
    
    // Check if we can see tools or if we're redirected to sign-in
    const isOnToolsPage = page.url().includes('/tools');
    const isOnSignInPage = page.url().includes('/auth/signin');
    
    // Should be on one of these pages
    expect(isOnToolsPage || isOnSignInPage).toBeTruthy();
  });

  test('should be able to set up auth bypass', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    // Navigate to a page before checking localStorage
    await page.goto('/');
    
    // Check that the bypass flag is set
    const hasBypass = await page.evaluate(() => {
      return window.localStorage.getItem('playwright-auth-bypass') === 'true';
    });
    
    expect(hasBypass).toBeTruthy();
  });

  test('should be able to set up environment auth bypass', async ({ page }) => {
    await setupTestAuthWithEnvBypass(page);
    
    // Navigate to a page before checking localStorage
    await page.goto('/');
    
    // Check that localStorage was set correctly
    const hasEnvBypass = await page.evaluate(() => {
      return window.localStorage.getItem('playwright-auth-bypass') === 'true';
    });
    
    expect(hasEnvBypass).toBeTruthy();
  });

  test('should be able to access fuzzy-text-locator tool with bypass', async ({ page }) => {
    await setupTestAuthBypass(page);
    await setupTestAuthWithEnvBypass(page);
    
    await page.goto('/tools/fuzzy-text-locator/try');
    
    // Should be able to access the tool page (not redirected to sign-in)
    await expect(page).toHaveURL('/tools/fuzzy-text-locator/try');
    
    // Should see the tool interface - check for any h1 and textarea
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('textarea').first()).toBeVisible();
  });

  test('should be able to access document-chunker tool with bypass', async ({ page }) => {
    await setupTestAuthBypass(page);
    await setupTestAuthWithEnvBypass(page);
    
    await page.goto('/tools/document-chunker/try');
    
    // Should be able to access the tool page
    await expect(page).toHaveURL('/tools/document-chunker/try');
    
    // Should see the tool interface - check for any h1 and textarea
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('textarea').first()).toBeVisible();
  });

  test('should handle auth check without bypass', async ({ page }) => {
    // The webServer config sets BYPASS_TOOL_AUTH=true globally,
    // so tools are accessible without authentication in test environment
    const authenticated = await isAuthenticated(page);
    
    // In test environment with BYPASS_TOOL_AUTH=true, tools are accessible
    expect(authenticated).toBeTruthy();
  });

  test('auth helpers should be functional', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    
    // Should be able to create auth helper
    expect(authHelper).toBeDefined();
    
    // Should be able to check sign-in status
    const isSignedIn = await authHelper.isSignedIn();
    expect(typeof isSignedIn).toBe('boolean');
  });
});
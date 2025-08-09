import { test, expect } from '@playwright/test';
import { AuthHelper, setupTestAuthBypass } from './auth-helpers';
import { setupTestAuthWithEnvBypass, isAuthenticated } from './database-helpers';

test.describe('Playwright Setup Verification', () => {
  test('should be able to access the app', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Roast My Post/i);
  });

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
    
    // Check that the bypass flag is set
    const hasBypass = await page.evaluate(() => {
      return window.localStorage.getItem('test-auth-bypass') === 'true';
    });
    
    expect(hasBypass).toBeTruthy();
  });

  test('should be able to set up environment auth bypass', async ({ page }) => {
    await setupTestAuthWithEnvBypass(page);
    
    // Check that environment variables are mocked
    const hasEnvBypass = await page.evaluate(() => {
      return (window as any).process?.env?.BYPASS_TOOL_AUTH === 'true';
    });
    
    expect(hasEnvBypass).toBeTruthy();
  });

  test('should be able to access fuzzy-text-locator tool with bypass', async ({ page }) => {
    await setupTestAuthBypass(page);
    await setupTestAuthWithEnvBypass(page);
    
    await page.goto('/tools/fuzzy-text-locator');
    
    // Should be able to access the tool page (not redirected to sign-in)
    await expect(page).toHaveURL('/tools/fuzzy-text-locator');
    
    // Should see the tool interface
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should be able to access document-chunker tool with bypass', async ({ page }) => {
    await setupTestAuthBypass(page);
    await setupTestAuthWithEnvBypass(page);
    
    await page.goto('/tools/document-chunker');
    
    // Should be able to access the tool page
    await expect(page).toHaveURL('/tools/document-chunker');
    
    // Should see the tool interface
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should handle auth check without bypass', async ({ page }) => {
    // Don't set up any bypass
    const authenticated = await isAuthenticated(page);
    
    // Should not be authenticated without proper setup
    expect(authenticated).toBeFalsy();
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
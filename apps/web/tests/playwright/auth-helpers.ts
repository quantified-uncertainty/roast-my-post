import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Signs in using email magic link flow
   * Note: In real tests, you'd need a test email service or email interception
   * For now, this demonstrates the flow structure
   */
  async signInWithEmail(email: string = 'test@example.com') {
    await this.page.goto('/auth/signin');
    
    // Check that we're on the sign-in page
    await expect(this.page).toHaveURL('/auth/signin');
    
    // Fill in email field
    await this.page.fill('input[type="email"]', email);
    
    // Submit the form
    await this.page.click('button[type="submit"]');
    
    // Wait for email sent confirmation
    await expect(this.page.locator('text=Check your email')).toBeVisible();
    
    // In real tests, you would:
    // 1. Intercept the email or use a test email service
    // 2. Extract the magic link from the email
    // 3. Navigate to that link to complete sign-in
    // 
    // For testing purposes, we'll simulate being signed in by
    // directly navigating to a protected page that would redirect
    // if not authenticated, but for now we'll assume sign-in works
  }

  /**
   * Create a test session directly via API for faster testing
   * This bypasses the email flow for integration tests
   */
  async createTestSession(userId: string = 'test-user-id') {
    // This would typically involve:
    // 1. Creating a test user in the database
    // 2. Creating a valid session token
    // 3. Setting the session cookie
    // 
    // For now, we'll use a simpler approach with environment bypass
    await this.page.addInitScript(() => {
      // Set a flag that our app can recognize for test sessions
      window.localStorage.setItem('playwright-test-mode', 'true');
    });
  }

  /**
   * Check if user is signed in by navigating to a protected page
   */
  async isSignedIn(): Promise<boolean> {
    await this.page.goto('/tools');
    
    // If we're redirected to sign-in, we're not authenticated
    if (this.page.url().includes('/auth/signin')) {
      return false;
    }
    
    // If we can access tools page, we're authenticated
    return this.page.url().includes('/tools');
  }

  /**
   * Sign out the user
   */
  async signOut() {
    // Look for sign out button/link
    const signOutButton = this.page.locator('text=Sign out').first();
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    } else {
      // Fallback: navigate to sign out URL directly
      await this.page.goto('/api/auth/signout');
    }
    
    // Confirm we're signed out
    await expect(this.page).toHaveURL(/\/auth\/signin/);
  }
}

/**
 * Create a test user session using the bypass mechanism for development
 * This uses the BYPASS_TOOL_AUTH environment variable
 */
export async function setupTestAuthBypass(page: Page) {
  // Navigate to a page first to ensure localStorage is accessible
  await page.goto('/');
  
  // Add the bypass flag to the page
  await page.addInitScript(() => {
    // Set environment flag that our createToolRoute checks
    (window as any).__test_bypass_auth = true;
  });
  
  // Also set localStorage flag for consistency
  await page.evaluate(() => {
    window.localStorage.setItem('test-auth-bypass', 'true');
  });
}

/**
 * Helper to test that auth is working by trying to access API without auth
 */
export async function testAuthRequired(page: Page, toolPath: string) {
  // Navigate to ensure page is loaded
  await page.goto('/');
  
  // Clear any bypass flags
  await page.evaluate(() => {
    delete (window as any).__test_bypass_auth;
    window.localStorage.removeItem('test-auth-bypass');
  });
  
  // Try to call the API directly without auth
  const response = await page.evaluate(async (path) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'test' }),
    });
    return {
      status: res.status,
      statusText: res.statusText,
    };
  }, toolPath);
  
  // Should be 401 Unauthorized without auth
  expect(response.status).toBe(401);
}
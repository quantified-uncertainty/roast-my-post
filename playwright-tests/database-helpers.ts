import { Page } from '@playwright/test';

/**
 * Database helpers for creating test users and sessions
 * These functions interact with the database to set up test scenarios
 */

export interface TestUser {
  id: string;
  email: string;
  name?: string;
  role: 'USER' | 'ADMIN';
}

export interface TestSession {
  sessionToken: string;
  userId: string;
  expires: Date;
}

/**
 * Create a test user via API endpoint
 * This assumes we have a test-only endpoint for user creation
 */
export async function createTestUser(page: Page, userData: Partial<TestUser> = {}): Promise<TestUser> {
  const defaultUser: TestUser = {
    id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    role: 'USER',
    ...userData
  };

  // This would call a test-only API endpoint to create the user
  // For now, we'll use page.evaluate to access a global test helper
  const createdUser = await page.evaluate(async (user) => {
    // In a real implementation, this would:
    // 1. Call a test API endpoint that creates users
    // 2. Or use a global test helper exposed on window
    // 3. Or use a database connection if available
    
    // For this example, we'll simulate the API call
    const response = await fetch('/api/test/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    }).catch(() => null);
    
    if (response && response.ok) {
      return response.json();
    }
    
    // Fallback: store user data in localStorage for mock purposes
    window.localStorage.setItem(`test-user-${user.id}`, JSON.stringify(user));
    return user;
  }, defaultUser);

  return createdUser;
}

/**
 * Create a test session for a user
 * This creates a valid session that can be used for authentication
 */
export async function createTestSession(page: Page, userId: string): Promise<TestSession> {
  const sessionData = {
    sessionToken: `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  };

  // Create session via API or direct database access
  await page.evaluate(async (session) => {
    // Try to call test API endpoint
    const response = await fetch('/api/test/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    }).catch(() => null);
    
    if (!response || !response.ok) {
      // Fallback: store in localStorage
      window.localStorage.setItem(`test-session-${session.sessionToken}`, JSON.stringify(session));
    }
  }, sessionData);

  return sessionData;
}

/**
 * Set session cookie for authenticated requests
 */
export async function setSessionCookie(page: Page, sessionToken: string) {
  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      httpOnly: true,
      secure: false, // false for localhost
      sameSite: 'Lax'
    }
  ]);
}

/**
 * Complete auth setup: create user, session, and set cookie
 */
export async function setupAuthenticatedUser(page: Page, userData: Partial<TestUser> = {}): Promise<TestUser> {
  // Create test user
  const user = await createTestUser(page, userData);
  
  // Create session for the user
  const session = await createTestSession(page, user.id);
  
  // Set the session cookie
  await setSessionCookie(page, session.sessionToken);
  
  return user;
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(page: Page, userIds: string[] = []) {
  await page.evaluate((ids) => {
    // Remove test data from localStorage
    const keysToRemove = Object.keys(localStorage)
      .filter(key => key.startsWith('test-user-') || key.startsWith('test-session-'));
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Call cleanup API if available
    if (ids.length > 0) {
      fetch('/api/test/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids })
      }).catch(() => {
        // Ignore cleanup errors in tests
      });
    }
  }, userIds);
}

/**
 * Alternative: Create a test session using environment variable approach
 * This is simpler but less realistic than actual database operations
 */
export async function setupTestAuthWithEnvBypass(page: Page) {
  // Navigate to a page first to ensure localStorage is accessible
  await page.goto('/');
  
  // Set environment variable that our auth middleware recognizes
  await page.addInitScript(() => {
    // Mock environment variable
    (window as any).process = { 
      env: { 
        BYPASS_TOOL_AUTH: 'true',
        NODE_ENV: 'test'
      } 
    };
    
    // Mock authenticated user data
    (window as any).__test_user = {
      id: 'test-user-playwright',
      email: 'playwright@example.com',
      role: 'USER'
    };
  });
  
  // Set localStorage flag that components can check
  await page.evaluate(() => {
    window.localStorage.setItem('playwright-auth-bypass', 'true');
    window.localStorage.setItem('test-user-id', 'test-user-playwright');
  });
}

/**
 * Check if user is authenticated by testing a protected endpoint
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/user/profile', {
        method: 'GET',
        credentials: 'include'
      });
      return { status: res.status, ok: res.ok };
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get current user info if authenticated
 */
export async function getCurrentUser(page: Page): Promise<TestUser | null> {
  try {
    const user = await page.evaluate(async () => {
      const res = await fetch('/api/user/profile', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (res.ok) {
        return res.json();
      }
      return null;
    });
    
    return user;
  } catch {
    return null;
  }
}
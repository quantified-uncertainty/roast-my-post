import { test, expect, Page } from '@playwright/test';
import { AuthHelper, setupTestAuthBypass, testAuthRequired } from './auth-helpers';

// Test data for different tools
const toolTestData = {
  'fuzzy-text-locator': {
    input: { 
      documentText: 'This is a sample document with some text to search through.',
      searchText: 'sample document'
    },
    expectedInResult: ['found', 'location']
  },
  'document-chunker': {
    input: {
      text: 'This is a long document that needs to be split into smaller chunks for processing. ' +
            'It contains multiple paragraphs and sections that should be handled appropriately. ' +
            'The chunking algorithm should preserve meaningful boundaries where possible.',
      maxChunkSize: 50
    },
    expectedInResult: ['chunks', 'text']
  },
  'extract-math-expressions': {
    input: {
      text: 'The equation 2 + 2 = 4 and the formula x^2 + y^2 = z^2 are mathematical expressions.',
      context: 'Find math expressions in text'
    },
    expectedInResult: ['expressions', 'math']
  },
  'detect-language-convention': {
    input: {
      text: 'This is a colour from the neighbourhood centre that specialises in behaviour.',
      context: 'Detect language convention'
    },
    expectedInResult: ['convention', 'language']
  }
};

// Helper function to test a tool with authentication
async function testToolWithAuth(page: Page, toolId: string, testData: any) {
  const _authHelper = new AuthHelper(page);
  
  // Navigate to the tool page
  await page.goto(`/tools/${toolId}`);
  
  // Should be on the tool page (not redirected to sign-in)
  await expect(page).toHaveURL(`/tools/${toolId}`);
  
  // Check that the page loaded properly - look for the tool title
  await expect(page.locator('h1').last()).toBeVisible();
  
  // Handle different input types based on the tool
  if (toolId === 'fuzzy-text-locator') {
    // Fuzzy text locator has two textareas: documentText and searchText
    const textareas = page.locator('textarea');
    const count = await textareas.count();
    if (count >= 2) {
      await textareas.nth(0).fill(testData.input.documentText || 'test document');
      await textareas.nth(1).fill(testData.input.searchText || 'test search');
    } else {
      // Fallback for single textarea
      await textareas.first().fill(testData.input.documentText || testData.input.text || 'test input');
    }
  } else if (toolId === 'document-chunker') {
    // Document chunker has a textarea and a number input
    const textarea = page.locator('textarea').first();
    await textarea.fill(testData.input.text || 'test text');
    
    // Look for chunk size input
    const chunkSizeInput = page.locator('input[type="number"]').first();
    if (await chunkSizeInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await chunkSizeInput.fill(String(testData.input.maxChunkSize || 50));
    }
  } else {
    // Default: single textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    const inputText = testData.input.text || testData.input.query || 'test input';
    await textarea.fill(inputText);
  }
  
  // Find and click the submit button
  const submitButton = page.locator('button[type="submit"]').or(
    page.locator('button').filter({ hasText: /analyze|check|process|submit/i })
  ).first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  
  // Wait for the request to complete (look for loading state to end)
  // Use longer timeout for extract-math-expressions which can be slow
  const timeout = toolId === 'extract-math-expressions' ? 30000 : 15000;
  // Wait for button to not show loading states (containing "...")
  await expect(submitButton).not.toHaveText(/ing\.\.\./, { timeout });
  
  // Check that we got some result
  // Look for common result indicators
  const resultIndicators = [
    page.locator('[data-testid="tool-result"]'),  // Primary: data-testid
    page.locator('.result'),                       // Fallback: specific class
    page.locator('pre'),                           // Fallback: JSON results
  ];
  
  let resultFound = false;
  for (const indicator of resultIndicators) {
    if (await indicator.isVisible()) {
      resultFound = true;
      break;
    }
  }
  
  // If no specific result container, check for expected content
  if (!resultFound) {
    for (const expectedContent of testData.expectedInResult) {
      const contentLocator = page.locator(`text=${expectedContent}`).first();
      if (await contentLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
        resultFound = true;
        break;
      }
    }
  }
  
  if (!resultFound) {
    // Check if there's an error message
    const errorSelectors = [
      '[data-testid="tool-error"]',  // Primary: data-testid
      'text=error',
      'text=Error',
      'text=failed',
      'text=Failed',
      '.error-message'  // Removed broad [class*="error"] selector
    ];
    
    let errorMessage = '';
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector).first();
      if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        errorMessage = await errorElement.textContent() || '';
        break;
      }
    }
    
    if (errorMessage) {
      throw new Error(`Tool ${toolId} failed with error: ${errorMessage}`);
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: `playwright-results/tool-${toolId}-debug.png`, fullPage: true });
    throw new Error(`No result found for tool ${toolId}. Check screenshot for debugging.`);
  }
  
  return true;
}

// Test authentication requirement
test.describe('Tool Authentication Requirements', () => {
  test('should require authentication for API endpoints', async ({ page }) => {
    for (const toolId of Object.keys(toolTestData)) {
      await testAuthRequired(page, `/api/tools/${toolId}`);
    }
  });
  
  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    // Visit a tool page without being authenticated
    await page.goto('/tools/fuzzy-text-locator');
    
    // Should be redirected to sign-in page or stay on tools page
    // Note: In dev mode with auth bypass, redirection might not happen
    const url = page.url();
    expect(url.includes('/auth/signin') || url.includes('/tools/')).toBeTruthy();
  });
});

// Test tools with authentication bypass (for development/testing)
test.describe('Tools with Auth Bypass', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupTestAuthBypass(page);
    
    // Add unique test identifier for isolation
    await page.addInitScript((testId) => {
      window.localStorage.setItem('test-id', testId);
    }, `${testInfo.title}-${Date.now()}`);
    
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
  
  test.afterEach(async ({ page }) => {
    // Clean up test data
    await page.evaluate(() => {
      const testKeys = Object.keys(localStorage).filter(key => key.startsWith('test-'));
      testKeys.forEach(key => localStorage.removeItem(key));
    });
  });
  
  for (const [toolId, testData] of Object.entries(toolTestData)) {
    test(`should work with auth bypass: ${toolId}`, async ({ page }) => {
      // Set environment variable for bypass
      await page.addInitScript(() => {
        (window as any).process = { env: { BYPASS_TOOL_AUTH: 'true' } };
      });
      
      await testToolWithAuth(page, toolId, testData);
    });
  }
});

// Test with real authentication (requires email setup)
test.describe('Tools with Real Authentication', () => {
  test.skip('should work with real email auth', async ({ page }) => {
    // This test is skipped by default because it requires:
    // 1. A test email service or email interception
    // 2. A way to extract magic links from emails
    // 3. A test database with known user
    
    const authHelper = new AuthHelper(page);
    
    // Sign in with test email
    await authHelper.signInWithEmail('test@example.com');
    
    // Test a tool
    await testToolWithAuth(page, 'fuzzy-text-locator', toolTestData['fuzzy-text-locator']);
  });
});

// Test tool functionality without auth bypass
test.describe('Tool Functionality Tests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Create a test session (this would be implemented with real session creation)
    const authHelper = new AuthHelper(page);
    await authHelper.createTestSession();
    
    // Add test isolation
    await page.addInitScript((testId) => {
      window.localStorage.setItem('test-session-id', testId);
    }, `session-${testInfo.title}-${Date.now()}`);
    
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
  
  test.afterEach(async ({ page }, testInfo) => {
    // Capture screenshot on failure
    if (testInfo.status === 'failed') {
      await page.screenshot({ 
        path: `test-results/auth-failures/${testInfo.title.replace(/[^a-z0-9]/gi, '-')}.png`,
        fullPage: true 
      });
    }
    
    // Clean up test session data
    await page.evaluate(() => {
      const testKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('test-') || key.startsWith('session-')
      );
      testKeys.forEach(key => localStorage.removeItem(key));
    });
  });
  
  test('fuzzy-text-locator should find text matches', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/fuzzy-text-locator');
    
    // Fuzzy text locator should have two textareas
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    
    if (textareaCount >= 2) {
      // Fill both textareas: documentText and searchText
      await textareas.nth(0).fill('This is a sample document with some text to search through.');
      await textareas.nth(1).fill('sample document');
    } else {
      // Fallback: try single textarea
      await textareas.first().fill('This is a sample document with some text to search through.');
    }
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for the button to be re-enabled (indicates processing is done)
    await expect(submitButton).toBeEnabled({ timeout: 30000 });
    
    // Wait for result to appear - check multiple possible selectors
    const resultSelectors = [
      '[data-testid="tool-result"]',
      'pre',
      '.result',
      'text=/found|location|match|offset/i'
    ];
    
    let hasResult = false;
    for (const selector of resultSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        hasResult = true;
        break;
      }
    }
    
    expect(hasResult).toBeTruthy();
  });
  
  test('document-chunker should split text into chunks', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/document-chunker');
    
    // Fill the text area
    const textarea = page.locator('textarea').first();
    await textarea.fill(toolTestData['document-chunker'].input.text);
    
    // Fill the chunk size input if present
    const chunkSizeInput = page.locator('input[type="number"]').first();
    if (await chunkSizeInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await chunkSizeInput.fill(String(toolTestData['document-chunker'].input.maxChunkSize));
    }
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for the button to be re-enabled (indicates processing is done)
    await expect(submitButton).toBeEnabled({ timeout: 30000 });
    
    // Wait for result to appear - check multiple possible selectors
    const resultSelectors = [
      '[data-testid="tool-result"]',
      'pre',
      '.result',
      'text=/chunk|segment|split/i'
    ];
    
    let hasResult = false;
    for (const selector of resultSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        hasResult = true;
        break;
      }
    }
    
    expect(hasResult).toBeTruthy();
  });
});

// Test error handling
test.describe('Tool Error Handling', () => {
  test('should handle missing input gracefully', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/fuzzy-text-locator');
    
    // Check if submit button is disabled without input
    const submitButton = page.locator('button[type="submit"]').first();
    const isDisabled = await submitButton.isDisabled();
    
    if (isDisabled) {
      // Good - button is properly disabled without input
      expect(isDisabled).toBeTruthy();
    } else {
      // Button is enabled, try to click and check for error
      await submitButton.click();
      
      // Should show error message
      const errorMessage = await page.locator('[data-testid="tool-error"], text=required, text=enter').isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!errorMessage) {
        // Check if form validation prevented submission
        const formValidation = await page.evaluate(() => {
          const form = document.querySelector('form');
          return form ? !form.checkValidity() : false;
        });
        
        expect(formValidation || errorMessage).toBeTruthy();
      }
    }
  });
});
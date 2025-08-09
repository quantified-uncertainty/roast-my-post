import { test, expect, Page } from '@playwright/test';
import { AuthHelper, setupTestAuthBypass, testAuthRequired } from './auth-helpers';

// Test data for different tools
const toolTestData = {
  'fuzzy-text-locator': {
    input: { 
      text: 'This is a sample document with some text to search through.',
      query: 'sample document'
    },
    expectedInResult: ['text', 'matches']
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
  const authHelper = new AuthHelper(page);
  
  // Navigate to the tool page
  await page.goto(`/tools/${toolId}`);
  
  // Should be on the tool page (not redirected to sign-in)
  await expect(page).toHaveURL(`/tools/${toolId}`);
  
  // Check that the page loaded properly
  await expect(page.locator('h1')).toBeVisible();
  
  // Find the main input textarea
  const textarea = page.locator('textarea').first();
  await expect(textarea).toBeVisible();
  
  // Fill in the test input
  const inputText = testData.input.text || testData.input.query || 'test input';
  await textarea.fill(inputText);
  
  // Find and click the submit button
  const submitButton = page.locator('button[type="submit"]').or(
    page.locator('button').filter({ hasText: /analyze|check|process|submit/i })
  ).first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  
  // Wait for the request to complete (look for loading state to end)
  await expect(submitButton).not.toHaveText(/\.\.\./);
  
  // Check that we got some result
  // Look for common result indicators
  const resultIndicators = [
    page.locator('[data-testid="tool-result"]'),
    page.locator('.result'),
    page.locator('[class*="result"]'),
    page.locator('pre'), // JSON results
    page.locator('[class*="output"]'),
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
      'text=error',
      'text=Error',
      'text=failed',
      'text=Failed',
      '[class*="error"]',
      '.error-message'
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
    
    // Should be redirected to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

// Test tools with authentication bypass (for development/testing)
test.describe('Tools with Auth Bypass', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestAuthBypass(page);
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
  test.beforeEach(async ({ page }) => {
    // Create a test session (this would be implemented with real session creation)
    const authHelper = new AuthHelper(page);
    await authHelper.createTestSession();
  });
  
  test('fuzzy-text-locator should find text matches', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/fuzzy-text-locator');
    
    const textarea = page.locator('textarea').first();
    await textarea.fill('This is a sample document with some text to search through.');
    
    // Look for a second input field for the query
    const inputs = page.locator('input[type="text"], textarea');
    const inputCount = await inputs.count();
    
    if (inputCount > 1) {
      // Fill the query field if it exists
      await inputs.nth(1).fill('sample document');
    }
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for result
    await page.waitForTimeout(2000);
    
    // Check for result indicators
    const hasResult = await page.locator('pre, .result, [data-testid="result"]').isVisible();
    expect(hasResult).toBeTruthy();
  });
  
  test('document-chunker should split text into chunks', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/document-chunker');
    
    const textarea = page.locator('textarea').first();
    await textarea.fill(toolTestData['document-chunker'].input.text);
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for result
    await page.waitForTimeout(2000);
    
    // Check for result
    const hasResult = await page.locator('pre, .result, [data-testid="result"]').isVisible();
    expect(hasResult).toBeTruthy();
  });
});

// Test error handling
test.describe('Tool Error Handling', () => {
  test('should handle missing input gracefully', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/fuzzy-text-locator');
    
    // Try to submit without input
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Should show error message or validation
    const errorMessage = await page.locator('text=required, text=enter, [class*="error"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!errorMessage) {
      // Check if form validation prevented submission
      const formValidation = await page.evaluate(() => {
        const form = document.querySelector('form');
        return form ? !form.checkValidity() : false;
      });
      
      expect(formValidation || errorMessage).toBeTruthy();
    }
  });
});
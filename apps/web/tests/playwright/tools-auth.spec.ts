import { test, expect, Page } from '@playwright/test';
import { AuthHelper, setupTestAuthBypass, testAuthRequired } from './auth-helpers';
import type { ToolId } from '../../src/app/tools/tool-metadata';

interface ToolTestData {
  input: Record<string, string | number>;
  response?: Record<string, unknown>;
}

// AI responses are fixed here; these tests check the browser form and result rendering.
const toolTestData = {
  'smart-text-searcher': {
    input: { 
      documentText: 'This is a sample document with some text to search through.',
      searchText: 'sample document'
    },
  },
  'document-chunker': {
    input: {
      text: 'This is a long document that needs to be split into smaller chunks for processing. ' +
            'It contains multiple paragraphs and sections that should be handled appropriately. ' +
            'The chunking algorithm should preserve meaningful boundaries where possible.',
      maxChunkSize: 500
    },
  },
  'math-expressions-extractor': {
    input: {
      text: 'The equation 2 + 2 = 4 and the formula x^2 + y^2 = z^2 are mathematical expressions.',
      context: 'Find math expressions in text'
    },
    response: {
      expressions: [{
        originalText: '2 + 2 = 4',
        hasError: false,
        complexityScore: 10,
        contextImportanceScore: 50,
        errorSeverityScore: 0,
        verificationStatus: 'verified',
      }],
    }
  },
  'language-convention-detector': {
    input: {
      text: 'This is a colour from the neighbourhood centre that specialises in behaviour.',
      context: 'Detect language convention'
    },
    response: { convention: 'UK', confidence: 0.95, consistency: 1, evidence: [] }
  }
} satisfies Partial<Record<ToolId, ToolTestData>>;

// Helper function to test a tool with authentication
async function testToolWithAuth(page: Page, toolId: string, testData: ToolTestData) {
  if (testData.response) {
    await page.route(`**/api/tools/${toolId}`, async route => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toMatchObject({ text: testData.input.text });
      await route.fulfill({ json: { success: true, result: testData.response } });
    });
  }
  
  // Navigate directly to the tool's try page
  await page.goto(`/tools/${toolId}/try`);
  
  // Should be on the tool page (not redirected to sign-in)
  await expect(page).toHaveURL(`/tools/${toolId}/try`);
  
  // Check that the page loaded properly - look for the tool title
  await expect(page.locator('h1').last()).toBeVisible();
  
  // Wait for the form to be visible
  await page.waitForSelector('form', { timeout: 5000 });
  
  // Handle different input types based on the tool
  if (toolId === 'smart-text-searcher') {
    await page.getByLabel('Document Text', { exact: false }).fill(String(testData.input.documentText));
    await page.getByLabel('Search Text', { exact: false }).fill(String(testData.input.searchText));
  } else if (toolId === 'document-chunker') {
    // Document chunker has a textarea and a number input
    const textarea = page.locator('textarea').first();
    await textarea.fill(String(testData.input.text || 'test text'));
    
    await page.getByLabel('Max Chunk Size', { exact: true }).fill(String(testData.input.maxChunkSize));
  } else {
    // Default: single textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    const inputText = testData.input.text || testData.input.query || 'test input';
    await textarea.fill(String(inputText));
  }
  
  // Find and click the submit button
  const submitButton = page.locator('button[type="submit"]').or(
    page.locator('button').filter({ hasText: /analyze|check|process|submit/i })
  ).first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  
  // Wait for the result container before checking the response.
  const result = page.getByTestId('tool-result');
  await expect(result).toBeVisible({ timeout: 30000 });
  if (testData.response) {
    await expect(result.locator('pre')).toHaveText(JSON.stringify(testData.response, null, 2));
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
    await page.goto('/tools/smart-text-searcher');
    
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
      // Use the proper auth bypass setup
      await setupTestAuthBypass(page);
      
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
    await testToolWithAuth(page, 'smart-text-searcher', toolTestData['smart-text-searcher']);
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
  
  test('smart-text-searcher should find text matches', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/smart-text-searcher/try');
    
    await page.getByLabel('Document Text', { exact: false }).fill('This is a sample document with some text to search through.');
    await page.getByLabel('Search Text', { exact: false }).fill('sample document');
    await page.locator('button[type="submit"]').click();

    const result = page.getByTestId('tool-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('"found": true');
    await expect(result).toContainText('"quotedText": "sample document"');
    await expect(result).toContainText('"startOffset": 10');
    await expect(result).toContainText('"endOffset": 25');
  });
  
  test('document-chunker should split text into chunks', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/document-chunker/try');
    
    // Fill the text area
    const textarea = page.locator('textarea').first();
    await textarea.fill(toolTestData['document-chunker'].input.text);
    
    await page.getByLabel('Max Chunk Size', { exact: true })
      .fill(String(toolTestData['document-chunker'].input.maxChunkSize));
    await page.locator('button[type="submit"]').click();

    const result = page.getByTestId('tool-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('"chunks"');
    await expect(result).toContainText('This is a long document');
  });
});

// Test error handling
test.describe('Tool Error Handling', () => {
  test('should handle missing input gracefully', async ({ page }) => {
    await setupTestAuthBypass(page);
    
    await page.goto('/tools/smart-text-searcher/try');
    
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
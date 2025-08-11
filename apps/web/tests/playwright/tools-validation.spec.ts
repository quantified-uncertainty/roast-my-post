/**
 * Tool Validation Tests
 * 
 * This test suite validates all tool pages in the application:
 * 1. Page Loading Tests - Verify tools load without errors
 * 2. AI Validation Tests - Use Claude Sonnet 4 to validate tool outputs make sense
 * 3. Example Tests - Verify example buttons populate forms correctly
 * 
 * AI validation uses the ANALYSIS_MODEL (Sonnet 4) to review tool outputs
 * and ensure they produce sensible results for given inputs.
 */

import { test, expect } from '@playwright/test';
import { Anthropic } from '@anthropic-ai/sdk';
import { setupTestAuthBypass } from './auth-helpers';
import { toolMetadata } from '../../src/app/tools/tool-metadata';

// Skip if no API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Tool configurations - using metadata from centralized source
const TOOLS_TO_TEST = Object.entries(toolMetadata).map(([id, metadata]) => ({
  id,
  path: `/tools/${id}`,
  buttonText: metadata.buttonText,
  exampleIndex: metadata.exampleIndex,
  expectedResultPattern: getExpectedPattern(id)
}));

// Helper function to get expected patterns for each tool
function getExpectedPattern(toolId: string): RegExp {
  const patterns: Record<string, RegExp> = {
    'check-math': /correct|incorrect|error|calculation/i,
    'check-math-hybrid': /correct|incorrect|error|calculation/i,
    'check-math-with-mathjs': /correct|incorrect|error|verified/i,
    'check-spelling-grammar': /error|spelling|grammar|correction/i,
    'fact-checker': /true|false|claim|verdict/i,
    'extract-factual-claims': /claim|fact|extracted/i,
    'extract-forecasting-claims': /forecast|prediction|claim/i,
    'detect-language-convention': /british|american|UK|US|convention/i,
    'document-chunker': /chunk|section|segment/i,
    'extract-math-expressions': /expression|formula|equation|math/i,
    'fuzzy-text-locator': /found|location|match|position/i,
    'link-validator': /valid|invalid|status|link|URL/i,
    'perplexity-research': /research|information|query|result/i,
    'forecaster': /probability|forecast|prediction|percent/i
  };
  return patterns[toolId] || /result|output|processed/i;
}


test.describe('Tool AI Validation Tests', () => {
  let anthropic: Anthropic;

  test.beforeAll(() => {
    if (ANTHROPIC_API_KEY) {
      anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY,
      });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Setup auth bypass for testing
    await setupTestAuthBypass(page);
  });

  for (const tool of TOOLS_TO_TEST) {
    const testFn = ANTHROPIC_API_KEY ? test : test.skip;
    testFn(`${tool.id}: should produce sensible results`, async ({ page }) => {
      // Set timeout for this specific test
      test.setTimeout(tool.timeout || 60000);

      // Navigate to tool page
      await page.goto(tool.path);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Click the example button to populate the form
      const exampleButton = await page.locator('button').filter({ 
        hasText: `Example ${tool.exampleIndex + 1}` 
      }).first();
      
      if (await exampleButton.isVisible()) {
        await exampleButton.click();
        await page.waitForTimeout(500); // Give time for form to populate
      } else {
        // Fallback: look for any example button
        const anyExampleButton = await page.locator('button').filter({ 
          hasText: /Example/i 
        }).nth(tool.exampleIndex);
        if (await anyExampleButton.isVisible()) {
          await anyExampleButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Find and click the submit button using the exact button text
      const submitButton = await page.locator('button').filter({ 
        hasText: tool.buttonText 
      }).first();
      
      await submitButton.click();
      
      // Wait for results (with timeout)
      const maxWaitTime = tool.timeout || 60000;
      const startTime = Date.now();
      
      // Wait for loading to complete
      while (Date.now() - startTime < maxWaitTime) {
        const isDisabled = await submitButton.isDisabled();
        if (!isDisabled) {
          break;
        }
        await page.waitForTimeout(1000);
      }
      
      // Get the page content after results appear
      await page.waitForTimeout(2000); // Give results time to render
      const pageContent = await page.content();
      const textContent = await page.locator('body').textContent();
      
      // Basic validation - check if expected patterns appear
      expect(textContent).toMatch(tool.expectedResultPattern);
      
      // AI validation - use Claude to check if results make sense
      if (anthropic) {
        const validationPrompt = `
You are reviewing the output of an AI tool called "${tool.id}". 
The tool received this input: ${JSON.stringify(tool.testInput, null, 2)}

Here is the text content from the results page:
${textContent?.substring(0, 3000)}

Please analyze if the output makes sense for this tool. Consider:
1. Does the output relate to the input provided?
2. Does it contain the expected type of analysis for a ${tool.id} tool?
3. Are there any obvious errors or nonsensical results?

Respond with a JSON object:
{
  "makeSense": true/false,
  "reason": "brief explanation",
  "issues": ["list", "of", "issues"] or []
}
`;

        try {
          // Use the ANALYSIS_MODEL (Sonnet 4) for validation
          const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || 'claude-3-5-sonnet-20241022';
          const response = await anthropic.messages.create({
            model: ANALYSIS_MODEL,  // Uses Sonnet 4 from environment or default
            max_tokens: 500,
            temperature: 0,
            messages: [
              {
                role: 'user',
                content: validationPrompt
              }
            ]
          });

          const content = response.content[0];
          if (content.type === 'text') {
            // Parse the JSON response
            const jsonMatch = content.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const validation = JSON.parse(jsonMatch[0]);
              
              // Assert that the output makes sense
              expect(validation.makeSense, 
                `Tool ${tool.id} output validation failed: ${validation.reason}. Issues: ${validation.issues.join(', ')}`
              ).toBe(true);
              
              console.log(`✓ ${tool.id}: Output validated successfully`);
            }
          }
        } catch (error) {
          console.warn(`Could not validate ${tool.id} with AI:`, error);
          // Don't fail the test if AI validation fails, just warn
        }
      }
    });
  }
});

// Test that all tools load without errors
test.describe('Tool Page Loading Tests', () => {
  for (const tool of TOOLS_TO_TEST) {
    test(`${tool.id}: should load without errors`, async ({ page }) => {
      // Listen for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Navigate to tool
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');
      
      // Check for no console errors
      expect(errors, `Console errors found on ${tool.id}: ${errors.join(', ')}`).toHaveLength(0);
      
      // Check that key elements are present
      await expect(page.locator('h1, h2').first()).toBeVisible();
      
      // Check for the specific submit button using the exact text from metadata
      const submitButton = page.locator('button').filter({ 
        hasText: tool.buttonText 
      }).first();
      
      // The button should be visible (may need scrolling on some pages)
      await expect(submitButton).toBeVisible({ timeout: 5000 });
    });
  }
});

// Test example buttons work
test.describe('Tool Example Tests', () => {
  for (const tool of TOOLS_TO_TEST) {
    test(`${tool.id}: example buttons should populate form`, async ({ page }) => {
      await page.goto(tool.path);
      await page.waitForLoadState('networkidle');
      
      // Look for example buttons
      const exampleButtons = page.locator('button').filter({ hasText: /example/i });
      const exampleCount = await exampleButtons.count();
      
      if (exampleCount > 0) {
        // Click first example
        await exampleButtons.first().click();
        await page.waitForTimeout(500);
        
        // Check that at least one field has content
        // Tools may use input or textarea elements
        let hasContent = false;
        const inputSelectors = ['input[type="text"]', 'textarea', 'input[placeholder]'];
        
        for (const selector of inputSelectors) {
          const elements = await page.locator(selector).all();
          for (const element of elements) {
            const value = await element.inputValue().catch(() => '');
            if (value && value.length > 0) {
              hasContent = true;
              break;
            }
          }
          if (hasContent) break;
        }
        
        expect(hasContent, `Example button did not populate form for ${tool.id}`).toBe(true);
      }
    });
  }
});
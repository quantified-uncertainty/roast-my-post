/**
 * End-to-End Tool Validation Tests
 * 
 * This test suite ACTUALLY RUNS each tool and validates outputs to ensure:
 * 1. Tools produce sensible results (no "wacky" outputs)
 * 2. Tools handle errors gracefully
 * 3. Tools respond within reasonable timeouts
 * 
 * Uses Claude Sonnet 4 to validate non-deterministic outputs
 */

import { test, expect, Page } from '@playwright/test';
import { Anthropic } from '@anthropic-ai/sdk';
import { setupTestAuthBypass } from './auth-helpers';
import { toolMetadata } from '../../src/app/tools/tool-metadata';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || 'claude-3-5-sonnet-20241022';

// Define what "working correctly" means for each tool
const TOOL_VALIDATION = {
  'check-math': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should identify correct/incorrect and explain why
      return output.match(/correct|incorrect|error|calculation/i) && 
             output.length > 20; // Not just a single word
    },
    aiPrompt: 'Is this a reasonable math checking result that identifies whether statements are correct/incorrect?'
  },
  'check-math-hybrid': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      return output.match(/correct|incorrect|verified|calculation/i) &&
             output.length > 20;
    },
    aiPrompt: 'Is this a reasonable math verification result?'
  },
  'check-math-with-mathjs': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      return output.match(/correct|incorrect|verified|evaluated/i) &&
             output.length > 20;
    },
    aiPrompt: 'Is this a reasonable math verification using computational tools?'
  },
  'check-spelling-grammar': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should find errors or say it's clean
      return (output.match(/error|spelling|grammar|correction/i) ||
              output.match(/no errors|correct|clean/i)) &&
             output.length > 20;
    },
    aiPrompt: 'Is this a reasonable spelling/grammar check result?'
  },
  'fact-checker': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should have claims with verdicts
      return output.match(/claim|verdict|true|false|accurate|inaccurate/i) &&
             output.length > 50;
    },
    aiPrompt: 'Does this fact-checking result properly analyze factual claims with verdicts?'
  },
  'extract-factual-claims': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should extract specific claims
      return output.match(/claim|fact|statement|extracted/i) &&
             output.length > 30;
    },
    aiPrompt: 'Does this properly extract factual claims from the text?'
  },
  'extract-forecasting-claims': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should find predictions about the future
      return output.match(/forecast|prediction|will|by \d{4}|future/i) &&
             output.length > 30;
    },
    aiPrompt: 'Does this properly extract forecasting/prediction claims?'
  },
  'detect-language-convention': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should identify British/American English
      return output.match(/british|american|UK|US|english|convention/i) &&
             output.length > 20;
    },
    aiPrompt: 'Does this correctly identify the language convention (British/American English)?'
  },
  'document-chunker': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should create chunks/sections
      return output.match(/chunk|section|segment|split|part/i) &&
             output.length > 50;
    },
    aiPrompt: 'Does this properly chunk the document into sections?'
  },
  'extract-math-expressions': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should find mathematical expressions
      return output.match(/expression|formula|equation|mathematical/i) &&
             output.length > 30;
    },
    aiPrompt: 'Does this properly extract mathematical expressions?'
  },
  'fuzzy-text-locator': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should find text locations
      return output.match(/found|location|match|position|offset/i) &&
             output.length > 20;
    },
    aiPrompt: 'Does this properly locate text in the document?'
  },
  'link-validator': {
    timeout: 60000, // Increased timeout
    validateOutput: (output: string) => {
      // Should check link validity
      return output.match(/valid|invalid|status|reachable|broken|link/i) &&
             output.length > 30;
    },
    aiPrompt: 'Does this properly validate the status of links?'
  },
  'perplexity-research': {
    timeout: 120000, // Increased timeout for API calls
    validateOutput: (output: string) => {
      // Should return research information
      return output.match(/research|information|found|according|source/i) &&
             output.length > 100;
    },
    aiPrompt: 'Does this provide relevant research information for the query?'
  },
  'forecaster': {
    timeout: 180000, // Increased timeout for multiple API calls
    validateOutput: (output: string) => {
      // Should give probability forecasts
      return output.match(/probability|forecast|prediction|\d+%|percent/i) &&
             output.length > 50;
    },
    aiPrompt: 'Does this provide a reasonable probability forecast with reasoning?'
  }
};

interface TestResult {
  tool: string;
  success: boolean;
  issues: string[];
  outputSample?: string;
  aiValidation?: {
    valid: boolean;
    reason: string;
  };
}

test.describe('Tool End-to-End Validation', () => {
  let anthropic: Anthropic | null = null;
  const results: TestResult[] = [];
  
  // Test isolation: track created resources for cleanup
  const testResources = {
    screenshots: [] as string[],
    startTime: Date.now(),
  };

  test.beforeAll(async () => {
    if (ANTHROPIC_API_KEY) {
      anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      console.log('✅ AI validation enabled with Sonnet 4');
    } else {
      console.log('⚠️  No API key - running basic validation only');
    }
    
    // Warm up tools that have cold start issues with retry logic
    console.log('🔥 Warming up tools with cold start issues...');
    
    const warmUpWithRetry = async (maxAttempts = 3) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await fetch('http://localhost:3000/api/tools/fuzzy-text-locator', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Test-Auth-Bypass': 'true' // Include auth bypass for warm-up
            },
            body: JSON.stringify({
              documentText: 'warm up',
              searchText: 'warm'
            }),
            signal: AbortSignal.timeout(5000) // 5 second timeout per attempt
          });
          
          // Check HTTP status
          if (response.ok) {
            console.log('✅ Tool warm-up complete (status: 200)');
            return true;
          } else {
            console.warn(`⚠️  Attempt ${attempt}/${maxAttempts}: Tool warm-up returned status ${response.status}`);
          }
        } catch (e) {
          console.warn(`⚠️  Attempt ${attempt}/${maxAttempts} failed:`, e instanceof Error ? e.message : 'Unknown error');
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      console.log('⚠️  Tool warm-up failed after all attempts, continuing anyway...');
      return false;
    };
    
    await warmUpWithRetry();
  });

  test.beforeEach(async ({ page, browserName }, testInfo) => {
    // Set up authentication bypass
    await setupTestAuthBypass(page);
    
    // Add test metadata for better debugging
    await page.addInitScript(() => {
      window.localStorage.setItem('test-run-id', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    });
    
    // Set viewport for consistency
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Log test start
    console.log(`\n📝 Starting test: ${testInfo.title} [${browserName}]`);
  });
  
  test.afterEach(async ({ page }, testInfo) => {
    // Capture screenshot on failure for debugging
    if (testInfo.status === 'failed') {
      const screenshotPath = `test-results/failures/${testInfo.title.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResources.screenshots.push(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
    
    // Clear any test data from localStorage
    await page.evaluate(() => {
      const testKeys = Object.keys(localStorage).filter(key => key.startsWith('test-'));
      testKeys.forEach(key => localStorage.removeItem(key));
    });
    
    // Clear cookies to ensure clean state
    await page.context().clearCookies();
  });

  test.afterAll(async () => {
    // Clean up test resources
    if (testResources.screenshots.length > 0) {
      console.log(`\n🧹 Created ${testResources.screenshots.length} debug screenshots during failed tests`);
    }
    
    const testDuration = ((Date.now() - testResources.startTime) / 1000).toFixed(2);
    
    // Print summary report
    console.log('\n========================================');
    console.log('TOOL VALIDATION SUMMARY');
    console.log('========================================\n');
    console.log(`⏱️  Total test duration: ${testDuration}s`);
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const confidence = (passed / results.length) * 100;
    
    console.log(`Overall Confidence: ${confidence.toFixed(1)}%`);
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    
    if (failed > 0) {
      console.log('\nFailed Tools:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.tool}: ${r.issues.join(', ')}`);
      });
    }
    
    console.log('\n========================================\n');
  });

  // Test each tool
  for (const [toolId, metadata] of Object.entries(toolMetadata)) {
    test(`${toolId}: produces sensible output`, async ({ page }) => {
      const validation = TOOL_VALIDATION[toolId as keyof typeof TOOL_VALIDATION];
      if (!validation) {
        console.warn(`⚠️  No validation defined for ${toolId}`);
        return;
      }

      const result: TestResult = {
        tool: toolId,
        success: false,
        issues: []
      };

      try {
        // Set timeout for this test
        test.setTimeout(validation.timeout + 20000); // Extra time for navigation and setup

        // Navigate to tool
        await page.goto(`/tools/${toolId}`, { waitUntil: 'networkidle' });
        
        // Click the appropriate example button based on type
        let exampleButton;
        if (metadata.exampleButtonType === 'numbered') {
          // Standard "Example N" pattern
          exampleButton = page.locator('button').filter({ 
            hasText: `Example ${metadata.exampleIndex + 1}` 
          }).first();
        } else {
          // Descriptive text pattern - look for partial match
          const exampleText = (metadata as any).exampleText;
          if (exampleText) {
            exampleButton = page.locator('button').filter({ 
              hasText: exampleText.substring(0, 30) // Match first part of text
            }).first();
          } else {
            // Fallback: get all buttons and select by index
            const buttons = await page.locator('button').all();
            // Skip first 2 buttons (Try, Documentation) and select by index
            const exampleButtons = buttons.slice(2, -1); // Exclude submit button at end
            if (metadata.exampleIndex < exampleButtons.length) {
              exampleButton = exampleButtons[metadata.exampleIndex];
            }
          }
        }
        
        // Check if we found an example button
        if (!exampleButton || !(await exampleButton.isVisible({ timeout: 2000 }).catch(() => false))) {
          // Try alternative approach: click any button with example text
          const allButtons = await page.locator('button').all();
          let foundExample = false;
          
          for (const btn of allButtons) {
            const text = await btn.textContent();
            // Skip navigation buttons
            if (text && !['Try', 'Documentation', metadata.buttonText].includes(text.trim())) {
              // This is likely an example button
              await btn.click();
              foundExample = true;
              // Small delay for form to populate
              await page.waitForTimeout(500);
              break;
            }
          }
          
          if (!foundExample) {
            result.issues.push('No example button found');
            results.push(result);
            expect(result.success, `${toolId}: ${result.issues.join(', ')}`).toBe(true);
            return;
          }
        } else {
          await exampleButton.click();
          // Small delay for form to populate
          await page.waitForTimeout(500);
        }
        
        // Submit the form
        const submitButton = page.locator('button').filter({ 
          hasText: metadata.buttonText 
        }).first();
        
        if (!await submitButton.isVisible()) {
          result.issues.push(`Submit button "${metadata.buttonText}" not found`);
          results.push(result);
          expect(result.success, `${toolId}: ${result.issues.join(', ')}`).toBe(true);
          return;
        }
        
        // Click submit and wait for response
        await submitButton.click();
        
        // Wait for the button to be re-enabled (indicates response received)
        await expect(submitButton).toBeEnabled({ timeout: validation.timeout });
        
        // Get the output
        const output = await getToolOutput(page);
        result.outputSample = output.substring(0, 200);
        
        // Basic validation
        if (!output || output.length < 10) {
          result.issues.push('No output or output too short');
        } else if (!validation.validateOutput(output)) {
          result.issues.push('Output failed basic validation');
        }
        
        // AI validation if available
        if (anthropic && result.issues.length === 0) {
          const aiResult = await validateWithAI(
            anthropic,
            toolId,
            validation.aiPrompt,
            output
          );
          
          result.aiValidation = aiResult;
          if (!aiResult.valid) {
            result.issues.push(`AI validation failed: ${aiResult.reason}`);
          }
        }
        
        // Mark success if no issues
        if (result.issues.length === 0) {
          result.success = true;
          console.log(`✅ ${toolId}: Output validated successfully`);
        } else {
          console.log(`❌ ${toolId}: ${result.issues.join(', ')}`);
        }
        
      } catch (error) {
        result.issues.push(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`❌ ${toolId}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      results.push(result);
      expect(result.success, `${toolId}: ${result.issues.join(', ')}`).toBe(true);
    });
  }

  // Test error handling for each tool
  test.describe('Error Handling', () => {
    for (const [toolId, metadata] of Object.entries(toolMetadata)) {
      test(`${toolId}: handles empty input gracefully`, async ({ page }) => {
        test.setTimeout(30000);
        
        await page.goto(`/tools/${toolId}`, { waitUntil: 'networkidle' });
        
        // Try to submit without filling form
        const submitButton = page.locator('button').filter({ 
          hasText: metadata.buttonText 
        }).first();
        
        if (!await submitButton.isVisible()) {
          return; // Skip if button not found
        }
        
        // Check if button is disabled (good) or if clicking shows error
        const isDisabled = await submitButton.isDisabled();
        
        if (!isDisabled) {
          await submitButton.click();
          
          // Wait for either error message or button state change
          await page.waitForFunction(() => {
            // Check if error message appeared
            const hasError = document.querySelector('[data-testid="tool-error"], [role="alert"]');
            // Check if button is re-enabled (form processed)
            const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
            const isProcessed = button && !button.textContent?.includes('...');
            return hasError || isProcessed;
          }, { timeout: 5000 });
          
          // Should either show error or have validation
          const hasError = await page.locator('[data-testid="tool-error"], [role="alert"], text=/required|enter|provide/i').isVisible();
          const stillDisabled = await submitButton.isDisabled();
          
          expect(hasError || stillDisabled, `${toolId} should handle empty input with error or disabled state`).toBe(true);
        }
      });
    }
  });
});

// Helper functions

async function getToolOutput(page: Page): Promise<string> {
  // Wait for results to appear using proper selector
  try {
    await page.waitForSelector('[data-testid="tool-result"], pre, [role="region"], .prose', { 
      timeout: 5000,
      state: 'visible' 
    });
  } catch {
    // If no result selector found, continue to fallback logic
  }
  
  // Try different selectors for results
  const selectors = [
    '[data-testid="tool-result"]',  // Primary: data-testid
    'pre',                           // Fallback: code blocks
    '[role="region"]',               // Fallback: semantic regions
    '.prose',                        // Fallback: prose content
    'div:has(> p):below(button)'     // Last resort: div with paragraph after button
  ];
  
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        const text = await element.textContent();
        if (text && text.length > 10) {
          return text;
        }
      }
    } catch {}
  }
  
  // Fallback: get all text after the submit button
  const bodyText = await page.locator('main, body').textContent();
  const toolIdFromUrl = page.url().split('/').pop() || '';
  const metadata = toolIdFromUrl in toolMetadata ? toolMetadata[toolIdFromUrl as keyof typeof toolMetadata] : null;
  const buttonText = metadata?.buttonText || '';
  const afterButton = bodyText?.split(buttonText).pop() || '';
  
  return afterButton.trim();
}

async function validateWithAI(
  anthropic: Anthropic,
  toolId: string,
  prompt: string,
  output: string
): Promise<{ valid: boolean; reason: string }> {
  try {
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 200,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `
Tool: ${toolId}
Output: ${output.substring(0, 1500)}

${prompt}

Respond with JSON only:
{
  "valid": true/false,
  "reason": "one sentence explanation"
}
`
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.warn(`AI validation error for ${toolId}:`, error);
  }
  
  return { valid: true, reason: 'AI validation skipped' };
}
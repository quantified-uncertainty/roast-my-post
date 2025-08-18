import { test, expect } from '@playwright/test';

test('debug tool page rendering', async ({ page }) => {
  // Set BYPASS_TOOL_AUTH in localStorage to bypass auth
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('playwright-auth-bypass', 'true');
  });
  
  // Navigate to the tool page
  await page.goto('/tools/fuzzy-text-locator', { waitUntil: 'networkidle' });
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-fuzzy-tool.png' });
  
  // Log the page content
  const pageContent = await page.content();
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Check what's actually on the page
  const h1Count = await page.locator('h1').count();
  console.log('Number of h1 elements:', h1Count);
  
  if (h1Count > 0) {
    for (let i = 0; i < h1Count; i++) {
      const h1Text = await page.locator('h1').nth(i).textContent();
      console.log(`h1[${i}]:`, h1Text);
    }
  }
  
  // Check for error messages
  const bodyText = await page.locator('body').textContent();
  if (bodyText?.includes('Error') || bodyText?.includes('error')) {
    console.log('Error found on page:', bodyText.substring(0, 500));
  }
  
  // Check for any divs with error classes
  const errorDivs = await page.locator('div[class*="error"]').count();
  if (errorDivs > 0) {
    console.log('Found error divs:', errorDivs);
  }
  
  // Wait a bit to see if it's a timing issue
  await page.waitForTimeout(2000);
  
  // Check again after wait
  const h1CountAfterWait = await page.locator('h1').count();
  console.log('Number of h1 elements after wait:', h1CountAfterWait);
});
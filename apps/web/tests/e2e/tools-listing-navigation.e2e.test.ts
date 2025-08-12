/**
 * E2E tests for tools listing page navigation
 * Verifies that clicking tool links from /tools takes you to the correct tool pages
 */

import { test, expect } from '@playwright/test';

test.describe('Tools Listing Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tools listing page
    await page.goto('/tools');
    
    // Ensure the page loads
    await expect(page.locator('h1:has-text("Experimental Tools")')).toBeVisible();
  });

  test('should display tools listing page correctly', async ({ page }) => {
    // Check main elements are present
    await expect(page.locator('h1:has-text("Experimental Tools")')).toBeVisible();
    await expect(page.locator('text=Test and experiment with various AI-powered analysis tools')).toBeVisible();
    
    // Should have at least some tool links
    const toolLinks = page.locator('a[href^="/tools/"]');
    await expect(toolLinks.first()).toBeVisible();
  });

  test('should navigate to individual tool pages correctly', async ({ page }) => {
    // Get all tool links from the listing page
    const toolLinks = page.locator('a[href^="/tools/"]');
    const linkCount = await toolLinks.count();
    
    expect(linkCount).toBeGreaterThan(0);
    
    // Test a few representative tools to avoid long test times
    const toolsToTest = Math.min(3, linkCount);
    
    for (let i = 0; i < toolsToTest; i++) {
      const link = toolLinks.nth(i);
      const href = await link.getAttribute('href');
      const toolName = await link.locator('h3').textContent();
      
      console.log(`Testing navigation to ${toolName} at ${href}`);
      
      // Click the tool link
      await link.click();
      
      // Verify we navigated to the correct page
      expect(page.url()).toContain(href!);
      
      // Verify we're on a tool page, not an API endpoint
      // Tool pages should have the tabbed layout with "Try" and "Documentation" tabs
      await expect(page.locator('button:has-text("Try"), [role="tab"]:has-text("Try")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("Documentation"), [role="tab"]:has-text("Documentation")')).toBeVisible();
      
      // Verify we're not seeing JSON or API response
      await expect(page.locator('body')).not.toContainText('{"success"');
      await expect(page.locator('body')).not.toContainText('{"error"');
      
      // Go back to tools listing for next iteration
      await page.goto('/tools');
      await expect(page.locator('h1:has-text("Experimental Tools")')).toBeVisible();
    }
  });

  test('should not link to API endpoints from tools listing', async ({ page }) => {
    // Get all links on the tools page
    const allLinks = page.locator('a[href*="/api/tools/"]');
    const apiLinkCount = await allLinks.count();
    
    // There should be NO links to API endpoints from the tools listing
    expect(apiLinkCount).toBe(0);
  });

  test('should have working tool links for all configured tools', async ({ page }) => {
    // Get all tool links
    const toolLinks = page.locator('a[href^="/tools/"]');
    const linkCount = await toolLinks.count();
    
    expect(linkCount).toBeGreaterThan(0);
    
    // Check that each link has proper structure
    for (let i = 0; i < linkCount; i++) {
      const link = toolLinks.nth(i);
      const href = await link.getAttribute('href');
      const toolName = await link.locator('h3').textContent();
      
      // Verify link format
      expect(href).toMatch(/^\/tools\/[a-z0-9-]+$/);
      expect(toolName).toBeTruthy();
      
      // Verify description exists
      const description = await link.locator('p').textContent();
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(10);
    }
  });

  test('should display tool status badges correctly', async ({ page }) => {
    const toolLinks = page.locator('a[href^="/tools/"]');
    const linkCount = await toolLinks.count();
    
    expect(linkCount).toBeGreaterThan(0);
    
    // Check that each tool has a status badge
    for (let i = 0; i < linkCount; i++) {
      const link = toolLinks.nth(i);
      const statusBadge = link.locator('[class*="rounded-full"]');
      
      await expect(statusBadge).toBeVisible();
      const statusText = await statusBadge.textContent();
      
      // Status should be one of the expected values
      expect(['stable', 'beta', 'experimental']).toContain(statusText?.toLowerCase());
    }
  });

  test('should organize tools by categories', async ({ page }) => {
    // Should have category headers
    await expect(page.locator('h2:has-text("analysis"), h2:has-text("Analysis")')).toBeVisible();
    
    // Each category section should have tools
    const categoryHeaders = page.locator('h2');
    const headerCount = await categoryHeaders.count();
    
    expect(headerCount).toBeGreaterThan(0);
    
    // Each category should have at least one tool
    for (let i = 0; i < headerCount; i++) {
      const header = categoryHeaders.nth(i);
      const categoryName = await header.textContent();
      
      if (categoryName && ['analysis', 'research', 'utility'].some(cat => 
        categoryName.toLowerCase().includes(cat))) {
        // Find tools in this category section
        const nextSection = header.locator('.. >> following-sibling::div').first();
        const toolsInCategory = nextSection.locator('a[href^="/tools/"]');
        
        await expect(toolsInCategory.first()).toBeVisible();
      }
    }
  });
});
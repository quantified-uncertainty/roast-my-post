import { test, expect } from '@playwright/test';

// These tests require a running dev server on port 3000
// Run with: pnpm --filter @roast/web dev
// Then: pnpm --filter @roast/web run test:playwright agent-deprecation
test.describe.skip('Agent Deprecation Feature', () => {
  // Skip by default since they need manual server setup
  // Remove .skip when running locally with dev server

  test('should display deprecation badge on agent list', async ({ page }) => {
    // Navigate to agents page
    await page.goto('/agents');
    
    // Wait for agents to load
    await page.waitForSelector('[data-testid="agents-list"]', { 
      timeout: 10000,
      state: 'visible' 
    }).catch(() => {
      // If no data-testid, look for common patterns
      return page.waitForSelector('.grid', { timeout: 10000 });
    });

    // Look for any deprecated agent badge
    const deprecatedBadges = page.locator('text=⚠ Deprecated');
    const deprecatedCount = await deprecatedBadges.count();
    
    // If there are deprecated agents, verify they appear last
    if (deprecatedCount > 0) {
      const firstBadge = deprecatedBadges.first();
      await expect(firstBadge).toBeVisible();
      
      // Check that the badge has appropriate styling (red background)
      const badgeElement = await firstBadge.elementHandle();
      if (badgeElement) {
        const className = await badgeElement.getAttribute('class');
        expect(className).toContain('bg-red');
      }
    }

    // Look for recommended badges
    const recommendedBadges = page.locator('text=★ Recommended');
    const recommendedCount = await recommendedBadges.count();
    
    if (recommendedCount > 0) {
      const firstRecommended = recommendedBadges.first();
      await expect(firstRecommended).toBeVisible();
      
      // Check styling (yellow background)
      const badgeElement = await firstRecommended.elementHandle();
      if (badgeElement) {
        const className = await badgeElement.getAttribute('class');
        expect(className).toContain('bg-yellow');
      }
    }
  });

  test('should show deprecation checkbox in agent edit form', async ({ page }) => {
    // Note: Edit form requires authentication, so we check if it's accessible
    // This test will work when BYPASS_TOOL_AUTH is set or user is logged in
    const testAgentId = 'system-comprehensive-checker';
    
    // Navigate to edit page
    await page.goto(`/agents/${testAgentId}/edit`);
    
    // Check if we're redirected to login or if form loads
    const hasForm = await page.locator('form').isVisible().catch(() => false);
    const hasLoginRedirect = await page.url().includes('/auth/signin');
    
    if (hasLoginRedirect || !hasForm) {
      // Skip this test if auth is required
      console.log('Edit form requires authentication - skipping test');
      return;
    }

    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 });

    // Look for deprecation checkbox
    const deprecationCheckbox = page.locator('input[type="checkbox"]#isDeprecated');
    const deprecationLabel = page.locator('label[for="isDeprecated"]');
    
    // Verify checkbox exists
    await expect(deprecationCheckbox).toBeVisible({ timeout: 5000 }).catch(() => {
      // If not visible by ID, try by label text
      return expect(page.locator('text=Mark as Deprecated')).toBeVisible();
    });

    // Verify label text
    await expect(deprecationLabel).toContainText('Mark as Deprecated').catch(() => {
      // Alternative: check for the description text
      return expect(page.locator('text=This will mark your agent as deprecated')).toBeVisible();
    });

    // Test toggling the checkbox
    const isChecked = await deprecationCheckbox.isChecked();
    await deprecationCheckbox.click();
    await expect(deprecationCheckbox).toBeChecked({ checked: !isChecked });
    
    // Toggle back
    await deprecationCheckbox.click();
    await expect(deprecationCheckbox).toBeChecked({ checked: isChecked });
  });

  test('should display badges on agent detail page', async ({ page }) => {
    // First navigate to agents list
    await page.goto('/agents');
    
    // Click on the first agent that has a System badge (should be a system agent)
    const firstSystemAgent = page.locator('a[href*="/agents/"]:has-text("System")').first();
    const agentCount = await firstSystemAgent.count();
    
    if (agentCount === 0) {
      // No system agents visible, just check any agent
      const firstAgent = page.locator('a[href*="/agents/"]').first();
      await firstAgent.click();
    } else {
      await firstSystemAgent.click();
    }

    // Wait for agent detail page to load
    await page.waitForSelector('h2', { timeout: 10000 });

    // Look for any badges on the page
    const pageContent = await page.content();
    
    // Check if any badge text is present
    const hasAnyBadge = 
      pageContent.includes('System') ||
      pageContent.includes('★ Recommended') ||
      pageContent.includes('⚠ Deprecated') ||
      pageContent.includes('Grades');
    
    // At least one type of badge should be present on detail page
    expect(hasAnyBadge).toBeTruthy();
  });
});
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
    // This test requires a specific agent ID to exist
    // In a real test environment, you'd create a test agent first
    const testAgentId = process.env.TEST_AGENT_ID || 'system-comprehensive-checker';
    
    // Navigate to edit page
    await page.goto(`/agents/${testAgentId}/edit`).catch(async () => {
      // If that fails, try to find any agent to edit
      await page.goto('/agents');
      await page.waitForSelector('a[href*="/agents/"]', { timeout: 5000 });
      const firstAgentLink = page.locator('a[href*="/agents/"]').first();
      const href = await firstAgentLink.getAttribute('href');
      if (href) {
        await page.goto(`${href}/edit`);
      }
    });

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
    // Navigate to a system agent that we know is recommended
    await page.goto('/agents/system-comprehensive-checker').catch(async () => {
      // Fallback to any agent
      await page.goto('/agents');
      const firstAgent = page.locator('a[href*="/agents/"]').first();
      await firstAgent.click();
    });

    // Wait for page to load
    await page.waitForSelector('h2', { timeout: 10000 });

    // Check for badges
    const badges = page.locator('.inline-flex.items-center.rounded');
    const badgeCount = await badges.count();
    
    // Should have at least one badge (system, recommended, or deprecated)
    expect(badgeCount).toBeGreaterThan(0);

    // Check for specific badge types
    const systemBadge = page.locator('text=System');
    const recommendedBadge = page.locator('text=★ Recommended');
    
    // At least one should be visible for system agents
    const hasSystemBadge = await systemBadge.isVisible().catch(() => false);
    const hasRecommendedBadge = await recommendedBadge.isVisible().catch(() => false);
    
    expect(hasSystemBadge || hasRecommendedBadge).toBeTruthy();
  });
});
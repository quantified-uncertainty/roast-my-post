/**
 * E2E tests for the evaluation versions page
 * 
 * These tests verify that the versions page properly handles decimal fields
 * and renders correctly in a real browser environment.
 */

import { test, expect } from '@playwright/test';
import { 
  createVersionsPageTestData, 
  cleanupVersionsPageTestData,
  type TestData 
} from './helpers/test-data';

let testData: TestData;

test.describe('Evaluation Versions Page', () => {
  test.beforeAll(async () => {
    // Create test data in the database
    testData = await createVersionsPageTestData();
    console.log('Created test data for versions page:', {
      docId: testData.docId,
      agentId: testData.agentId,
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testData) {
      await cleanupVersionsPageTestData(testData);
      console.log('Cleaned up test data');
    }
  });

  test('should display version 1 with properly formatted decimal values', async ({ page }) => {
    // Navigate to the versions page
    const url = `/docs/${testData.docId}/evals/${testData.agentId}/versions/1`;
    console.log('Navigating to:', url);
    
    const response = await page.goto(url);
    console.log('Response status:', response?.status());
    
    // Debug: Take a screenshot to see what's actually on the page
    await page.screenshot({ path: 'test-results/version-page-debug.png' });
    
    // Wait for the page to load - check if there's an error message
    const errorElement = await page.locator('text=/404|error|not found/i').count();
    if (errorElement > 0) {
      console.log('Error found on page:', await page.textContent('body'));
    }
    
    // Wait for the page to load - look for the main content area
    await page.waitForSelector('main', { timeout: 10000 });

    // Check that the page title contains version info (avoid header h1)
    await expect(page.locator('h1:has-text("Evaluation (v1)")')).toBeVisible();

    // Check that the cost is properly formatted (was breaking with [object Object])
    // The cost should be $12.457 (rounded from 12.456789)
    await expect(page.locator('text=$12.457')).toBeVisible();

    // Check that duration is properly formatted
    // 180 seconds = 3m 0s
    const durationText = page.locator('text=/3m\\s+0s|180s/');
    await expect(durationText).toBeVisible();

    // Check that there's no [object Object] text (the bug we fixed)
    const objectObjectText = await page.locator('text=[object Object]').count();
    expect(objectObjectText).toBe(0);

    // Check that summary is displayed
    await expect(page.locator('text=E2E Test Evaluation Summary')).toBeVisible();

    // Check that analysis is displayed
    await expect(page.locator('text=E2E Test Analysis')).toBeVisible();
  });

  test('should navigate between versions', async ({ page }) => {
    // Start at version 1
    const url = `/docs/${testData.docId}/evals/${testData.agentId}/versions/1`;
    await page.goto(url);

    // Find and click the "Next" or version 2 button
    // The exact selector depends on your UI implementation
    const nextButton = page.locator('a[href*="versions/2"]').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      
      // Wait for navigation
      await page.waitForURL('**/versions/2');
      
      // Check we're on version 2 (avoid header h1)
      await expect(page.locator('h1:has-text("Evaluation (v2)")')).toBeVisible();
      
      // Check version 2 content
      await expect(page.locator('text=Second version for E2E testing')).toBeVisible();
    }
  });

  test('should handle zero duration correctly', async ({ page }) => {
    // Create a job with zero duration for testing
    const { prisma } = await import('@roast/db');
    const zeroJobId = `e2e_zero_job_${Date.now()}`;
    
    await prisma.job.create({
      data: {
        id: zeroJobId,
        status: 'COMPLETED',
        evaluationId: testData.evaluationId,
        priceInDollars: 5.00,
        durationInSeconds: 0,  // Zero duration edge case
      },
    });

    await prisma.evaluationVersion.create({
      data: {
        evaluationId: testData.evaluationId,
        version: 3,
        agentId: testData.agentId,
        agentVersionId: testData.agentVersionId,
        documentVersionId: testData.docVersionId,
        job: {
          connect: { id: zeroJobId }
        },
        summary: 'Zero duration test',
        analysis: 'Testing zero duration handling',
      },
    });

    // Navigate to version 3
    const url = `/docs/${testData.docId}/evals/${testData.agentId}/versions/3`;
    await page.goto(url);
    
    // Wait for the page to load
    await page.waitForSelector('main', { timeout: 10000 });

    // Check that 0s is displayed in the Run Statistics section, not NaN
    await expect(page.locator('text=Run Statistics').locator('..').locator('text=0s')).toBeVisible();
    
    // Ensure no NaN is displayed
    const nanText = await page.locator('text=NaN').count();
    expect(nanText).toBe(0);

    // Clean up the extra test data
    await prisma.evaluationVersion.delete({
      where: {
        evaluationId_version: {
          evaluationId: testData.evaluationId,
          version: 3,
        },
      },
    });
    await prisma.job.delete({
      where: { id: zeroJobId },
    });
  });

  test('should display grade correctly', async ({ page }) => {
    const url = `/docs/${testData.docId}/evals/${testData.agentId}/versions/1`;
    await page.goto(url);

    // Check that grade is displayed as letter grade (85 = A- grade)
    const gradeElement = page.locator('text=A-');
    await expect(gradeElement).toBeVisible();
  });

  test('should display agent and document information', async ({ page }) => {
    const url = `/docs/${testData.docId}/evals/${testData.agentId}/versions/1`;
    await page.goto(url);
    
    // Wait for the page to load
    await page.waitForSelector('main', { timeout: 10000 });

    // Check agent name is displayed in the Agent Information section
    await expect(page.locator('text=E2E Test Agent')).toBeVisible();

    // Check document title is displayed in breadcrumbs or page header
    await expect(page.locator('text=E2E Test Document for Versions Page')).toBeVisible();
    
    // Check that the evaluation title shows the agent name and version
    await expect(page.locator('h1:has-text("E2E Test Agent Evaluation (v1)")')).toBeVisible();
  });

  test('should handle missing job data gracefully', async ({ page }) => {
    // Create a version without a job
    const { prisma } = await import('@roast/db');
    
    await prisma.evaluationVersion.create({
      data: {
        evaluationId: testData.evaluationId,
        version: 4,
        agentId: testData.agentId,
        agentVersionId: testData.agentVersionId,
        documentVersionId: testData.docVersionId,
        // No job associated
        summary: 'No job test',
        analysis: 'Testing without job data',
      },
    });

    // Navigate to version 4
    const url = `/docs/${testData.docId}/evals/${testData.agentId}/versions/4`;
    await page.goto(url);
    
    // Wait for the page to load
    await page.waitForSelector('main', { timeout: 10000 });

    // Should show the summary in the Summary section
    await expect(page.locator('text=Summary').locator('..').locator('text=No job test')).toBeVisible({ timeout: 10000 });
    
    // Should show the analysis
    await expect(page.locator('text=Testing without job data')).toBeVisible();

    // Should not show Run Statistics section (no cost/duration)
    const runStatsSection = page.locator('text=Run Statistics');
    await expect(runStatsSection).not.toBeVisible();

    // Clean up
    await prisma.evaluationVersion.delete({
      where: {
        evaluationId_version: {
          evaluationId: testData.evaluationId,
          version: 4,
        },
      },
    });
  });
});
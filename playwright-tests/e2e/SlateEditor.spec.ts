import {
  expect,
  test,
} from '@playwright/test';

test("SlateEditor renders content and highlights correctly", async ({
  page,
}) => {
  // Navigate to the test page
  await page.goto("/test-slate-editor");

  // Wait for the editor to be visible
  await page.waitForSelector('[data-testid="slate-editable"]');

  // Check if the heading is rendered
  const heading = await page.textContent("h2");
  expect(heading).toBe(
    "Strongly Bounded AI: Definitions and Strategic Implications"
  );

  // Check if highlights are applied
  const highlightedText = await page.locator(".bg-amber-100").first();
  await expect(highlightedText).toBeVisible();

  // Verify highlight content
  const highlightContent = await highlightedText.textContent();
  expect(highlightContent).toContain("Ozzie Gooen");
});

test("SlateEditor highlight interaction", async ({ page }) => {
  await page.goto("/test-slate-editor");

  // Wait for the editor
  await page.waitForSelector('[data-testid="slate-editable"]');

  // Find the first highlight
  const highlight = await page.locator(".bg-amber-100").first();

  // Hover over highlight
  await highlight.hover();

  // Click the highlight
  await highlight.click();

  // Verify the highlight is selected (has the ring-2 class)
  await expect(highlight).toHaveClass(/ring-2/);
});

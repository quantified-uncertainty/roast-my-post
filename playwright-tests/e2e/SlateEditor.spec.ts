import {
  expect,
  test,
} from '@playwright/test';

test("page loads with editor component", async ({ page }) => {
  await page.goto("/test-slate-editor");
  const editor = await page.locator('[data-testid="slate-editable"]');
  await expect(editor).toBeVisible();
});

test("editor renders content correctly", async ({ page }) => {
  await page.goto("/test-slate-editor");

  // Wait for editor
  const editor = await page.locator('[data-testid="slate-editable"]');
  await expect(editor).toBeVisible();

  // Get all text content
  const content = await editor.textContent();
  expect(content?.trim() || "").toContain("This is a test");
});

test("highlight is applied correctly", async ({ page }) => {
  await page.goto("/test-slate-editor");

  // Wait for editor
  await page.waitForSelector('[data-testid="slate-editable"]');

  // Find highlight
  const highlight = await page.locator('[class*="bg-amber-100"]');
  await expect(highlight).toBeVisible();

  // Check highlight text
  const text = await highlight.textContent();
  expect(text?.trim() || "").toContain("This is a test");
});

test("highlight interaction works", async ({ page }) => {
  await page.goto("/test-slate-editor");

  // Wait for editor
  await page.waitForSelector('[data-testid="slate-editable"]');

  // Get highlight
  const highlight = await page.locator('[class*="bg-amber-100"]');

  // Initial state - no ring
  await expect(highlight).not.toHaveClass(/ring/);

  // Click highlight
  await highlight.click();

  // Should now have ring class
  await expect(highlight).toHaveClass(/ring/);
});

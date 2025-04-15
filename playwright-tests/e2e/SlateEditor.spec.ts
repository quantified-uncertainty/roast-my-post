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

  // Get the HTML content for debugging
  const html = await editor.innerHTML();
  console.log("Editor HTML:", html);

  // Check heading (using a more general selector)
  const heading = await editor.locator("h1");
  await expect(heading).toBeVisible();
  const headingText = await heading.textContent();
  expect(headingText?.trim()).toBe("Strongly Bounded AI");

  // Check paragraph
  const paragraph = await editor.locator("div.mb-4");
  await expect(paragraph).toBeVisible();
  const paragraphText = await paragraph.textContent();
  expect(paragraphText?.trim()).toBe(
    "This is a test document about AI safety. We need to be careful about AI development."
  );
});

test("highlights are applied correctly", async ({ page }) => {
  await page.goto("/test-slate-editor");

  // Wait for editor
  await page.waitForSelector('[data-testid="slate-editable"]');

  // Check title highlight
  const titleHighlight = await page.locator('[class*="bg-amber-100"]');
  await expect(titleHighlight).toBeVisible();
  const titleText = await titleHighlight.textContent();
  expect(titleText?.trim()).toBe("Strongly Bounded AI");

  // Check content highlight
  const contentHighlight = await page.locator('[class*="bg-blue-100"]');
  await expect(contentHighlight).toBeVisible();
  const contentText = await contentHighlight.textContent();
  expect(contentText?.trim()).toBe(
    "This is a test document about AI safety. We need to be careful about AI development."
  );
});

test("highlight interaction works", async ({ page }) => {
  await page.goto("/test-slate-editor");

  // Wait for editor
  await page.waitForSelector('[data-testid="slate-editable"]');

  // Get both highlights
  const titleHighlight = await page.locator('[class*="bg-amber-100"]');
  const contentHighlight = await page.locator('[class*="bg-blue-100"]');

  // Initial state - no ring
  await expect(titleHighlight).not.toHaveClass(/ring/);
  await expect(contentHighlight).not.toHaveClass(/ring/);

  // Click title highlight
  await titleHighlight.click();
  await expect(titleHighlight).toHaveClass(/ring/);
  await expect(contentHighlight).not.toHaveClass(/ring/);

  // Click content highlight
  await contentHighlight.click();
  await expect(contentHighlight).toHaveClass(/ring/);
  await expect(titleHighlight).not.toHaveClass(/ring/);
});

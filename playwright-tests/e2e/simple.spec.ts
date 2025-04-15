import {
  expect,
  test,
} from '@playwright/test';

test("basic page test", async ({ page }) => {
  // Navigate to the test page
  await page.goto("/test-simple");

  // Check if the title is present
  const title = page.getByTestId("title");
  await expect(title).toBeVisible();
  await expect(title).toHaveText("Simple Test Page");

  // Check if the button is present and clickable
  const button = page.getByTestId("increment");
  await expect(button).toBeVisible();
  await expect(button).toHaveText("Increment");
});

test("counter functionality", async ({ page }) => {
  // Navigate to the test page
  await page.goto("/test-simple");

  // Check initial state
  const count = page.getByTestId("count");
  await expect(count).toBeVisible();
  await expect(count).toHaveText("Count: 0");

  // Click the increment button
  const button = page.getByTestId("increment");
  await button.click();

  // Check that count increased
  await expect(count).toHaveText("Count: 1");

  // Click again
  await button.click();

  // Check that count increased again
  await expect(count).toHaveText("Count: 2");
});

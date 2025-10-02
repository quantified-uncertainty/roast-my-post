const playwright = require('@playwright/test');

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/tools/check-spelling-grammar/docs');
  await page.waitForLoadState('networkidle');

  // Get the Tools Used section
  const toolsSection = await page.locator('h2:has-text("Tools Used")').locator('..').innerHTML();
  console.log('Tools Used section HTML:');
  console.log(toolsSection);

  // Check for links
  const links = await page.locator('a[href^="/tools/"]').all();
  console.log(`\nFound ${links.length} tool links`);

  for (const link of links) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    console.log(`  - ${text} -> ${href}`);
  }

  await browser.close();
})();

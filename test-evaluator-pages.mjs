import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const ISSUES_FOUND = [];

const log = {
  success: (msg) => console.log('✅', msg),
  error: (msg) => {
    console.log('❌', msg);
    ISSUES_FOUND.push(msg);
  },
  info: (msg) => console.log('ℹ️', msg),
  warning: (msg) => console.log('⚠️', msg),
};

// Routes to test based on the refactoring
const ROUTES = [
  { path: '/evaluators', description: 'Evaluators listing page' },
  { path: '/evaluators/new', description: 'New evaluator form' },
  { path: '/evaluators/readme', description: 'Evaluator documentation' },
  { path: '/help/getting-started', description: 'Getting started help page' },
  { path: '/help/api', description: 'API help page' },
  { path: '/help/ephemeral-experiments', description: 'Ephemeral experiments help' },
  { path: '/about', description: 'About page' },
  { path: '/docs', description: 'Documents listing' },
  { path: '/experiments', description: 'Experiments page' },
];

async function checkForAgentTerminology(page, url) {
  const content = await page.content();

  // Look for "agent" (case-insensitive) but exclude expected cases
  const agentMatches = content.match(/\bagent\b/gi) || [];

  // Filter out acceptable uses (in URLs, code examples, etc.)
  const problematicMatches = agentMatches.filter(match => {
    const context = content.substring(
      Math.max(0, content.indexOf(match) - 50),
      content.indexOf(match) + 50
    );

    // Allow: /agents/ in URLs (legacy routes), user-agent, agentId (parameter names)
    return !(
      context.includes('href="/agents/') ||
      context.includes('user-agent') ||
      context.includes('agentId') ||
      context.includes('User-Agent') ||
      context.includes('[agentId]') ||
      context.includes('/evals/[agentId]') ||
      context.includes('&lt;agentId&gt;') ||
      context.includes('<agentId>') ||
      context.includes('agent_') ||
      context.includes('_agent')
    );
  });

  if (problematicMatches.length > 0) {
    log.warning(`Found ${problematicMatches.length} potential "agent" references on ${url}`);
    return problematicMatches;
  }

  return [];
}

async function testPage(browser, route) {
  const page = await browser.newPage();
  const url = `${BASE_URL}${route.path}`;

  try {
    log.info(`Testing: ${route.description} (${url})`);

    // Navigate to page
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Check response status
    if (response.status() === 404) {
      log.error(`404 Not Found: ${url}`);
      await page.close();
      return;
    }

    if (response.status() >= 500) {
      log.error(`Server Error (${response.status()}): ${url}`);
      await page.close();
      return;
    }

    // Wait a bit for any client-side rendering
    await page.waitForTimeout(2000);

    // Check for React errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Check for "agent" terminology
    const agentRefs = await checkForAgentTerminology(page, url);

    // Check for error boundaries or error messages
    const hasError = await page.evaluate(() => {
      return document.body.innerText.includes('Error') ||
             document.body.innerText.includes('Something went wrong');
    });

    if (hasError) {
      log.warning(`Possible error state on ${url}`);
    }

    // Check page title
    const title = await page.title();
    if (title.toLowerCase().includes('agent') && !title.toLowerCase().includes('evaluator')) {
      log.warning(`Page title contains "agent": "${title}" on ${url}`);
    }

    // Look for specific UI elements based on page
    if (route.path === '/evaluators') {
      const hasCreateButton = await page.evaluate(() => {
        return document.body.innerText.includes('Create') ||
               document.body.innerText.includes('New Evaluator');
      });
      if (!hasCreateButton) {
        log.warning('No "Create" or "New Evaluator" button found on evaluators listing page');
      }
    }

    if (route.path === '/evaluators/new') {
      const hasForm = await page.$('form');
      if (!hasForm) {
        log.error('No form found on new evaluator page');
      }
    }

    // Check for broken links
    const brokenLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .map(a => a.href)
        .filter(href => href.includes('/agents/') && !href.includes('/evals/'));
    });

    if (brokenLinks.length > 0) {
      log.warning(`Found ${brokenLinks.length} links to /agents/ on ${url}`);
    }

    log.success(`${route.description} loaded successfully`);

  } catch (error) {
    log.error(`Failed to test ${url}: ${error.message}`);
  } finally {
    await page.close();
  }
}

async function testInteractiveFeatures(browser) {
  log.info('Testing interactive features...');

  const page = await browser.newPage();

  try {
    // Test navigation from evaluators to new
    await page.goto(`${BASE_URL}/evaluators`, { waitUntil: 'networkidle2' });

    const newEvalButton = await page.$('a[href="/evaluators/new"]');
    if (newEvalButton) {
      await newEvalButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      const currentUrl = page.url();
      if (currentUrl.includes('/evaluators/new')) {
        log.success('Navigation from /evaluators to /evaluators/new works');
      } else {
        log.error(`Navigation failed. Expected /evaluators/new, got ${currentUrl}`);
      }
    } else {
      log.warning('Could not find link to create new evaluator');
    }

  } catch (error) {
    log.error(`Interactive test failed: ${error.message}`);
  } finally {
    await page.close();
  }
}

async function checkDevServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      log.success('Dev server is running');
      return true;
    }
  } catch (error) {
    log.error('Dev server is not running. Please start it with: pnpm --filter @roast/web dev');
    return false;
  }
  return false;
}

async function main() {
  console.log('🧪 Testing Evaluator Pages (Agent→Evaluator Refactoring)\n');

  // Check if dev server is running
  const serverRunning = await checkDevServer();
  if (!serverRunning) {
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Test all routes
    for (const route of ROUTES) {
      await testPage(browser, route);
    }

    // Test interactive features
    await testInteractiveFeatures(browser);

    console.log('\n' + '='.repeat(60));
    if (ISSUES_FOUND.length === 0) {
      log.success('All tests passed! No issues found.');
    } else {
      console.log(`\n❌ Found ${ISSUES_FOUND.length} issue(s):\n`);
      ISSUES_FOUND.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }
    console.log('='.repeat(60));

  } finally {
    await browser.close();
  }
}

main().catch(console.error);

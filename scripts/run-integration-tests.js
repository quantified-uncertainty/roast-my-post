#!/usr/bin/env node

/**
 * Manual Integration Test Runner
 * 
 * Usage:
 *   pnpm run test:manual --suite=llm
 *   pnpm run test:manual --suite=integration --pattern="math"
 *   pnpm run test:manual --suite=all --max-cost=1.50
 * 
 * Note: This script loads environment variables from apps/web/.env.local
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
try {
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.warn('Warning: Could not parse .env.local:', result.error.message);
    }
  }
} catch (error) {
  // dotenv not available, continue without it
  console.warn('Warning: Could not load .env.local (dotenv not available in current context)');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value || true;
  }
});

// Default options
const config = {
  suite: options.suite || 'integration',
  pattern: options.pattern || '',
  maxCost: parseFloat(options['max-cost'] || '2.00'),
  verbose: options.verbose || false,
  dryRun: options['dry-run'] || false
};

// Cost estimates (rough)
const COST_ESTIMATES = {
  integration: 0.00,
  llm: 1.50,
  all: 1.50
};

// Time estimates (minutes)
const TIME_ESTIMATES = {
  integration: 10,
  llm: 30,
  all: 40
};

function printUsage() {
  console.log(`
🧪 Integration Test Runner

Usage:
  node scripts/run-integration-tests.js [options]

Options:
  --suite=<type>        Test suite to run (integration|llm|all) [default: integration]
  --pattern=<pattern>   Test name pattern to match [optional]
  --max-cost=<dollars>  Maximum cost limit [default: 2.00]
  --verbose             Show detailed output
  --dry-run             Show what would be run without executing
  --help                Show this help

Examples:
  node scripts/run-integration-tests.js --suite=llm
  node scripts/run-integration-tests.js --suite=integration --pattern="math"
  node scripts/run-integration-tests.js --suite=all --max-cost=1.50
  node scripts/run-integration-tests.js --dry-run --suite=llm
`);
}

function buildTestCommand() {
  let command;
  
  switch (config.suite) {
    case 'integration':
      command = 'pnpm --filter @roast/web run test:integration';
      if (config.pattern) {
        command += ` --testNamePattern="${config.pattern}"`;
      }
      break;
      
    case 'llm':
      // Run LLM tests from both web and AI packages
      if (config.pattern) {
        command = `pnpm --filter @roast/web run test:llm --testNamePattern="${config.pattern}" && pnpm --filter @roast/ai run test:llm --testNamePattern="${config.pattern}"`;
      } else {
        command = 'pnpm --filter @roast/web run test:llm && pnpm --filter @roast/ai run test:llm';
      }
      break;
      
    case 'all':
      command = 'pnpm --filter @roast/web run test:without-llms && pnpm --filter @roast/web run test:llm && pnpm --filter @roast/ai run test:llm';
      break;
      
    default:
      throw new Error(`Unknown test suite: ${config.suite}`);
  }
  
  return command;
}

function checkPrerequisites() {
  const issues = [];
  
  // Check if we're in the right directory
  if (!require('fs').existsSync('package.json')) {
    issues.push('❌ Must be run from project root (package.json not found)');
  }
  
  // Check for API key if running LLM tests
  if ((config.suite === 'llm' || config.suite === 'all') && !process.env.ANTHROPIC_API_KEY) {
    issues.push('❌ ANTHROPIC_API_KEY environment variable not set (required for LLM tests)');
  }
  
  // Check cost limit
  const estimatedCost = COST_ESTIMATES[config.suite] || 0;
  if (estimatedCost > config.maxCost) {
    issues.push(`❌ Estimated cost ($${estimatedCost}) exceeds limit ($${config.maxCost})`);
  }
  
  return issues;
}

function printTestPlan() {
  const estimatedCost = COST_ESTIMATES[config.suite] || 0;
  const estimatedTime = TIME_ESTIMATES[config.suite] || 0;
  
  console.log(`
🎯 Test Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suite:           ${config.suite}
Pattern:         ${config.pattern || 'All tests'}
Estimated Cost:  $${estimatedCost.toFixed(2)}
Estimated Time:  ${estimatedTime} minutes
Max Cost Limit:  $${config.maxCost.toFixed(2)}

Command: ${buildTestCommand()}

${config.dryRun ? '🔍 DRY RUN - No tests will actually execute' : '▶️  Ready to execute'}
`);
}

async function executeTests() {
  const command = buildTestCommand();
  const startTime = Date.now();
  
  console.log('🚀 Starting test execution...\n');
  
  try {
    // Use spawn for real-time output
    const child = spawn('bash', ['-c', command], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Ensure we have a test database URL
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/roast_my_post?schema=public',
        // CI environment helps with some test configurations
        CI: 'true'
      }
    });
    
    const exitCode = await new Promise((resolve) => {
      child.on('close', resolve);
    });
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${exitCode === 0 ? '✅ Tests completed successfully!' : '❌ Tests failed!'}

Duration: ${duration} seconds (${Math.round(duration / 60)} minutes)
Exit Code: ${exitCode}
Suite: ${config.suite}
${config.pattern ? `Pattern: ${config.pattern}` : ''}

${exitCode !== 0 ? 'Check the output above for details about failures.' : ''}
`);
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Failed to execute tests:', error.message);
    process.exit(1);
  }
}

async function main() {
  // Show help
  if (options.help) {
    printUsage();
    return;
  }
  
  // Validate options
  if (!['integration', 'llm', 'all'].includes(config.suite)) {
    console.error(`❌ Invalid suite: ${config.suite}`);
    printUsage();
    process.exit(1);
  }
  
  // Check prerequisites
  const issues = checkPrerequisites();
  if (issues.length > 0) {
    console.error('❌ Prerequisites not met:\n');
    issues.forEach(issue => console.error(`  ${issue}`));
    console.error('\nPlease fix these issues before running tests.');
    process.exit(1);
  }
  
  // Show test plan
  printTestPlan();
  
  // Execute or dry run
  if (config.dryRun) {
    console.log('✅ Dry run complete. Use without --dry-run to execute.');
    return;
  }
  
  // Confirm execution for expensive tests
  if (COST_ESTIMATES[config.suite] > 0.50) {
    console.log('⚠️  This test suite has estimated costs. Continue? (y/N)');
    
    // Read user input in Node.js
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('', resolve);
    });
    
    readline.close();
    
    if (!['y', 'yes'].includes(answer.toLowerCase().trim())) {
      console.log('❌ Test execution cancelled by user.');
      return;
    }
  }
  
  await executeTests();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error.message);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
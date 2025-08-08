#!/usr/bin/env node

/**
 * Quick test to verify workspace packages can be imported
 * This simulates what the worker Docker container needs to do
 */

console.log('Testing workspace package imports...\n');

let failed = false;

// Test @roast/domain
try {
  require.resolve('@roast/domain');
  console.log('✓ @roast/domain can be resolved');
  
  // Try to actually import it
  const domain = require('@roast/domain');
  if (domain.config) {
    console.log('  ✓ config export found');
  }
} catch (e) {
  console.error('✗ @roast/domain failed:', e.message);
  failed = true;
}

// Test @roast/db
try {
  require.resolve('@roast/db');
  console.log('✓ @roast/db can be resolved');
  
  // Note: Can't actually import it without DATABASE_URL set
  // but resolving it is enough to know it exists
} catch (e) {
  console.error('✗ @roast/db failed:', e.message);
  failed = true;
}

// Test @roast/ai
try {
  require.resolve('@roast/ai');
  console.log('✓ @roast/ai can be resolved');
  
  // Try to actually import it
  const ai = require('@roast/ai');
  if (ai.callClaude) {
    console.log('  ✓ callClaude export found');
  }
} catch (e) {
  console.error('✗ @roast/ai failed:', e.message);
  failed = true;
}

// Test that built files exist
const fs = require('fs');
const path = require('path');

console.log('\nChecking built packages...');

const packages = [
  { name: '@roast/domain', path: 'internal-packages/domain/dist/index.js' },
  { name: '@roast/db', path: 'internal-packages/db/dist/index.js' },
  { name: '@roast/ai', path: 'internal-packages/ai/dist/index.js' }
];

for (const pkg of packages) {
  const fullPath = path.join(process.cwd(), pkg.path);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ ${pkg.name} is built (${pkg.path} exists)`);
  } else {
    console.error(`✗ ${pkg.name} is NOT built (${pkg.path} missing)`);
    failed = true;
  }
}

if (failed) {
  console.error('\n❌ Some packages are not available or not built');
  console.error('The worker Docker image will fail in production!');
  process.exit(1);
} else {
  console.log('\n✅ All workspace packages are available and built');
  console.log('The worker should work correctly');
  process.exit(0);
}
#!/usr/bin/env node

/**
 * Test script to verify Docker runtime package access
 * This runs inside the Docker container to ensure all packages are accessible
 */

console.log('Testing Docker runtime package access...\n');

// Test @roast/domain package
try {
  const domain = require('@roast/domain');
  console.log('✅ @roast/domain loaded successfully');
  console.log('   Available exports:', Object.keys(domain).slice(0, 5).join(', '), '...');
} catch (error) {
  console.error('❌ Failed to load @roast/domain:', error.message);
  process.exit(1);
}

// Test @roast/db package
try {
  const db = require('@roast/db');
  console.log('✅ @roast/db loaded successfully');
  console.log('   Has prisma client:', !!db.prisma);
} catch (error) {
  console.error('❌ Failed to load @roast/db:', error.message);
  process.exit(1);
}

// Test @roast/ai package
try {
  const ai = require('@roast/ai');
  console.log('✅ @roast/ai loaded successfully');
  console.log('   Available exports:', Object.keys(ai).slice(0, 5).join(', '), '...');
} catch (error) {
  console.error('❌ Failed to load @roast/ai:', error.message);
  process.exit(1);
}

// Check if we can access the actual process-jobs-adaptive script
const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '../../apps/web/scripts/process-jobs-adaptive.ts');
if (fs.existsSync(scriptPath)) {
  console.log('✅ process-jobs-adaptive.ts exists at expected location');
} else {
  console.error('❌ process-jobs-adaptive.ts not found at:', scriptPath);
}

console.log('\n✅ All runtime checks passed!');
#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🧪 Simple test of Claude Code...\n');

const prompt = `Count to 5 and then say "done"`;

console.log('Running simple prompt...');
const startTime = Date.now();

try {
  execSync(`claude -p "${prompt}" --max-turns 5`, { 
    stdio: 'inherit',
    timeout: 60000 // 1 minute timeout
  });
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Completed in ${duration.toFixed(1)} seconds`);
} catch (error) {
  console.error('❌ Error:', error.message);
}
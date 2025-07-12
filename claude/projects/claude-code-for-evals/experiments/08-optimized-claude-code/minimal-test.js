#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🧪 Minimal test - Can Claude read and analyze a file?\n');

const prompt = 'Read input.md and tell me how many lines it has.';

console.log('Prompt:', prompt);
console.log('Starting...\n');

const start = Date.now();

try {
  execSync(`claude -p "${prompt}" --allowedTools Read`, {
    stdio: 'inherit',
    timeout: 30000 // 30 second timeout
  });
  
  console.log(`\n✅ Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
} catch (e) {
  console.error('❌ Error:', e.message);
}
#!/usr/bin/env node

// Simple demo of error-finding approach
const { execSync } = require('child_process');

console.log('🔍 Error Hunter Demo - 2 quick iterations\n');

// Iteration 1: Find typos
console.log('📝 Iteration 1: Finding typos...');
const iter1 = `Read experiments/06-error-hunter/input.md.
Find these specific errors:
1. "crossing crossing" (repeated word)
2. "baseball pitchers hand" (missing apostrophe)
3. Other typos

Quote exact text with line numbers. Save findings as error_demo_1.md`;

execSync(`claude -p "${iter1}" --max-turns 5 --allowedTools Read,Write`, {
  stdio: 'inherit'
});

// Iteration 2: Check math
console.log('\n📐 Iteration 2: Checking mathematical claims...');
const iter2 = `Read experiments/06-error-hunter/input.md and error_demo_1.md.
Add these mathematical errors:
1. R vs R-squared confusion (around line 71-75)
2. Population calculations (+4SD, +3SD claims)
3. Any formula errors

Add to existing findings. Save as error_demo_2.md`;

execSync(`claude -p "${iter2}" --max-turns 5 --allowedTools Read,Write`, {
  stdio: 'inherit'
});

console.log('\n✅ Demo complete! Check error_demo_1.md and error_demo_2.md');
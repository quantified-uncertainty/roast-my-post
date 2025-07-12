#!/usr/bin/env node

// Quick test of error-finding approach
const { execSync } = require('child_process');

console.log('🧪 Quick error-finding test (1 iteration only)\n');

const prompt = `Read the blog post at experiments/02-direct-evaluation/input.md.

Find these specific types of errors:
1. Typos (like "crossing crossing")
2. Mathematical errors (R vs R-squared confusion)
3. Wrong numbers (population calculations)
4. Unsupported claims (Bill Gates intelligence)

For each error found:
- Quote the EXACT text
- Give line number if possible
- Explain what's wrong
- Provide correction if known

Find at least 5 specific errors. Save as quick_error_test.md`;

try {
  execSync(`claude -p "${prompt}" --max-turns 10 --allowedTools Read,Write`, {
    stdio: 'inherit'
  });
  
  console.log('\n✅ Test complete! Check quick_error_test.md');
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
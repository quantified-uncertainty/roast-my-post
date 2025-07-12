#!/usr/bin/env node

// Simple test that just runs one iteration synchronously
const { execSync } = require('child_process');

console.log('🧪 Running simple Claude Code test (1 iteration only)');

const prompt = `Read the blog post at experiments/02-direct-evaluation/input.md about statistical correlations. 
Write a brief 200-word evaluation covering the main thesis and one strength/weakness. 
Save as simple_test_output.md`;

console.log('📝 Prompt:', prompt);
console.log('🚀 Starting Claude Code...\n');

try {
  execSync(`claude -p "${prompt}" --max-turns 5 --allowedTools Read,Write`, {
    stdio: 'inherit'
  });
  
  console.log('\n✅ Test complete! Check simple_test_output.md');
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Optimized Claude Code Error Hunter v2\n');

// Pre-read the document
const inputContent = fs.readFileSync(path.join(__dirname, 'input.md'), 'utf8');

// Create a more focused prompt
const prompt = `I'll analyze the document below for errors. I'll find specific issues with exact line numbers.

<document>
${inputContent}
</document>

Task: Find 20-30 specific errors in this document including:
1. Typos and grammar (quote exact text)
2. Math errors (especially R vs R-squared confusion)
3. Logical contradictions
4. Citation issues

For each error: State the line number, quote the exact text, explain the issue.

Note: I'll work through this systematically, outputting findings as I go. No need to use file tools - just analyze and output results.`;

console.log('📄 Document loaded: ' + inputContent.length + ' characters');
console.log('🔍 Starting analysis...\n');
console.log('─'.repeat(50) + '\n');

const startTime = Date.now();

// Use spawn instead of execSync for real-time output
const child = spawn('claude', [
  '-p', prompt,
  '--max-turns', '15',
  '--allowedTools', 'WebSearch'
], {
  stdio: ['inherit', 'pipe', 'pipe']
});

// Capture output
let output = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  const duration = (Date.now() - startTime) / 1000;
  
  console.log('\n' + '─'.repeat(50));
  console.log(`\n⏱️  Completed in ${duration.toFixed(1)} seconds`);
  
  // Save output
  fs.writeFileSync('output.md', output);
  console.log(`📄 Output saved to: output.md`);
  
  // Quick stats
  const errorCount = (output.match(/line \d+/gi) || []).length;
  console.log(`🔍 References to line numbers: ${errorCount}`);
  
  if (code !== 0) {
    console.log(`⚠️  Process exited with code: ${code}`);
  }
});
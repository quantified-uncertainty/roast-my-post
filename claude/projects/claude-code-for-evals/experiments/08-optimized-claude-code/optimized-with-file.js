#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Optimized Claude Code (File-based approach)\n');

// Simpler prompt that asks Claude to read the file
const prompt = `Please read the file at ${path.join(__dirname, 'input.md')} and analyze it for errors.

Find 20-30 specific errors including:
1. Typos and grammar errors (with exact quotes and line numbers)
2. Mathematical mistakes (especially look for R vs R-squared confusion)
3. Logical contradictions
4. Citation and reference issues

For each error you find:
- State the line number
- Quote the exact problematic text
- Explain what's wrong
- Suggest a fix if applicable

Work through the document systematically and output your findings as you go. Use WebSearch if you need to verify facts.`;

console.log('🔍 Starting analysis with file-based approach...\n');
console.log('─'.repeat(50) + '\n');

const startTime = Date.now();

// Use spawn for real-time output
const child = spawn('claude', [
  '-p', prompt,
  '--max-turns', '20',
  '--allowedTools', 'Read,WebSearch'
]);

// Capture and display output in real-time
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
  fs.writeFileSync('output-with-file.md', output);
  console.log(`📄 Output saved to: output-with-file.md`);
  
  // Stats
  const errorCount = (output.match(/line \d+/gi) || []).length;
  console.log(`🔍 Errors found (line references): ${errorCount}`);
  
  // Compare to experiment 07
  if (duration < 300) { // Less than 5 minutes
    const speedup = (937.8 / duration).toFixed(1);
    console.log(`🚀 ${speedup}x faster than experiment 07!`);
  }
});
#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Optimized Claude Code Approach\n');

const outputFile = path.join(__dirname, 'output.md');
const logFile = path.join(__dirname, 'run.log');

console.log(`📝 Output will be saved to: ${outputFile}`);
console.log(`📊 Timing log: ${logFile}\n`);

// Clear previous outputs
fs.writeFileSync(outputFile, '');
fs.writeFileSync(logFile, `Started: ${new Date().toISOString()}\n`);

const startTime = Date.now();

// Run the optimized version and capture output
const child = spawn('node', ['optimized-claude-code.js'], {
  cwd: __dirname
});

let output = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text); // Show progress
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  const duration = (Date.now() - startTime) / 1000;
  
  // Save output
  fs.writeFileSync(outputFile, output);
  
  // Log timing
  fs.appendFileSync(logFile, `Completed: ${new Date().toISOString()}\n`);
  fs.appendFileSync(logFile, `Duration: ${duration.toFixed(1)} seconds\n`);
  fs.appendFileSync(logFile, `Exit code: ${code}\n`);
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Test complete!`);
  console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
  console.log(`📄 Output saved to: ${outputFile}`);
  
  // Quick analysis
  const errorCount = (output.match(/Line \d+/g) || []).length;
  console.log(`🔍 Errors found: ~${errorCount}`);
  
  // Compare to experiment 07
  const experiment07Time = 937.8; // seconds
  const speedup = (experiment07Time / duration).toFixed(1);
  console.log(`🚀 Speedup: ${speedup}x faster than experiment 07`);
});
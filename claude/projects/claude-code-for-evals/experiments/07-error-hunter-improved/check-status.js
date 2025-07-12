#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📊 Error Hunter v2 Status Check\n');

// Check if process is running
const { execSync } = require('child_process');
try {
  const psOutput = execSync('ps aux | grep "node.*run.js" | grep -v grep', { encoding: 'utf8' });
  if (psOutput.trim()) {
    console.log('✅ Process is running');
  }
} catch {
  console.log('❌ Process not found');
}

// Check summary file
const summaryPath = path.join(__dirname, 'output', 'summary.json');
if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  console.log('\n📊 Summary:');
  console.log(`- Completed: ${summary.iterations.completed}/${summary.iterations.max} iterations`);
  console.log(`- Errors found: ${summary.errors.total}`);
  console.log(`- Duration: ${summary.duration.toFixed(1)}s`);
  console.log(`- Total cost: $${summary.cost.total.toFixed(4)}`);
  console.log('\n✅ Run complete!');
} else {
  // Check working document
  const workingPath = path.join(__dirname, 'working', 'working.md');
  if (fs.existsSync(workingPath)) {
    const content = fs.readFileSync(workingPath, 'utf8');
    const iterMatches = content.match(/### Iteration \d+:/g) || [];
    const errorMatches = content.match(/^\d+\. \*\*Line/gm) || [];
    console.log(`\n⏳ In progress:`);
    console.log(`- Iterations started: ${iterMatches.length}`);
    console.log(`- Errors found so far: ${errorMatches.length}`);
  }
  
  // Check latest log
  const logPath = path.join(__dirname, 'logs', 'run.log');
  if (fs.existsSync(logPath)) {
    const log = fs.readFileSync(logPath, 'utf8');
    const lastIteration = log.match(/🔍 Iteration (\d+)\/\d+:/g);
    if (lastIteration) {
      console.log(`- Current: ${lastIteration[lastIteration.length - 1]}`);
    }
  }
}
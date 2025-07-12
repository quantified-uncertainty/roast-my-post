#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting Error Hunter evaluation');
console.log('📄 Article: "Why the tails fall apart"');
console.log('🎯 Goal: Find specific, concrete errors');
console.log('🔄 Iterations: 4-6 with web search\n');

// Configuration
const config = {
  evaluatorPath: path.join(__dirname, 'core-implementation/error-hunter-evaluator.js'),
  inputFile: path.join(__dirname, 'experiments/02-direct-evaluation/input.md'),
  logFile: 'error_hunter.log'
};

// Create log file
const logStream = fs.createWriteStream(config.logFile);

// Spawn the evaluator
const evaluator = spawn('node', [
  config.evaluatorPath,
  config.inputFile,
  '--iterations', '6'
], {
  stdio: ['ignore', 'pipe', 'pipe']
});

// Pipe output to both console and log file
evaluator.stdout.on('data', (data) => {
  process.stdout.write(data);
  logStream.write(data);
});

evaluator.stderr.on('data', (data) => {
  process.stderr.write(data);
  logStream.write(data);
});

evaluator.on('close', (code) => {
  logStream.end();
  
  if (code === 0) {
    console.log('\n✅ Error hunting complete!');
    console.log('📋 Check these files:');
    console.log('  - error_hunting_eval.md (working document)');
    console.log('  - final_error_report.md (final report)');
    console.log('  - error_hunter.log (execution log)');
  } else {
    console.error(`\n❌ Error hunter exited with code ${code}`);
  }
});
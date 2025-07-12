#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  evaluatorPath: path.join(__dirname, 'iterative-evaluator-v2.js'),
  inputFile: path.join(__dirname, '../experiments/02-direct-evaluation/input.md'),
  outputFile: 'test_evaluation.md',
  logFile: 'evaluation.log',
  iterations: 2
};

console.log('🚀 Starting evaluation in background process');
console.log(`📄 Input: ${config.inputFile}`);
console.log(`📝 Output: ${config.outputFile}`);
console.log(`📋 Log: ${config.logFile}`);
console.log(`🔄 Iterations: ${config.iterations}`);
console.log('');
console.log('The evaluation will run in the background.');
console.log('Check evaluation.log for progress.');
console.log('');

// Open log file for appending
const out = fs.openSync(config.logFile, 'a');
const err = fs.openSync(config.logFile, 'a');

// Spawn the evaluator as a detached process
const evaluator = spawn('node', [
  config.evaluatorPath,
  config.inputFile,
  '--iterations', config.iterations.toString(),
  '--output', config.outputFile
], {
  detached: true,
  stdio: ['ignore', out, err]
});

// Let it run independently
evaluator.unref();

console.log(`✅ Process started with PID: ${evaluator.pid}`);
console.log('');
console.log('To check progress:');
console.log(`  tail -f ${config.logFile}`);
console.log('');
console.log('To check if still running:');
console.log(`  ps -p ${evaluator.pid}`);
console.log('');
console.log('The process will complete on its own.');

// Save PID for reference
fs.writeFileSync('evaluation.pid', evaluator.pid.toString());

// Close file descriptors
fs.closeSync(out);
fs.closeSync(err);
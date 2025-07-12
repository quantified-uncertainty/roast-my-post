#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting Error Hunter in background');
console.log('📄 This will run 4-6 iterations with web search');
console.log('⏱️  Estimated time: 15-30 minutes\n');

const config = {
  evaluatorPath: path.join(__dirname, 'core-implementation/error-hunter-evaluator.js'),
  inputFile: path.join(__dirname, 'experiments/02-direct-evaluation/input.md'),
  logFile: 'error_hunter.log'
};

// Open log file
const out = fs.openSync(config.logFile, 'a');
const err = fs.openSync(config.logFile, 'a');

// Spawn detached
const evaluator = spawn('node', [
  config.evaluatorPath,
  config.inputFile,
  '--iterations', '6'
], {
  detached: true,
  stdio: ['ignore', out, err]
});

evaluator.unref();

console.log(`✅ Process started with PID: ${evaluator.pid}`);
console.log('\nTo check progress:');
console.log(`  tail -f ${config.logFile}`);
console.log('\nOutput files will be:');
console.log('  - error_hunting_eval.md (working document)');
console.log('  - final_error_report.md (final report)');

fs.writeFileSync('error_hunter.pid', evaluator.pid.toString());
fs.closeSync(out);
fs.closeSync(err);
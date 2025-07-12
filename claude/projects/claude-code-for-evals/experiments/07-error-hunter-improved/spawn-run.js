#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'background_run.log');
const errorFile = path.join(__dirname, 'background_run_error.log');

console.log('🚀 Spawning Error Hunter v2 in background...');
console.log(`📝 Log file: ${logFile}`);
console.log(`❌ Error file: ${errorFile}`);

// Create/clear log files
fs.writeFileSync(logFile, `Started at: ${new Date().toISOString()}\n`);
fs.writeFileSync(errorFile, '');

const out = fs.openSync(logFile, 'a');
const err = fs.openSync(errorFile, 'a');

const child = spawn('node', [path.join(__dirname, 'run.js')], {
  detached: true,
  stdio: ['ignore', out, err]
});

child.unref();

console.log(`✅ Process spawned with PID: ${child.pid}`);
console.log('📊 Monitor progress with: tail -f background_run.log');
console.log('🏁 Check completion with: grep "Error Hunter complete" background_run.log');
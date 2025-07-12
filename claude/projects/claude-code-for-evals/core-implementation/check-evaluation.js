#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('📊 Checking evaluation status...\n');

// Check if PID file exists
if (fs.existsSync('evaluation.pid')) {
  const pid = fs.readFileSync('evaluation.pid', 'utf-8').trim();
  
  try {
    // Check if process is still running
    execSync(`ps -p ${pid}`, { stdio: 'ignore' });
    console.log(`✅ Evaluation still running (PID: ${pid})`);
  } catch (e) {
    console.log(`⏹️  Evaluation completed (process no longer running)`);
  }
} else {
  console.log('❓ No evaluation process found');
}

// Check log file
if (fs.existsSync('evaluation.log')) {
  console.log('\n📋 Recent log entries:');
  console.log('─'.repeat(50));
  
  const log = fs.readFileSync('evaluation.log', 'utf-8');
  const lines = log.split('\n').filter(l => l.trim());
  const recent = lines.slice(-10).join('\n');
  console.log(recent);
  console.log('─'.repeat(50));
}

// Check output files
console.log('\n📁 Output files:');
if (fs.existsSync('test_evaluation.md')) {
  const stats = fs.statSync('test_evaluation.md');
  console.log(`✓ test_evaluation.md (${stats.size} bytes)`);
}

if (fs.existsSync('final_evaluation.md')) {
  const stats = fs.statSync('final_evaluation.md');
  console.log(`✓ final_evaluation.md (${stats.size} bytes)`);
}

// Count iterations from log
if (fs.existsSync('evaluation.log')) {
  const log = fs.readFileSync('evaluation.log', 'utf-8');
  const iterations = (log.match(/🔄 Iteration/g) || []).length;
  console.log(`\n🔄 Iterations completed: ${iterations}`);
}
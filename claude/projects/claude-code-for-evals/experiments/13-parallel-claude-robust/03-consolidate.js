#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📊 Phase 3: Consolidation (ROBUST)\n');

// Check prerequisites
if (!fs.existsSync('parallel-execution-summary.json')) {
  console.error('❌ Error: parallel-execution-summary.json not found.');
  console.error('   Run ./02-run-parallel-robust.sh first.');
  process.exit(1);
}

let summary;
try {
  summary = JSON.parse(fs.readFileSync('parallel-execution-summary.json', 'utf8'));
} catch (error) {
  console.error('❌ Error reading summary file:', error.message);
  process.exit(1);
}

// Check if we have enough successful tasks
if (summary.tasksSuccess < 3) {
  console.error('❌ Insufficient successful tasks to consolidate');
  console.error(`   Only ${summary.tasksSuccess}/6 tasks succeeded`);
  process.exit(1);
}

// Read all successful task outputs
console.log('📖 Reading outputs from parallel tasks...\n');
let allOutputs = '';
let totalErrors = 0;
let successfulTasks = 0;

summary.outputs.forEach(output => {
  if (output.status === 'success' && fs.existsSync(output.outputFile)) {
    try {
      const content = fs.readFileSync(output.outputFile, 'utf8');
      if (content.trim().length > 50) { // Minimum content threshold
        console.log(`  ✓ Task ${output.taskNumber}: ${(output.size / 1024).toFixed(1)}KB`);
        
        allOutputs += `\n\n### Task ${output.taskNumber}: ${output.description}\n\n`;
        allOutputs += content;
        
        // Rough error count
        const errorCount = (content.match(/line \d+/gi) || []).length;
        totalErrors += errorCount;
        successfulTasks++;
      } else {
        console.log(`  ⚠️  Task ${output.taskNumber}: Content too short, skipping`);
      }
    } catch (error) {
      console.log(`  ✗ Task ${output.taskNumber}: Error reading file`);
    }
  } else if (output.status === 'timeout') {
    console.log(`  ⏱️  Task ${output.taskNumber}: Timed out`);
  } else if (output.status === 'failed') {
    console.log(`  ✗ Task ${output.taskNumber}: Failed`);
  } else {
    console.log(`  ⚠️  Task ${output.taskNumber}: ${output.status}`);
  }
});

if (successfulTasks === 0) {
  console.error('\n❌ No valid task outputs to consolidate');
  process.exit(1);
}

console.log(`\n📝 Consolidating ${successfulTasks} successful tasks with ~${totalErrors} total findings\n`);

// Fallback: If too few outputs, save what we have
if (allOutputs.length < 1000) {
  console.log('⚠️  Warning: Very little content to consolidate');
  console.log('   Saving raw outputs without Claude consolidation...');
  
  fs.writeFileSync('final-consolidated-report.md', `# Error Analysis Report

## Summary
Consolidated ${successfulTasks} task outputs with limited findings.

## Raw Findings
${allOutputs}

---
*Note: This is raw output due to insufficient content for full consolidation.*`);
  
  console.log('📄 Raw outputs saved to: final-consolidated-report.md');
  process.exit(0);
}

// Create consolidation prompt
const prompt = `You are consolidating the results from ${successfulTasks} parallel analyses of a document.

Here are all the findings from the successful parallel tasks:

${allOutputs.substring(0, 50000)} ${allOutputs.length > 50000 ? '\n[... truncated ...]' : ''}

Your job is to:
1. Combine all findings into a single, well-organized report
2. Remove any duplicates (same error found by multiple tasks)
3. Organize by severity: Critical > Major > Minor
4. Provide a clear summary at the top with total error count
5. Ensure all line numbers and quotes are preserved exactly
6. Group similar errors together
7. Create a professional final report

Output a comprehensive error report in markdown format.`;

console.log('🔄 Running consolidation with Claude...\n');

try {
  const startTime = Date.now();
  
  // Save prompt to file (it might be large)
  fs.writeFileSync('consolidation-prompt.txt', prompt);
  
  // Run with timeout and error handling
  const MAX_TIME = 300; // 5 minute timeout for consolidation
  let output;
  
  try {
    output = execSync(
      `timeout ${MAX_TIME} claude -p "$(cat consolidation-prompt.txt)" --max-turns 10`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (error) {
    if (error.status === 124) {
      console.error('⏱️  Consolidation timed out after 5 minutes');
      console.log('   Saving raw outputs instead...');
      
      fs.writeFileSync('final-consolidated-report.md', `# Error Analysis Report (Timeout)

## Summary
Consolidation timed out. Here are the raw findings from ${successfulTasks} tasks.

${allOutputs}`);
      
      console.log('📄 Raw outputs saved to: final-consolidated-report.md');
      process.exit(0);
    }
    throw error;
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  // Validate output
  if (!output || output.trim().length < 100) {
    throw new Error('Consolidation produced insufficient output');
  }
  
  // Save final report
  fs.writeFileSync('final-consolidated-report.md', output);
  
  console.log(`✅ Consolidation completed in ${duration.toFixed(1)}s`);
  console.log('📄 Final report saved to: final-consolidated-report.md');
  
  // Create final summary
  const finalSummary = {
    phases: {
      decomposition: summary.decompositionTime || 10,
      parallelExecution: summary.executionTime,
      consolidation: duration
    },
    totalTime: (summary.decompositionTime || 10) + summary.executionTime + duration,
    tasksRun: summary.tasksTotal,
    tasksSuccessful: successfulTasks,
    approximateErrors: totalErrors,
    timestamp: new Date().toISOString(),
    robustness: {
      retriesUsed: summary.attempts || 1,
      fallbacksTriggered: summary.method === 'fallback',
      partialSuccess: successfulTasks < summary.tasksTotal
    }
  };
  
  fs.writeFileSync('final-summary.json', JSON.stringify(finalSummary, null, 2));
  
  console.log('\n📊 FINAL SUMMARY:');
  console.log(`  - Decomposition: ${finalSummary.phases.decomposition.toFixed(1)}s`);
  console.log(`  - Parallel execution: ${finalSummary.phases.parallelExecution}s`);
  console.log(`  - Consolidation: ${finalSummary.phases.consolidation.toFixed(1)}s`);
  console.log(`  - TOTAL TIME: ${finalSummary.totalTime.toFixed(1)}s`);
  console.log(`  - Tasks successful: ${successfulTasks}/${summary.tasksTotal}`);
  
  if (finalSummary.totalTime < 960) { // 16 minutes baseline
    const speedup = (960 / finalSummary.totalTime).toFixed(1);
    console.log(`  - SPEEDUP: ${speedup}x faster than serial approach!`);
  }
  
} catch (error) {
  console.error('❌ Error during consolidation:', error.message);
  
  // Save outputs even if consolidation fails
  fs.writeFileSync('raw-parallel-outputs.md', allOutputs);
  console.log('📄 Raw outputs saved to: raw-parallel-outputs.md');
  console.log('   You can manually review and consolidate these findings.');
}
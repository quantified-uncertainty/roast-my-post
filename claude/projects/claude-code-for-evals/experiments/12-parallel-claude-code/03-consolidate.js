#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📊 Phase 3: Consolidation\n');

// Check prerequisites
if (!fs.existsSync('parallel-execution-summary.json')) {
  console.error('❌ Error: parallel-execution-summary.json not found.');
  console.error('   Run ./02-run-parallel.sh first.');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync('parallel-execution-summary.json', 'utf8'));

// Read all task outputs
console.log('📖 Reading outputs from parallel tasks...\n');
let allOutputs = '';
let totalErrors = 0;

summary.outputs.forEach(output => {
  if (fs.existsSync(output.outputFile)) {
    const content = fs.readFileSync(output.outputFile, 'utf8');
    console.log(`  ✓ Task ${output.taskNumber}: ${(output.size / 1024).toFixed(1)}KB`);
    
    allOutputs += `\n\n### Task ${output.taskNumber}: ${output.description}\n\n`;
    allOutputs += content;
    
    // Rough error count
    const errorCount = (content.match(/line \d+/gi) || []).length;
    totalErrors += errorCount;
  } else {
    console.log(`  ✗ Task ${output.taskNumber}: No output found`);
  }
});

console.log(`\n📝 Total findings across all tasks: ~${totalErrors} issues\n`);

// Create consolidation prompt
const prompt = `You are consolidating the results from ${summary.tasksCompleted} parallel analyses of a document.

Here are all the findings from the parallel tasks:

${allOutputs}

Your job is to:
1. Combine all findings into a single, well-organized report
2. Remove any duplicates (same error found by multiple tasks)
3. Organize by severity: Critical > Major > Minor
4. Provide a clear summary at the top
5. Ensure all line numbers and quotes are preserved
6. Create a professional final report

Format the output as a comprehensive error report.`;

console.log('🔄 Running consolidation with Claude...\n');

try {
  const startTime = Date.now();
  
  // Save prompt to file (it might be large)
  fs.writeFileSync('consolidation-prompt.txt', prompt);
  
  // Use file input for the prompt to handle size
  const output = execSync(
    `claude -p "$(cat consolidation-prompt.txt)" --max-turns 10`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  
  const duration = (Date.now() - startTime) / 1000;
  
  // Save final report
  fs.writeFileSync('final-consolidated-report.md', output);
  
  console.log(`✅ Consolidation completed in ${duration.toFixed(1)}s`);
  console.log('📄 Final report saved to: final-consolidated-report.md');
  
  // Create final summary
  const finalSummary = {
    phases: {
      decomposition: summary.decompositionTime || 0,
      parallelExecution: summary.executionTime,
      consolidation: duration
    },
    totalTime: (summary.decompositionTime || 0) + summary.executionTime + duration,
    tasksRun: summary.tasksCompleted,
    approximateErrors: totalErrors,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('final-summary.json', JSON.stringify(finalSummary, null, 2));
  
  console.log('\n📊 FINAL SUMMARY:');
  console.log(`  - Decomposition: ${finalSummary.phases.decomposition}s`);
  console.log(`  - Parallel execution: ${finalSummary.phases.parallelExecution}s`);
  console.log(`  - Consolidation: ${finalSummary.phases.consolidation}s`);
  console.log(`  - TOTAL TIME: ${finalSummary.totalTime}s`);
  
  if (finalSummary.totalTime < 960) { // 16 minutes baseline
    const speedup = (960 / finalSummary.totalTime).toFixed(1);
    console.log(`  - SPEEDUP: ${speedup}x faster than serial approach!`);
  }
  
} catch (error) {
  console.error('❌ Error during consolidation:', error.message);
  
  // Save outputs even if consolidation fails
  fs.writeFileSync('raw-parallel-outputs.md', allOutputs);
  console.log('📄 Raw outputs saved to: raw-parallel-outputs.md');
}
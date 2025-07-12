#!/usr/bin/env node

// Quick test to verify error hunter works with just 1 iteration
const ErrorHunterV2 = require('./error-hunter-v2');
const path = require('path');

console.log('🧪 Testing Error Hunter v2 with single iteration...\n');

const hunter = new ErrorHunterV2({
  inputFile: path.join(__dirname, 'input.md'),
  maxIterations: 1,  // Just one iteration for testing
  maxTurns: 5        // Fewer turns for quick test
});

hunter.run()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    console.log('Check the following outputs:');
    console.log('- logs/run.log - Main execution log');
    console.log('- logs/iterations/iter-1.log - Iteration details');
    console.log('- working/working.md - Working document');
    console.log('- output/report.md - Final report');
    console.log('- output/summary.json - Summary stats');
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
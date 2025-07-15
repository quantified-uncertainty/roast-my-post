#!/usr/bin/env tsx
/**
 * Test to reveal variations in math checker output
 * Shows exactly what changes between runs
 */

import { analyzeMathChunk, splitIntoChunks, type MathError } from '../src/lib/documentAnalysis/narrow-epistemic-evals/mathChecker';

// Single test case to run many times
const testCase = `
  Our analysis shows that 2 + 2 = 5, which is a fundamental result.
  The company revenue grew by 50% from $2 million to $3.5 million.
  We calculate that 15% of 200 equals 35.
  The probability of rolling a 6 twice in a row is 1/12.
`;

function errorToString(error: MathError): string {
  return JSON.stringify({
    line: `${error.lineStart}-${error.lineEnd}`,
    text: error.highlightedText,
    type: error.errorType,
    severity: error.severity,
    desc: error.description
  }, null, 2);
}

async function testVariations() {
  console.log('Math Error Checker Variation Test');
  console.log('=================================\n');
  console.log('Running same text 10 times to detect variations...\n');

  const NUM_RUNS = 10;
  const allRuns: { runNumber: number; errors: MathError[] }[] = [];
  
  // Run the same test multiple times
  for (let i = 1; i <= NUM_RUNS; i++) {
    console.log(`Run ${i}/${NUM_RUNS}...`);
    
    const chunks = splitIntoChunks(testCase, 200);
    const errors: MathError[] = [];
    
    for (const chunk of chunks) {
      try {
        const result = await analyzeMathChunk(chunk);
        errors.push(...result.errors);
      } catch (error) {
        console.error(`Error in run ${i}:`, error);
      }
    }
    
    allRuns.push({ runNumber: i, errors });
    console.log(`  Found ${errors.length} errors\n`);
    
    // Small delay between runs
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Analyze variations
  console.log('\n' + '='.repeat(60));
  console.log('VARIATION ANALYSIS');
  console.log('='.repeat(60) + '\n');
  
  // Check if error counts vary
  const errorCounts = allRuns.map(r => r.errors.length);
  const uniqueCounts = [...new Set(errorCounts)];
  
  console.log(`Error counts across runs: [${errorCounts.join(', ')}]`);
  console.log(`Unique counts: ${uniqueCounts.length === 1 ? 'Consistent' : 'VARIES!'}`);
  
  // Track all unique errors seen
  const uniqueErrorSignatures = new Map<string, { runs: number[], error: MathError }>();
  
  allRuns.forEach(({ runNumber, errors }) => {
    errors.forEach(error => {
      const sig = `${error.highlightedText}|${error.errorType}|${error.severity}`;
      if (!uniqueErrorSignatures.has(sig)) {
        uniqueErrorSignatures.set(sig, { runs: [], error });
      }
      uniqueErrorSignatures.get(sig)!.runs.push(runNumber);
    });
  });
  
  console.log(`\nTotal unique errors detected: ${uniqueErrorSignatures.size}`);
  
  // Show which errors appeared in which runs
  console.log('\nError appearance by run:');
  uniqueErrorSignatures.forEach(({ runs, error }, sig) => {
    const consistency = runs.length / NUM_RUNS * 100;
    console.log(`\n"${error.highlightedText}" (${error.errorType}, ${error.severity})`);
    console.log(`  Appeared in runs: [${runs.join(', ')}] - ${consistency}% consistency`);
    
    // If not 100% consistent, show variations
    if (runs.length < NUM_RUNS) {
      console.log(`  ⚠️  INCONSISTENT DETECTION!`);
    }
  });
  
  // Show detailed differences between first two runs
  if (allRuns.length >= 2) {
    console.log('\n\n' + '='.repeat(60));
    console.log('DETAILED COMPARISON: Run 1 vs Run 2');
    console.log('='.repeat(60) + '\n');
    
    const run1Errors = allRuns[0].errors;
    const run2Errors = allRuns[1].errors;
    
    console.log(`Run 1: ${run1Errors.length} errors`);
    console.log(`Run 2: ${run2Errors.length} errors`);
    
    // Compare descriptions for same errors
    const matchedErrors = new Map<string, { e1: MathError, e2: MathError }>();
    
    run1Errors.forEach(e1 => {
      const match = run2Errors.find(e2 => 
        e2.highlightedText === e1.highlightedText && 
        e2.errorType === e1.errorType
      );
      if (match) {
        matchedErrors.set(e1.highlightedText, { e1, e2: match });
      }
    });
    
    console.log(`\nMatched errors: ${matchedErrors.size}`);
    
    // Check for description variations
    let descriptionVariations = 0;
    matchedErrors.forEach(({ e1, e2 }, text) => {
      if (e1.description !== e2.description) {
        descriptionVariations++;
        console.log(`\nDESCRIPTION VARIATION for "${text}":`);
        console.log(`  Run 1: ${e1.description}`);
        console.log(`  Run 2: ${e2.description}`);
      }
    });
    
    if (descriptionVariations === 0) {
      console.log('\nNo description variations found in matched errors.');
    } else {
      console.log(`\n⚠️  Found ${descriptionVariations} description variations!`);
    }
  }
  
  // Show all errors from a sample run
  console.log('\n\n' + '='.repeat(60));
  console.log('SAMPLE OUTPUT (Run 1)');
  console.log('='.repeat(60) + '\n');
  
  allRuns[0].errors.forEach((error, idx) => {
    console.log(`Error ${idx + 1}:`);
    console.log(errorToString(error));
    console.log();
  });
}

// Run the test
testVariations().catch(error => {
  console.error('Variation test failed:', error);
  process.exit(1);
});
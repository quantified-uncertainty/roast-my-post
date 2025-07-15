#!/usr/bin/env tsx
/**
 * Reliability test for math error checker
 * Runs the same test multiple times to check consistency
 */

import { analyzeMathChunk, splitIntoChunks, type MathError } from '../src/lib/documentAnalysis/narrow-epistemic-evals/mathChecker';

// Test cases with known errors
const testCases = {
  basicArithmetic: `
    In our financial analysis, we calculated that 15% of 200 is 35.
    We also found that 2 + 2 = 5 in our non-standard arithmetic system.
    The square root of 144 is 11, which we use in our calculations.
  `,
  
  percentageCalculations: `
    Our revenue grew by 50% from $1 million to $1.4 million last year.
    A 25% discount on a $80 item brings the price down to $55.
    If 30% of students passed, and there are 100 students, then 35 passed.
  `,
  
  statistics: `
    The mean of [2, 4, 6, 8, 10] is 5.
    With a standard deviation of 10 and mean of 50, 68% of values lie between 30 and 70.
    The probability of rolling a 6 on a fair die twice in a row is 1/12.
  `,
  
  algebra: `
    Solving x² - 5x + 6 = 0, we get x = 2 and x = 4.
    If 2x + 3 = 11, then x = 3.
    The equation y = 2x + 5 passes through the point (1, 7).
  `,
  
  calculus: `
    The derivative of x³ is 3x.
    The integral of 2x is x² + C.
    The limit of (x² - 4)/(x - 2) as x approaches 2 is 8.
  `
};

interface TestRun {
  testName: string;
  runNumber: number;
  errorsFound: MathError[];
  errorCount: number;
}

interface ConsistencyAnalysis {
  testName: string;
  runs: number;
  errorCounts: number[];
  uniqueErrors: Set<string>;
  consistentErrors: string[];
  inconsistentErrors: string[];
  detectionRate: Map<string, number>;
}

async function runSingleTest(testName: string, content: string, runNumber: number): Promise<TestRun> {
  const chunks = splitIntoChunks(content, 150);
  const allErrors: MathError[] = [];
  
  for (const chunk of chunks) {
    try {
      const result = await analyzeMathChunk(chunk);
      allErrors.push(...result.errors);
    } catch (error) {
      console.error(`Error in run ${runNumber} for ${testName}:`, error);
    }
  }
  
  return {
    testName,
    runNumber,
    errorsFound: allErrors,
    errorCount: allErrors.length
  };
}

function analyzeConsistency(runs: TestRun[]): ConsistencyAnalysis {
  const testName = runs[0].testName;
  const errorCounts = runs.map(r => r.errorCount);
  
  // Create a map of error signatures to track consistency
  const errorOccurrences = new Map<string, number>();
  const uniqueErrors = new Set<string>();
  
  runs.forEach(run => {
    run.errorsFound.forEach(error => {
      // Create a signature for each error
      const signature = `${error.highlightedText}|${error.errorType}|${error.severity}`;
      uniqueErrors.add(signature);
      errorOccurrences.set(signature, (errorOccurrences.get(signature) || 0) + 1);
    });
  });
  
  // Determine consistent vs inconsistent errors
  const consistentErrors: string[] = [];
  const inconsistentErrors: string[] = [];
  const detectionRate = new Map<string, number>();
  
  uniqueErrors.forEach(signature => {
    const occurrences = errorOccurrences.get(signature) || 0;
    const rate = occurrences / runs.length;
    detectionRate.set(signature, rate);
    
    if (rate === 1.0) {
      consistentErrors.push(signature);
    } else {
      inconsistentErrors.push(signature);
    }
  });
  
  return {
    testName,
    runs: runs.length,
    errorCounts,
    uniqueErrors,
    consistentErrors,
    inconsistentErrors,
    detectionRate
  };
}

async function runReliabilityTest() {
  console.log('Math Error Checker Reliability Test');
  console.log('===================================\n');
  
  const NUM_RUNS = 5;
  const allResults: ConsistencyAnalysis[] = [];
  
  for (const [testName, testContent] of Object.entries(testCases)) {
    console.log(`\nTesting: ${testName}`);
    console.log('-'.repeat(40));
    
    const runs: TestRun[] = [];
    
    // Run the test multiple times
    for (let i = 1; i <= NUM_RUNS; i++) {
      process.stdout.write(`  Run ${i}/${NUM_RUNS}... `);
      const result = await runSingleTest(testName, testContent, i);
      runs.push(result);
      console.log(`Found ${result.errorCount} errors`);
      
      // Small delay between runs
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Analyze consistency
    const analysis = analyzeConsistency(runs);
    allResults.push(analysis);
    
    // Display results
    console.log(`\n  Consistency Analysis:`);
    console.log(`  - Error counts across runs: [${analysis.errorCounts.join(', ')}]`);
    console.log(`  - Average errors: ${(analysis.errorCounts.reduce((a, b) => a + b, 0) / NUM_RUNS).toFixed(1)}`);
    console.log(`  - Unique errors detected: ${analysis.uniqueErrors.size}`);
    console.log(`  - Consistently detected: ${analysis.consistentErrors.length} (100% detection rate)`);
    console.log(`  - Inconsistently detected: ${analysis.inconsistentErrors.length}`);
    
    if (analysis.inconsistentErrors.length > 0) {
      console.log(`\n  Inconsistent detections:`);
      analysis.inconsistentErrors.forEach(sig => {
        const rate = analysis.detectionRate.get(sig) || 0;
        const [text, type, severity] = sig.split('|');
        console.log(`    - "${text}" (${type}, ${severity}): ${(rate * 100).toFixed(0)}% detection rate`);
      });
    }
  }
  
  // Overall summary
  console.log('\n\n' + '='.repeat(60));
  console.log('OVERALL RELIABILITY SUMMARY');
  console.log('='.repeat(60));
  
  let totalConsistent = 0;
  let totalInconsistent = 0;
  let totalRuns = 0;
  
  allResults.forEach(analysis => {
    totalConsistent += analysis.consistentErrors.length;
    totalInconsistent += analysis.inconsistentErrors.length;
    totalRuns += analysis.runs;
    
    const consistency = analysis.consistentErrors.length / analysis.uniqueErrors.size;
    console.log(`\n${analysis.testName}:`);
    console.log(`  Consistency rate: ${(consistency * 100).toFixed(1)}%`);
    console.log(`  Error count variance: ${Math.max(...analysis.errorCounts) - Math.min(...analysis.errorCounts)}`);
  });
  
  const overallConsistency = totalConsistent / (totalConsistent + totalInconsistent);
  console.log(`\nOverall consistency: ${(overallConsistency * 100).toFixed(1)}%`);
  console.log(`Total consistent detections: ${totalConsistent}`);
  console.log(`Total inconsistent detections: ${totalInconsistent}`);
  
  // Identify patterns in inconsistencies
  console.log('\n\nPatterns in Inconsistencies:');
  const typeInconsistency = new Map<string, number>();
  allResults.forEach(analysis => {
    analysis.inconsistentErrors.forEach(sig => {
      const [, type] = sig.split('|');
      typeInconsistency.set(type, (typeInconsistency.get(type) || 0) + 1);
    });
  });
  
  typeInconsistency.forEach((count, type) => {
    console.log(`  ${type}: ${count} inconsistent detections`);
  });
}

// Run the test
runReliabilityTest().catch(error => {
  console.error('Reliability test failed:', error);
  process.exit(1);
});
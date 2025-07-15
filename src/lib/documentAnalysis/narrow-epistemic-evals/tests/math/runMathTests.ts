#!/usr/bin/env tsx
/**
 * Math test runner with clean input/output verification
 */

import { analyzeMathChunk, splitIntoChunks } from '../../mathChecker';
import { runTestSuite, displayDetailedResults } from '../shared/testRunner';
import { basicMathTestSuite, advancedMathTestSuite, edgeCaseTestSuite } from './mathTestCases';
import type { MathTestInput, MathTestExpected } from './mathTestCases';

/**
 * Test function that converts input to math checker format and runs analysis
 */
async function runMathAnalysis(input: MathTestInput): Promise<any> {
  const chunks = splitIntoChunks(input.text, input.chunkSize || 200);
  const allErrors = [];
  
  for (const chunk of chunks) {
    const result = await analyzeMathChunk(chunk);
    allErrors.push(...result.errors);
  }
  
  return {
    errorCount: allErrors.length,
    errors: allErrors.map(error => ({
      highlightedText: error.highlightedText,
      errorType: error.errorType,
      severity: error.severity,
      description: error.description,
      lineStart: error.lineStart,
      lineEnd: error.lineEnd
    }))
  };
}

/**
 * Run all math test suites
 */
async function runAllMathTests() {
  console.log('🧮 Math Error Detection Test Suite');
  console.log('==================================\n');
  
  const allResults = [];
  
  // Run basic tests
  console.log('\n' + '='.repeat(60));
  const basicResults = await runTestSuite(
    basicMathTestSuite,
    runMathAnalysis,
    {
      useExactMatch: false, // Use LLM fuzzy matching
      matchingCriteria: `
        Focus on:
        - Error count should match (±1 acceptable for edge cases)
        - Error types should be semantically equivalent
        - Highlighted text should contain the problematic mathematical content
        - Severity should be appropriate (critical > major > minor)
        - Descriptions should identify the correct issue and solution
      `,
      timeout: 45000
    }
  );
  allResults.push(basicResults);
  
  // Run advanced tests
  console.log('\n' + '='.repeat(60));
  const advancedResults = await runTestSuite(
    advancedMathTestSuite,
    runMathAnalysis,
    {
      useExactMatch: false,
      matchingCriteria: `
        For advanced math:
        - Mathematical concepts should be correctly identified
        - Calculus errors should specify correct derivatives/integrals
        - Statistical reasoning should be sound
        - Algebraic solutions should be verified
        - Allow for equivalent mathematical expressions
      `,
      timeout: 45000
    }
  );
  allResults.push(advancedResults);
  
  // Run edge case tests  
  console.log('\n' + '='.repeat(60));
  const edgeResults = await runTestSuite(
    edgeCaseTestSuite,
    runMathAnalysis,
    {
      useExactMatch: false,
      matchingCriteria: `
        For edge cases:
        - Context-dependent approximations should be handled appropriately
        - Ambiguous notation should be flagged when problematic
        - Conceptual errors should be identified correctly
        - Multiple errors should all be detected
        - Engineering/practical approximations may be acceptable
      `,
      timeout: 45000
    }
  );
  allResults.push(edgeResults);
  
  // Overall summary
  console.log('\n' + '='.repeat(80));
  console.log('OVERALL TEST SUMMARY');
  console.log('='.repeat(80));
  
  const totalTests = allResults.reduce((sum, r) => sum + r.summary.total, 0);
  const totalPassed = allResults.reduce((sum, r) => sum + r.summary.passed, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.summary.failed, 0);
  const avgScore = allResults.reduce((sum, r) => sum + r.summary.averageScore, 0) / allResults.length;
  
  console.log(`\n📊 Total Results:`);
  console.log(`   Tests Run: ${totalTests}`);
  console.log(`   ✅ Passed: ${totalPassed} (${(totalPassed/totalTests*100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${totalFailed} (${(totalFailed/totalTests*100).toFixed(1)}%)`);
  console.log(`   📈 Average Score: ${avgScore.toFixed(3)}`);
  
  // Break down by suite
  console.log(`\n📋 Results by Test Suite:`);
  const suiteNames = ['Basic Math', 'Advanced Math', 'Edge Cases'];
  allResults.forEach((result, i) => {
    const passRate = (result.summary.passed / result.summary.total * 100).toFixed(1);
    console.log(`   ${suiteNames[i]}: ${result.summary.passed}/${result.summary.total} (${passRate}%) - Score: ${result.summary.averageScore.toFixed(3)}`);
  });
  
  // Show detailed failures
  const allFailures = allResults.flatMap(r => r.results.filter(test => !test.passed));
  if (allFailures.length > 0) {
    console.log(`\n❌ Failed Tests (${allFailures.length}):`);
    displayDetailedResults(allFailures, true);
  }
  
  // Performance metrics
  console.log(`\n⚡ Performance Notes:`);
  console.log(`   - Tests use LLM-based fuzzy matching for realistic evaluation`);
  console.log(`   - Each test includes timeout protection (45s)`);
  console.log(`   - Scoring allows for equivalent mathematical expressions`);
  console.log(`   - Context-aware evaluation of approximations and notation`);
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    avgScore,
    suiteResults: allResults
  };
}

/**
 * Run specific test suite by name
 */
async function runSpecificSuite(suiteName: string) {
  console.log(`🧮 Running ${suiteName} Test Suite\n`);
  
  let suite;
  switch (suiteName.toLowerCase()) {
    case 'basic':
      suite = basicMathTestSuite;
      break;
    case 'advanced':
      suite = advancedMathTestSuite;
      break;
    case 'edge':
      suite = edgeCaseTestSuite;
      break;
    default:
      console.error(`Unknown suite: ${suiteName}`);
      console.log('Available suites: basic, advanced, edge');
      process.exit(1);
  }
  
  const results = await runTestSuite(suite, runMathAnalysis, {
    useExactMatch: false,
    timeout: 45000
  });
  
  if (results.summary.failed > 0) {
    displayDetailedResults(results.results, true);
  }
  
  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Run specific suite
    const suiteName = args[0];
    await runSpecificSuite(suiteName);
  } else {
    // Run all suites
    await runAllMathTests();
  }
}

// Handle errors gracefully
main().catch(error => {
  console.error('\n💥 Test execution failed:', error);
  process.exit(1);
});
#!/usr/bin/env tsx
/**
 * Advanced test script for mathematical error detection
 * Run with: npm run test:math-checker:advanced
 */

import { analyzeMathChunk, splitIntoChunks } from '../src/lib/documentAnalysis/narrow-epistemic-evals/mathChecker';
import { advancedTestCases, subtleErrorCases } from '../src/lib/documentAnalysis/narrow-epistemic-evals/advancedMathTestCases';

// List of deliberate errors in the test cases for verification
const knownErrors = {
  calculus: [
    "f'(x) = 3x² - 6x + 2 should be 3x² - 6x + 2 (correct), but critical points calculation is wrong",
    "∫sin²(x)dx result is missing the factor of 1/4 in sin(2x)/4",
    "e ≈ 2.708 is slightly off; should be ≈ 2.718"
  ],
  statistics: [
    "Significance test |r| > 2/√n is incorrect; should use critical values from t-distribution",
    "P(Z > 1) ≈ 0.1587 is correct, but conclusion '84% below' is wrong (should be ~84.13%)",
    "Bonferroni correction should be α/20 = 0.0025, not 0.025"
  ],
  linearAlgebra: [
    "Eigenvalue calculation: λ² - 4λ = 0 is correct, but det(A - λI) expansion is wrong",
    "Matrix A actually has rank 1 (correct), but the eigenvalue calculation above is flawed"
  ],
  probability: [
    "Birthday paradox calculation uses 342! instead of 343! in denominator"
  ],
  numberTheory: [
    "σ(12) = 28 is correct, but 28 > 24 (not 2×12 = 24)"
  ],
  topology: [
    "Klein bottle has Euler characteristic χ = 0, not 1"
  ],
  complexAnalysis: [
    "Residue calculation for 1/(z²(z-1)) at z=0 is incorrect; should be -1, not 1",
    "Residues at z=1 and z=-1 for 1/(z²-1) are 1/2 and -1/2 (correct), but they sum to 0"
  ],
  groupTheory: [
    "D₆ is symmetries of hexagon but has order 12 (correct), description could be clearer"
  ],
  limitError: [
    "Second limit uses L'Hôpital's twice but shows only one application"
  ],
  integrationByParts: [
    "Final answer has wrong factor: should be (x²/2)(ln(x) - 1/2), not (x²/4)(2ln(x) - 1)"
  ],
  matrixInverse: [
    "Determinant is 9-8=1 (correct) but the given calculation shows 3×3-2×4=1 which equals 9-8=1"
  ],
  conditionalProbability: [
    "Calculation looks correct but could verify arithmetic"
  ],
  seriesConvergence: [
    "∑(1/n^(1/2)) diverges (correct) but reasoning about p=1/2 < 1 is stated correctly"
  ]
};

async function analyzeTestCase(name: string, content: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYZING: ${name.toUpperCase()}`);
  console.log(`${'='.repeat(60)}\n`);

  const chunks = splitIntoChunks(content, 200); // Larger chunks for advanced content
  let totalErrors = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`\nChunk ${i + 1}/${chunks.length} (Lines ${chunk.startLineNumber}-${chunk.endLineNumber}):`);
    
    try {
      const result = await analyzeMathChunk(chunk);
      
      if (result.errors.length === 0) {
        console.log('✓ No errors found in this chunk');
      } else {
        totalErrors += result.errors.length;
        console.log(`\n❌ Found ${result.errors.length} error(s):\n`);
        
        result.errors.forEach((error, idx) => {
          console.log(`  ${idx + 1}. [${error.severity.toUpperCase()}] ${error.errorType}`);
          console.log(`     Line ${error.lineStart}: "${error.highlightedText}"`);
          console.log(`     ${error.description}\n`);
        });
      }
    } catch (error) {
      console.error(`  ⚠️  Error analyzing chunk: ${error}`);
    }
    
    // Add a small delay between chunks to avoid rate limiting
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\nTotal errors found in ${name}: ${totalErrors}`);
  if (knownErrors[name as keyof typeof knownErrors]) {
    console.log(`\nKnown errors in this section:`);
    knownErrors[name as keyof typeof knownErrors].forEach((error, idx) => {
      console.log(`  ${idx + 1}. ${error}`);
    });
  }

  return totalErrors;
}

async function runAdvancedTests() {
  console.log('Advanced Math Error Detection Test');
  console.log('==================================\n');

  const testCasesToRun = [
    // Run a subset to manage API costs - uncomment others as needed
    { name: 'calculus', content: advancedTestCases.calculus },
    { name: 'statistics', content: advancedTestCases.statistics },
    { name: 'linearAlgebra', content: advancedTestCases.linearAlgebra },
    // { name: 'probability', content: advancedTestCases.probability },
    // { name: 'numberTheory', content: advancedTestCases.numberTheory },
    // { name: 'topology', content: advancedTestCases.topology },
    // { name: 'complexAnalysis', content: advancedTestCases.complexAnalysis },
    // { name: 'groupTheory', content: advancedTestCases.groupTheory },
    
    // Subtle error cases
    { name: 'limitError', content: subtleErrorCases.limitError },
    { name: 'integrationByParts', content: subtleErrorCases.integrationByParts },
    // { name: 'matrixInverse', content: subtleErrorCases.matrixInverse },
    // { name: 'conditionalProbability', content: subtleErrorCases.conditionalProbability },
    // { name: 'seriesConvergence', content: subtleErrorCases.seriesConvergence },
  ];

  let totalErrorsFound = 0;
  const results: { name: string; errors: number }[] = [];

  for (const testCase of testCasesToRun) {
    const errors = await analyzeTestCase(testCase.name, testCase.content);
    totalErrorsFound += errors;
    results.push({ name: testCase.name, errors });
    
    // Delay between test cases
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('\nErrors found by category:');
  results.forEach(({ name, errors }) => {
    console.log(`  ${name}: ${errors} error(s)`);
  });
  console.log(`\nTotal errors found: ${totalErrorsFound}`);
  console.log('\nNote: Some subtle errors might not be detected, and some correct');
  console.log('statements might be flagged depending on interpretation.');
}

// Run the tests
runAdvancedTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
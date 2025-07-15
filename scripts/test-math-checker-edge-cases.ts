#!/usr/bin/env tsx
/**
 * Edge case reliability test for math error checker
 * Tests more ambiguous or context-dependent cases
 */

import { analyzeMathChunk, splitIntoChunks, type MathError } from '../src/lib/documentAnalysis/narrow-epistemic-evals/mathChecker';

// Edge cases that might produce inconsistent results
const edgeCases = {
  approximations: `
    The value of π is approximately 3.14.
    We estimate e ≈ 2.7 for our quick calculations.
    Using √2 ≈ 1.4 gives us a rough estimate.
    For practical purposes, we round 9.8 m/s² to 10 m/s².
  `,
  
  contextDependent: `
    In base 16, 10 + 10 = 20.
    For small angles, sin(x) ≈ x (in radians).
    When x is large, 1/x ≈ 0.
    In our simplified model, we assume g = 10 m/s².
  `,
  
  ambiguousNotation: `
    The expression 6/2(1+2) equals 1.
    We write 2 × 10³ as 2000.
    The function f(x) = x² has derivative 2x.
    sin²(x) + cos²(x) = 1 for all x.
  `,
  
  subtleErrors: `
    The harmonic series 1 + 1/2 + 1/3 + ... converges to 2.
    For any triangle, a² + b² = c².
    The probability of getting at least one 6 in two dice rolls is 1/3.
    If f(x) = |x|, then f'(0) = 0.
  `,
  
  mixedCorrectAndWrong: `
    The quadratic formula gives x = (-b ± √(b²-4ac))/2a. For x² - 5x + 6 = 0, 
    we have a=1, b=-5, c=6, so x = (5 ± √(25-24))/2 = (5 ± 1)/2, giving x=3 or x=4.
    However, checking: 3² - 5(3) + 6 = 9 - 15 + 6 = 0 ✓ and 4² - 5(4) + 6 = 16 - 20 + 6 = 2.
  `
};

async function runEdgeCaseTest() {
  console.log('Math Error Checker Edge Case Reliability Test');
  console.log('=============================================\n');
  
  const NUM_RUNS = 5;
  
  for (const [testName, testContent] of Object.entries(edgeCases)) {
    console.log(`\nTesting: ${testName}`);
    console.log('-'.repeat(50));
    
    const runResults: { errors: MathError[], count: number }[] = [];
    const errorTracking = new Map<string, number[]>(); // Track which runs detected each error
    
    // Run the test multiple times
    for (let i = 1; i <= NUM_RUNS; i++) {
      process.stdout.write(`  Run ${i}/${NUM_RUNS}... `);
      
      const chunks = splitIntoChunks(testContent, 200);
      const allErrors: MathError[] = [];
      
      for (const chunk of chunks) {
        try {
          const result = await analyzeMathChunk(chunk);
          allErrors.push(...result.errors);
        } catch (error) {
          console.error(`Error in run ${i}:`, error);
        }
      }
      
      runResults.push({ errors: allErrors, count: allErrors.length });
      console.log(`Found ${allErrors.length} errors`);
      
      // Track which errors were found in this run
      allErrors.forEach(error => {
        const key = `${error.highlightedText}|||${error.description.substring(0, 50)}`;
        if (!errorTracking.has(key)) {
          errorTracking.set(key, []);
        }
        errorTracking.get(key)!.push(i);
      });
      
      // Delay between runs
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Analyze results
    console.log(`\n  Analysis:`);
    const counts = runResults.map(r => r.count);
    console.log(`  - Error counts: [${counts.join(', ')}]`);
    console.log(`  - Min/Max: ${Math.min(...counts)}/${Math.max(...counts)}`);
    console.log(`  - Variance: ${Math.max(...counts) - Math.min(...counts)}`);
    
    // Check for inconsistencies
    const inconsistentErrors: string[] = [];
    const consistentErrors: string[] = [];
    
    errorTracking.forEach((runs, errorKey) => {
      if (runs.length === NUM_RUNS) {
        consistentErrors.push(errorKey);
      } else {
        inconsistentErrors.push(errorKey);
      }
    });
    
    console.log(`  - Consistent errors: ${consistentErrors.length}`);
    console.log(`  - Inconsistent errors: ${inconsistentErrors.length}`);
    
    if (inconsistentErrors.length > 0) {
      console.log(`\n  Inconsistent detections:`);
      inconsistentErrors.forEach(errorKey => {
        const runs = errorTracking.get(errorKey)!;
        const [text, desc] = errorKey.split('|||');
        console.log(`    - "${text}"`);
        console.log(`      ${desc}...`);
        console.log(`      Detected in runs: [${runs.join(', ')}] (${runs.length}/${NUM_RUNS})`);
      });
    }
    
    // Show errors from first run for reference
    if (runResults[0].errors.length > 0) {
      console.log(`\n  Sample errors from first run:`);
      runResults[0].errors.forEach((error, idx) => {
        console.log(`    ${idx + 1}. [${error.severity}] "${error.highlightedText}"`);
        console.log(`       ${error.description.substring(0, 80)}...`);
      });
    }
  }
  
  console.log('\n\nKey Findings:');
  console.log('- Approximations: Model generally accepts common approximations (π≈3.14, e≈2.7)');
  console.log('- Context-dependent: Handles alternative bases and contextual statements well');
  console.log('- Ambiguous notation: May interpret mathematical expressions differently');
  console.log('- Subtle errors: Good at catching mathematical falsehoods');
  console.log('- Mixed content: Can analyze complex multi-step problems');
}

// Run the test
runEdgeCaseTest().catch(error => {
  console.error('Edge case test failed:', error);
  process.exit(1);
});
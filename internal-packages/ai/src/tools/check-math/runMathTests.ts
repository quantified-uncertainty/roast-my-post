#!/usr/bin/env tsx
/**
 * Math test runner for single-statement verification
 */

// Test the actual tool instead of legacy functions
import checkMathTool from './index';
import type { CheckMathInput, CheckMathOutput } from './index';

/**
 * Example test cases for single-statement verification
 */
const testStatements = [
  {
    statement: "2 + 2 = 5",
    expected: "verified_false",
    description: "Simple arithmetic error"
  },
  {
    statement: "The square root of 16 is 4",
    expected: "verified_true",
    description: "Correct square root"
  },
  {
    statement: "1 kilometer equals 100 meters",
    expected: "verified_false",
    description: "Unit conversion error"
  },
  {
    statement: "50% of 100 is 50",
    expected: "verified_true",
    description: "Correct percentage calculation"
  },
  {
    statement: "π equals exactly 3.14",
    expected: "verified_false",
    description: "Precision error"
  }
];

/**
 * Run test for a single statement
 */
async function testStatement(input: CheckMathInput): Promise<CheckMathOutput> {
  const result = await checkMathTool.execute(input, {
    logger: console as any
  });
  
  return result;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧮 Math Statement Verification Tests');
  console.log('====================================\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testStatements) {
    console.log(`\nTesting: "${test.statement}"`);
    console.log(`Expected: ${test.expected}`);
    console.log(`Description: ${test.description}`);
    
    try {
      const result = await testStatement({ statement: test.statement });
      
      console.log(`Result: ${result.status}`);
      console.log(`Explanation: ${result.explanation}`);
      
      if (result.status === 'verified_false' && result.errorDetails) {
        console.log(`Error Type: ${result.errorDetails.errorType}`);
        console.log(`Severity: ${result.errorDetails.severity}`);
        if (result.errorDetails.conciseCorrection) {
          console.log(`Correction: ${result.errorDetails.conciseCorrection}`);
        }
      }
      
      // Check if result matches expectation
      const testPassed = result.status === test.expected;
      if (testPassed) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        failed++;
      }
      
    } catch (error) {
      console.error('💥 Error:', error);
      failed++;
    }
    
    console.log('-'.repeat(60));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testStatements.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / testStatements.length) * 100).toFixed(1)}%`);
}

// Main execution
async function main() {
  try {
    await runAllTests();
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
main();
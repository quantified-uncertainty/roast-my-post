#!/usr/bin/env npx tsx

import { checkSpellingGrammarTool } from '../../../apps/web/src/tools/check-spelling-grammar/index';
import { logger } from '../../../apps/web/src/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

// Just run 3 test cases to verify JSON output
const testCases = [
  {
    category: "Basic Spelling",
    name: "Simple typo - teh",
    input: { text: "I teh best way to learn is by doing." },
    expectedBehavior: "Should find 'teh' error",
    shouldFindErrors: true,
    specificChecks: ["Should find 'teh'", "Type should be 'spelling' or 'grammar'"]
  },
  {
    category: "Grammar",
    name: "Subject-verb disagreement",
    input: { text: "The dogs is barking loudly." },
    expectedBehavior: "Should find 'is' → 'are'",
    shouldFindErrors: true,
    specificChecks: ["Should find 'is' → 'are'", "Type should be 'grammar'"]
  },
  {
    category: "Non-Errors",
    name: "Correct text",
    input: { text: "The quick brown fox jumps over the lazy dog." },
    expectedBehavior: "Should find no errors",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected"]
  }
];

async function runQuickEvaluation() {
  const mockContext = { logger, userId: 'test-user' };
  console.log("🚀 Running quick evaluation with 3 test cases...");
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`);
    
    const runs: any[] = [];
    for (let i = 0; i < 3; i++) {
      console.log(`  Run ${i + 1}/3...`);
      const start = Date.now();
      
      try {
        const output = await checkSpellingGrammarTool.run(testCase.input, mockContext);
        const duration = Date.now() - start;
        
        runs.push({
          passed: testCase.shouldFindErrors ? output.errors.length > 0 : output.errors.length === 0,
          failureReasons: [],
          duration,
          errorCount: output.errors.length,
          errors: output.errors,
          output // Include full output
        });
      } catch (error) {
        runs.push({
          passed: false,
          failureReasons: [error instanceof Error ? error.message : String(error)],
          duration: Date.now() - start,
          errorCount: 0,
          errors: [],
          error: error instanceof Error ? error.message : String(error),
          output: null
        });
      }
    }
    
    results.push({
      testCase,
      runs,
      overallPassed: runs.every(r => r.passed),
      consistencyScore: runs.every(r => r.errorCount === runs[0].errorCount) ? 100 : 50
    });
  }
  
  // Ensure results directory exists
  const resultsDir = path.join(process.cwd(), 'evaluations', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Generate JSON file
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const jsonPath = path.join(resultsDir, `spelling-grammar-quick-results-${timestamp}.json`);
  
  const jsonData = {
    metadata: {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedTests: results.filter(r => r.overallPassed).length,
      failedTests: results.filter(r => !r.overallPassed).length,
      passRate: Math.round((results.filter(r => r.overallPassed).length / results.length) * 100),
      avgConsistency: Math.round(results.reduce((sum, r) => sum + r.consistencyScore, 0) / results.length),
      inconsistentTests: results.filter(r => r.consistencyScore < 100).length,
      categoryStats: {},
      numRunsPerTest: 3
    },
    results
  };
  
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  
  console.log(`\n✅ Quick evaluation complete!`);
  console.log(`📄 Results saved to: ${jsonPath}`);
  console.log(`\nTo view: npx tsx evaluations/scripts/server.ts`);
}

runQuickEvaluation().catch(console.error);
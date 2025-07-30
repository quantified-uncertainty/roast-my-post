import { checkSpellingGrammarTool } from '../../src/tools/check-spelling-grammar';
import { logger } from '../../src/lib/logger';
import type { TestCase } from '../data/test-cases';

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

export interface RunResult {
  passed: boolean;
  errors: any[];
  output: any;
  duration: number;
  failureReasons: string[];
}

export interface TestResult {
  testCase: TestCase;
  runs: RunResult[];
  overallPassed: boolean;
  consistencyScore: number;
}

export interface EvaluationResult {
  metadata: {
    timestamp: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    avgConsistency: number;
    inconsistentTests: number;
    categoryStats: Record<string, { total: number; passed: number }>;
  };
  results: TestResult[];
}

export async function runEvaluation(
  testCases: TestCase[],
  runsPerTest: number = 3
): Promise<EvaluationResult> {
  const mockContext = { logger, userId: 'test-evaluation' };
  const results: TestResult[] = [];
  
  console.log(`Running ${testCases.length} tests with ${runsPerTest} runs each...`);
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    const runs: RunResult[] = [];
    
    for (let i = 0; i < runsPerTest; i++) {
      const start = Date.now();
      
      try {
        const output = await checkSpellingGrammarTool.run(testCase.input, mockContext);
        const duration = Date.now() - start;
        
        // Check expectations
        const { passed, reasons } = checkExpectations(output, testCase.expectations);
        
        runs.push({
          passed,
          errors: output.errors,
          output,
          duration,
          failureReasons: reasons
        });
      } catch (error) {
        runs.push({
          passed: false,
          errors: [],
          output: null,
          duration: Date.now() - start,
          failureReasons: [error.message]
        });
      }
    }
    
    // Calculate consistency
    const errorCounts = runs.map(r => r.errors.length);
    const consistencyScore = errorCounts.every(c => c === errorCounts[0]) ? 100 : 
      calculateConsistencyScore(runs);
    
    results.push({
      testCase,
      runs,
      overallPassed: runs.every(r => r.passed),
      consistencyScore
    });
  }
  
  // Calculate metadata
  const passedTests = results.filter(r => r.overallPassed).length;
  const categoryStats = calculateCategoryStats(results);
  
  return {
    metadata: {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedTests,
      failedTests: results.length - passedTests,
      passRate: Math.round((passedTests / results.length) * 100),
      avgConsistency: Math.round(
        results.reduce((sum, r) => sum + r.consistencyScore, 0) / results.length
      ),
      inconsistentTests: results.filter(r => r.consistencyScore < 100).length,
      categoryStats
    },
    results
  };
}

function checkExpectations(output: any, expectations: TestCase['expectations']) {
  const reasons: string[] = [];
  
  // Check error count
  if (expectations.shouldFindErrors && output.errors.length === 0) {
    reasons.push('Expected errors but found none');
  }
  if (!expectations.shouldFindErrors && output.errors.length > 0) {
    reasons.push(`Expected no errors but found ${output.errors.length}`);
  }
  
  // Check min/max errors
  if (expectations.minErrors && output.errors.length < expectations.minErrors) {
    reasons.push(`Expected at least ${expectations.minErrors} errors but found ${output.errors.length}`);
  }
  if (expectations.maxErrors && output.errors.length > expectations.maxErrors) {
    reasons.push(`Expected at most ${expectations.maxErrors} errors but found ${output.errors.length}`);
  }
  
  // Check must find
  if (expectations.mustFind) {
    for (const must of expectations.mustFind) {
      const found = output.errors.find(e => {
        const textMatch = !must.text || 
          e.text?.toLowerCase() === must.text.toLowerCase();
        const correctionMatch = !must.correction || 
          e.correction?.toLowerCase() === must.correction.toLowerCase();
        const typeMatch = !must.type || e.type === must.type;
        const minImpMatch = !must.minImportance || e.importance >= must.minImportance;
        const maxImpMatch = !must.maxImportance || e.importance <= must.maxImportance;
        
        return textMatch && correctionMatch && typeMatch && minImpMatch && maxImpMatch;
      });
      
      if (!found) {
        reasons.push(`Expected to find error: ${must.text}${must.correction ? ' → ' + must.correction : ''}`);
      }
    }
  }
  
  return {
    passed: reasons.length === 0,
    reasons
  };
}

function calculateConsistencyScore(runs: RunResult[]): number {
  // Simple consistency: what percentage of runs had the same error count
  const errorCounts = runs.map(r => r.errors.length);
  const mode = getMostFrequent(errorCounts);
  const consistent = errorCounts.filter(c => c === mode).length;
  return Math.round((consistent / runs.length) * 100);
}

function getMostFrequent<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  let maxCount = 0;
  let mode = arr[0];
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mode = item;
    }
  }
  return mode;
}

function calculateCategoryStats(results: TestResult[]) {
  const stats: Record<string, { total: number; passed: number }> = {};
  
  for (const result of results) {
    const category = result.testCase.category;
    if (!stats[category]) {
      stats[category] = { total: 0, passed: 0 };
    }
    stats[category].total++;
    if (result.overallPassed) {
      stats[category].passed++;
    }
  }
  
  return stats;
}
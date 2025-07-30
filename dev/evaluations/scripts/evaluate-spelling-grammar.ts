#!/usr/bin/env npx tsx
import { logger } from "@roast/web/src/lib/logger";
import { checkSpellingGrammarTool } from "@roast/web/src/tools/check-spelling-grammar";
import type { 
  CheckSpellingGrammarInput, 
  CheckSpellingGrammarOutput,
  SpellingGrammarError 
} from "@roast/web/src/tools/check-spelling-grammar";
import * as fs from "fs";
import * as path from "path";

interface TestCase {
  category: string;
  name: string;
  input: CheckSpellingGrammarInput;
  expectedBehavior: string;
  shouldFindErrors: boolean;
  specificChecks?: string[];
}

interface SingleRunResult {
  output: CheckSpellingGrammarOutput;
  passed: boolean;
  failureReasons: string[];
  duration: number;
  error?: string;
}

interface TestResult {
  testCase: TestCase;
  runs: SingleRunResult[];
  overallPassed: boolean;
  consistencyScore: number; // 0-100, how consistent were the runs
}

// Define all test cases from the e2e test file
const testCases: TestCase[] = [
  // Basic Spelling Errors
  {
    category: "Basic Spelling",
    name: "Simple typo - teh",
    input: { text: "I teh best way to learn is by doing." },
    expectedBehavior: "Should detect 'teh' as spelling error",
    shouldFindErrors: true,
    specificChecks: ["Should find 'teh' → 'the'", "Type should be 'spelling'", "Importance ≤ 30"]
  },
  {
    category: "Basic Spelling",
    name: "Common misspelling - recieve",
    input: { text: "I will recieve the package tomorrow." },
    expectedBehavior: "Should detect 'recieve' as spelling error",
    shouldFindErrors: true,
    specificChecks: ["Should find 'recieve' → 'receive'", "Type should be 'spelling'", "Importance ≤ 35"]
  },
  {
    category: "Basic Spelling",
    name: "Technical term misspelling",
    input: { text: "The algorithem is very efficient." },
    expectedBehavior: "Should detect 'algorithem' as spelling error",
    shouldFindErrors: true,
    specificChecks: ["Should find 'algorithem' → 'algorithm'", "Type should be 'spelling'", "Importance 26-75"]
  },
  {
    category: "Basic Spelling",
    name: "Multiple spelling errors",
    input: { text: "Teh studnet recieved thier assignement." },
    expectedBehavior: "Should detect all 4-5 spelling errors",
    shouldFindErrors: true,
    specificChecks: ["Should find 'Teh'", "Should find 'studnet'", "Should find 'recieved'", "Should find 'thier'", "At least 4 errors total"]
  },

  // Grammar Errors
  {
    category: "Grammar",
    name: "Their/there confusion",
    input: { text: "I put the book over their on the table." },
    expectedBehavior: "Should detect 'their' → 'there'",
    shouldFindErrors: true,
    specificChecks: ["Should find 'their' → 'there'", "Type should be 'spelling' or 'grammar'", "Importance 26-50"]
  },
  {
    category: "Grammar",
    name: "Subject-verb disagreement",
    input: { text: "The group of students are going to the library." },
    expectedBehavior: "May or may not flag (style guide dependent)",
    shouldFindErrors: false,
    specificChecks: ["If flagged: 'are' → 'is'", "If flagged: type should be 'grammar'"]
  },
  {
    category: "Grammar",
    name: "Missing article",
    input: { text: "I went to store to buy milk." },
    expectedBehavior: "Should detect missing 'the'",
    shouldFindErrors: true,
    specificChecks: ["Should suggest 'the store'", "Type should be 'grammar'", "Importance 26-50"]
  },
  {
    category: "Grammar",
    name: "Verb tense error",
    input: { text: "Yesterday, I go to the park and play soccer." },
    expectedBehavior: "Should detect tense errors",
    shouldFindErrors: true,
    specificChecks: ["Should find 'go' → 'went'", "Should find 'play' → 'played'", "Type should be 'grammar'"]
  },

  // Critical/Edge Cases
  {
    category: "Critical Cases",
    name: "Dangerous advice (grammatically correct)",
    input: { text: "You should drink alcohol while driving." },
    expectedBehavior: "Should NOT flag (grammatically correct)",
    shouldFindErrors: false,
    specificChecks: ["No errors about missing 'not'", "Zero errors expected"]
  },
  {
    category: "Critical Cases",
    name: "Wrong date (June 31st)",
    input: { text: "The meeting is at 2:00 PM on the 31st of June." },
    expectedBehavior: "May flag factual error with high importance",
    shouldFindErrors: false,
    specificChecks: ["If flagged: importance ≥ 76", "Factual error, not grammar"]
  },
  {
    category: "Critical Cases",
    name: "Ambiguous pronoun",
    input: { text: "John told Mark that he should leave early." },
    expectedBehavior: "May flag ambiguous 'he'",
    shouldFindErrors: false,
    specificChecks: ["If flagged: type should be 'grammar'", "If flagged: importance ≥ 51"]
  },

  // Non-Errors (Should NOT be flagged)
  {
    category: "Non-Errors",
    name: "Mathematical error",
    input: { text: "It is well known that 2 + 2 = 5." },
    expectedBehavior: "Should NOT flag (not spelling/grammar)",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected", "Math errors ignored"]
  },
  {
    category: "Non-Errors",
    name: "Perfect grammar",
    input: { text: "The quick brown fox jumps over the lazy dog." },
    expectedBehavior: "Should NOT flag anything",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected"]
  },
  {
    category: "Non-Errors",
    name: "Technical jargon",
    input: { text: "The API uses OAuth5 authentication with JWT tokens.", strictness: "minimal" as const },
    expectedBehavior: "Should NOT flag technical terms",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected", "Technical terms accepted"]
  },
  {
    category: "Non-Errors",
    name: "Informal language (jankily)",
    input: { 
      text: "Overall, my perspective is that jankily controlling superintelligence seems decently helpful.",
      strictness: "minimal" as const 
    },
    expectedBehavior: "Should NOT flag informal words",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected", "'jankily' is valid"]
  },
  {
    category: "Non-Errors",
    name: "Logical fallacy",
    input: { text: "All birds can fly. Penguins are birds. Therefore, penguins can fly." },
    expectedBehavior: "Should NOT flag (logical error, not grammar)",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected", "Logic errors ignored"]
  },
  {
    category: "Non-Errors",
    name: "Bad argument",
    input: { text: "Climate change is not real because it was cold yesterday." },
    expectedBehavior: "Should NOT flag (bad reasoning, not grammar)",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected", "Reasoning errors ignored"]
  },
  {
    category: "Non-Errors",
    name: "Unusual word usage",
    input: { 
      text: "I think the main rational reason we might use significantly superhuman AIs is that we might be able to control them.",
      strictness: "minimal" as const 
    },
    expectedBehavior: "Should NOT flag 'rational reason'",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected", "Unusual but valid usage"]
  },

  // Complex Text
  {
    category: "Complex Text",
    name: "Academic text with errors",
    input: { 
      text: "The studnets research on quantum mecahnics have shown promissing results.",
      context: "Academic paper abstract"
    },
    expectedBehavior: "Should find multiple errors",
    shouldFindErrors: true,
    specificChecks: ["Should find 'studnets'", "Should find 'mecahnics'", "At least 3 errors total"]
  },
  {
    category: "Complex Text",
    name: "Business email",
    input: { 
      text: "Dear Mr. Smith, I hope this email find you well. We need to discus the new projcet timeline.",
      context: "Professional email"
    },
    expectedBehavior: "Should find verb and spelling errors",
    shouldFindErrors: true,
    specificChecks: ["Should find 'find' → 'finds'", "Should find 'discus' → 'discuss'", "Should find 'projcet' → 'project'"]
  },
  {
    category: "Complex Text",
    name: "Medical context",
    input: { 
      text: "The medecine dosage is 5mg, not 50mg as stated earlier.",
      context: "Medical instructions"
    },
    expectedBehavior: "Should flag with high importance",
    shouldFindErrors: true,
    specificChecks: ["Should find 'medecine' → 'medicine'", "Importance ≥ 51 (medical context)"]
  },

  // Edge Cases
  {
    category: "Edge Cases",
    name: "Very short text",
    input: { text: "Hi." },
    expectedBehavior: "Should handle gracefully",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected"]
  },
  {
    category: "Edge Cases",
    name: "Max errors limit",
    input: { text: "Ths iz a vry bad txt wit mny erors evrywhre.", maxErrors: 3 },
    expectedBehavior: "Should limit to 3 errors",
    shouldFindErrors: true,
    specificChecks: ["Exactly ≤ 3 errors", "Most important errors first"]
  },
  {
    category: "Edge Cases",
    name: "Special characters",
    input: { text: "The cost is $100.00 (excluding tax)." },
    expectedBehavior: "Should handle special chars",
    shouldFindErrors: false,
    specificChecks: ["Zero errors expected"]
  },
  {
    category: "Edge Cases",
    name: "Intentional misspelling",
    input: { 
      text: "Check out our kool new app!",
      context: "Marketing copy with intentional casual spelling"
    },
    expectedBehavior: "May flag with low importance",
    shouldFindErrors: false,
    specificChecks: ["If flagged: importance ≤ 50", "Context considered"]
  },

  // Additional Grammar Patterns
  {
    category: "Grammar Patterns",
    name: "Apostrophe errors",
    input: { text: "Its a beautiful day. The cat licked it's paws. Your welcome!" },
    expectedBehavior: "Should find all apostrophe errors",
    shouldFindErrors: true,
    specificChecks: ["Should find 'Its' → 'It's'", "Should find 'it's' → 'its'", "Should find 'Your' → 'You're'"]
  },
  {
    category: "Grammar Patterns",
    name: "Common confusions",
    input: { text: "The affect of the new policy effects everyone. Then they went too the store to." },
    expectedBehavior: "Should find word confusions",
    shouldFindErrors: true,
    specificChecks: ["May find 'affect' → 'effect'", "May find 'effects' → 'affects'", "May find 'too' → 'to'"]
  },
  {
    category: "Grammar Patterns",
    name: "Punctuation spacing",
    input: { text: "Hello ,how are you?I'm fine.Thanks !" },
    expectedBehavior: "Should find spacing issues",
    shouldFindErrors: true,
    specificChecks: ["Should find spacing errors", "Type should be 'grammar'"]
  },
  {
    category: "Grammar Patterns",
    name: "Double negatives",
    input: { text: "I don't have no money. She can't hardly wait." },
    expectedBehavior: "Should find double negatives",
    shouldFindErrors: true,
    specificChecks: ["Should find grammar errors", "Importance ≥ 26"]
  },
  {
    category: "Grammar Patterns",
    name: "Tense consistency",
    input: { text: "Yesterday I go to the store and buy some milk." },
    expectedBehavior: "Should find tense errors",
    shouldFindErrors: true,
    specificChecks: ["Should find 'go' → 'went'", "Should find 'buy' → 'bought'"]
  },

  // Capitalization
  {
    category: "Capitalization",
    name: "Sentence capitalization",
    input: { text: "the meeting is on monday. we will discuss the new project. john will present." },
    expectedBehavior: "Should find some capitalization errors",
    shouldFindErrors: true,
    specificChecks: ["At least 1 capitalization error", "May find 'the', 'we', 'john'"]
  },
  {
    category: "Capitalization",
    name: "Proper nouns",
    input: { text: "I visited paris in france last Summer. The eiffel tower was beautiful." },
    expectedBehavior: "Should find proper noun errors",
    shouldFindErrors: true,
    specificChecks: ["At least 1 proper noun error", "May find 'paris', 'france', 'eiffel'"]
  }
];

async function runSingleTest(testCase: TestCase, runNumber: number): Promise<SingleRunResult> {
  const startTime = Date.now();
  const mockContext = {
    logger,
    userId: `test-evaluation-run${runNumber}`
  };

  try {
    const output = await checkSpellingGrammarTool.run(testCase.input, mockContext);
    const duration = Date.now() - startTime;

    // Evaluate if the test passed based on expectations
    const failureReasons: string[] = [];
    
    // Check if errors were found when expected
    if (testCase.shouldFindErrors && output.errors.length === 0) {
      failureReasons.push("Expected to find errors but found none");
    }
    
    // Check specific expectations
    if (testCase.specificChecks) {
      for (const check of testCase.specificChecks) {
        // This is a simplified check - in reality we'd parse these more carefully
        if (check.includes("Should find") && !check.includes("If flagged")) {
          const searchTerm = check.match(/'([^']+)'/)?.[1];
          if (searchTerm && !output.errors.some(e => 
            e.text?.toLowerCase() === searchTerm.toLowerCase() ||
            e.correction?.toLowerCase() === searchTerm.toLowerCase()
          )) {
            failureReasons.push(`Failed check: ${check}`);
          }
        }
      }
    }

    return {
      output,
      passed: failureReasons.length === 0,
      failureReasons,
      duration
    };
  } catch (error) {
    return {
      output: { errors: [] },
      passed: false,
      failureReasons: [`Error running test: ${error}`],
      duration: Date.now() - startTime,
      error: String(error)
    };
  }
}

async function runTestCase(testCase: TestCase, numRuns: number = 3): Promise<TestResult> {
  const runs: SingleRunResult[] = [];
  
  // Run the test multiple times
  for (let i = 0; i < numRuns; i++) {
    console.log(`    Run ${i + 1}/${numRuns}...`);
    const result = await runSingleTest(testCase, i + 1);
    runs.push(result);
    
    // Small delay between runs to avoid rate limiting
    if (i < numRuns - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Calculate overall pass (all runs must pass)
  const overallPassed = runs.every(run => run.passed);
  
  // Calculate consistency score
  const passCount = runs.filter(r => r.passed).length;
  const errorCountsMatch = runs.every(r => 
    r.output.errors.length === runs[0].output.errors.length
  );
  const errorTextsMatch = runs.every(r => {
    const errors1 = r.output.errors.map(e => e.text).sort();
    const errors2 = runs[0].output.errors.map(e => e.text).sort();
    return JSON.stringify(errors1) === JSON.stringify(errors2);
  });
  
  let consistencyScore = (passCount / numRuns) * 50; // 50% for consistent pass/fail
  if (errorCountsMatch) consistencyScore += 25; // 25% for same error count
  if (errorTextsMatch) consistencyScore += 25; // 25% for same errors found
  
  return {
    testCase,
    runs,
    overallPassed,
    consistencyScore
  };
}

function generateJSONReport(results: TestResult[]) {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.overallPassed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  // Calculate consistency metrics
  const avgConsistency = results.reduce((sum, r) => sum + r.consistencyScore, 0) / totalTests;
  const inconsistentTests = results.filter(r => r.consistencyScore < 100).length;

  const categoryStats = results.reduce((acc, r) => {
    if (!acc[r.testCase.category]) {
      acc[r.testCase.category] = { total: 0, passed: 0 };
    }
    acc[r.testCase.category].total++;
    if (r.overallPassed) acc[r.testCase.category].passed++;
    return acc;
  }, {} as Record<string, { total: number; passed: number }>);

  return {
    metadata: {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      passRate: parseFloat(passRate),
      avgConsistency,
      inconsistentTests,
      categoryStats,
      numRunsPerTest: 3
    },
    results: results.map(r => ({
      testCase: r.testCase,
      runs: r.runs.map(run => ({
        passed: run.passed,
        failureReasons: run.failureReasons,
        duration: run.duration,
        errorCount: run.output.errors.length,
        errors: run.output.errors,
        error: run.error,
        output: run.output  // Include full output for JSON display
      })),
      overallPassed: r.overallPassed,
      consistencyScore: r.consistencyScore
    }))
  };
}

function generateHTMLReport(results: TestResult[]): string {
  const timestamp = new Date().toISOString();
  const totalTests = results.length;
  const passedTests = results.filter(r => r.overallPassed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  // Calculate consistency metrics
  const avgConsistency = results.reduce((sum, r) => sum + r.consistencyScore, 0) / totalTests;
  const inconsistentTests = results.filter(r => r.consistencyScore < 100).length;

  const categoryStats = results.reduce((acc, r) => {
    if (!acc[r.testCase.category]) {
      acc[r.testCase.category] = { total: 0, passed: 0 };
    }
    acc[r.testCase.category].total++;
    if (r.overallPassed) acc[r.testCase.category].passed++;
    return acc;
  }, {} as Record<string, { total: number; passed: number }>);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Spelling/Grammar Tool Evaluation Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      margin: 0 20px;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .summary {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }
    .stat-card {
      background: white;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    .warning { color: #f39c12; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      padding: 10px;
      border: 1px solid #e0e0e0;
      vertical-align: top;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    tr:hover {
      background: #fafafa;
    }
    .status-icon {
      font-size: 16px;
      text-align: center !important;
    }
    .error-item {
      background: #f8f9fa;
      padding: 6px 8px;
      margin: 4px 0;
      border-radius: 4px;
      font-size: 12px;
      border-left: 3px solid #e0e0e0;
    }
    .error-text {
      color: #d32f2f;
      font-weight: 600;
    }
    .error-correction {
      color: #388e3c;
      font-weight: 600;
    }
    .error-type {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
      margin-left: 6px;
      font-weight: 500;
    }
    .type-spelling {
      background: #e3f2fd;
      color: #1565c0;
    }
    .type-grammar {
      background: #f3e5f5;
      color: #6a1b9a;
    }
    .importance {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
      margin-left: 4px;
      font-weight: 500;
    }
    .importance-low { background: #fff8e1; color: #f57c00; }
    .importance-medium { background: #fff3cd; color: #856404; }
    .importance-high { background: #ffebee; color: #c62828; }
    .check-list {
      margin: 4px 0;
      padding-left: 16px;
      font-size: 12px;
    }
    .check-item {
      margin: 3px 0;
      list-style-type: none;
      position: relative;
      padding-left: 20px;
    }
    .check-item::before {
      position: absolute;
      left: 0;
    }
    .check-passed::before { content: "✓"; color: #27ae60; }
    .check-failed::before { content: "✗"; color: #e74c3c; }
    .filter-buttons {
      margin: 20px 0;
    }
    .filter-btn {
      padding: 8px 16px;
      margin-right: 10px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .filter-btn:hover {
      background: #f8f9fa;
      border-color: #aaa;
    }
    .filter-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }
    details summary {
      cursor: pointer;
      padding: 4px;
      margin: -4px;
      border-radius: 3px;
      font-size: 12px;
      color: #0066cc;
    }
    details summary:hover {
      background: #f0f0f0;
    }
    details[open] summary {
      margin-bottom: 8px;
    }
    code {
      background: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      font-size: 12px;
    }
    pre {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 11px;
      line-height: 1.4;
      margin: 8px 0;
      border: 1px solid #e0e0e0;
    }
    .json-response {
      max-height: 300px;
      overflow-y: auto;
    }
    .no-errors {
      color: #666;
      font-style: italic;
      font-size: 12px;
    }
    .failure-box {
      background: #ffebee;
      border: 1px solid #ef5350;
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
      font-size: 12px;
    }
    .failure-box strong {
      color: #c62828;
    }
    .test-name {
      font-weight: 600;
      color: #333;
    }
    .context-info {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }
    .duration {
      color: #666;
      font-size: 12px;
      text-align: right !important;
    }
    .run-indicator {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin: 0 2px;
      font-size: 11px;
      text-align: center;
      line-height: 20px;
      color: white;
      font-weight: bold;
    }
    .run-pass { background: #27ae60; }
    .run-fail { background: #e74c3c; }
    .consistency-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      margin-left: 8px;
    }
    .consistency-perfect { background: #d4edda; color: #155724; }
    .consistency-good { background: #fff3cd; color: #856404; }
    .consistency-poor { background: #f8d7da; color: #721c24; }
    .run-details {
      margin-top: 8px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 12px;
    }
    .run-header {
      font-weight: 600;
      margin-bottom: 4px;
      color: #495057;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Spelling/Grammar Tool Evaluation Report</h1>
    <p style="color: #666;">Generated: ${timestamp}</p>
    
    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="stat-card">
          <div class="stat-value">${totalTests}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-card">
          <div class="stat-value passed">${passedTests}</div>
          <div class="stat-label">Passed All Runs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value failed">${failedTests}</div>
          <div class="stat-label">Failed Any Run</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${passRate}%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ${avgConsistency < 90 ? 'warning' : ''}">${avgConsistency.toFixed(1)}%</div>
          <div class="stat-label">Avg Consistency</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ${inconsistentTests > 0 ? 'warning' : 'passed'}">${inconsistentTests}</div>
          <div class="stat-label">Inconsistent Tests</div>
        </div>
      </div>
      
      <h3 style="margin-top: 20px;">Category Breakdown</h3>
      <div class="summary-grid">
        ${Object.entries(categoryStats).map(([category, stats]) => `
          <div class="stat-card">
            <strong>${category}</strong>
            <div style="margin-top: 8px;">
              <span class="passed">${stats.passed}</span> / ${stats.total} passed
              <div style="font-size: 12px; color: #666;">
                ${((stats.passed / stats.total) * 100).toFixed(0)}% success rate
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="filter-buttons">
      <button class="filter-btn active" onclick="filterTests('all')">All Tests</button>
      <button class="filter-btn" onclick="filterTests('passed')">Passed Only</button>
      <button class="filter-btn" onclick="filterTests('failed')">Failed Only</button>
    </div>

    <table id="results-table">
      <thead>
        <tr>
          <th style="width: 40px;">Status</th>
          <th style="width: 80px;">Runs</th>
          <th style="width: 100px;">Category</th>
          <th style="width: 150px;">Test Name</th>
          <th style="width: 180px;">Input Text</th>
          <th style="width: 140px;">Expected</th>
          <th style="width: 600px;">Results (3 Runs)</th>
          <th style="width: 100px;">Consistency</th>
        </tr>
      </thead>
      <tbody>
        ${results.map((result, idx) => {
          const statusIcon = result.overallPassed ? '✅' : '❌';
          
          // Generate run indicators
          const runIndicators = result.runs.map((run, i) => 
            `<span class="run-indicator ${run.passed ? 'run-pass' : 'run-fail'}" title="Run ${i+1}: ${run.passed ? 'Pass' : 'Fail'}">${i+1}</span>`
          ).join('');
          
          // Consistency badge
          const consistencyClass = result.consistencyScore === 100 ? 'consistency-perfect' :
                                 result.consistencyScore >= 75 ? 'consistency-good' : 'consistency-poor';
          const consistencyBadge = `<span class="consistency-badge ${consistencyClass}">${result.consistencyScore}%</span>`;
          
          // Format results for all runs
          const resultsHtml = `
            <details>
              <summary>
                ${result.runs[0].output.errors.length} errors found
                ${result.runs.some((r, i) => r.output.errors.length !== result.runs[0].output.errors.length) 
                  ? '<span style="color: #f39c12; font-size: 11px;"> (varies)</span>' 
                  : ''}
              </summary>
              <div class="run-details">
                ${result.runs.map((run, i) => {
                  const errorsHtml = run.output.errors.length === 0 
                    ? '<span class="no-errors">No errors found</span>'
                    : run.output.errors.map(error => {
                        const importanceClass = error.importance <= 25 ? 'importance-low' :
                                              error.importance <= 50 ? 'importance-medium' : 'importance-high';
                        return `
                          <span class="error-text">${error.text || '?'}</span> → 
                          <span class="error-correction">${error.correction || '?'}</span>
                          <span class="error-type type-${error.type}">${error.type}</span>
                          <span class="importance ${importanceClass}">imp: ${error.importance}</span>
                        `;
                      }).join('<br>');
                  
                  return `
                    <div class="run-header">Run ${i+1} (${run.duration}ms) ${run.passed ? '✅' : '❌'}</div>
                    <div style="margin-left: 12px;">
                      ${errorsHtml}
                      ${run.failureReasons.length > 0 ? `
                        <div style="color: #e74c3c; font-size: 11px; margin-top: 4px;">
                          ${run.failureReasons.join(', ')}
                        </div>
                      ` : ''}
                    </div>
                    ${i < result.runs.length - 1 ? '<hr style="margin: 8px 0; border: 0; border-top: 1px solid #dee2e6;">' : ''}
                  `;
                }).join('')}
              </div>
            </details>
            
            <details style="margin-top: 8px;">
              <summary style="font-size: 11px; color: #6c757d;">View JSON Responses</summary>
              ${result.runs.map((run, i) => `
                <details style="margin-left: 12px; margin-top: 4px;">
                  <summary style="font-size: 11px;">Run ${i+1} JSON</summary>
                  <pre class="json-response" style="font-size: 10px; max-height: 200px;">${JSON.stringify(run.output, null, 2)}</pre>
                </details>
              `).join('')}
            </details>
          `;
          
          return `
            <tr>
              <td class="status-icon">${statusIcon}</td>
              <td style="text-align: center;">${runIndicators}</td>
              <td>${result.testCase.category}</td>
              <td class="test-name">${result.testCase.name}</td>
              <td>
                <details>
                  <summary>${result.testCase.input.text.substring(0, 35)}${result.testCase.input.text.length > 35 ? '...' : ''}</summary>
                  <div style="margin-top: 8px;">
                    <code style="display: block; white-space: pre-wrap; font-size: 11px;">${result.testCase.input.text}</code>
                    ${result.testCase.input.context ? `<div class="context-info">Context: ${result.testCase.input.context}</div>` : ''}
                    ${result.testCase.input.strictness ? `<div class="context-info">Strictness: ${result.testCase.input.strictness}</div>` : ''}
                  </div>
                </details>
              </td>
              <td style="font-size: 12px;">${result.testCase.expectedBehavior}</td>
              <td>${resultsHtml}</td>
              <td style="text-align: center;">${consistencyBadge}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <script>
    function filterTests(filter) {
      const buttons = document.querySelectorAll('.filter-btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      const rows = document.querySelectorAll('tbody tr');
      rows.forEach(row => {
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'passed') {
          row.style.display = row.querySelector('.status-icon').textContent.includes('✅') ? '' : 'none';
        } else if (filter === 'failed') {
          row.style.display = row.querySelector('.status-icon').textContent.includes('❌') ? '' : 'none';
        }
      });
    }
  </script>
</body>
</html>`;
}

async function main() {
  console.log("🚀 Starting spelling/grammar tool evaluation...");
  console.log(`📝 Running ${testCases.length} test cases (3 runs each)...`);
  
  const results: TestResult[] = [];
  
  // Run tests in batches to avoid overwhelming the API
  const batchSize = 3; // Smaller batch size since we're doing 3 runs each
  for (let i = 0; i < testCases.length; i += batchSize) {
    const batch = testCases.slice(i, i + batchSize);
    console.log(`\n⏳ Running batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(testCases.length/batchSize)}...`);
    
    const batchResults = await Promise.all(
      batch.map(async (testCase) => {
        console.log(`  Testing: ${testCase.name}`);
        return runTestCase(testCase, 3); // Run each test 3 times
      })
    );
    
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < testCases.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Generate timestamp for filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  
  // Ensure results directory exists
  const resultsDir = path.join(process.cwd(), 'evaluations', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Generate JSON data file
  const jsonData = generateJSONReport(results);
  const jsonPath = path.join(resultsDir, `spelling-grammar-results-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  
  // Generate HTML viewer (only if it doesn't exist)
  const viewerPath = path.join(process.cwd(), 'spelling-grammar-viewer.html');
  if (!fs.existsSync(viewerPath)) {
    const viewerHtml = generateHTMLViewer();
    fs.writeFileSync(viewerPath, viewerHtml);
  }
  
  // Print summary
  const passed = results.filter(r => r.overallPassed).length;
  const failed = results.length - passed;
  const avgConsistency = results.reduce((sum, r) => sum + r.consistencyScore, 0) / results.length;
  
  console.log("\n📊 Evaluation Complete!");
  console.log(`✅ Passed all runs: ${passed}/${results.length} (${((passed/results.length)*100).toFixed(1)}%)`);
  console.log(`❌ Failed any run: ${failed}/${results.length}`);
  console.log(`📈 Average consistency: ${avgConsistency.toFixed(1)}%`);
  console.log(`\n📄 Results saved to: ${jsonPath}`);
  console.log(`\n💡 To view results, run:`);
  console.log(`\nnpx tsx evaluations/scripts/server.ts`);
  console.log(`\nThis will open the evaluation dashboard with all your results!`);
}

function generateHTMLViewer(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Spelling/Grammar Tool Evaluation Viewer</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      margin: 0 20px;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .file-loader {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
      text-align: center;
    }
    input[type="file"] {
      margin: 10px;
    }
    .summary {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
      display: none;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }
    .stat-card {
      background: white;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    .warning { color: #f39c12; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 13px;
      display: none;
    }
    th, td {
      text-align: left;
      padding: 10px;
      border: 1px solid #e0e0e0;
      vertical-align: top;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    tr:hover {
      background: #fafafa;
    }
    .status-icon {
      font-size: 16px;
      text-align: center !important;
    }
    .error-item {
      background: #f8f9fa;
      padding: 6px 8px;
      margin: 4px 0;
      border-radius: 4px;
      font-size: 12px;
      border-left: 3px solid #e0e0e0;
    }
    .error-text {
      color: #d32f2f;
      font-weight: 600;
    }
    .error-correction {
      color: #388e3c;
      font-weight: 600;
    }
    .error-type {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
      margin-left: 6px;
      font-weight: 500;
    }
    .type-spelling {
      background: #e3f2fd;
      color: #1565c0;
    }
    .type-grammar {
      background: #f3e5f5;
      color: #6a1b9a;
    }
    .importance {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
      margin-left: 4px;
      font-weight: 500;
    }
    .importance-low { background: #fff8e1; color: #f57c00; }
    .importance-medium { background: #fff3cd; color: #856404; }
    .importance-high { background: #ffebee; color: #c62828; }
    .filter-buttons {
      margin: 20px 0;
      display: none;
    }
    .filter-btn {
      padding: 8px 16px;
      margin-right: 10px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .filter-btn:hover {
      background: #f8f9fa;
      border-color: #aaa;
    }
    .filter-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }
    details summary {
      cursor: pointer;
      padding: 4px;
      margin: -4px;
      border-radius: 3px;
      font-size: 12px;
      color: #0066cc;
    }
    details summary:hover {
      background: #f0f0f0;
    }
    details[open] summary {
      margin-bottom: 8px;
    }
    code {
      background: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      font-size: 12px;
    }
    pre {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 11px;
      line-height: 1.4;
      margin: 8px 0;
      border: 1px solid #e0e0e0;
    }
    .json-response {
      max-height: 300px;
      overflow-y: auto;
    }
    .no-errors {
      color: #666;
      font-style: italic;
      font-size: 12px;
    }
    .run-indicator {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin: 0 2px;
      font-size: 11px;
      text-align: center;
      line-height: 20px;
      color: white;
      font-weight: bold;
    }
    .run-pass { background: #27ae60; }
    .run-fail { background: #e74c3c; }
    .consistency-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      margin-left: 8px;
    }
    .consistency-perfect { background: #d4edda; color: #155724; }
    .consistency-good { background: #fff3cd; color: #856404; }
    .consistency-poor { background: #f8d7da; color: #721c24; }
    .run-details {
      margin-top: 8px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 12px;
    }
    .run-header {
      font-weight: 600;
      margin-bottom: 4px;
      color: #495057;
    }
    .context-info {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Spelling/Grammar Tool Evaluation Viewer</h1>
    
    <div class="file-loader">
      <h3>Load Evaluation Results</h3>
      <input type="file" id="fileInput" accept=".json" />
      <div id="loadStatus" style="margin-top: 10px; color: #666;"></div>
    </div>
    
    <div id="content" style="display: none;">
      <div class="summary" id="summary"></div>
      
      <div class="filter-buttons" id="filterButtons">
        <button class="filter-btn active" onclick="filterTests('all')">All Tests</button>
        <button class="filter-btn" onclick="filterTests('passed')">Passed Only</button>
        <button class="filter-btn" onclick="filterTests('failed')">Failed Only</button>
        <button class="filter-btn" onclick="filterTests('inconsistent')">Inconsistent Only</button>
      </div>

      <table id="results-table">
        <thead>
          <tr>
            <th style="width: 40px;">Status</th>
            <th style="width: 80px;">Runs</th>
            <th style="width: 100px;">Category</th>
            <th style="width: 150px;">Test Name</th>
            <th style="width: 180px;">Input Text</th>
            <th style="width: 140px;">Expected</th>
            <th style="width: 600px;">Results</th>
            <th style="width: 100px;">Consistency</th>
          </tr>
        </thead>
        <tbody id="results-body">
        </tbody>
      </table>
    </div>
  </div>

  <script>
    let currentData = null;

    document.getElementById('fileInput').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          currentData = JSON.parse(e.target.result);
          document.getElementById('loadStatus').textContent = 'Loaded: ' + file.name;
          document.getElementById('loadStatus').style.color = '#27ae60';
          renderData();
        } catch (err) {
          document.getElementById('loadStatus').textContent = 'Error loading file: ' + err.message;
          document.getElementById('loadStatus').style.color = '#e74c3c';
        }
      };
      reader.readAsText(file);
    });

    function renderData() {
      if (!currentData) return;
      
      document.getElementById('content').style.display = 'block';
      document.querySelector('.summary').style.display = 'block';
      document.querySelector('.filter-buttons').style.display = 'block';
      document.querySelector('table').style.display = 'table';
      
      // Render summary
      const summary = currentData.metadata;
      document.getElementById('summary').innerHTML = \`
        <h2>Summary</h2>
        <p style="color: #666;">Generated: \${summary.timestamp}</p>
        <div class="summary-grid">
          <div class="stat-card">
            <div class="stat-value">\${summary.totalTests}</div>
            <div class="stat-label">Total Tests</div>
          </div>
          <div class="stat-card">
            <div class="stat-value passed">\${summary.passedTests}</div>
            <div class="stat-label">Passed All Runs</div>
          </div>
          <div class="stat-card">
            <div class="stat-value failed">\${summary.failedTests}</div>
            <div class="stat-label">Failed Any Run</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${summary.passRate}%</div>
            <div class="stat-label">Pass Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value \${summary.avgConsistency < 90 ? 'warning' : ''}">\${summary.avgConsistency.toFixed(1)}%</div>
            <div class="stat-label">Avg Consistency</div>
          </div>
          <div class="stat-card">
            <div class="stat-value \${summary.inconsistentTests > 0 ? 'warning' : 'passed'}">\${summary.inconsistentTests}</div>
            <div class="stat-label">Inconsistent Tests</div>
          </div>
        </div>
        
        <h3 style="margin-top: 20px;">Category Breakdown</h3>
        <div class="summary-grid">
          \${Object.entries(summary.categoryStats).map(([category, stats]) => \`
            <div class="stat-card">
              <strong>\${category}</strong>
              <div style="margin-top: 8px;">
                <span class="passed">\${stats.passed}</span> / \${stats.total} passed
                <div style="font-size: 12px; color: #666;">
                  \${((stats.passed / stats.total) * 100).toFixed(0)}% success rate
                </div>
              </div>
            </div>
          \`).join('')}
        </div>
      \`;
      
      // Render table
      renderTable(currentData.results);
    }

    function renderTable(results) {
      const tbody = document.getElementById('results-body');
      tbody.innerHTML = results.map((result, idx) => {
        const statusIcon = result.overallPassed ? '✅' : '❌';
        
        // Generate run indicators
        const runIndicators = result.runs.map((run, i) => 
          \`<span class="run-indicator \${run.passed ? 'run-pass' : 'run-fail'}" title="Run \${i+1}: \${run.passed ? 'Pass' : 'Fail'}">\${i+1}</span>\`
        ).join('');
        
        // Consistency badge
        const consistencyClass = result.consistencyScore === 100 ? 'consistency-perfect' :
                               result.consistencyScore >= 75 ? 'consistency-good' : 'consistency-poor';
        const consistencyBadge = \`<span class="consistency-badge \${consistencyClass}">\${result.consistencyScore}%</span>\`;
        
        // Format results for all runs
        const resultsHtml = \`
          <details>
            <summary>
              \${result.runs[0].errorCount} errors found
              \${result.runs.some((r, i) => r.errorCount !== result.runs[0].errorCount) 
                ? '<span style="color: #f39c12; font-size: 11px;"> (varies)</span>' 
                : ''}
            </summary>
            <div class="run-details">
              \${result.runs.map((run, i) => {
                const errorsHtml = run.errorCount === 0 
                  ? '<span class="no-errors">No errors found</span>'
                  : run.errors.map(error => {
                      const importanceClass = error.importance <= 25 ? 'importance-low' :
                                            error.importance <= 50 ? 'importance-medium' : 'importance-high';
                      return \`
                        <span class="error-text">\${error.text || '?'}</span> → 
                        <span class="error-correction">\${error.correction || '?'}</span>
                        <span class="error-type type-\${error.type}">\${error.type}</span>
                        <span class="importance \${importanceClass}">imp: \${error.importance}</span>
                      \`;
                    }).join('<br>');
                
                return \`
                  <div class="run-header">Run \${i+1} (\${run.duration}ms) \${run.passed ? '✅' : '❌'}</div>
                  <div style="margin-left: 12px;">
                    \${errorsHtml}
                    \${run.failureReasons.length > 0 ? \`
                      <div style="color: #e74c3c; font-size: 11px; margin-top: 4px;">
                        \${run.failureReasons.join(', ')}
                      </div>
                    \` : ''}
                  </div>
                  \${i < result.runs.length - 1 ? '<hr style="margin: 8px 0; border: 0; border-top: 1px solid #dee2e6;">' : ''}
                \`;
              }).join('')}
            </div>
          </details>
        \`;
        
        return \`
          <tr data-passed="\${result.overallPassed}" data-consistency="\${result.consistencyScore}">
            <td class="status-icon">\${statusIcon}</td>
            <td style="text-align: center;">\${runIndicators}</td>
            <td>\${result.testCase.category}</td>
            <td style="font-weight: 600;">\${result.testCase.name}</td>
            <td>
              <details>
                <summary>\${result.testCase.input.text.substring(0, 35)}\${result.testCase.input.text.length > 35 ? '...' : ''}</summary>
                <div style="margin-top: 8px;">
                  <code style="display: block; white-space: pre-wrap; font-size: 11px;">\${result.testCase.input.text}</code>
                  \${result.testCase.input.context ? \`<div class="context-info">Context: \${result.testCase.input.context}</div>\` : ''}
                  \${result.testCase.input.strictness ? \`<div class="context-info">Strictness: \${result.testCase.input.strictness}</div>\` : ''}
                </div>
              </details>
            </td>
            <td style="font-size: 12px;">\${result.testCase.expectedBehavior}</td>
            <td>\${resultsHtml}</td>
            <td style="text-align: center;">\${consistencyBadge}</td>
          </tr>
        \`;
      }).join('');
    }

    function filterTests(filter) {
      if (!currentData) return;
      
      const buttons = document.querySelectorAll('.filter-btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      let filteredResults;
      switch(filter) {
        case 'passed':
          filteredResults = currentData.results.filter(r => r.overallPassed);
          break;
        case 'failed':
          filteredResults = currentData.results.filter(r => !r.overallPassed);
          break;
        case 'inconsistent':
          filteredResults = currentData.results.filter(r => r.consistencyScore < 100);
          break;
        default:
          filteredResults = currentData.results;
      }
      
      renderTable(filteredResults);
    }
  </script>
</body>
</html>`;
}

main().catch(console.error);
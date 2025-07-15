/**
 * Test runner with LLM-based fuzzy matching for epistemic evaluations
 * Handles verification of results that can't be exactly matched
 */

import { createAnthropicClient } from '../../types/openai';
import { ANALYSIS_MODEL } from '../../types/openai';

export interface TestCase<TInput, TExpected> {
  id: string;
  description: string;
  input: TInput;
  expected: TExpected;
  tags?: string[];
}

export interface TestResult {
  testId: string;
  passed: boolean;
  actualOutput: any;
  expectedOutput: any;
  score: number; // 0-1 for fuzzy matches
  reasoning: string;
  error?: string;
}

export interface TestSuite<TInput, TExpected> {
  name: string;
  description: string;
  testCases: TestCase<TInput, TExpected>[];
}

/**
 * Fuzzy match two outputs using LLM evaluation
 */
export async function fuzzyMatch(
  actual: any,
  expected: any,
  context: {
    testDescription: string;
    inputDescription: string;
    matchingCriteria?: string;
  }
): Promise<{ matches: boolean; score: number; reasoning: string }> {
  
  const systemPrompt = `You are a test evaluator. Your job is to determine if an actual output matches an expected output, allowing for reasonable variations.

MATCHING CRITERIA:
- Content correctness is more important than exact wording
- Allow for different phrasings that convey the same meaning
- Consider numerical approximations (e.g., 2.71 vs 2.718 for e)
- Error categories should match (e.g., "calculation error" vs "arithmetic error" are similar)
- Severity levels should be roughly equivalent
- Sources and evidence should be comparable in quality/reliability

SCORING SCALE:
- 1.0: Perfect match or equivalent meaning
- 0.8-0.9: Very close match with minor differences
- 0.6-0.7: Similar meaning with some differences
- 0.4-0.5: Partially correct but missing key elements  
- 0.2-0.3: Some similarities but significant differences
- 0.0-0.1: No meaningful match

OUTPUT: Use the evaluation tool to provide your assessment.`;

  const userPrompt = `Test: ${context.testDescription}
Input: ${context.inputDescription}

EXPECTED OUTPUT:
${JSON.stringify(expected, null, 2)}

ACTUAL OUTPUT:
${JSON.stringify(actual, null, 2)}

${context.matchingCriteria ? `Additional criteria: ${context.matchingCriteria}` : ''}

Evaluate if the actual output matches the expected output according to the criteria.`;

  try {
    const anthropic = createAnthropicClient();
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1000,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [{
        name: "evaluate_match",
        description: "Evaluate if actual output matches expected output",
        input_schema: {
          type: "object",
          properties: {
            matches: {
              type: "boolean",
              description: "True if outputs match within acceptable tolerance"
            },
            score: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Numerical score from 0-1 indicating match quality"
            },
            reasoning: {
              type: "string",
              description: "Detailed explanation of the evaluation"
            }
          },
          required: ["matches", "score", "reasoning"]
        }
      }],
      tool_choice: { type: "tool", name: "evaluate_match" }
    });

    const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
    if (toolUse?.input) {
      return toolUse.input;
    }
    
    throw new Error("No tool use in response");
    
  } catch (error) {
    console.error('Fuzzy match evaluation failed:', error);
    return {
      matches: false,
      score: 0,
      reasoning: `Evaluation failed: ${error}`
    };
  }
}

/**
 * Run a test case with fuzzy matching
 */
export async function runTestCase<TInput, TExpected>(
  testCase: TestCase<TInput, TExpected>,
  testFunction: (input: TInput) => Promise<any>,
  options: {
    useExactMatch?: boolean;
    matchingCriteria?: string;
    timeout?: number;
  } = {}
): Promise<TestResult> {
  
  console.log(`\n🧪 Running test: ${testCase.id}`);
  console.log(`   ${testCase.description}`);
  
  try {
    // Run the actual test function
    const startTime = Date.now();
    const actualOutput = await Promise.race([
      testFunction(testCase.input),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), options.timeout || 30000)
      )
    ]);
    const duration = Date.now() - startTime;
    
    console.log(`   ⏱️  Completed in ${duration}ms`);
    
    // Determine if outputs match
    let matches: boolean;
    let score: number;
    let reasoning: string;
    
    if (options.useExactMatch) {
      // Exact JSON comparison
      const exactMatch = JSON.stringify(actualOutput) === JSON.stringify(testCase.expected);
      matches = exactMatch;
      score = exactMatch ? 1.0 : 0.0;
      reasoning = exactMatch ? "Exact match" : "Outputs differ";
    } else {
      // Fuzzy LLM-based comparison
      console.log(`   🤖 Evaluating with LLM...`);
      const fuzzyResult = await fuzzyMatch(actualOutput, testCase.expected, {
        testDescription: testCase.description,
        inputDescription: JSON.stringify(testCase.input),
        matchingCriteria: options.matchingCriteria
      });
      
      matches = fuzzyResult.matches;
      score = fuzzyResult.score;
      reasoning = fuzzyResult.reasoning;
    }
    
    console.log(`   ${matches ? '✅' : '❌'} ${matches ? 'PASS' : 'FAIL'} (score: ${score.toFixed(2)})`);
    console.log(`   📝 ${reasoning}`);
    
    return {
      testId: testCase.id,
      passed: matches,
      actualOutput,
      expectedOutput: testCase.expected,
      score,
      reasoning
    };
    
  } catch (error) {
    console.log(`   💥 ERROR: ${error}`);
    
    return {
      testId: testCase.id,
      passed: false,
      actualOutput: null,
      expectedOutput: testCase.expected,
      score: 0,
      reasoning: `Test execution failed: ${error}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run a complete test suite
 */
export async function runTestSuite<TInput, TExpected>(
  suite: TestSuite<TInput, TExpected>,
  testFunction: (input: TInput) => Promise<any>,
  options: {
    useExactMatch?: boolean;
    matchingCriteria?: string;
    timeout?: number;
    filter?: string[]; // Run only tests with these IDs
  } = {}
): Promise<{
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageScore: number;
  };
  results: TestResult[];
}> {
  
  console.log(`\n🧪 Running Test Suite: ${suite.name}`);
  console.log(`📋 ${suite.description}`);
  console.log(`📊 ${suite.testCases.length} test cases`);
  
  const results: TestResult[] = [];
  let totalScore = 0;
  
  const testCasesToRun = options.filter 
    ? suite.testCases.filter(tc => options.filter!.includes(tc.id))
    : suite.testCases;
  
  for (let i = 0; i < testCasesToRun.length; i++) {
    const testCase = testCasesToRun[i];
    
    try {
      const result = await runTestCase(testCase, testFunction, options);
      results.push(result);
      totalScore += result.score;
      
      // Small delay between tests
      if (i < testCasesToRun.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`Failed to run test ${testCase.id}:`, error);
      results.push({
        testId: testCase.id,
        passed: false,
        actualOutput: null,
        expectedOutput: testCase.expected,
        score: 0,
        reasoning: `Test suite error: ${error}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const averageScore = totalScore / results.length;
  
  console.log(`\n📊 Test Suite Results:`);
  console.log(`   ✅ Passed: ${passed}/${results.length}`);
  console.log(`   ❌ Failed: ${failed}/${results.length}`);
  console.log(`   📈 Average Score: ${averageScore.toFixed(2)}`);
  console.log(`   🎯 Pass Rate: ${(passed / results.length * 100).toFixed(1)}%`);
  
  return {
    summary: {
      total: results.length,
      passed,
      failed,
      averageScore
    },
    results
  };
}

/**
 * Display detailed test results
 */
export function displayDetailedResults(results: TestResult[], showOnlyFailures = false) {
  console.log(`\n📋 Detailed Test Results:`);
  
  results.forEach(result => {
    if (showOnlyFailures && result.passed) return;
    
    console.log(`\n${result.passed ? '✅' : '❌'} ${result.testId} (score: ${result.score.toFixed(2)})`);
    console.log(`   Reasoning: ${result.reasoning}`);
    
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (!result.passed) {
      console.log(`   Expected: ${JSON.stringify(result.expectedOutput, null, 2)}`);
      console.log(`   Actual: ${JSON.stringify(result.actualOutput, null, 2)}`);
    }
  });
}
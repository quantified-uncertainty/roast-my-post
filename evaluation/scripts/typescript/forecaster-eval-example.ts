/**
 * Example: Using Opik to evaluate the Forecaster tool
 * 
 * This demonstrates a simple setup that:
 * 1. Creates a dataset of test cases
 * 2. Runs evaluations to measure quality
 * 3. Provides data for Claude Code to iterate on
 */

import { quickEvaluate, ToolEvaluator, EvaluationDataPoint } from './opik-setup';
import forecasterTool from '../forecaster';

// Example test cases - in practice, you'd load these from a file or database
const FORECASTER_TEST_CASES: EvaluationDataPoint[] = [
  {
    input: {
      question: "Will AI achieve AGI by 2030?",
      numForecasts: 3
    },
    expectedOutput: {
      probability: 35, // Expected range: 25-45
      consensus: 'medium',
      // We don't need exact match on all fields
    },
    qualityScore: 1.0,
    metadata: {
      tags: ['ai', 'timeline', 'agi'],
      evaluatorNotes: 'Should reflect current expert consensus around 30-40%'
    }
  },
  {
    input: {
      question: "Will the S&P 500 be higher in 6 months?",
      context: "Current economic indicators show mixed signals",
      numForecasts: 3
    },
    expectedOutput: {
      probability: 55, // Expected range: 45-65
      consensus: 'medium',
    },
    qualityScore: 1.0,
    metadata: {
      tags: ['finance', 'markets'],
      evaluatorNotes: 'Should show slight bullish bias typical of markets'
    }
  },
  {
    input: {
      question: "Will it rain tomorrow?",
      numForecasts: 3
    },
    expectedOutput: {
      probability: 50, // Should indicate uncertainty without weather data
      consensus: 'low',
    },
    qualityScore: 1.0,
    metadata: {
      tags: ['weather', 'no-context'],
      evaluatorNotes: 'Without location/data, should default to high uncertainty'
    }
  }
];

/**
 * Custom evaluator with domain-specific quality scoring
 */
class ForecasterEvaluator extends ToolEvaluator {
  protected calculateQualityScore(actual: any, expected: any): number {
    if (!actual || !expected) return 0;
    
    let score = 0;
    let factors = 0;
    
    // Check probability is within reasonable range
    if (actual.probability !== undefined && expected.probability !== undefined) {
      const diff = Math.abs(actual.probability - expected.probability);
      // Allow 10% deviation
      if (diff <= 10) {
        score += 1.0;
      } else if (diff <= 20) {
        score += 0.5;
      }
      factors++;
    }
    
    // Check consensus matches
    if (actual.consensus === expected.consensus) {
      score += 1.0;
      factors++;
    } else if (
      (actual.consensus === 'medium' && expected.consensus === 'high') ||
      (actual.consensus === 'high' && expected.consensus === 'medium') ||
      (actual.consensus === 'medium' && expected.consensus === 'low') ||
      (actual.consensus === 'low' && expected.consensus === 'medium')
    ) {
      score += 0.5; // Adjacent consensus levels
      factors++;
    } else {
      factors++;
    }
    
    // Check that individual forecasts exist and are reasonable
    if (actual.individualForecasts && actual.individualForecasts.length > 0) {
      score += 0.5;
      factors += 0.5;
    }
    
    return factors > 0 ? score / factors : 0;
  }
}

/**
 * Run a simple evaluation
 */
export async function runForecasterEvaluation() {
  console.log('🧪 Running Forecaster Tool Evaluation with Opik\n');
  
  const evaluator = new ForecasterEvaluator(forecasterTool);
  
  // Create dataset
  const datasetId = await evaluator.createDataset(
    'forecaster-baseline-v1',
    FORECASTER_TEST_CASES
  );
  
  console.log(`📊 Created dataset: ${datasetId}\n`);
  
  // Run evaluation
  const report = await evaluator.evaluate(datasetId);
  
  console.log('📈 Evaluation Results:');
  console.log(`- Success Rate: ${((report.successfulCases / report.totalCases) * 100).toFixed(1)}%`);
  console.log(`- Average Quality: ${report.averageQuality.toFixed(2)}/1.0`);
  console.log(`\n${report.summary}`);
  
  // Show specific results
  console.log('\n📋 Detailed Results:');
  report.results.forEach((result, i) => {
    console.log(`\nTest Case ${i + 1}:`);
    console.log(`  Input: ${result.input.question}`);
    console.log(`  Expected probability: ${result.expectedOutput.probability}%`);
    console.log(`  Actual probability: ${result.actualOutput?.probability}%`);
    console.log(`  Quality Score: ${result.qualityScore.toFixed(2)}`);
  });
  
  return report;
}

/**
 * Script for Claude Code to iterate on improvements
 */
export async function improveToolWithEvals() {
  const evaluator = new ForecasterEvaluator(forecasterTool);
  
  // Get baseline performance
  const baseline = await runForecasterEvaluation();
  
  console.log('\n🤖 Claude Code can now:');
  console.log('1. Analyze failing test cases');
  console.log('2. Modify tool implementation');
  console.log('3. Re-run evaluation to measure improvement');
  console.log('4. Repeat until quality targets are met');
  
  // Save results for Claude Code to analyze
  const fs = require('fs').promises;
  await fs.writeFile(
    'forecaster-eval-results.json',
    JSON.stringify({
      baseline,
      failingCases: baseline.results.filter(r => r.qualityScore < 0.7),
      improvementTargets: {
        successRate: 0.95,
        averageQuality: 0.85
      }
    }, null, 2)
  );
  
  console.log('\n📝 Results saved to forecaster-eval-results.json');
}

// Quick test - uncomment to run
// runForecasterEvaluation().catch(console.error);
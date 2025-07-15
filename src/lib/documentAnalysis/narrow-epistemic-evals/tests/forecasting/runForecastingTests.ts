#!/usr/bin/env tsx
/**
 * Forecasting test runner
 */

import { extractForecasts, generateForecast, getForecast } from '../../forecaster';
import { runTestSuite, displayDetailedResults } from '../shared/testRunner';
import { 
  forecastExtractionTestSuite,
  forecastGenerationTestSuite,
  forecastEdgeCasesTestSuite,
  type ForecastExtractionInput,
  type ForecastGenerationInput,
  type ForecastExtractionExpected,
  type ForecastGenerationExpected
} from './forecastingTestCases';

/**
 * Run forecast extraction analysis
 */
async function runForecastExtraction(input: ForecastExtractionInput): Promise<any> {
  const forecasts = await extractForecasts(input.text);
  
  return {
    forecastsFound: forecasts.length,
    forecasts: forecasts.map(f => ({
      text: f.text,
      topic: f.topic,
      probability: f.probability,
      timeframe: f.timeframe
    }))
  };
}

/**
 * Run forecast generation analysis
 */
async function runForecastGeneration(input: ForecastGenerationInput): Promise<any> {
  const result = await generateForecast({
    question: input.question,
    context: input.context,
    timeframe: input.timeframe
  });
  
  return {
    probability: result.forecast.probability,
    confidence: result.forecast.confidence,
    description: result.forecast.description,
    individualForecasts: result.individual_forecasts,
    statistics: result.statistics,
    outliersRemoved: result.outliers_removed.length
  };
}

/**
 * Run all forecasting test suites
 */
async function runAllForecastingTests() {
  console.log('🔮 Forecasting Test Suite');
  console.log('========================\n');
  
  const allResults = [];
  
  // Run forecast extraction tests
  console.log('\n' + '='.repeat(60));
  const extractionResults = await runTestSuite(
    forecastExtractionTestSuite,
    runForecastExtraction,
    {
      useExactMatch: false,
      matchingCriteria: `
        Focus on:
        - Correct count of forecasts extracted
        - Topics should include the specified keywords
        - Probability ranges should capture the stated probability
        - Timeframe detection should be accurate
        - Differentiate between predictions and historical statements
      `,
      timeout: 30000
    }
  );
  allResults.push(extractionResults);
  
  // Run forecast generation tests
  console.log('\n' + '='.repeat(60));
  const generationResults = await runTestSuite(
    forecastGenerationTestSuite,
    runForecastGeneration,
    {
      useExactMatch: false,
      matchingCriteria: `
        Focus on:
        - Probability should fall within the expected range
        - Confidence level should match expected (or 'any' if flexible)
        - Description should mention "6 independent analyses"
        - Description should contain required phrases
        - Key factors should be relevant to the question
        - Statistics should show outlier removal working properly
      `,
      timeout: 180000 // 3 minutes per test (6 Claude calls each)
    }
  );
  allResults.push(generationResults);
  
  // Run edge case tests
  console.log('\n' + '='.repeat(60));
  const edgeResults = await runTestSuite(
    forecastEdgeCasesTestSuite,
    runForecastGeneration,
    {
      useExactMatch: false,
      matchingCriteria: `
        Edge cases should:
        - Handle ambiguous questions with appropriate uncertainty
        - Show low confidence for unclear resolution criteria
        - Recognize historical facts vs future predictions
        - Deal with paradoxical questions gracefully
        - Show disagreement in description when forecasts vary widely
      `,
      timeout: 180000
    }
  );
  allResults.push(edgeResults);
  
  // Overall summary
  console.log('\n' + '='.repeat(80));
  console.log('OVERALL FORECASTING SUMMARY');
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
  const suiteNames = ['Forecast Extraction', 'Forecast Generation', 'Edge Cases'];
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
  
  console.log(`\n💡 Implementation Notes:`);
  console.log(`   - Each forecast generation makes 6 independent Claude calls`);
  console.log(`   - Outliers are removed using IQR method`);
  console.log(`   - Confidence is based on agreement and standard deviation`);
  console.log(`   - Extraction looks for probability words and future tense`);
  console.log(`   - The clean getForecast() function provides simple interface`);
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    avgScore,
    suiteResults: allResults
  };
}

/**
 * Demo the clean forecast function
 */
async function demoCleanForecast() {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 DEMO: Clean Forecast Function');
  console.log('='.repeat(80));
  
  const examples = [
    {
      question: "Will Bitcoin reach $100,000 by end of 2025?",
      context: "Current price is around $45,000 with increasing institutional adoption",
      timeframe: "By December 31, 2025"
    },
    {
      question: "Will we see a major breakthrough in quantum computing in 2025?",
      context: "Several companies are approaching quantum advantage milestones",
      timeframe: "During 2025"
    }
  ];
  
  for (const example of examples) {
    console.log(`\n📌 Question: ${example.question}`);
    if (example.context) console.log(`   Context: ${example.context}`);
    if (example.timeframe) console.log(`   Timeframe: ${example.timeframe}`);
    
    try {
      const forecast = await getForecast(
        example.question,
        example.context,
        example.timeframe
      );
      
      console.log(`\n   🎯 Forecast: ${forecast.probability}%`);
      console.log(`   📝 ${forecast.description}`);
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }
}

/**
 * Run specific test suite by name
 */
async function runSpecificSuite(suiteName: string) {
  console.log(`🔮 Running ${suiteName} Forecasting Suite\n`);
  
  let suite;
  let testFunction;
  
  switch (suiteName.toLowerCase()) {
    case 'extraction':
      suite = forecastExtractionTestSuite;
      testFunction = runForecastExtraction;
      break;
    case 'generation':
      suite = forecastGenerationTestSuite;
      testFunction = runForecastGeneration;
      break;
    case 'edge':
      suite = forecastEdgeCasesTestSuite;
      testFunction = runForecastGeneration;
      break;
    default:
      console.error(`Unknown suite: ${suiteName}`);
      console.log('Available suites: extraction, generation, edge');
      process.exit(1);
  }
  
  const timeout = suiteName.toLowerCase() === 'extraction' ? 30000 : 180000;
  const results = await runTestSuite(suite, testFunction, {
    useExactMatch: false,
    timeout
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
    if (args[0] === 'demo') {
      // Run demo of clean function
      await demoCleanForecast();
    } else {
      // Run specific suite
      const suiteName = args[0];
      await runSpecificSuite(suiteName);
    }
  } else {
    // Run all suites
    await runAllForecastingTests();
  }
}

// Handle errors gracefully
main().catch(error => {
  console.error('\n💥 Forecasting test execution failed:', error);
  process.exit(1);
});
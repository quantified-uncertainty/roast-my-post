#!/usr/bin/env tsx
/**
 * Forecasting test runner
 */

// Test the actual tool instead of legacy functions  
import forecasterTool from './index';
import { generateForecastWithAggregation } from './generator';
import { runTestSuite, displayDetailedResults } from '../base/testRunner';
import { 
  forecastExtractionTestSuite,
  forecastGenerationTestSuite,
  forecastEdgeCasesTestSuite,
  type ForecastExtractionInput,
  type ForecastGenerationInput,
  type ForecastExtractionExpected,
  type ForecastGenerationExpected
} from './forecastingTestCases';
import { logger } from '@/lib/logger';

/**
 * Run forecast extraction analysis
 * NOTE: This is a simulation for testing since the current tool doesn't include extraction
 */
async function runForecastExtraction(input: ForecastExtractionInput): Promise<any> {
  // This is a mock/simulation function for testing purposes
  // In a real implementation, this would analyze text and extract forecast-like statements
  console.log('⚠️  Forecast extraction is simulated for testing - no actual extraction implemented');
  
  // Simple pattern matching simulation for testing
  const text = input.text.toLowerCase();
  const forecasts = [];
  
  // Look for probability patterns
  const probabilityMatches = text.match(/(\d+)%/g) || [];
  const hasTimeframe = /\d{4}|next|by|within|before|after|decade|year|month/.test(text);
  
  if (probabilityMatches.length > 0 || hasTimeframe) {
    forecasts.push({
      text: input.text.substring(0, 100) + '...',
      topic: 'extracted_topic',
      probability: probabilityMatches.length > 0 ? parseInt(probabilityMatches[0]?.replace('%', '') || '0') : null,
      timeframe: hasTimeframe ? 'detected' : null
    });
  }
  
  return {
    forecastsFound: forecasts.length,
    forecasts: forecasts
  };
}

/**
 * Run forecast generation analysis using the actual forecaster tool
 */
async function runForecastGeneration(input: ForecastGenerationInput): Promise<any> {
  // Use the actual forecaster tool through its execute method
  const toolContext = {
    userId: 'test-user',
    logger: logger
  };
  
  const result = await forecasterTool.execute({
    question: input.question,
    context: input.context,
    numForecasts: 6, // Default number of forecasts
    usePerplexity: false // Disable Perplexity for tests to avoid external API calls
  }, toolContext);
  
  return {
    probability: result.probability,
    consensus: result.consensus,
    description: result.description,
    individualForecasts: result.individualForecasts,
    statistics: result.statistics,
    outliersRemoved: 0 // This info is not exposed in the tool's output
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
  console.log(`   - Each forecast generation makes 6 independent Claude calls by default`);
  console.log(`   - Outliers are removed using IQR method in generateForecastWithAggregation`);
  console.log(`   - Consensus level is based on standard deviation of forecasts`);
  console.log(`   - Forecast extraction is simulated for testing (not implemented in tool)`);
  console.log(`   - The ForecasterTool class provides the main interface`);
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    avgScore,
    suiteResults: allResults
  };
}

/**
 * Demo the forecaster tool
 */
async function demoCleanForecast() {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 DEMO: Forecaster Tool');
  console.log('='.repeat(80));
  
  const toolContext = {
    userId: 'demo-user',
    logger: logger
  };
  
  const examples = [
    {
      question: "Will Bitcoin reach $100,000 by end of 2025?",
      context: "Current price is around $45,000 with increasing institutional adoption"
    },
    {
      question: "Will we see a major breakthrough in quantum computing in 2025?",
      context: "Several companies are approaching quantum advantage milestones"
    }
  ];
  
  for (const example of examples) {
    console.log(`\n📌 Question: ${example.question}`);
    if (example.context) console.log(`   Context: ${example.context}`);
    
    try {
      const forecast = await forecasterTool.execute({
        question: example.question,
        context: example.context,
        numForecasts: 3, // Fewer forecasts for demo speed
        usePerplexity: false
      }, toolContext);
      
      console.log(`\n   🎯 Forecast: ${forecast.probability}% (${forecast.consensus} consensus)`);
      console.log(`   📝 ${forecast.description}`);
      console.log(`   📊 Individual forecasts: ${forecast.individualForecasts.map(f => f.probability + '%').join(', ')}`);
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
  
  const timeout = suiteName.toLowerCase() === 'extraction' ? 30000 : 180000;
  let results;
  
  switch (suiteName.toLowerCase()) {
    case 'extraction':
      results = await runTestSuite(forecastExtractionTestSuite, runForecastExtraction, {
        useExactMatch: false,
        timeout
      });
      break;
    case 'generation':
      results = await runTestSuite(forecastGenerationTestSuite, runForecastGeneration, {
        useExactMatch: false,
        timeout
      });
      break;
    case 'edge':
      results = await runTestSuite(forecastEdgeCasesTestSuite, runForecastGeneration, {
        useExactMatch: false,
        timeout
      });
      break;
    default:
      console.error(`Unknown suite: ${suiteName}`);
      console.log('Available suites: extraction, generation, edge');
      process.exit(1);
  }
  
  if (results && results.summary.failed > 0) {
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
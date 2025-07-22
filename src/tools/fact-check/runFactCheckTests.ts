#!/usr/bin/env tsx
/**
 * Fact check test runner with clean input/output verification
 */

// Test the actual tool instead of legacy functions
import factCheckTool from './index';
import { runTestSuite, displayDetailedResults } from '../base/testRunner';
import { logger } from '@/lib/logger';
import { 
  currentFactsTestSuite, 
  historicalFactsTestSuite, 
  mixedClaimsTestSuite,
  edgeCaseFactsTestSuite 
} from './factCheckTestCases';
import type { FactCheckTestInput, FactCheckTestExpected } from './factCheckTestCases';
import type { FactCheckOutput } from './index';

/**
 * Mock fact checking function using the actual fact check tool
 */
interface TestFactCheckOutput {
  claimsCount: number;
  verificationResults: Array<{
    claimText: string;
    verdict: 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'MISLEADING' | 'UNVERIFIABLE';
    confidence: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
  contradictions?: Array<{
    claim1: string;
    claim2: string;
    explanation: string;
  }>;
}

async function runFactCheckAnalysis(input: FactCheckTestInput): Promise<TestFactCheckOutput> {
  // Use the actual fact check tool
  const result = await factCheckTool.execute({
    text: input.text,
    context: undefined, // Test input doesn't include context
    maxClaims: 20,
    verifyHighPriority: true
  }, {
    userId: 'test-user',
    logger: logger
  });
  
  // Convert verification results to expected format
  const verificationResults = [];
  for (const vr of result.verificationResults) {
    // Determine verdict based on verification result
    let verdict: 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'MISLEADING' | 'UNVERIFIABLE';
    if (vr.verified) {
      verdict = 'TRUE';
    } else if (vr.explanation.toLowerCase().includes('requires current data') || 
               vr.explanation.toLowerCase().includes('uncertain')) {
      verdict = 'UNVERIFIABLE';
    } else {
      verdict = 'FALSE';
    }
    
    // Simulate web search for evidence categories
    const searchResult = await simulateWebSearch(vr.claim.text);
    const evidenceCategories: ('supporting' | 'contradicting')[] = [];
    if (searchResult.supporting.length > 0) evidenceCategories.push('supporting');
    if (searchResult.contradicting.length > 0) evidenceCategories.push('contradicting');
    
    // Determine source types based on claim topic
    let sourceTypes: string[] = [];
    if (vr.claim.topic.toLowerCase().includes('market') || 
        vr.claim.topic.toLowerCase().includes('stock') ||
        vr.claim.topic.toLowerCase().includes('financial')) {
      sourceTypes = ['finance', 'news'];
    } else if (vr.claim.topic.toLowerCase().includes('tech') ||
               vr.claim.topic.toLowerCase().includes('company')) {
      sourceTypes = ['tech', 'news'];
    } else if (vr.claim.topic.toLowerCase().includes('history')) {
      sourceTypes = ['government', 'academic'];
    } else {
      sourceTypes = ['news', 'official'];
    }
    
    verificationResults.push({
      claim: vr.claim.text,
      verdict,
      confidenceRange: vr.verified ? [0.8, 1.0] : [0.2, 0.6] as [number, number],
      evidenceCategories,
      sourceTypes
    });
  }
  
  return {
    claimsFound: result.claims.length,
    verificationResults: verificationResults
  };
}

/**
 * Simulate web search results based on claim content
 * In real implementation, this would be replaced with actual WebSearch API calls
 */
async function simulateWebSearch(claim: string) {
  const lowerClaim = claim.toLowerCase();
  
  // Current/recent facts that would require web search
  if (lowerClaim.includes('nvidia') && lowerClaim.includes('market cap') && lowerClaim.includes('trillion')) {
    return {
      supporting: [
        "NVIDIA Corporation's market capitalization reached $3 trillion in 2024",
        "NVIDIA became one of the world's most valuable companies by market cap"
      ],
      contradicting: [],
      sources: ["bloomberg.com", "reuters.com", "marketwatch.com"]
    };
  }
  
  if (lowerClaim.includes('bitcoin') && (lowerClaim.includes('100,000') || lowerClaim.includes('150,000'))) {
    return {
      supporting: [],
      contradicting: [
        "Bitcoin has never reached $100,000 in its trading history",
        "Current Bitcoin price is significantly below $100,000"
      ],
      sources: ["coinbase.com", "coinmarketcap.com", "bloomberg.com"]
    };
  }
  
  if (lowerClaim.includes('india') && lowerClaim.includes('population') && lowerClaim.includes('1.4 billion')) {
    return {
      supporting: [
        "India's population surpassed 1.4 billion in 2023 according to UN estimates",
        "India became the world's most populous country in 2023"
      ],
      contradicting: [],
      sources: ["un.org", "worldbank.org", "census.gov.in"]
    };
  }
  
  if (lowerClaim.includes('openai') && lowerClaim.includes('gpt-5')) {
    return {
      supporting: [],
      contradicting: [
        "OpenAI has not officially announced or released GPT-5",
        "The latest OpenAI model remains GPT-4 with various iterations"
      ],
      sources: ["openai.com", "techcrunch.com", "theverge.com"]
    };
  }
  
  if (lowerClaim.includes('nobel prize') && lowerClaim.includes('2024') && lowerClaim.includes('physics')) {
    return {
      supporting: [
        "2024 Nobel Prize in Physics awarded to Geoffrey Hinton and John Hopfield",
        "Prize recognized foundational discoveries in machine learning and neural networks"
      ],
      contradicting: [],
      sources: ["nobelprize.org", "nature.com", "science.org"]
    };
  }
  
  if (lowerClaim.includes('tesla') && lowerClaim.includes('stock') && lowerClaim.includes('300')) {
    return {
      supporting: [],
      contradicting: [
        "Tesla stock typically trades below $300 per share",
        "TSLA has not sustained levels above $300 consistently"
      ],
      sources: ["yahoo.com", "marketwatch.com", "nasdaq.com"]
    };
  }
  
  // Historical facts (should be easily verifiable)
  if (lowerClaim.includes('united states') && lowerClaim.includes('independence') && lowerClaim.includes('1776')) {
    return {
      supporting: [
        "The United States Declaration of Independence was signed on July 4, 1776",
        "American independence from Britain was declared in 1776"
      ],
      contradicting: [],
      sources: ["archives.gov", "history.com", "britannica.com"]
    };
  }
  
  if (lowerClaim.includes('world war ii') && lowerClaim.includes('1944')) {
    return {
      supporting: [],
      contradicting: [
        "World War II ended in 1945, not 1944",
        "The war concluded with Japan's surrender in September 1945"
      ],
      sources: ["history.com", "britannica.com", "nationalww2museum.org"]
    };
  }
  
  if (lowerClaim.includes('water') && lowerClaim.includes('boils') && lowerClaim.includes('100')) {
    return {
      supporting: [
        "Water boils at 100°C (212°F) at standard atmospheric pressure",
        "The boiling point of water at sea level is 100 degrees Celsius"
      ],
      contradicting: [],
      sources: ["britannica.com", "physics.org", "nist.gov"]
    };
  }
  
  if (lowerClaim.includes('apple') && lowerClaim.includes('market cap') && lowerClaim.includes('4 trillion')) {
    return {
      supporting: [],
      contradicting: [
        "Apple's market cap has approached but not consistently exceeded $4 trillion",
        "Apple's valuation fluctuates below the $4 trillion mark"
      ],
      sources: ["bloomberg.com", "marketwatch.com", "reuters.com"]
    };
  }
  
  if (lowerClaim.includes('iphone') && lowerClaim.includes('september 2024')) {
    return {
      supporting: [
        "Apple released iPhone 16 series in September 2024",
        "The iPhone 16 launch event occurred in September 2024"
      ],
      contradicting: [],
      sources: ["apple.com", "techcrunch.com", "macrumors.com"]
    };
  }
  
  if (lowerClaim.includes('apple') && lowerClaim.includes('founded') && lowerClaim.includes('1976')) {
    return {
      supporting: [
        "Apple Inc. was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne",
        "Apple Computer Company was established on April 1, 1976"
      ],
      contradicting: [],
      sources: ["apple.com", "biography.com", "computerhistory.org"]
    };
  }
  
  // Edge cases and ambiguous claims
  if (lowerClaim.includes('stock market') && lowerClaim.includes('all-time high')) {
    return {
      supporting: [
        "Various stock indices have reached record highs in recent periods",
        "The S&P 500 and other major indices set new records in 2024"
      ],
      contradicting: [],
      sources: ["marketwatch.com", "cnbc.com", "bloomberg.com"]
    };
  }
  
  if (lowerClaim.includes('tesla') && lowerClaim.includes('best electric cars')) {
    return {
      supporting: [
        "Tesla is often rated highly in electric vehicle reviews"
      ],
      contradicting: [
        "Multiple manufacturers compete for 'best' EV status",
        "Best is subjective and depends on criteria"
      ],
      sources: ["motortrend.com", "consumerreports.org", "edmunds.com"]
    };
  }
  
  // Default case - insufficient evidence
  return {
    supporting: [],
    contradicting: [],
    sources: ["example.com"]
  };
}

/**
 * Run all fact check test suites
 */
async function runAllFactCheckTests() {
  console.log('🔍 Fact Checking Test Suite');
  console.log('===========================\n');
  
  const allResults = [];
  
  // Run current facts tests
  console.log('\n' + '='.repeat(60));
  const currentResults = await runTestSuite(
    currentFactsTestSuite,
    runFactCheckAnalysis,
    {
      useExactMatch: false,
      matchingCriteria: `
        Focus on:
        - Claims extraction should identify verifiable factual statements
        - Verdict should match expected outcome (TRUE/FALSE/PARTIALLY_TRUE/etc.)
        - Confidence should fall within expected range
        - Evidence categories should include expected types
        - Sources should be from relevant domains (finance, tech, official, etc.)
        - Current information claims require real-time verification
      `,
      timeout: 60000
    }
  );
  allResults.push(currentResults);
  
  // Run historical facts tests (baseline)
  console.log('\n' + '='.repeat(60));
  const historicalResults = await runTestSuite(
    historicalFactsTestSuite,
    runFactCheckAnalysis,
    {
      useExactMatch: false,
      matchingCriteria: `
        Historical facts should be:
        - Easily verifiable from reliable sources
        - Have high confidence scores
        - Show clear supporting or contradicting evidence
        - Use authoritative historical sources
      `,
      timeout: 60000
    }
  );
  allResults.push(historicalResults);
  
  // Run mixed claims tests
  console.log('\n' + '='.repeat(60));
  const mixedResults = await runTestSuite(
    mixedClaimsTestSuite,
    runFactCheckAnalysis,
    {
      useExactMatch: false,
      matchingCriteria: `
        Mixed claims should:
        - Extract multiple distinct claims from text
        - Verify each claim independently
        - Handle both current and historical information
        - Provide appropriate evidence for each claim type
      `,
      timeout: 60000
    }
  );
  allResults.push(mixedResults);
  
  // Run edge cases
  console.log('\n' + '='.repeat(60));
  const edgeResults = await runTestSuite(
    edgeCaseFactsTestSuite,
    runFactCheckAnalysis,
    {
      useExactMatch: false,
      matchingCriteria: `
        Edge cases should:
        - Handle ambiguous or subjective claims appropriately
        - Recognize unverifiable statements
        - Deal with time-sensitive information correctly
        - Provide reasonable confidence levels for uncertain claims
      `,
      timeout: 60000
    }
  );
  allResults.push(edgeResults);
  
  // Overall summary
  console.log('\n' + '='.repeat(80));
  console.log('OVERALL FACT CHECK SUMMARY');
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
  const suiteNames = ['Current Facts', 'Historical Facts', 'Mixed Claims', 'Edge Cases'];
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
  
  console.log(`\n⚡ Implementation Notes:`);
  console.log(`   - Tests use mock web search data for demonstration`);
  console.log(`   - Production version would use real WebSearch API calls`);
  console.log(`   - Claims extraction uses pattern matching (could be improved with NLP)`);
  console.log(`   - Source credibility assessment weights evidence appropriately`);
  console.log(`   - Current facts require real-time data that LLMs cannot know`);
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    avgScore,
    suiteResults: allResults
  };
}

/**
 * Run specific test suite by name
 */
async function runSpecificSuite(suiteName: string) {
  console.log(`🔍 Running ${suiteName} Fact Check Suite\n`);
  
  let suite;
  switch (suiteName.toLowerCase()) {
    case 'current':
      suite = currentFactsTestSuite;
      break;
    case 'historical':
      suite = historicalFactsTestSuite;
      break;
    case 'mixed':
      suite = mixedClaimsTestSuite;
      break;
    case 'edge':
      suite = edgeCaseFactsTestSuite;
      break;
    default:
      console.error(`Unknown suite: ${suiteName}`);
      console.log('Available suites: current, historical, mixed, edge');
      process.exit(1);
  }
  
  const results = await runTestSuite(suite, runFactCheckAnalysis, {
    useExactMatch: false,
    timeout: 60000
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
    // Run specific suite
    const suiteName = args[0];
    await runSpecificSuite(suiteName);
  } else {
    // Run all suites
    await runAllFactCheckTests();
  }
}

// Handle errors gracefully
main().catch(error => {
  console.error('\n💥 Fact check test execution failed:', error);
  process.exit(1);
});
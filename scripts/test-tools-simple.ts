#!/usr/bin/env tsx
/**
 * Simple test script for tool logic
 * Run with: npx tsx scripts/test-tools-simple.ts
 */

import { checkMathTool } from '../src/tools/check-math';
import { forecasterTool } from '../src/tools/forecaster';
import { factCheckTool } from '../src/tools/fact-check';
import { extractForecastingClaimsTool } from '../src/tools/extract-forecasting-claims';
import { extractFactualClaimsTool } from '../src/tools/extract-factual-claims';
import { checkSpellingGrammarTool } from '../src/tools/check-spelling-grammar';
import { logger } from '../src/lib/logger';

// Test context
const testContext = {
  userId: 'test-user',
  logger
};

// Test data for each tool
const testCases = {
  'math-checker': {
    tool: checkMathTool,
    input: {
      text: 'Revenue grew by 50% from $2 million to $3.5 million. With a 15% profit margin, we made $525,000 in profit.',
      maxErrors: 10
    }
  },
  'forecaster': {
    tool: forecasterTool,
    input: {
      question: 'Will AI assistants be widely adopted in software development by 2025?',
      context: 'GitHub Copilot has millions of users, ChatGPT is being integrated into IDEs',
      numForecasts: 3,
      usePerplexity: false
    }
  },
  'fact-check': {
    tool: factCheckTool,
    input: {
      text: 'The Earth is approximately 4.5 billion years old. The moon is about 384,400 km from Earth.',
      maxClaims: 10,
      verifyHighPriority: false
    }
  },
  'extract-forecasting-claims': {
    tool: extractForecastingClaimsTool,
    input: {
      text: 'We expect revenue to grow 20% next year. AI will likely replace 30% of jobs by 2030.',
      maxDetailedAnalysis: 2
    }
  },
  'extract-factual-claims': {
    tool: extractFactualClaimsTool,
    input: {
      text: 'Apple was founded in 1976. Microsoft was founded in 1975. Both are tech giants.',
      checkContradictions: true,
      prioritizeVerification: true
    }
  },
  'check-spelling-grammar': {
    tool: checkSpellingGrammarTool,
    input: {
      text: 'Their are many reasons why this approch might not work. We should of done better.',
      includeStyle: true,
      maxErrors: 20
    }
  }
};

async function testTool(name: string, testCase: any) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log('Input:', JSON.stringify(testCase.input, null, 2));

  try {
    const result = await testCase.tool.execute(testCase.input, testContext);
    
    console.log(`✓ ${name} succeeded`);
    
    // Log key results
    if (name === 'math-checker' && result.errors) {
      console.log(`  Found ${result.errors.length} math errors`);
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.highlightedText} - ${error.description}`);
      });
    } else if (name === 'forecaster' && result.probability) {
      console.log(`  Forecast: ${result.probability.toFixed(1)}% (${result.consensus} consensus)`);
      console.log(`  Mean: ${result.statistics.mean.toFixed(1)}%, StdDev: ${result.statistics.stdDev.toFixed(1)}`);
    } else if (name === 'fact-check' && result.claims) {
      console.log(`  Found ${result.claims.length} factual claims`);
      result.claims.forEach((claim, i) => {
        console.log(`  ${i + 1}. ${claim.claim}`);
      });
    } else if (name === 'extract-forecasting-claims' && result.totalForecasts) {
      console.log(`  Found ${result.totalForecasts} forecasting claims`);
    } else if (name === 'extract-factual-claims' && result.claims) {
      console.log(`  Found ${result.claims.length} factual claims`);
      if (result.contradictions && result.contradictions.length > 0) {
        console.log(`  Found ${result.contradictions.length} contradictions!`);
      }
    } else if (name === 'check-spelling-grammar' && result.errors) {
      console.log(`  Found ${result.errors.length} spelling/grammar issues`);
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. "${error.originalText}" → "${error.suggestion}"`);
      });
    }
    
    return true;
  } catch (error) {
    console.error(`❌ ${name} failed:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting tool logic tests...\n');
  console.log('Note: This tests the tool logic directly, not the API endpoints.');
  console.log('Tools that require Perplexity API will be skipped.\n');

  const results: Record<string, boolean> = {};

  // Test each tool (skip perplexity-research as it requires API key)
  for (const [name, testCase] of Object.entries(testCases)) {
    if (name === 'perplexity-research') {
      console.log(`\n⏭️  Skipping ${name} (requires Perplexity API key)`);
      continue;
    }
    
    results[name] = await testTool(name, testCase);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n📊 Test Summary:');
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  for (const [name, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✓' : '✗'} ${name}`);
  }
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed < total) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
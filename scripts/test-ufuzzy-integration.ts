#!/usr/bin/env npx tsx

/**
 * Test script to verify uFuzzy integration in text location finder
 */

import { findTextLocation } from '../src/tools/text-location-finder/core';

async function testUFuzzy() {
  console.log('Testing uFuzzy integration...\n');

  const testCases = [
    {
      name: 'Exact match',
      document: 'The quick brown fox jumps over the lazy dog.',
      search: 'brown fox',
      expected: true
    },
    {
      name: 'Fuzzy match - typo',
      document: 'The quick brown fox jumps over the lazy dog.',
      search: 'browm fox', // typo in 'brown'
      expected: true
    },
    {
      name: 'Fuzzy match - missing character',
      document: 'The quick brown fox jumps over the lazy dog.',
      search: 'quik brown', // missing 'c' in 'quick'
      expected: true
    },
    {
      name: 'Fuzzy match - extra character',
      document: 'The quick brown fox jumps over the lazy dog.',
      search: 'quickk brown', // extra 'k' in 'quick'
      expected: true
    },
    {
      name: 'Case insensitive fuzzy',
      document: 'The Quick Brown Fox Jumps Over The Lazy Dog.',
      search: 'quick brown fox',
      expected: true
    },
    {
      name: 'Quote normalization',
      document: "It's a beautiful day, isn't it?",
      search: "It's a beautiful day, isn't it?", // Different quotes
      options: { normalizeQuotes: true },
      expected: true
    },
    {
      name: 'Complex spelling error',
      document: 'The algorithm efficiently processes the data.',
      search: 'algoritm eficiently', // Multiple typos
      expected: true
    },
    {
      name: 'No match - too different',
      document: 'The quick brown fox jumps over the lazy dog.',
      search: 'completely different text',
      expected: false
    }
  ];

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Document: "${testCase.document}"`);
    console.log(`Search: "${testCase.search}"`);
    
    const result = await findTextLocation(
      testCase.search,
      testCase.document,
      testCase.options || {}
    );
    
    const found = result !== null;
    const passed = found === testCase.expected;
    
    if (result) {
      console.log(`✅ FOUND: "${result.quotedText}" at position ${result.startOffset}-${result.endOffset}`);
      console.log(`   Strategy: ${result.strategy}, Confidence: ${result.confidence}`);
    } else {
      console.log(`❌ NOT FOUND`);
    }
    
    console.log(`   Result: ${passed ? 'PASS' : 'FAIL'}\n`);
  }
}

// Run the test
testUFuzzy().catch(console.error);
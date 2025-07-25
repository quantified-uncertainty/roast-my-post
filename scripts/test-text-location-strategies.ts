#!/usr/bin/env npx tsx

/**
 * Test all text location finding strategies
 */

import { exactSearch } from '../src/tools/text-location-finder/exactSearch';
import { uFuzzySearch } from '../src/tools/text-location-finder/uFuzzySearch';
import { llmSearch } from '../src/tools/text-location-finder/llmSearch';
import { findTextLocation, findTextLocationEnhanced } from '../src/tools/text-location-finder/core';

interface TestCase {
  name: string;
  document: string;
  search: string;
  expectedLocation: { start: number; end: number; text: string };
  shouldFindWith: {
    exact: boolean;
    ufuzzy: boolean;
    llm: boolean;
  };
  options?: any;
}

const testCases: TestCase[] = [
  {
    name: 'Exact match',
    document: 'The quick brown fox jumps over the lazy dog.',
    search: 'brown fox',
    expectedLocation: { start: 10, end: 19, text: 'brown fox' },
    shouldFindWith: { exact: true, ufuzzy: true, llm: true }
  },
  {
    name: 'Single typo (substitution)',
    document: 'The quick brown fox jumps over the lazy dog.',
    search: 'quik brown',
    expectedLocation: { start: 4, end: 15, text: 'quick brown' },
    shouldFindWith: { exact: false, ufuzzy: true, llm: true }
  },
  {
    name: 'Missing character',
    document: 'The algorithm efficiently processes the data.',
    search: 'algoritm',
    expectedLocation: { start: 4, end: 13, text: 'algorithm' },
    shouldFindWith: { exact: false, ufuzzy: true, llm: true }
  },
  {
    name: 'Extra character',
    document: 'The quick brown fox jumps over the lazy dog.',
    search: 'quickk',
    expectedLocation: { start: 4, end: 9, text: 'quick' },
    shouldFindWith: { exact: false, ufuzzy: true, llm: true }
  },
  {
    name: 'Transposition',
    document: 'Please receive this message.',
    search: 'recieve',
    expectedLocation: { start: 7, end: 14, text: 'receive' },
    shouldFindWith: { exact: false, ufuzzy: true, llm: true }
  },
  {
    name: 'Case difference',
    document: 'The Quick Brown Fox Jumps Over The Lazy Dog.',
    search: 'quick brown fox',
    expectedLocation: { start: 4, end: 19, text: 'Quick Brown Fox' },
    shouldFindWith: { exact: false, ufuzzy: true, llm: true }
  },
  {
    name: 'Multiple typos (beyond uFuzzy limit)',
    document: 'The quick brown fox jumps over the lazy dog.',
    search: 'quikk browm fax',
    expectedLocation: { start: 4, end: 19, text: 'quick brown fox' },
    shouldFindWith: { exact: false, ufuzzy: false, llm: true }
  },
  {
    name: 'Paraphrased text',
    document: 'The rapid brown fox leaps across the sleepy hound.',
    search: 'quick fox jumps over dog',
    expectedLocation: { start: 4, end: 19, text: 'rapid brown fox' },
    shouldFindWith: { exact: false, ufuzzy: false, llm: true }
  },
  {
    name: 'Quote variations',
    document: "It's a beautiful day, isn't it?",
    search: "It's a beautiful day, isn't it?",
    expectedLocation: { start: 0, end: 31, text: "It's a beautiful day, isn't it?" },
    shouldFindWith: { exact: false, ufuzzy: true, llm: true },
    options: { normalizeQuotes: true }
  },
  {
    name: 'No match anywhere',
    document: 'The quick brown fox jumps over the lazy dog.',
    search: 'elephant giraffe zebra',
    expectedLocation: { start: -1, end: -1, text: '' },
    shouldFindWith: { exact: false, ufuzzy: false, llm: false }
  }
];

async function testStrategy(
  name: string,
  searchFn: (search: string, doc: string, opts?: any) => any,
  testCase: TestCase,
  shouldFind: boolean
): Promise<{ passed: boolean; result: any }> {
  try {
    const result = await searchFn(testCase.search, testCase.document, testCase.options || {});
    const found = result !== null;
    
    if (shouldFind && !found) {
      console.log(`    ❌ ${name}: Expected to find but didn't`);
      return { passed: false, result };
    }
    
    if (!shouldFind && found) {
      console.log(`    ❌ ${name}: Expected not to find but did`);
      return { passed: false, result };
    }
    
    if (found && testCase.expectedLocation.start !== -1) {
      const locationMatch = 
        result.startOffset === testCase.expectedLocation.start &&
        result.endOffset === testCase.expectedLocation.end &&
        result.quotedText === testCase.expectedLocation.text;
      
      if (!locationMatch) {
        console.log(`    ⚠️  ${name}: Found but at wrong location`);
        console.log(`        Expected: [${testCase.expectedLocation.start}, ${testCase.expectedLocation.end}] "${testCase.expectedLocation.text}"`);
        console.log(`        Got:      [${result.startOffset}, ${result.endOffset}] "${result.quotedText}"`);
        return { passed: false, result };
      }
    }
    
    console.log(`    ✅ ${name}: ${found ? `Found "${result.quotedText}" with ${result.strategy}` : 'Not found (as expected)'}`);
    return { passed: true, result };
  } catch (error) {
    console.log(`    ❌ ${name}: Error - ${error.message}`);
    return { passed: false, result: null };
  }
}

async function runTests() {
  console.log('Testing all text location finding strategies\n');
  console.log('='.repeat(80));
  
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log(`Document: "${testCase.document}"`);
    console.log(`Search:   "${testCase.search}"`);
    if (testCase.expectedLocation.start !== -1) {
      console.log(`Expected: [${testCase.expectedLocation.start}, ${testCase.expectedLocation.end}] "${testCase.expectedLocation.text}"`);
    } else {
      console.log(`Expected: No match`);
    }
    console.log('');
    
    // Test individual strategies
    await testStrategy('Exact  ', exactSearch, testCase, testCase.shouldFindWith.exact);
    await testStrategy('uFuzzy ', uFuzzySearch, testCase, testCase.shouldFindWith.ufuzzy);
    await testStrategy('LLM    ', llmSearch, testCase, testCase.shouldFindWith.llm);
    
    // Test combined strategies
    console.log('');
    const basicResult = await testStrategy('Basic fallback', findTextLocation, testCase, 
      testCase.shouldFindWith.exact || testCase.shouldFindWith.ufuzzy);
    
    const enhancedResult = await testStrategy('Enhanced (with LLM)', 
      (s, d, o) => findTextLocationEnhanced(s, d, { ...o, useLLMFallback: true }), 
      testCase, 
      testCase.shouldFindWith.exact || testCase.shouldFindWith.ufuzzy || testCase.shouldFindWith.llm);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Test complete!');
}

// Run the tests
runTests().catch(console.error);
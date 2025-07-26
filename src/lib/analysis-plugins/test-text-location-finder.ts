#!/usr/bin/env npx tsx

/**
 * Test the text location finder to understand what's happening
 */

import { findTextLocation } from '../documentAnalysis/shared/textLocationFinder';

async function testTextLocationFinder() {
  const sampleDocument = `This is a test document.
It contains multiple lines and paragraphs.

The document has "quoted text" and numbers like 42%.
Some text will be found by 2025.
There are various formatting issues and spelling mistakes.`;

  console.log('Testing text location finder\n');

  // Test 1: Exact match
  console.log('Test 1: Exact match for "test document"');
  const result1 = await findTextLocation('test document', sampleDocument);
  console.log('Result:', result1);
  console.log();

  // Test 2: Case insensitive
  console.log('Test 2: Case insensitive for "TEST DOCUMENT"');
  const result2 = await findTextLocation('TEST DOCUMENT', sampleDocument, {
    caseInsensitive: true
  });
  console.log('Result:', result2);
  console.log();

  // Test 3: Normalized quotes
  console.log('Test 3: Normalized quotes for \'"quoted text"\'');
  const result3 = await findTextLocation('"quoted text"', sampleDocument, {
    normalizeQuotes: true
  });
  console.log('Result:', result3);
  console.log();

  // Test 4: Fuzzy match
  console.log('Test 4: Fuzzy match for "formattin issues"');
  const result4 = await findTextLocation('formattin issues', sampleDocument, {
    allowFuzzy: true
  });
  console.log('Result:', result4);
  console.log();

  // Test 5: Partial match
  console.log('Test 5: Partial match for long text');
  const longText = 'document has quoted text and numbers like 42% and more stuff that does not exist';
  const result5 = await findTextLocation(longText, sampleDocument, {
    allowPartialMatch: true,
    minPartialMatchLength: 20
  });
  console.log('Result:', result5);
  console.log();
}

// Run the test
testTextLocationFinder().catch(console.error);
#!/usr/bin/env tsx
/**
 * Test to show TRUE variations by:
 * 1. Using timestamp in prompt to bypass cache
 * 2. Testing edge cases that might produce different interpretations
 */

import { analyzeMathChunk, type TextChunk } from '../src/lib/documentAnalysis/narrow-epistemic-evals/mathChecker';

// Test cases that might produce variations
const variationTestCases = {
  ambiguous: `The expression 6/2(1+2) could be interpreted as either 1 or 9.`,
  
  contextual: `In this approximation, we use g = 10 m/s² instead of 9.8 m/s².`,
  
  rounding: `We rounded π to 3.14, which gives us a circumference of 31.4 for a circle with radius 5.`,
  
  informal: `The chance of winning is basically 50-50, so about 1/2.`,
  
  mixed: `Our calculation shows that √2 ≈ 1.41, so 2√2 ≈ 2.82.`
};

async function testTrueVariations() {
  console.log('Math Error Checker - True Variation Test');
  console.log('(Bypassing cache with timestamps)');
  console.log('=' .repeat(50) + '\n');

  for (const [name, content] of Object.entries(variationTestCases)) {
    console.log(`\nTesting: ${name}`);
    console.log('-'.repeat(40));
    
    const results: any[] = [];
    
    // Run 3 times with cache-busting
    for (let i = 1; i <= 3; i++) {
      // Add timestamp to make each request unique
      const timestamp = Date.now();
      const uniqueContent = `[Test ${timestamp}]\n${content}`;
      
      const chunk: TextChunk = {
        content: uniqueContent,
        startLineNumber: 1,
        endLineNumber: 2,
        wordCount: uniqueContent.split(/\s+/).length
      };
      
      try {
        console.log(`\n  Run ${i}:`);
        const result = await analyzeMathChunk(chunk);
        
        results.push({
          run: i,
          errors: result.errors,
          count: result.errors.length
        });
        
        if (result.errors.length === 0) {
          console.log('    No errors detected');
        } else {
          result.errors.forEach(e => {
            // Remove timestamp from displayed text
            const displayText = e.highlightedText.replace(/\[Test \d+\]\s*/, '');
            console.log(`    [${e.severity}] "${displayText}"`);
            console.log(`    ${e.description.substring(0, 100)}...`);
          });
        }
      } catch (error) {
        console.error(`    Error: ${error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Analyze consistency
    const counts = results.map(r => r.count);
    const allSame = counts.every(c => c === counts[0]);
    
    console.log(`\n  Consistency: ${allSame ? '✓ Same count' : '✗ DIFFERENT COUNTS'} [${counts.join(', ')}]`);
    
    // Check for description variations
    if (results.length > 1 && results[0].errors.length > 0) {
      const firstError = results[0].errors[0];
      const descriptions = results.map(r => r.errors[0]?.description || '');
      const uniqueDescriptions = [...new Set(descriptions)];
      
      if (uniqueDescriptions.length > 1) {
        console.log('  ⚠️  Description variations detected!');
      }
    }
  }
  
  console.log('\n\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log('\nWith Helicone caching enabled and cache-busting timestamps:');
  console.log('- Each request is unique (bypasses cache)');
  console.log('- This should reveal any non-determinism in Claude\'s responses');
  console.log('- Even with temperature=0, slight variations are possible');
  
  console.log('\nTo see variations without cache-busting:');
  console.log('1. Set HELICONE_CACHE_ENABLED=false in .env');
  console.log('2. Or wait for cache expiry (currently 2 hours)');
  console.log('3. Or use different test inputs');
}

// Run test
testTrueVariations().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
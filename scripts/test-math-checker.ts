#!/usr/bin/env tsx
/**
 * Test script runner for math error checker
 * Run with: npm run test:math-checker
 */

import { analyzeMathChunk, splitIntoChunks } from '../src/lib/documentAnalysis/narrow-epistemic-evals/mathChecker';

// Example text with various mathematical statements (some correct, some incorrect)
const testText = `
The company's revenue grew by 50% last year, from $2 million to $3.5 million. 
This represents a significant increase in our market share.

In our analysis, we found that 2 + 2 = 5, which led to some interesting conclusions
about the nature of arithmetic in non-Euclidean spaces.

The distance from New York to Los Angeles is approximately 2,800 miles, which
converts to about 4,500 kilometers (since 1 mile = 1.6 kilometers, so 
2,800 × 1.6 = 4,480 km).

Our statistical model shows that if we increase marketing spend by 20%, we can
expect a 30% increase in sales. Since we currently spend $100,000 on marketing,
a 20% increase would mean spending $130,000 total.

The probability of getting heads on a fair coin toss is 0.5. Therefore, if we
flip a coin 10 times, we will definitely get exactly 5 heads.

Using the Pythagorean theorem, if a right triangle has sides of length 3 and 4,
the hypotenuse must be 5 (since 3² + 4² = 9 + 16 = 25 = 5²).

Our profit margin is 25%, which means for every $100 in revenue, we make $25
in profit. Last month we had $400,000 in revenue, so our profit was $120,000.
`;

async function runTest() {
  console.log('=== Math Error Checker Test ===\n');
  
  try {
    // Split text into chunks
    const chunks = splitIntoChunks(testText, 150); // Smaller chunks for testing
    console.log(`Text split into ${chunks.length} chunks\n`);

    // Analyze each chunk
    let totalErrors = 0;
    let totalTokens = { input: 0, output: 0 };

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n--- Analyzing Chunk ${i + 1}/${chunks.length} ---`);
      console.log(`Lines ${chunk.startLineNumber}-${chunk.endLineNumber} (${chunk.wordCount} words)`);
      console.log(`Preview: ${chunk.content.substring(0, 100)}...`);
      
      const result = await analyzeMathChunk(chunk);
      
      totalErrors += result.errors.length;
      totalTokens.input += result.usage.input_tokens;
      totalTokens.output += result.usage.output_tokens;
      
      if (result.errors.length === 0) {
        console.log('✓ No mathematical errors found');
      } else {
        console.log(`\n❌ Found ${result.errors.length} error(s):`);
        result.errors.forEach((error, index) => {
          console.log(`\n  Error ${index + 1}:`);
          console.log(`  - Location: Lines ${error.lineStart}-${error.lineEnd}`);
          console.log(`  - Type: ${error.errorType} (${error.severity})`);
          console.log(`  - Highlighted: "${error.highlightedText}"`);
          console.log(`  - Description: ${error.description}`);
        });
      }
      
      console.log(`\nTokens used: ${result.usage.input_tokens} input, ${result.usage.output_tokens} output`);
    }

    // Summary
    console.log('\n\n=== Summary ===');
    console.log(`Total errors found: ${totalErrors}`);
    console.log(`Total tokens used: ${totalTokens.input} input, ${totalTokens.output} output`);
    
    // Estimated cost (Claude 3.5 Sonnet pricing as of 2024)
    const inputCost = (totalTokens.input / 1_000_000) * 3.00;  // $3 per million input tokens
    const outputCost = (totalTokens.output / 1_000_000) * 15.00; // $15 per million output tokens
    const totalCost = inputCost + outputCost;
    
    console.log(`Estimated cost: $${totalCost.toFixed(4)} ($${inputCost.toFixed(4)} input + $${outputCost.toFixed(4)} output)`);

  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

// Run the test
console.log('Starting math error checker test...\n');
runTest().then(() => {
  console.log('\nTest completed!');
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
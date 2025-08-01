#!/usr/bin/env tsx

import { extractMathExpressionsTool } from '../tools/extract-math-expressions';
import { logger } from '../lib/logger';

async function testMathExtraction() {
  const testText = `
    Here are some math examples:
    
    1. Simple arithmetic error: The total is 45 + 23 = 67 (should be 68)
    2. Coefficient error: Using the formula F = 4ma (should be F = ma)  
    3. Percentage calculation: 15% of 200 is 40 (should be 30)
    4. Order of magnitude: 10^6 × 5 = 50,000 (should be 5,000,000)
    5. Unit error: Speed = 60 km in 2 hours = 30 km (should be 30 km/h)
    6. Sign error: Net change = 100 - 150 = 50 (should be -50)
    7. Missing operation: Revenue = 1000 × 0.15 = 150 (should be 1000 × 1.15 = 1150)
  `;

  try {
    console.log('Testing math expression extraction with concise corrections...\n');
    
    const result = await extractMathExpressionsTool.execute({
      text: testText,
      verifyCalculations: true,
      includeContext: true
    }, { logger });

    console.log(`Found ${result.expressions.length} math expressions:\n`);
    
    result.expressions.forEach((expr, index) => {
      console.log(`Expression ${index + 1}:`);
      console.log(`  Original: "${expr.originalText}"`);
      console.log(`  Has Error: ${expr.hasError}`);
      if (expr.hasError) {
        console.log(`  Error Type: ${expr.errorType || 'N/A'}`);
        console.log(`  Concise Correction: ${expr.conciseCorrection || 'N/A'}`);
        console.log(`  Full Correction: ${expr.correctedVersion || 'N/A'}`);
        console.log(`  Explanation: ${expr.errorExplanation || 'N/A'}`);
      }
      console.log(`  Scores: Complexity=${expr.complexityScore}, Importance=${expr.contextImportanceScore}, Severity=${expr.errorSeverityScore}`);
      console.log();
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testMathExtraction().catch(console.error);
#!/usr/bin/env tsx

import { checkSpellingGrammarTool } from '../src/tools/check-spelling-grammar';
import { logger } from '../src/lib/logger';

async function testSpellingExtraction() {
  // Test chunk that should have spelling errors
  const testChunk = `
This times the increase in the risk of death due to something is a common mistake.
The authr made severl errors in thier calculation of probabilities.
We can see that the reserch shows a 15% improvment over the baseline.
Their are many problms with this approch to solving the issue.
  `;

  console.log('Testing spelling extraction on chunk:');
  console.log('---');
  console.log(testChunk);
  console.log('---\n');

  try {
    const result = await checkSpellingGrammarTool.execute(
      {
        text: testChunk,
        maxErrors: 20,
      },
      {
        logger: logger,
      }
    );

    console.log(`Found ${result.errors.length} errors:\n`);
    
    for (const error of result.errors) {
      console.log(`Error: "${error.text}"`);
      console.log(`  Correction: "${error.correction}"`);
      console.log(`  Type: ${error.type}`);
      console.log(`  Importance: ${error.importance}`);
      
      // Check if this exact text exists in the chunk
      const exactMatch = testChunk.includes(error.text);
      console.log(`  Exact match in chunk: ${exactMatch}`);
      
      if (!exactMatch) {
        // Try to find where this might have come from
        const words = error.text.split(' ');
        console.log(`  Checking individual words:`);
        for (const word of words) {
          if (word.length > 2) {
            console.log(`    "${word}": ${testChunk.includes(word) ? 'found' : 'not found'}`);
          }
        }
      }
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSpellingExtraction();
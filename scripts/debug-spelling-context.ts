#!/usr/bin/env tsx

import { checkSpellingGrammarTool } from '../src/tools/check-spelling-grammar';
import { logger } from '../src/lib/logger';

async function debugSpellingContext() {
  // Test with a chunk that has context issues
  const chunkText = `over the baseline.
Their are many problms with this approch to solving the issue.`;

  console.log('Testing spelling extraction on partial chunk:');
  console.log('---');
  console.log(chunkText);
  console.log('---\n');

  try {
    const result = await checkSpellingGrammarTool.execute(
      {
        text: chunkText,
        maxErrors: 20,
      },
      {
        logger: logger,
      }
    );

    console.log(`Found ${result.errors.length} errors:\n`);
    
    for (const error of result.errors) {
      console.log(`Error text: "${error.text}"`);
      console.log(`  Context: "${error.context || 'none'}"`);
      console.log(`  Correction: "${error.correction}"`);
      
      // Check if error text exists in chunk
      const inChunk = chunkText.includes(error.text);
      console.log(`  Found in chunk: ${inChunk}`);
      
      if (error.context) {
        const contextInChunk = chunkText.includes(error.context);
        console.log(`  Context in chunk: ${contextInChunk}`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugSpellingContext();
#!/usr/bin/env tsx

// Test if spelling errors at chunk boundaries cause issues

import { checkSpellingGrammarTool } from '../src/tools/check-spelling-grammar';
import { logger } from '../src/lib/logger';

async function debugChunkBoundaryErrors() {
  // Create chunks that split words/errors at boundaries
  const fullText = `This is a test where we have problms at the boundary. The word is split across chunks.`;
  
  // Split "problms" across chunks
  const chunk1 = `This is a test where we have probl`;
  const chunk2 = `ms at the boundary. The word is split across chunks.`;
  
  console.log('Testing chunk boundary error detection:\n');
  console.log('Full text:', fullText);
  console.log('\nChunk 1:', chunk1);
  console.log('Chunk 2:', chunk2);
  console.log('\n---\n');

  // Check each chunk
  for (const [idx, chunk] of [chunk1, chunk2].entries()) {
    console.log(`\nChecking chunk ${idx + 1}:`);
    
    try {
      const result = await checkSpellingGrammarTool.execute(
        {
          text: chunk,
          maxErrors: 20,
        },
        {
          logger: logger,
        }
      );

      console.log(`Found ${result.errors.length} errors:`);
      
      for (const error of result.errors) {
        console.log(`  - "${error.text}" → "${error.correction}"`);
        
        // Check if this error exists in the chunk
        const inChunk = chunk.includes(error.text);
        console.log(`    In chunk: ${inChunk}`);
        
        // Check if it exists in the full text
        const inFull = fullText.includes(error.text);
        console.log(`    In full text: ${inFull}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Now test with overlapping context
  console.log('\n\nTesting with overlapping chunks:');
  const overlap1 = `This is a test where we have problms at the`;
  const overlap2 = `have problms at the boundary. The word is split across chunks.`;
  
  for (const [idx, chunk] of [overlap1, overlap2].entries()) {
    console.log(`\nChecking overlapping chunk ${idx + 1}:`);
    
    try {
      const result = await checkSpellingGrammarTool.execute(
        {
          text: chunk,
          maxErrors: 20,
        },
        {
          logger: logger,
        }
      );

      console.log(`Found ${result.errors.length} errors:`);
      
      for (const error of result.errors) {
        console.log(`  - "${error.text}" → "${error.correction}"`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

debugChunkBoundaryErrors();
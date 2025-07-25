#!/usr/bin/env tsx

// Debug why spelling errors can't be found in their chunks

import { checkSpellingGrammarTool } from '../src/tools/check-spelling-grammar';
import { logger } from '../src/lib/logger';

async function debugChunkErrorMatching() {
  // Simulate what happens when we have multiple chunks
  const chunk1 = `## Section 1: Introduction

The authr of this document made many mistaks in their writing.`;

  const chunk2 = `We can see that the reserch shows a 15% improvment over the baseline.
Their are many problms with this approch to solving the issue.`;

  const chunk3 = `## Section 2: Analysis

This times the increase in the risk of death due to something is a common mistake.`;

  console.log('Testing error extraction from multiple chunks:\n');

  const chunks = [
    { id: 'chunk-1', text: chunk1 },
    { id: 'chunk-2', text: chunk2 },
    { id: 'chunk-3', text: chunk3 }
  ];

  const allErrors: Array<{error: any, chunkId: string, chunkText: string}> = [];

  // Process each chunk
  for (const chunk of chunks) {
    console.log(`\nProcessing ${chunk.id}:`);
    console.log('Text:', chunk.text.replace(/\n/g, '\\n'));
    
    try {
      const result = await checkSpellingGrammarTool.execute(
        {
          text: chunk.text,
          maxErrors: 20,
        },
        {
          logger: logger,
        }
      );

      console.log(`Found ${result.errors.length} errors`);
      
      for (const error of result.errors) {
        allErrors.push({ error, chunkId: chunk.id, chunkText: chunk.text });
        console.log(`  - "${error.text}" → "${error.correction}"`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Now simulate what happens when we try to find these errors
  console.log('\n\nSimulating error location finding:');
  console.log('=====================================\n');

  for (const {error, chunkId, chunkText} of allErrors) {
    console.log(`\nError: "${error.text}" (from ${chunkId})`);
    
    // Check if error text exists in its associated chunk
    const exactMatch = chunkText.includes(error.text);
    console.log(`  Exact match in original chunk: ${exactMatch}`);
    
    if (!exactMatch) {
      // Try case-insensitive
      const caseInsensitive = chunkText.toLowerCase().includes(error.text.toLowerCase());
      console.log(`  Case-insensitive match: ${caseInsensitive}`);
      
      // Check if it might be in a different chunk
      for (const chunk of chunks) {
        if (chunk.id !== chunkId && chunk.text.includes(error.text)) {
          console.log(`  ⚠️  Found in different chunk: ${chunk.id}`);
        }
      }
    }
  }
}

debugChunkErrorMatching();
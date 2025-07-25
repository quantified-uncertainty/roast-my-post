#!/usr/bin/env tsx

import { SpellingAnalyzerJob } from '../src/lib/analysis-plugins/plugins/spelling';
import { TextChunk } from '../src/lib/analysis-plugins/TextChunk';
import { logger } from '../src/lib/logger';

async function testSpellingPluginFlow() {
  // Create a test document with intentional spelling errors
  const documentText = `# Test Document

This is a test document with severl spelling errors.

## Section 1: Introduction

The authr of this document made many mistaks in their writing.
We can see that the reserch shows a 15% improvment over the baseline.
Their are many problms with this approch to solving the issue.

## Section 2: Analysis

This times the increase in the risk of death due to something is a common mistake.
The scientsts discovered that thier calculations were incorrect.
We should focuss on the main isues rather than minor detals.

## Conclusion

In concluson, we have identifed multiple speling errors throughout the text.`;

  // Create test chunks (simulating how document chunker would work)
  const chunks: TextChunk[] = [
    {
      id: 'chunk-1',
      text: `## Section 1: Introduction

The authr of this document made many mistaks in their writing.
We can see that the reserch shows a 15% improvment over the baseline.
Their are many problms with this approch to solving the issue.`,
      metadata: {
        position: {
          start: 54,  // Position after header and first line
          end: 268
        },
        section: 'Section 1: Introduction'
      }
    },
    {
      id: 'chunk-2', 
      text: `## Section 2: Analysis

This times the increase in the risk of death due to something is a common mistake.
The scientsts discovered that thier calculations were incorrect.
We should focuss on the main isues rather than minor detals.`,
      metadata: {
        position: {
          start: 270,
          end: 508
        },
        section: 'Section 2: Analysis'
      }
    }
  ];

  console.log('Document text:');
  console.log('---');
  console.log(documentText);
  console.log('---\n');

  // Test chunk position verification
  console.log('Verifying chunk positions:');
  for (const chunk of chunks) {
    const extractedText = documentText.substring(
      chunk.metadata.position.start,
      chunk.metadata.position.end
    );
    const matches = extractedText === chunk.text;
    console.log(`Chunk ${chunk.id}:`);
    console.log(`  Position: ${chunk.metadata.position.start}-${chunk.metadata.position.end}`);
    console.log(`  Matches: ${matches}`);
    if (!matches) {
      console.log(`  Expected: "${chunk.text.slice(0, 50)}..."`);
      console.log(`  Actual:   "${extractedText.slice(0, 50)}..."`);
    }
  }
  console.log('');

  // Run spelling analyzer
  const analyzer = new SpellingAnalyzerJob();
  
  try {
    console.log('Running spelling analysis...\n');
    const result = await analyzer.analyze(chunks, documentText);
    
    console.log(`Analysis Summary: ${result.summary}`);
    console.log(`Total comments: ${result.comments.length}\n`);
    
    // Check each comment
    for (const comment of result.comments) {
      console.log(`Comment: "${comment.description}"`);
      console.log(`  Importance: ${comment.importance}`);
      console.log(`  Highlight: ${comment.highlight?.startOffset}-${comment.highlight?.endOffset}`);
      console.log(`  Quoted text: "${comment.highlight?.quotedText}"`);
      
      // Verify the highlight position
      if (comment.highlight) {
        const verifyText = documentText.substring(
          comment.highlight.startOffset,
          comment.highlight.endOffset
        );
        const matches = verifyText === comment.highlight.quotedText;
        console.log(`  Position verification: ${matches ? 'OK' : 'FAILED'}`);
        if (!matches) {
          console.log(`    Expected: "${comment.highlight.quotedText}"`);
          console.log(`    Actual:   "${verifyText}"`);
        }
      }
      console.log('');
    }
    
    // Get debug info
    const debugInfo = analyzer.getDebugInfo();
    console.log('Debug info:', debugInfo);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSpellingPluginFlow();
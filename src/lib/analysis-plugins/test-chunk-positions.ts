#!/usr/bin/env npx tsx

/**
 * Test script to verify chunk position preservation
 */

import { createChunksWithTool } from './utils/createChunksWithTool';
import { logger } from '../logger';

async function testChunkPositions() {
  // Create a larger document with repeated content to force chunking
  const sections = [];
  for (let i = 1; i <= 10; i++) {
    sections.push(`## Section ${i}

This is paragraph 1 in section ${i}. It contains some interesting content that spans multiple lines to ensure we have enough text for chunking to occur properly.

This is paragraph 2 in section ${i}. More content here to make sure each section is substantial enough to potentially be its own chunk.

This is paragraph 3 in section ${i}. Even more text to ensure proper testing of chunk boundaries and position tracking across the document.`);
  }
  
  const testDocument = `# Main Title

Introduction paragraph with some initial content.

${sections.join('\n\n')}

Final concluding paragraph at the very end.`;

  console.log('Document length:', testDocument.length);
  console.log('Document preview:', testDocument.slice(0, 100) + '...');
  console.log('\n---\n');

  try {
    // Create chunks - use realistic chunk sizes
    const chunks = await createChunksWithTool(testDocument, {
      maxChunkSize: 500, // More realistic chunk size
      minChunkSize: 100,
      preserveContext: true
    });

    console.log(`Created ${chunks.length} chunks\n`);
    
    // Check if we're missing any content
    let coveredRanges = chunks.map(c => ({
      start: c.metadata?.position?.start || 0,
      end: c.metadata?.position?.end || 0,
      chunk: c
    })).sort((a, b) => a.start - b.start);
    
    console.log('\n--- Chunk Coverage Analysis ---');
    console.log(`Document starts at 0, ends at ${testDocument.length}`);
    
    if (coveredRanges[0].start > 0) {
      console.log(`\nWARNING: Missing content from start!`);
      console.log(`First chunk starts at ${coveredRanges[0].start}`);
      console.log(`Missing text: "${testDocument.slice(0, coveredRanges[0].start)}"`);
    }
    
    for (let i = 0; i < coveredRanges.length - 1; i++) {
      const gap = coveredRanges[i + 1].start - coveredRanges[i].end;
      if (gap > 1) { // Allow for single character gaps (newlines)
        console.log(`\nGap between chunks ${i} and ${i + 1}: ${gap} characters`);
        console.log(`Missing text: "${testDocument.slice(coveredRanges[i].end, coveredRanges[i + 1].start)}"`);
      }
    }
    
    if (coveredRanges[coveredRanges.length - 1].end < testDocument.length) {
      console.log(`\nWARNING: Missing content at end!`);
      console.log(`Last chunk ends at ${coveredRanges[coveredRanges.length - 1].end}`);
      console.log(`Missing text: "${testDocument.slice(coveredRanges[coveredRanges.length - 1].end)}"`);
    }
    
    console.log('\n--- Individual Chunk Verification ---\n');

    // Verify each chunk
    for (const chunk of chunks) {
      console.log(`\nChunk ${chunk.id}:`);
      console.log(`  Text: "${chunk.text.slice(0, 50)}..."`);
      console.log(`  Position: ${chunk.metadata?.position?.start} - ${chunk.metadata?.position?.end}`);
      console.log(`  Lines: ${chunk.metadata?.lineInfo?.startLine} - ${chunk.metadata?.lineInfo?.endLine}`);
      
      // Verify position matches actual document
      if (chunk.metadata?.position) {
        const extractedText = testDocument.slice(
          chunk.metadata.position.start,
          chunk.metadata.position.end
        );
        
        const positionMatches = extractedText === chunk.text;
        console.log(`  Position matches: ${positionMatches}`);
        
        if (!positionMatches) {
          console.log(`  ERROR: Position mismatch!`);
          console.log(`  Expected: "${chunk.text}"`);
          console.log(`  Got: "${extractedText}"`);
          
          // Try to find actual position
          const actualPos = testDocument.indexOf(chunk.text);
          console.log(`  Actual position in document: ${actualPos}`);
          if (actualPos !== -1) {
            console.log(`  Offset difference: ${actualPos - chunk.metadata.position.start}`);
          }
        }
      }
    }

    // Test finding text across chunks
    console.log('\n\n--- Testing text location across chunks ---\n');
    
    const searchTexts = [
      'Introduction paragraph',
      'section 3',
      'section 7',
      'Final concluding paragraph'
    ];

    for (const searchText of searchTexts) {
      console.log(`\nSearching for: "${searchText}"`);
      const actualPos = testDocument.indexOf(searchText);
      console.log(`Actual position in document: ${actualPos}`);
      
      // Find which chunk contains this text
      for (const chunk of chunks) {
        if (chunk.text.includes(searchText)) {
          console.log(`Found in chunk ${chunk.id}`);
          const chunkRelativePos = chunk.text.indexOf(searchText);
          const absolutePos = (chunk.metadata?.position?.start || 0) + chunkRelativePos;
          console.log(`Calculated absolute position: ${absolutePos}`);
          console.log(`Position correct: ${absolutePos === actualPos}`);
          
          // Test the findTextAbsolute method
          const location = await chunk.findTextAbsolute(searchText, { documentText: testDocument });
          if (location) {
            console.log(`findTextAbsolute result: ${location.startOffset} - ${location.endOffset}`);
            console.log(`findTextAbsolute correct: ${location.startOffset === actualPos}`);
          } else {
            console.log(`findTextAbsolute failed to find text`);
          }
          break;
        }
      }
    }

  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run the test
testChunkPositions().catch(console.error);
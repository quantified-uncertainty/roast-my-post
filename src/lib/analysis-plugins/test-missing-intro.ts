#!/usr/bin/env npx tsx

/**
 * Test to verify the missing introduction content issue
 */

import { createChunksWithTool } from './utils/createChunksWithTool';

async function testMissingIntro() {
  const testDocument = `This is an introduction paragraph before any headings.

It should definitely be included in the chunks.

# First Heading

Content under the first heading.

## Subheading

More content here.`;

  console.log('Document:', testDocument);
  console.log('\nDocument length:', testDocument.length);
  console.log('\n---\n');

  try {
    // Create chunks with small size to force multiple chunks
    const chunks = await createChunksWithTool(testDocument, {
      maxChunkSize: 1000,
      minChunkSize: 50,
      preserveContext: true
    });

    console.log(`Created ${chunks.length} chunks\n`);

    // Check coverage
    let totalCovered = 0;
    for (const chunk of chunks) {
      const start = chunk.metadata?.position?.start || 0;
      const end = chunk.metadata?.position?.end || 0;
      totalCovered += (end - start);
      
      console.log(`Chunk ${chunk.id}:`);
      console.log(`  Position: ${start}-${end}`);
      console.log(`  Text: "${chunk.text.slice(0, 50)}..."`);
      console.log(`  Contains intro: ${chunk.text.includes('introduction paragraph')}`);
    }
    
    console.log(`\nTotal characters covered: ${totalCovered} / ${testDocument.length}`);
    console.log(`Missing characters: ${testDocument.length - totalCovered}`);
    
    // Check if intro is in any chunk
    const introInChunks = chunks.some(c => c.text.includes('introduction paragraph'));
    console.log(`\nIntroduction found in chunks: ${introInChunks}`);
    
    if (!introInChunks) {
      console.log('\nERROR: Introduction paragraph is missing from all chunks!');
      
      // Find where the first chunk starts
      const firstChunkStart = Math.min(...chunks.map(c => c.metadata?.position?.start || Infinity));
      console.log(`First chunk starts at position: ${firstChunkStart}`);
      console.log(`Missing text (0-${firstChunkStart}): "${testDocument.slice(0, firstChunkStart)}"`);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testMissingIntro().catch(console.error);
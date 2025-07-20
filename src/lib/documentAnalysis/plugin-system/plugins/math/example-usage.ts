/**
 * Example usage of the Math Plugin
 * 
 * This demonstrates the clear stage-based flow
 */

import { MathPlugin } from '../MathPlugin';
import { TextChunk } from '../../TextChunk';

async function processMathDocument(documentText: string) {
  const plugin = new MathPlugin();
  
  // STAGE 1: Extract math expressions from chunks
  const chunk = new TextChunk({
    id: 'chunk-1',
    text: 'The calculation 2 + 2 = 5 is incorrect. Also, 10% of 50 is 5.',
    startLine: 1,
    endLine: 1
  });
  
  await plugin.extractPotentialFindings(chunk);
  // → Finds: "2 + 2 = 5" and "10% of 50 is 5"
  
  // STAGE 2: Investigate correctness
  await plugin.investigateFindings();
  // → Validates: "2 + 2 = 5" is wrong, "10% of 50 is 5" is correct
  
  // STAGE 3: Locate in document
  await plugin.locateFindings(documentText);
  // → Finds exact positions for the error
  
  // STAGE 4: Analyze patterns
  await plugin.analyzeFindingPatterns();
  // → Generates: "1 arithmetic error found (50% error rate)"
  
  // STAGE 5: Generate UI comments
  const comments = plugin.getComments(documentText);
  // → Returns formatted comments with highlights
  
  return {
    comments,
    debug: plugin.debugJson()
  };
}

// The flow is clear and each stage has a specific purpose
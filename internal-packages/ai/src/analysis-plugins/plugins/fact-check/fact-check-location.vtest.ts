import { describe, it, expect, vi } from 'vitest';
import { FactCheckPlugin } from './index';
import { TextChunk } from '../../TextChunk';

// Mock the tools to avoid actual API calls
vi.mock('../../../tools/extract-factual-claims', () => ({
  default: {
    execute: vi.fn().mockResolvedValue({
      claims: [
        {
          exactText: 'The Earth orbits the Sun.',
          claim: 'The Earth orbits the Sun.',
          topic: 'astronomy',
          importanceScore: 80,
          checkabilityScore: 90,
          truthProbability: 95,
          highlight: {
            startOffset: 18, // position of "The" within chunk
            endOffset: 43, // position after "." within chunk
            quotedText: 'The Earth orbits the Sun.',
            isValid: true,
          },
        },
      ],
      summary: {
        totalFound: 1,
        aboveThreshold: 1,
        averageQuality: 85,
      },
    }),
  },
}));

vi.mock('../../../tools/fact-checker', () => ({
  default: {
    execute: vi.fn().mockResolvedValue({
      result: {
        verdict: 'true',
        confidence: 'high',
        explanation: 'This is a well-established scientific fact.',
        sources: [],
      },
    }),
  },
}));

describe('FactCheckPlugin Location Tracking', () => {
  it('should convert chunk-relative offsets to document-absolute offsets', async () => {
    const plugin = new FactCheckPlugin();
    
    // Create a document with multiple chunks
    const documentText = 'This is the first chunk text. The Earth orbits the Sun. This is more text in the first chunk.\n\nThis is the second chunk text.';
    
    // Create chunks with proper position metadata
    const chunk1 = new TextChunk(
      'chunk-1',
      'first chunk text. The Earth orbits the Sun. This is more text',
      {
        position: {
          start: 12, // "This is the " = 12 chars
          end: 74,   // Position in document where chunk ends
        },
      }
    );
    
    const chunk2 = new TextChunk(
      'chunk-2', 
      'This is the second chunk text.',
      {
        position: {
          start: 96,
          end: 127,
        },
      }
    );
    
    // Run analysis
    const result = await plugin.analyze([chunk1, chunk2], documentText);
    
    // Check that comments were generated
    expect(result.comments).toBeDefined();
    expect(result.comments.length).toBeGreaterThan(0);
    
    // Verify the location is document-absolute, not chunk-relative
    const comment = result.comments[0];
    if (comment && comment.location) {
      // The fact "The Earth orbits the Sun." starts at position 30 in the document
      // (12 for chunk start + 18 for position within chunk)
      const expectedStart = 12 + 18; // chunk start + relative offset
      const expectedEnd = 12 + 43;   // chunk start + relative end offset
      
      expect(comment.location.startOffset).toBe(expectedStart);
      expect(comment.location.endOffset).toBe(expectedEnd);
      expect(comment.location.quotedText).toBe('The Earth orbits the Sun.');
      
      // Verify the text at the location matches
      const extractedText = documentText.substring(
        comment.location.startOffset,
        comment.location.endOffset
      );
      expect(extractedText).toBe('The Earth orbits the Sun.');
    }
  });

  it('should handle chunks with no position metadata gracefully', async () => {
    const plugin = new FactCheckPlugin();
    
    const documentText = 'The Earth orbits the Sun.';
    
    // Create a chunk without position metadata
    const chunk = new TextChunk(
      'chunk-1',
      'The Earth orbits the Sun.'
      // No metadata provided
    );
    
    const result = await plugin.analyze([chunk], documentText);
    
    // Should still generate results but location will use fallback (0 offset)
    expect(result.comments).toBeDefined();
    if (result.comments.length > 0 && result.comments[0]?.location) {
      const { startOffset, endOffset, quotedText } = result.comments[0].location;
      expect(startOffset).toBeGreaterThanOrEqual(0);
      expect(endOffset).toBeGreaterThan(startOffset);
      expect(documentText.substring(startOffset, endOffset)).toBe(quotedText);
    }
  });

  it('should return null location when text verification fails', async () => {
    const plugin = new FactCheckPlugin();
    
    // Document text that doesn't match what's expected at the calculated location
    const documentText = 'Something completely different here. And more text to fill space.';
    
    const chunk = new TextChunk(
      'chunk-1',
      'The Earth orbits the Sun.',
      {
        position: {
          start: 10,
          end: 36,
        },
      }
    );
    
    const result = await plugin.analyze([chunk], documentText);
    
    // Should not generate comments since location verification would fail
    expect(result.comments).toBeDefined();
    // Comments should be filtered out if location can't be verified
    const regularComments = result.comments.filter(c => c.level !== 'debug');
    expect(regularComments.length).toBe(0);
  });
});
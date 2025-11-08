import { describe, it, expect, vi } from 'vitest';
import { findLocationInChunk } from './chunk-location-finder';
import type { ToolContext } from '../base/Tool';
import { logger } from '../../shared/logger';

describe('Chunk Location Finder', () => {
  const mockContext: ToolContext = {
    logger,
  };

  describe('Plain text search (Tier 1)', () => {
    it('should find text in chunk using plain search', async () => {
      const chunkText = 'Bitcoin has grown 1000% in the last year. This is great news.';
      const fullDoc = `Some intro text. ${chunkText} Some outro text.`;

      const result = await findLocationInChunk(
        {
          chunkText,
          fullDocumentText: fullDoc,
          chunkStartOffset: 17, // "Some intro text. ".length
          searchText: 'grown 1000%',
          lineNumberHint: undefined,
        },
        mockContext
      );

      expect(result.found).toBe(true);
      expect(result.location?.quotedText).toContain('grown 1000%');
      expect(result.location?.strategy).toContain('chunk');
      // Offset should be absolute, not chunk-relative
      expect(result.location?.startOffset).toBeGreaterThan(17);
    });

    it('should handle exact match in chunk', async () => {
      const chunkText = 'The quick brown fox jumps over the lazy dog.';

      const result = await findLocationInChunk(
        {
          chunkText,
          chunkStartOffset: 0,
          searchText: 'quick brown fox',
        },
        mockContext
      );

      expect(result.found).toBe(true);
      expect(result.location?.quotedText).toContain('quick brown fox');
    });
  });

  describe('Quote normalization', () => {
    it('should handle different quote styles', async () => {
      const chunkText = 'He said "hello world" to everyone.';

      const result = await findLocationInChunk(
        {
          chunkText,
          chunkStartOffset: 0,
          searchText: 'He said "hello world"', // Straight quotes
        },
        mockContext
      );

      expect(result.found).toBe(true);
    });
  });

  describe('Chunk offset conversion', () => {
    it('should convert chunk-relative offsets to absolute', async () => {
      const chunkText = 'This is chunk text with some content.';
      const chunkStart = 100;

      const result = await findLocationInChunk(
        {
          chunkText,
          chunkStartOffset: chunkStart,
          searchText: 'chunk text',
        },
        mockContext
      );

      expect(result.found).toBe(true);
      // Absolute offset should be chunk start + relative position
      expect(result.location?.startOffset).toBeGreaterThanOrEqual(chunkStart);
      expect(result.location?.endOffset).toBeGreaterThan(result.location!.startOffset);
    });
  });

  describe('Fallback behavior', () => {
    it('should return not found when text is not in chunk or document', async () => {
      const chunkText = 'This is the chunk.';
      const fullDoc = 'This is the full document with the chunk.';

      const result = await findLocationInChunk(
        {
          chunkText,
          fullDocumentText: fullDoc,
          chunkStartOffset: 20,
          searchText: 'nonexistent text',
        },
        mockContext
      );

      expect(result.found).toBe(false);
      expect(result.location).toBeUndefined();
    });

    it('should search full document when not in chunk', async () => {
      const chunkText = 'This is just the chunk.';
      const fullDoc = 'Intro text. This is just the chunk. And some extra context here.';

      // Search for text that's NOT in the chunk but IS in the full document
      const result = await findLocationInChunk(
        {
          chunkText,
          fullDocumentText: fullDoc,
          chunkStartOffset: 12, // Position of chunk in fullDoc
          searchText: 'extra context',
        },
        mockContext
      );

      expect(result.found).toBe(true);
      expect(result.location?.quotedText).toContain('extra context');
      // Should NOT have '-chunk' suffix since it was found in full doc
      expect(result.location?.strategy).not.toContain('-chunk');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty chunk text', async () => {
      // Empty chunk text should throw validation error
      await expect(
        findLocationInChunk(
          {
            chunkText: '',
            chunkStartOffset: 0,
            searchText: 'anything',
          },
          mockContext
        )
      ).rejects.toThrow('Invalid input');
    });

    it('should handle chunk at document start', async () => {
      const chunkText = 'Start of document.';

      const result = await findLocationInChunk(
        {
          chunkText,
          chunkStartOffset: 0,
          searchText: 'Start of',
        },
        mockContext
      );

      expect(result.found).toBe(true);
      expect(result.location?.startOffset).toBe(0);
    });

    it('should handle chunk at document end', async () => {
      const fullDoc = 'Some text before. End of document.';
      const chunkText = 'End of document.';
      const chunkStart = fullDoc.indexOf(chunkText);

      const result = await findLocationInChunk(
        {
          chunkText,
          fullDocumentText: fullDoc,
          chunkStartOffset: chunkStart,
          searchText: 'End of',
        },
        mockContext
      );

      expect(result.found).toBe(true);
      expect(result.location?.startOffset).toBeGreaterThanOrEqual(chunkStart);
    });
  });

  describe('Performance optimization verification', () => {
    it('should prefer chunk results over full document search', async () => {
      // Create a scenario where text appears in both chunk and later in document
      const chunkText = 'Bitcoin grew 1000% last year.';
      const fullDoc = `${chunkText} Some middle text. Bitcoin grew 1000% last year again.`;

      const result = await findLocationInChunk(
        {
          chunkText,
          fullDocumentText: fullDoc,
          chunkStartOffset: 0,
          searchText: 'Bitcoin grew 1000%',
        },
        mockContext
      );

      expect(result.found).toBe(true);
      // Should find first occurrence (in chunk)
      expect(result.location?.startOffset).toBeLessThan(chunkText.length);
      // Should have chunk strategy marker
      expect(result.location?.strategy).toContain('chunk');
    });
  });
});

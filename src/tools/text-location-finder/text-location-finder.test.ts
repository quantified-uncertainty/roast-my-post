import { describe, it, expect, beforeEach } from '@jest/globals';
import textLocationFinderTool from './index';
import type { TextLocationFinderInput } from './index';
import { logger } from '@/lib/logger';

describe('TextLocationFinderTool', () => {
  const context = { userId: 'test-user', logger };

  describe('basic functionality', () => {
    it('should find exact matches', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'This is a test document with some text.',
        searchText: 'test document'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      expect(result.location?.strategy).toBe('exact');
      expect(result.location?.quotedText).toBe('test document');
      expect(result.location?.startOffset).toBe(10);
      expect(result.location?.endOffset).toBe(23);
      expect(result.searchText).toBe('test document');
    });

    it('should handle not found cases', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'This is a test document.',
        searchText: 'nonexistent text'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(false);
      expect(result.location).toBeUndefined();
      expect(result.error).toBe('Text not found in document');
    });

    it('should handle quote normalization with correct offsets', async () => {
      const input: TextLocationFinderInput = {
        documentText: "This has 'smart quotes' and apostrophes.",
        searchText: "This has 'smart quotes' and apostrophes.",
        options: {
          normalizeQuotes: true
        }
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      // When the text matches exactly, it uses 'exact' strategy even with normalizeQuotes enabled
      expect(['exact', 'quotes-normalized'].includes(result.location?.strategy || '')).toBe(true);
      expect(result.location?.quotedText).toBe("This has 'smart quotes' and apostrophes.");
      expect(result.location?.startOffset).toBe(0);
      expect(result.location?.endOffset).toBe(40);
    });

    it('should handle actual quote normalization', async () => {
      const input: TextLocationFinderInput = {
        documentText: "This has 'smart quotes' and apostrophes.",
        searchText: "This has 'smart quotes' and apostrophes.", // Different quote types
        options: {
          normalizeQuotes: true
        }
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      expect(result.location?.strategy).toBe('quotes-normalized');
      expect(result.location?.quotedText).toBe("This has 'smart quotes' and apostrophes.");
      expect(result.location?.startOffset).toBe(0);
      expect(result.location?.endOffset).toBe(40);
    });

    it('should NOT do case insensitive search by default', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'This is a TEST document.',
        searchText: 'test document'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(false);
    });


    it('should handle partial matching when enabled', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'This is a very long sentence that contains specific information.',
        searchText: 'very long sentence that contains different text that does not exactly match',
        options: {
          partialMatch: true
        }
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      expect(result.location?.strategy).toBe('partial');
    });

    it('should handle context-based searching', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'The study shows climate change impacts. Research indicates significant environmental effects.',
        searchText: 'climate change impacts',
        context: 'environmental research study'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
    });

    it('should return processing time', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'Test document.',
        searchText: 'Test'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });


    it('should validate input schema', () => {
      const validInput: TextLocationFinderInput = {
        documentText: 'Test document',
        searchText: 'Test'
      };

      expect(() => textLocationFinderTool.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should validate output schema', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'Test document',
        searchText: 'Test'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(() => textLocationFinderTool.outputSchema.parse(result)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty search text gracefully', async () => {
      const input = {
        documentText: 'Test document',
        searchText: ''
      };

      // Should be rejected by schema validation
      expect(() => textLocationFinderTool.inputSchema.parse(input)).toThrow();
    });

    it('should handle very long documents', async () => {
      const longDocument = 'Test '.repeat(10000) + 'target text';
      const input: TextLocationFinderInput = {
        documentText: longDocument,
        searchText: 'target text'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      expect(result.location?.quotedText).toBe('target text');
    });

    it('should handle unicode characters', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'Document with émojis 🚀 and spëcial characters',
        searchText: 'émojis 🚀'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      expect(result.location?.quotedText).toBe('émojis 🚀');
    });
  });

  describe('configuration', () => {
    it('should have correct tool configuration', () => {
      const config = textLocationFinderTool.config;

      expect(config.id).toBe('text-location-finder');
      expect(config.name).toBe('Text Location Finder');
      expect(config.category).toBe('utility');
      expect(config.status).toBe('stable');
    });

    it('should provide examples', () => {
      const examples = textLocationFinderTool.getExamples();

      expect(examples).toHaveLength(5);
      expect(examples[0].description).toBe('Basic exact text search');
      expect(examples[1].description).toBe('Quote normalization (apostrophes)');
      expect(examples[2].description).toBe('Partial match for long text');
    });

    it('should validate access', async () => {
      const hasAccess = await textLocationFinderTool.validateAccess(context);
      expect(hasAccess).toBe(true);
    });
  });
});
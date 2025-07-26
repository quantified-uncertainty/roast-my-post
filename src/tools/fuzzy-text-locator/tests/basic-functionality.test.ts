import { describe, it, expect, beforeEach } from '@jest/globals';
import textLocationFinderTool from '../index';
import type { TextLocationFinderInput } from '../index';
import { logger } from '@/lib/logger';
import { exactSearch } from '../exactSearch';
import { uFuzzySearch } from '../uFuzzySearch';
import { convertLLMResultToLocation, generateLLMSearchPrompts } from "../llmSearch";
import { LineBasedLocator } from "@/lib/text-location/line-based";

describe('Fuzzy Text Locator - Basic Functionality', () => {
  const context = { userId: 'test-user', logger };

  describe('Tool interface', () => {
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

    it('should handle quote normalization', async () => {
      const input: TextLocationFinderInput = {
        documentText: "This has 'smart quotes' and apostrophes.",
        searchText: "This has 'smart quotes' and apostrophes.",
        options: { normalizeQuotes: true }
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      expect(['exact', 'quotes-normalized'].includes(result.location?.strategy || '')).toBe(true);
    });

    it('should do case insensitive search with uFuzzy', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'This is a TEST document.',
        searchText: 'test document'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      expect(result.location?.strategy).toBe('ufuzzy');
      expect(result.location?.quotedText).toBe('TEST document');
    });

    it('should handle partial matching', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'This is a very long sentence that contains specific information.',
        searchText: 'very long sentence that contains different text that does not exactly match',
        options: { partialMatch: true }
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.found).toBe(true);
      expect(result.location?.strategy).toBe('partial');
    });

    it('should return processing time', async () => {
      const input: TextLocationFinderInput = {
        documentText: 'Test document.',
        searchText: 'Test'
      };

      const result = await textLocationFinderTool.execute(input, context);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should validate schemas', async () => {
      const validInput: TextLocationFinderInput = {
        documentText: 'Test document',
        searchText: 'Test'
      };

      expect(() => textLocationFinderTool.inputSchema.parse(validInput)).not.toThrow();

      const result = await textLocationFinderTool.execute(validInput, context);
      expect(() => textLocationFinderTool.outputSchema.parse(result)).not.toThrow();
    });
  });

  describe('Direct search functions', () => {
    it('exactSearch should find exact matches', () => {
      const result = exactSearch('quick brown', 'The quick brown fox jumps');
      expect(result).toBeTruthy();
      expect(result?.startOffset).toBe(4);
      expect(result?.endOffset).toBe(15);
      expect(result?.quotedText).toBe('quick brown');
    });

    it('uFuzzySearch should handle typos', () => {
      const result = uFuzzySearch('quikc browm', 'The quick brown fox jumps');
      expect(result).toBeTruthy();
      expect(result?.strategy).toBe('ufuzzy');
    });

    it('uFuzzySearch should handle case differences', () => {
      const result = uFuzzySearch('QUICK BROWN', 'The quick brown fox jumps');
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('quick brown');
    });

    it('uFuzzySearch should skip short queries', () => {
      const result = uFuzzySearch('hi', 'Hello hi there');
      expect(result).toBeNull();
    });
  });

  describe('LLM search components', () => {
    const sampleDocument = `The quick brown fox jumps over the lazy dog.
Machine learning has many applications. Machine learning paradigms include supervised learning.
This is the third line with some content.`;

    let locator: LineBasedLocator;

    beforeEach(() => {
      locator = new LineBasedLocator(sampleDocument);
    });

    it('should convert valid LLM result to text location', () => {
      const llmResult = {
        found: true,
        startLineNumber: 2,
        endLineNumber: 2,
        startCharacters: "Machine lea",
        endCharacters: "paradigms",
        confidence: 1.0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "machine learning paradigms",
        sampleDocument
      );

      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe("Machine learning paradigms");
      expect(result?.strategy).toBe("llm");
      expect(result?.confidence).toBe(0.9); // Scaled down from 1.0
    });

    it('should handle not found LLM results', () => {
      const llmResult = {
        found: false,
        startLineNumber: 0,
        endLineNumber: 0,
        startCharacters: "",
        endCharacters: "",
        confidence: 0,
      };

      const result = convertLLMResultToLocation(
        llmResult,
        locator,
        "nonexistent text",
        sampleDocument
      );

      expect(result).toBeNull();
    });

    it('should generate LLM search prompts', () => {
      const prompts = generateLLMSearchPrompts('test query', sampleDocument);
      
      expect(prompts.systemPrompt).toContain('text locator');
      expect(prompts.userPrompt).toContain('test query');
      expect(prompts.userPrompt).toContain(sampleDocument);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty search text', async () => {
      const input = {
        documentText: 'Test document',
        searchText: ''
      };

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

    it('should handle punctuation correctly', () => {
      const doc = 'The journey continues... but where will it lead?';
      const query = 'continues...';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      expect(exactResult?.startOffset).toBe(12);
      expect(exactResult?.endOffset).toBe(24);
    });

    it('should handle word boundaries', () => {
      const doc = 'The bicycle shop sells bicycles and tricycles.';
      const query = 'bicycle';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      expect(exactResult?.startOffset).toBe(4);
      expect(exactResult?.endOffset).toBe(11);
      expect(exactResult?.quotedText).toBe('bicycle');
    });
  });

  describe('Tool configuration', () => {
    it('should have correct tool configuration', () => {
      const config = textLocationFinderTool.config;

      expect(config.id).toBe('fuzzy-text-locator');
      expect(config.name).toBe('Fuzzy Text Locator');
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
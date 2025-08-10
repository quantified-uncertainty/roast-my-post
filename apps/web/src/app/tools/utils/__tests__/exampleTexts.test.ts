/**
 * @jest-environment node
 */
import { toolExamples, getToolExamples, getRandomExample } from '../exampleTexts';

describe('exampleTexts utilities', () => {
  describe('toolExamples', () => {
    it('should have examples for all major tools', () => {
      expect(toolExamples['check-spelling-grammar']).toBeDefined();
      expect(toolExamples['extract-factual-claims']).toBeDefined();
      expect(toolExamples['fact-checker']).toBeDefined();
      expect(toolExamples['extract-forecasting-claims']).toBeDefined();
      expect(toolExamples['extract-math-expressions']).toBeDefined();
      expect(toolExamples['check-math']).toBeDefined();
      expect(toolExamples['link-validator']).toBeDefined();
      expect(toolExamples['perplexity-research']).toBeDefined();
      expect(toolExamples['document-chunker']).toBeDefined();
      expect(toolExamples['forecaster-simple']).toBeDefined();
    });

    it('should have array examples for multi-example tools', () => {
      expect(Array.isArray(toolExamples['check-spelling-grammar'])).toBe(true);
      expect(Array.isArray(toolExamples['extract-forecasting-claims'])).toBe(true);
      expect(Array.isArray(toolExamples['perplexity-research'])).toBe(true);
    });

    it('should have string examples for single-example tools', () => {
      expect(typeof toolExamples['extract-factual-claims']).toBe('string');
      expect(typeof toolExamples['fact-checker']).toBe('string');
      expect(typeof toolExamples['extract-math-expressions']).toBe('string');
      expect(typeof toolExamples['document-chunker']).toBe('string');
    });

    it('should have object examples for complex tools', () => {
      expect(typeof toolExamples['fuzzy-text-locator']).toBe('object');
      expect(toolExamples['fuzzy-text-locator']).toHaveProperty('text');
      expect(toolExamples['fuzzy-text-locator']).toHaveProperty('search');
    });
  });

  describe('getToolExamples', () => {
    it('should return examples for valid tool IDs', () => {
      const examples = getToolExamples('check-spelling-grammar');
      expect(Array.isArray(examples)).toBe(true);
      expect(examples).toHaveLength(5);
    });

    it('should return mutable arrays for array examples', () => {
      const examples1 = getToolExamples('check-spelling-grammar') as string[];
      const examples2 = getToolExamples('check-spelling-grammar') as string[];
      expect(examples1).not.toBe(examples2); // Different array instances
      expect(examples1).toEqual(examples2); // Same content
    });

    it('should return strings directly for string examples', () => {
      const example = getToolExamples('fact-checker');
      expect(typeof example).toBe('string');
      expect(example).toContain('Earth is flat');
    });

    it('should return undefined for invalid tool IDs', () => {
      const example = getToolExamples('non-existent-tool');
      expect(example).toBeUndefined();
    });

    it('should handle fuzzy-text-locator object example', () => {
      const example = getToolExamples('fuzzy-text-locator');
      expect(typeof example).toBe('object');
      expect(example).toHaveProperty('text');
      expect(example).toHaveProperty('search');
    });
  });

  describe('getRandomExample', () => {
    it('should return a random example from array examples', () => {
      // Mock Math.random to test deterministically
      const originalRandom = Math.random;
      
      // Test first item
      Math.random = jest.fn(() => 0);
      const first = getRandomExample('check-spelling-grammar');
      expect(first).toBe("Their going to there house over they're.");
      
      // Test last item
      Math.random = jest.fn(() => 0.99);
      const last = getRandomExample('check-spelling-grammar');
      expect(last).toBe("The data shows that sales has increased significantly.");
      
      // Restore
      Math.random = originalRandom;
    });

    it('should return the string directly for single examples', () => {
      const example = getRandomExample('fact-checker');
      expect(typeof example).toBe('string');
      expect(example).toContain('Earth is flat');
    });

    it('should return undefined for non-array, non-string examples', () => {
      const example = getRandomExample('fuzzy-text-locator');
      expect(example).toBeUndefined();
    });

    it('should return undefined for invalid tool IDs', () => {
      const example = getRandomExample('non-existent-tool');
      expect(example).toBeUndefined();
    });
  });

  describe('example content validation', () => {
    it('should have meaningful spelling/grammar examples', () => {
      const examples = toolExamples['check-spelling-grammar'] as string[];
      expect(examples[0]).toContain("Their going to there");
      expect(examples[1]).toContain("it's tail");
      expect(examples[2]).toContain("Me and him");
    });

    it('should have valid math examples', () => {
      const example = toolExamples['extract-math-expressions'] as string;
      expect(example).toContain('50%');
      expect(example).toContain('(V_f/V_i)^(1/n) - 1');
      expect(example).toContain('E = output/input');
    });

    it('should have valid URLs in link-validator example', () => {
      const example = toolExamples['link-validator'] as string;
      expect(example).toContain('https://docs.example.com');
      expect(example).toContain('https://github.com');
      expect(example).toContain('https://notarealwebsite12345.com');
    });

    it('should have valid forecast questions', () => {
      const examples = toolExamples['extract-forecasting-claims'] as string[];
      expect(examples[0]).toContain('2030');
      expect(examples[1]).toContain('2025');
      expect(examples.every(q => q.includes('will') || q.includes('Will'))).toBe(true);
    });
  });
});
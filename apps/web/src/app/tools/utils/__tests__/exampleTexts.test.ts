/**
 * @jest-environment node
 */
import { toolExamples, getToolExamples } from '../exampleTexts';

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

    it('should have array examples for multiple-example tools', () => {
      expect(Array.isArray(toolExamples['extract-factual-claims'])).toBe(true);
      expect(Array.isArray(toolExamples['fact-checker'])).toBe(true);
      expect(Array.isArray(toolExamples['extract-math-expressions'])).toBe(true);
      expect(Array.isArray(toolExamples['document-chunker'])).toBe(true);
    });

    it('should have array of object examples for complex tools', () => {
      expect(Array.isArray(toolExamples['fuzzy-text-locator'])).toBe(true);
      const firstExample = toolExamples['fuzzy-text-locator'][0];
      expect(firstExample).toHaveProperty('text');
      expect(firstExample).toHaveProperty('search');
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

    it('should return arrays for array examples', () => {
      const examples = getToolExamples('fact-checker') as string[];
      expect(Array.isArray(examples)).toBe(true);
      expect(examples[0]).toContain('Earth is flat');
    });

    it('should return undefined for invalid tool IDs', () => {
      const example = getToolExamples('non-existent-tool');
      expect(example).toBeUndefined();
    });

    it('should handle fuzzy-text-locator array of object examples', () => {
      const examples = getToolExamples('fuzzy-text-locator') as Array<{text: string, search: string}>;
      expect(Array.isArray(examples)).toBe(true);
      const firstExample = examples[0];
      expect(firstExample).toHaveProperty('text');
      expect(firstExample).toHaveProperty('search');
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
      const examples = toolExamples['extract-math-expressions'] as string[];
      expect(examples[0]).toContain('50%');
      expect(examples[0]).toContain('(V_f/V_i)^(1/n) - 1');
      expect(examples[1]).toContain('E = output/input');
    });

    it('should have valid URLs in link-validator examples', () => {
      const examples = toolExamples['link-validator'] as string[];
      expect(examples[0]).toContain('https://docs.example.com');
      expect(examples[0]).toContain('https://github.com');
      expect(examples[0]).toContain('https://notarealwebsite12345.com');
    });

    it('should have valid forecast questions', () => {
      const examples = toolExamples['extract-forecasting-claims'] as string[];
      expect(examples[0]).toContain('2030');
      expect(examples[1]).toContain('2025');
      expect(examples.every(q => q.includes('will') || q.includes('Will'))).toBe(true);
    });
  });
});
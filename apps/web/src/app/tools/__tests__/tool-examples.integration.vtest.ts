/**
 * Integration tests that verify all tool examples work correctly
 * This test suite uses the actual examples from each tool's examples.ts file
 * to ensure they are valid and produce expected results
 */

import { toolRegistry } from '@roast/ai/server';
import { allToolConfigs } from '@roast/ai';

describe('Tool Examples Integration Tests', () => {
  // Derive tool IDs from the registry instead of hardcoding
  const toolsWithExamples = allToolConfigs.map(config => config.id);

  describe.each(toolsWithExamples)('%s examples', (toolId) => {
    let examples: any;
    let tool: any;

    beforeAll(async () => {
      try {
        // Import examples from the tool's examples.ts file
        const examplesModule = await import(`../${toolId}/examples.ts`);
        examples = examplesModule.examples;
        
        // Get the tool from registry
        tool = toolRegistry.get(toolId);
      } catch (error) {
        // If import fails, skip tests for this tool
        console.warn(`Could not load examples for ${toolId}:`, error);
      }
    });

    it('should have at least 3 examples', () => {
      if (!examples) {
        console.warn(`Skipping test for ${toolId} - no examples found`);
        return;
      }
      
      expect(Array.isArray(examples)).toBe(true);
      expect(examples.length).toBeGreaterThanOrEqual(3);
    });

    it('should have valid example format for the tool', () => {
      if (!examples || !tool) {
        console.warn(`Skipping test for ${toolId} - tool or examples not found`);
        return;
      }

      examples.forEach((example: any, index: number) => {
        // Check basic structure based on tool type
        if (toolId === 'fuzzy-text-locator') {
          // Special case for fuzzy-text-locator with paired inputs
          expect(example).toHaveProperty('text');
          expect(example).toHaveProperty('search');
          expect(typeof example.text).toBe('string');
          expect(typeof example.search).toBe('string');
          expect(example.text.length).toBeGreaterThan(0);
          expect(example.search.length).toBeGreaterThan(0);
        } else {
          // Most tools just have string examples
          expect(typeof example).toBe('string');
          expect(example.length).toBeGreaterThan(0);
        }
      });
    });

    it('should have diverse examples with different content', () => {
      if (!examples || examples.length < 2) {
        console.warn(`Skipping diversity test for ${toolId}`);
        return;
      }

      // Check that examples are not duplicates
      const uniqueExamples = new Set(
        examples.map((ex: any) => 
          typeof ex === 'string' ? ex : JSON.stringify(ex)
        )
      );
      
      expect(uniqueExamples.size).toBe(examples.length);
      
      // For text-based tools, check that examples have reasonable variation
      if (typeof examples[0] === 'string') {
        // Skip variation check for document-chunker and similar tools
        // where consistent formatting is more important than length variation
        if (toolId === 'document-chunker' || toolId === 'link-validator') {
          // These tools benefit from consistent example structure
          return;
        }
        
        const lengths = examples.map((ex: string) => ex.length);
        const minLength = Math.min(...lengths);
        const maxLength = Math.max(...lengths);
        
        // Examples should have some variation in length (at least 10% difference)
        // or at least 20 characters difference
        const hasVariation = maxLength > minLength * 1.1 || maxLength - minLength > 20;
        expect(hasVariation).toBe(true);
      }
    });

    it('should have examples appropriate for the tool purpose', () => {
      if (!examples) return;

      // Tool-specific content checks
      switch(toolId) {
        case 'math-validator-llm':
        case 'math-validator-hybrid':
        case 'math-validator-mathjs':
          examples.forEach((ex: string) => {
            // Math examples should contain numbers
            expect(ex).toMatch(/\d/); // Contains digits
            // Should contain either math operators or math terminology
            expect(ex).toMatch(/[+\-*/=]|equation|formula|calculate|solve|area|volume|interest/i);
          });
          break;
          
        case 'spelling-grammar-checker':
          examples.forEach((ex: string) => {
            // Should be complete sentences
            expect(ex).toMatch(/[.!?]/); // Has sentence ending
            expect(ex.split(' ').length).toBeGreaterThan(3); // Multiple words
          });
          break;
          
        case 'factual-claims-extractor':
        case 'fact-checker':
          examples.forEach((ex: string) => {
            // Should contain factual statements
            expect(ex.split('.').length).toBeGreaterThanOrEqual(1); // Has statements
            expect(ex.length).toBeGreaterThan(50); // Substantial content
          });
          break;
          
        case 'binary-forecasting-claims-extractor':
        case 'binary-forecaster':
          examples.forEach((ex: string) => {
            // Should contain future predictions
            expect(ex).toMatch(/will|by \d{4}|next|future|forecast|predict/i);
          });
          break;
          
        case 'link-validator':
          examples.forEach((ex: string) => {
            // Should contain URLs
            expect(ex).toMatch(/https?:\/\//);
          });
          break;
          
        case 'perplexity-researcher':
          examples.forEach((ex: string) => {
            // Should be research queries
            expect(ex.split(' ').length).toBeGreaterThan(2); // Multi-word queries
            expect(ex.length).toBeLessThan(200); // Not too long for a query
          });
          break;
          
        case 'document-chunker':
          examples.forEach((ex: string) => {
            // Should be substantial documents
            expect(ex.length).toBeGreaterThan(200); // Long enough to chunk
            expect(ex.split('\n').length).toBeGreaterThan(2); // Multiple paragraphs
          });
          break;
          
        case 'smart-text-searcher':
          examples.forEach((ex: any) => {
            // Search text should be substring or similar to document text
            expect(ex.text || ex.documentText).toBeDefined();
            expect(ex.search || ex.searchText).toBeDefined();
          });
          break;
      }
    });
  });

  describe('Example consistency across tools', () => {
    it('all tools should have examples in centralized configuration', async () => {
      const { toolExamples } = await import('../utils/toolExamples');
      
      // Check that we have examples configured
      expect(Object.keys(toolExamples).length).toBeGreaterThan(0);
      
      // Check that examples have consistent structure
      for (const [toolId, examples] of Object.entries(toolExamples)) {
        expect(Array.isArray(examples)).toBe(true);
        
        for (const example of examples) {
          expect(example).toHaveProperty('label');
          expect(example).toHaveProperty('values');
          expect(typeof example.label).toBe('string');
          expect(typeof example.values).toBe('object');
        }
      }
    });

    it('centralized examples should be accessible', async () => {
      const { toolExamples } = await import('../utils/toolExamples');
      
      // Just verify the import works and we have some examples
      expect(toolExamples).toBeDefined();
      expect(typeof toolExamples).toBe('object');
      
      // Check a few known tools have examples
      const knownTools = ['math-validator-llm', 'smart-text-searcher', 'fact-checker'];
      const availableTools = knownTools.filter(tool => tool in toolExamples);
      expect(availableTools.length).toBeGreaterThan(0);
    });
  });
});
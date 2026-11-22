import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { validateGeneratedSchemas } from './check-generated-schemas';
import { toolSchemas } from './generated-schemas';

describe('Generated Schemas', () => {
  it('should be up-to-date with tool definitions', () => {
    // This will throw if schemas are stale
    expect(() => validateGeneratedSchemas()).not.toThrow();
  });
  
  it('should have generated schemas file', () => {
    // This ensures the file exists and can be imported
    expect(toolSchemas).toBeDefined();
    expect(Object.keys(toolSchemas).length).toBeGreaterThan(0);
  });
  
  it('should include all expected tools', () => {
    const expectedTools = [
      'spelling-grammar-checker',
      'factual-claims-extractor',
      'fact-checker',
      'math-validator-mathjs',
      'math-validator-llm',
      'math-validator-hybrid',
      'math-expressions-extractor',
      'binary-forecasting-claims-extractor',
      'document-chunker',
      'smart-text-searcher',
      'language-convention-detector',
      'binary-forecaster',
      'link-validator',
      'perplexity-researcher',
    ];
    
    for (const toolId of expectedTools) {
      expect(toolSchemas[toolId]).toBeDefined();
      expect(toolSchemas[toolId].inputSchema).toBeDefined();
      expect(toolSchemas[toolId].outputSchema).toBeDefined();
    }
  });
});
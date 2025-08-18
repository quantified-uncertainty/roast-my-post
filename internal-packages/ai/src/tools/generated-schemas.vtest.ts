import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { validateGeneratedSchemas } from './check-generated-schemas';

describe('Generated Schemas', () => {
  it('should be up-to-date with tool definitions', () => {
    // This will throw if schemas are stale
    expect(() => validateGeneratedSchemas()).not.toThrow();
  });
  
  it('should have generated schemas file', () => {
    // This ensures the file exists and can be imported
    const { toolSchemas } = require('./generated-schemas');
    expect(toolSchemas).toBeDefined();
    expect(Object.keys(toolSchemas).length).toBeGreaterThan(0);
  });
  
  it('should include all expected tools', () => {
    const { toolSchemas } = require('./generated-schemas');
    const expectedTools = [
      'check-spelling-grammar',
      'extract-factual-claims',
      'fact-checker',
      'check-math-with-mathjs',
      'check-math',
      'extract-math-expressions',
      'document-chunker',
      'fuzzy-text-locator',
    ];
    
    for (const toolId of expectedTools) {
      expect(toolSchemas[toolId]).toBeDefined();
      expect(toolSchemas[toolId].inputSchema).toBeDefined();
      expect(toolSchemas[toolId].outputSchema).toBeDefined();
    }
  });
});
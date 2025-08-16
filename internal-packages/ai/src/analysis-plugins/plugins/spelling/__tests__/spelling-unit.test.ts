import { describe, test, expect, jest } from '@jest/globals';
import { SpellingPlugin } from '../index';
import type { TextChunk } from '../../../types';

// Mock the tools
jest.mock('../../../../tools/check-spelling-grammar', () => ({
  checkSpellingGrammarTool: {
    execute: jest.fn().mockResolvedValue({
      errors: [
        {
          errorText: 'documnet',
          correction: 'document',
          errorType: 'spelling',
          importance: 85,
          confidence: 95,
          context: 'This documnet has',
          description: 'Misspelling of "document"'
        },
        {
          errorText: 'varios',
          correction: 'various',
          errorType: 'spelling',
          importance: 75,
          confidence: 90,
          context: 'has varios spelling',
          description: 'Misspelling of "various"'
        }
      ]
    })
  }
}));

jest.mock('../../../../tools/detect-language-convention', () => ({
  detectLanguageConventionTool: {
    execute: jest.fn().mockResolvedValue({
      language: 'US',
      confidence: 90,
      indicators: ['spelling patterns']
    })
  }
}));

jest.mock('../../../../tools/fuzzy-text-locator/core', () => ({
  findTextLocation: jest.fn().mockImplementation((text, searchText) => {
    const index = text.indexOf(searchText);
    if (index === -1) return null;
    return {
      startOffset: index,
      endOffset: index + searchText.length,
      quotedText: searchText,
      confidence: 1.0
    };
  })
}));

describe('SpellingPlugin Unit Test', () => {
  test('should detect spelling errors in text chunks', async () => {
    const plugin = new SpellingPlugin();
    
    const chunks: TextChunk[] = [
      {
        id: 'chunk-1',
        text: 'This documnet has varios spelling errors.',
        metadata: {
          position: { start: 0, end: 41 },
          type: 'paragraph'
        }
      }
    ];
    
    const fullText = 'This documnet has varios spelling errors.';
    
    const result = await plugin.analyze(chunks, fullText);
    
    // Should return analysis result
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('cost');
    
    // Should detect the mocked errors
    expect(result.comments.length).toBe(2);
    
    // Check first error
    const firstComment = result.comments[0];
    expect(firstComment.description).toContain('document');
    expect(firstComment.highlight).toBeDefined();
    expect(firstComment.highlight?.quotedText).toBe('documnet');
    expect(firstComment.highlight?.startOffset).toBe(5);
    expect(firstComment.highlight?.endOffset).toBe(13);
    
    // Check second error  
    const secondComment = result.comments[1];
    expect(secondComment.description).toContain('various');
    expect(secondComment.highlight?.quotedText).toBe('varios');
    
    // Summary should mention the errors found
    expect(result.summary).toContain('2');
    expect(result.summary.toLowerCase()).toContain('spelling');
  });
  
  test('should handle empty chunks', async () => {
    const plugin = new SpellingPlugin();
    
    const chunks: TextChunk[] = [];
    const fullText = '';
    
    const result = await plugin.analyze(chunks, fullText);
    
    expect(result.comments).toHaveLength(0);
    expect(result.summary).toContain('No spelling');
    expect(result.cost).toBe(0);
  });
  
  test('should have correct plugin metadata', () => {
    const plugin = new SpellingPlugin();
    
    expect(plugin.name()).toBe('SPELLING');
    expect(plugin.description()).toContain('spelling');
    expect(plugin.version()).toBeTruthy();
    expect(plugin.runOnAllChunks).toBe(true);
  });
});
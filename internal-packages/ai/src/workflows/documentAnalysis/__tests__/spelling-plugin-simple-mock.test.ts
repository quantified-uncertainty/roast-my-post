import { describe, test, expect, jest, beforeAll } from '@jest/globals';
import { SpellingAnalyzerJob } from '../../../analysis-plugins/plugins/spelling';
import { TextChunk } from '../../../analysis-plugins/TextChunk';

// Mock all the tool dependencies before importing the plugin
jest.mock('../../../tools/check-spelling-grammar', () => ({
  checkSpellingGrammarTool: {
    execute: jest.fn().mockResolvedValue({
      errors: [
        {
          text: 'documnet',
          correction: 'document',
          type: 'spelling',
          importance: 85,
          confidence: 95,
          context: 'This documnet has',
          description: 'Misspelling of "document"'
        },
        {
          text: 'varios',
          correction: 'various',
          type: 'spelling',
          importance: 75,
          confidence: 90,
          context: 'has varios spelling',
          description: 'Misspelling of "various"'
        }
      ]
    })
  }
}));

jest.mock('../../../tools/check-spelling-grammar/commentGeneration', () => ({
  generateDocumentSummary: jest.fn().mockReturnValue('Summary of spelling errors'),
  generateSpellingComment: jest.fn().mockImplementation((error) => `${error.text} → ${error.correction}`)
}));

jest.mock('../../../tools/check-spelling-grammar/grading', () => ({
  calculateGrade: jest.fn().mockReturnValue({
    grade: 75,
    category: 'Fair',
    statistics: {
      errorsByType: { spelling: 2, grammar: 0 },
      errorsBySeverity: { critical: 0, major: 2, minor: 0 }
    }
  }),
  countWords: jest.fn().mockReturnValue(10)
}));

jest.mock('../../../tools/detect-language-convention/conventionDetector', () => ({
  detectLanguageConvention: jest.fn().mockReturnValue({
    convention: 'US',
    confidence: 0.9,
    consistency: 0.95
  }),
  getConventionExamples: jest.fn().mockReturnValue(['color', 'center'])
}));

describe('SpellingPlugin Simple Mock Test', () => {
  beforeAll(() => {
    // Suppress error logs during test
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('should detect spelling errors with mocked tools', async () => {
    const plugin = new SpellingAnalyzerJob();
    
    const documentText = 'This documnet has varios spelling errors.';
    
    // Create chunk with mocked findTextAbsolute method
    const chunk = new TextChunk(
      'chunk-0',
      documentText,
      0,
      documentText.length,
      { type: 'paragraph' }
    );
    
    // Mock the findTextAbsolute method to return proper locations
    chunk.findTextAbsolute = jest.fn().mockImplementation((searchText: string) => {
      const index = documentText.indexOf(searchText);
      if (index === -1) return null;
      return {
        startOffset: index,
        endOffset: index + searchText.length,
        quotedText: searchText
      };
    });
    
    const chunks: TextChunk[] = [chunk];
    
    const result = await plugin.analyze(chunks, documentText);
    
    // Should return analysis result
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('cost');
    expect(result).toHaveProperty('grade');
    
    // Should have detected the mocked errors
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
    expect(result.summary.toLowerCase()).toContain('writing quality');
    
    // Analysis should contain details
    expect(result.analysis).toContain('Key Findings');
    expect(result.analysis).toContain('2 spelling error');
    
    // Should have grading result
    expect(result.grade).toBe(75);
  });
  
  test('should handle empty document', async () => {
    const plugin = new SpellingAnalyzerJob();
    
    // Mock empty errors for this test
    const mockExecute = jest.requireMock('../../../tools/check-spelling-grammar').checkSpellingGrammarTool.execute;
    mockExecute.mockResolvedValueOnce({ errors: [] });
    
    const documentText = '';
    const chunks: TextChunk[] = [];
    
    const result = await plugin.analyze(chunks, documentText);
    
    expect(result.comments).toHaveLength(0);
    expect(result.summary.toLowerCase()).toContain('excellent');
  });
});
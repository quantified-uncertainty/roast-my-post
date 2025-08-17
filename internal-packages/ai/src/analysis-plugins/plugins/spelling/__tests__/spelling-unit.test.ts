import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { TextChunk } from '../../../types';

// Mock all the dependencies
jest.mock('../../../../tools/check-spelling-grammar');
jest.mock('../../../../tools/detect-language-convention/conventionDetector');
jest.mock('../../../utils/CommentBuilder');
jest.mock('../../../../shared/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('SpellingPlugin Unit Test', () => {
  let SpellingPlugin: any;
  let checkSpellingGrammarTool: any;
  let detectLanguageConvention: any;
  let CommentBuilder: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    const checkSpellingModule = require('../../../../tools/check-spelling-grammar');
    checkSpellingGrammarTool = {
      execute: jest.fn().mockResolvedValue({
        errors: [
          {
            text: 'documnet',
            correction: 'document',
            type: 'spelling',
            importance: 85,
            confidence: 95,
            context: 'This documnet has',
            description: 'Misspelling of "document"',
            conciseCorrection: 'documnet → document'
          },
          {
            text: 'varios',
            correction: 'various',
            type: 'spelling',
            importance: 75,
            confidence: 90,
            context: 'has varios spelling',
            description: 'Misspelling of "various"',
            conciseCorrection: 'varios → various'
          }
        ]
      })
    };
    checkSpellingModule.checkSpellingGrammarTool = checkSpellingGrammarTool;
    
    // Mock generateSpellingComment
    checkSpellingModule.generateSpellingComment = jest.fn().mockImplementation((error) => 
      `${error.type === 'spelling' ? 'Spelling' : 'Grammar'} error: "${error.text}" should be "${error.correction}"`
    );
    
    // Mock generateDocumentSummary 
    checkSpellingModule.generateDocumentSummary = jest.fn().mockReturnValue('Error summary');
    
    // Mock grading functions
    checkSpellingModule.calculateGrade = jest.fn().mockReturnValue({
      grade: 85,
      category: 'Good',
      statistics: {
        errorsByType: { spelling: 2, grammar: 0 },
        errorsBySeverity: { critical: 0, major: 0, minor: 2 }
      }
    });
    checkSpellingModule.countWords = jest.fn().mockReturnValue(10);
    
    const conventionModule = require('../../../../tools/detect-language-convention/conventionDetector');
    detectLanguageConvention = jest.fn().mockReturnValue({
      convention: 'US',
      confidence: 0.9,
      consistency: 0.95,
      indicators: ['spelling patterns']
    });
    conventionModule.detectLanguageConvention = detectLanguageConvention;
    conventionModule.getConventionExamples = jest.fn().mockReturnValue(['color', 'center']);
    
    const commentBuilderModule = require('../../../utils/CommentBuilder');
    CommentBuilder = {
      build: jest.fn().mockImplementation((params) => ({
        id: 'comment-' + Math.random(),
        description: params.description,
        highlight: params.location,
        ...params
      }))
    };
    commentBuilderModule.CommentBuilder = CommentBuilder;
    
    // Now import the plugin after mocks are set up
    const pluginModule = require('../index');
    SpellingPlugin = pluginModule.SpellingPlugin;
  });
  test('should detect spelling errors in text chunks', async () => {
    const plugin = new SpellingPlugin();
    
    // Create mock chunk with required methods
    const chunks: any[] = [
      {
        id: 'chunk-1',
        text: 'This documnet has varios spelling errors.',
        metadata: {
          position: { start: 0, end: 41 },
          type: 'paragraph'
        },
        findTextAbsolute: jest.fn().mockImplementation((searchText) => {
          const index = 'This documnet has varios spelling errors.'.indexOf(searchText);
          if (index === -1) return null;
          return {
            startOffset: index,
            endOffset: index + searchText.length,
            quotedText: searchText
          };
        }),
        getLineNumber: jest.fn().mockReturnValue(1)
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
    expect(firstComment.description).toBeDefined();
    expect(firstComment.description).toContain('documnet');
    expect(firstComment.location).toBeDefined();
    expect(firstComment.location?.quotedText).toBe('documnet');
    expect(firstComment.location?.startOffset).toBe(5);
    expect(firstComment.location?.endOffset).toBe(13);
    
    // Check second error  
    const secondComment = result.comments[1];
    expect(secondComment.description).toContain('varios');
    expect(secondComment.location?.quotedText).toBe('varios');
    
    // Summary should mention the errors found
    expect(result.summary.toLowerCase()).toContain('issues');
  });
  
  test('should handle empty chunks', async () => {
    const plugin = new SpellingPlugin();
    
    const chunks: any[] = [];
    const fullText = '';
    
    // Mock to return no errors for empty text
    checkSpellingGrammarTool.execute.mockResolvedValue({ errors: [] });
    
    const result = await plugin.analyze(chunks, fullText);
    
    expect(result.comments).toHaveLength(0);
    expect(result.summary).toContain('excellent');
    expect(result.cost).toBe(0);
  });
  
  test('should have correct plugin metadata', () => {
    const plugin = new SpellingPlugin();
    
    expect(plugin.name()).toBe('SPELLING');
    expect(plugin.promptForWhenToUse()).toContain('Spelling');
    expect(plugin.runOnAllChunks).toBe(true);
  });
});
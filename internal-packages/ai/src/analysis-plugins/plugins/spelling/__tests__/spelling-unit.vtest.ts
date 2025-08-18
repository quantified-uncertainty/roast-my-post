import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { TextChunk } from '../../../types';

// Mock all the dependencies
vi.mock('../../../../tools/check-spelling-grammar', () => ({
  default: {
    execute: vi.fn()
  },
  generateSpellingComment: vi.fn(),
  generateDocumentSummary: vi.fn(),
  calculateGrade: vi.fn(),
  countWords: vi.fn()
}));

vi.mock('../../../../tools/detect-language-convention/conventionDetector', () => ({
  detectLanguageConvention: vi.fn(),
  getConventionExamples: vi.fn()
}));

vi.mock('../../../utils/CommentBuilder', () => ({
  CommentBuilder: {
    build: vi.fn()
  }
}));

vi.mock('../../../../shared/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import checkSpellingGrammarTool, { 
  generateSpellingComment, 
  generateDocumentSummary,
  calculateGrade,
  countWords 
} from '../../../../tools/check-spelling-grammar';
import { detectLanguageConvention, getConventionExamples } from '../../../../tools/detect-language-convention/conventionDetector';
import { CommentBuilder } from '../../../utils/CommentBuilder';
import { SpellingPlugin } from '../index';

describe('SpellingPlugin Unit Test', () => {
  let plugin: SpellingPlugin;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(checkSpellingGrammarTool.execute).mockImplementation(() => Promise.resolve({
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
    }));
    
    vi.mocked(generateSpellingComment).mockImplementation((error: any) => 
      `${error.type === 'spelling' ? 'Spelling' : 'Grammar'} error: "${error.text}" should be "${error.correction}"`
    );
    
    vi.mocked(generateDocumentSummary).mockReturnValue('Error summary');
    
    vi.mocked(calculateGrade).mockReturnValue({
      grade: 85,
      category: 'Good',
      statistics: {
        errorsByType: { spelling: 2, grammar: 0 },
        errorsBySeverity: { critical: 0, major: 0, minor: 2 }
      }
    });
    
    vi.mocked(countWords).mockReturnValue(10);
    
    vi.mocked(detectLanguageConvention).mockReturnValue({
      convention: 'US',
      confidence: 0.9,
      consistency: 0.95,
      indicators: ['spelling patterns']
    });
    
    vi.mocked(getConventionExamples).mockReturnValue(['color', 'center']);
    
    vi.mocked(CommentBuilder.build).mockImplementation((params: any) => ({
      id: 'comment-' + Math.random(),
      description: params.description,
      highlight: params.location,
      ...params
    }));
    
    plugin = new SpellingPlugin();
  });
  
  test('should detect spelling errors in text chunks', async () => {
    // Create mock chunk with required methods
    const chunks: any[] = [
      {
        id: 'chunk-1',
        text: 'This documnet has varios spelling errors.',
        metadata: {
          position: { start: 0, end: 41 },
          type: 'paragraph'
        },
        findTextAbsolute: vi.fn().mockImplementation((searchText) => {
          const index = 'This documnet has varios spelling errors.'.indexOf(searchText);
          if (index === -1) return null;
          return {
            startOffset: index,
            endOffset: index + searchText.length,
            quotedText: searchText
          };
        }),
        getLineNumber: vi.fn().mockReturnValue(1)
      }
    ];
    
    const fullText = 'This documnet has varios spelling errors.';
    
    const result = await plugin.analyze(chunks, fullText);
    
    // Should return analysis result
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('cost');
    
    // Should call the tool
    expect(checkSpellingGrammarTool.execute).toHaveBeenCalled();
  });
  
  test('should handle empty chunks', async () => {
    const chunks: any[] = [];
    const fullText = '';
    
    // Mock to return no errors for empty text
    vi.mocked(checkSpellingGrammarTool.execute).mockImplementation(() => Promise.resolve({ errors: [] }));
    
    const result = await plugin.analyze(chunks, fullText);
    
    expect(result.comments).toHaveLength(0);
    expect(result.cost).toBe(0);
  });
  
  test('should have correct plugin metadata', () => {
    expect(plugin.name()).toBe('SPELLING');
    expect(plugin.promptForWhenToUse().toLowerCase()).toContain('spelling');
    expect(plugin.runOnAllChunks).toBe(true);
  });
});
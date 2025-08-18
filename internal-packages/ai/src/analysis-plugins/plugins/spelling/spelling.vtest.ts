import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// Jest test file
import { SpellingAnalyzerJob } from './index';
import { TextChunk } from '../../TextChunk';
import { checkSpellingGrammarTool } from '../../../tools/check-spelling-grammar';
import * as conventionDetector from '../../../tools/detect-language-convention/conventionDetector';
import * as grading from '../../../tools/check-spelling-grammar/grading';

vi.mock('../../../tools/check-spelling-grammar', () => ({
  checkSpellingGrammarTool: {
    execute: vi.fn()
  }
}));
vi.mock('../../../shared/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock convention detector and grading modules
vi.mock('../../../tools/detect-language-convention/conventionDetector');
vi.mock('../../../tools/check-spelling-grammar/grading');

describe('SpellingAnalyzerJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mocks
    (conventionDetector.detectLanguageConvention as any).mockReturnValue({
      convention: 'US',
      confidence: 0.9,
      consistency: 0.9, // High consistency, no mixed warning
      evidence: []
    });
    
    
    (conventionDetector.getConventionExamples as any).mockReturnValue([
      'Uses -ize endings (organize, realize)'
    ]);
    
    (grading.countWords as any).mockReturnValue(100);
    
    (grading.calculateGrade as any).mockReturnValue({
      grade: 85,
      category: 'Good',
      description: 'Good job! Minor errors that don\'t significantly impact readability.',
      statistics: {
        totalErrors: 2,
        errorDensity: 2.0,
        errorsByType: { spelling: 1, grammar: 1 },
        errorsBySeverity: { critical: 0, major: 0, minor: 2, trivial: 0 }
      }
    });
    
    (grading.generateGradeSummary as any).mockReturnValue(
      'Good (85/100)\n\nFound 2 errors:\n• 1 spelling, 1 grammar\n• Severity: 2 minor\n• Error density: 2.0 per 100 words'
    );
  });

  describe('name', () => {
    it('should return correct name', () => {
      const analyzer = new SpellingAnalyzerJob();
      expect(analyzer.name()).toBe('SPELLING');
    });
  });

  describe('promptForWhenToUse', () => {
    it('should return appropriate prompt', () => {
      const analyzer = new SpellingAnalyzerJob();
      const prompt = analyzer.promptForWhenToUse();
      expect(prompt).toContain('ALL text chunks');
      expect(prompt).toContain('spelling and grammar');
    });
  });

  describe('routingExamples', () => {
    it('should provide appropriate routing examples', () => {
      const analyzer = new SpellingAnalyzerJob();
      const examples = analyzer.routingExamples();
      expect(examples).toHaveLength(4);
      
      expect(examples[0]).toEqual({
        chunkText: "The quick brown fox jumps over the lazy dog.",
        shouldProcess: true,
        reason: "Normal text should be checked for spelling and grammar",
      });

      expect(examples[1]).toEqual({
        chunkText: "Thier are many problms with this sentance.",
        shouldProcess: true,
        reason: "Text with obvious errors needs checking",
      });

      expect(examples[3]).toEqual({
        chunkText: "function calculate() { return 2 + 2; }",
        shouldProcess: false,
        reason: "Code blocks should not be spell-checked",
      });
    });
  });

  describe('analyze', () => {
    it('should extract spelling errors and generate comments', async () => {
      const mockErrors = [
        {
          text: "thier",
          correction: "their",
          conciseCorrection: "thier → their",
          type: 'spelling' as const,
          context: "This is thier house",
          importance: 30,
        },
        {
          text: "dont",
          correction: "don't",
          conciseCorrection: "dont → don't",
          type: 'grammar' as const,
          context: "They dont know",
          importance: 40,
        },
      ];

      // Mock to return different errors for each chunk
      (checkSpellingGrammarTool.execute as any)
        .mockImplementationOnce(() => Promise.resolve({
          errors: [mockErrors[0]], // First chunk gets the spelling error
        }))
        .mockImplementationOnce(() => Promise.resolve({
          errors: [mockErrors[1]], // Second chunk gets the grammar error
        }));

      const chunks: TextChunk[] = [
        Object.assign(new TextChunk('This is thier house', 'chunk1', {
          position: { start: 0, end: 19 },
        }), {
          findTextAbsolute: vi.fn().mockImplementation(() => Promise.resolve({
            startOffset: 8,
            endOffset: 13,
            quotedText: 'thier'
          }))
        }),
        Object.assign(new TextChunk('They dont know', 'chunk2', {
          position: { start: 20, end: 34 },
        }), {
          findTextAbsolute: vi.fn().mockImplementation(() => Promise.resolve({
            startOffset: 25,
            endOffset: 29,
            quotedText: 'dont'
          }))
        }),
      ];

      const analyzer = new SpellingAnalyzerJob();

      const result = await analyzer.analyze(chunks, 'This is thier house\nThey dont know');

      // Check summary includes grade
      expect(result.summary).toContain('Good (85/100)');
      expect(result.summary).toContain('2 issues');
      
      // Check grade is returned
      expect(result.grade).toBe(85);
      
      // Check analysis includes all components
      expect(result.analysis).toContain('Good (85/100)');
      expect(result.analysis).toContain('**Language Convention**: US English');
      
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0].description).toContain('Spelling');
      expect(result.comments[0].description).toContain('thier');
      expect(result.comments[0].description).toContain('their');
    });

    it('should handle empty document', async () => {
      (checkSpellingGrammarTool.execute as any).mockImplementation(() => Promise.resolve({
        errors: [],
      }));

      (grading.calculateGrade as any).mockReturnValue({
        grade: 100,
        category: 'Excellent',
        description: '✅ Excellent! Very few errors found - professional quality writing.',
        statistics: {
          totalErrors: 0,
          errorDensity: 0,
          errorsByType: { spelling: 0, grammar: 0 },
          errorsBySeverity: { critical: 0, major: 0, minor: 0, trivial: 0 }
        }
      });

      const analyzer = new SpellingAnalyzerJob();

      const result = await analyzer.analyze([new TextChunk('No errors here.', 'chunk1')], 'No errors here.');

      expect(result.summary).toContain('Excellent (100/100)');
      expect(result.summary).toContain('No spelling or grammar errors found');
      expect(result.analysis).toContain('free of spelling and grammar errors');
      expect(result.comments).toHaveLength(0);
      expect(result.grade).toBe(100);
    });

    it('should not run analysis twice', async () => {
      (checkSpellingGrammarTool.execute as any).mockImplementation(() => Promise.resolve({
        errors: [],
      }));

      const analyzer = new SpellingAnalyzerJob();

      const chunks = [new TextChunk('Test', 'chunk1')];
      const result1 = await analyzer.analyze(chunks, 'Test');
      const result2 = await analyzer.analyze(chunks, 'Test');

      expect(result1).toEqual(result2);
      expect(checkSpellingGrammarTool.execute).toHaveBeenCalledTimes(1);
    });

  });

  describe('getResults', () => {
    it('should throw error if analysis not run', () => {
      const analyzer = new SpellingAnalyzerJob();

      expect(() => analyzer.getResults()).toThrow(
        'Analysis has not been run yet. Call analyze() first.'
      );
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', async () => {
      (checkSpellingGrammarTool.execute as any).mockImplementation(() => Promise.resolve({
        errors: [{
          text: "teh",
          correction: "the",
          type: 'spelling' as const,
          importance: 20,
        }],
      }));

      const analyzer = new SpellingAnalyzerJob();

      const chunks = [
        Object.assign(new TextChunk('teh', 'chunk1', { position: { start: 0, end: 3 } }), {
          findTextAbsolute: vi.fn().mockImplementation(() => Promise.resolve({
            startOffset: 0,
            endOffset: 3,
            quotedText: 'teh'
          })
        })
      ];
      await analyzer.analyze(chunks, 'teh');
      const debugInfo = analyzer.getDebugInfo();

      expect(debugInfo).toEqual({
        hasRun: true,
        errorsCount: 1,
        commentsCount: 1,
        totalCost: expect.any(Number),
        llmInteractionsCount: 0,
      });
    });
  });

  describe('convention detection', () => {
    it('should detect mixed US/UK spelling', async () => {
      (conventionDetector.detectLanguageConvention as any).mockReturnValue({
        convention: 'mixed',
        confidence: 0.6,
        consistency: 0.5, // Low consistency triggers mixed warning
        evidence: [
          { word: 'organize', convention: 'US', count: 2 },
          { word: 'colour', convention: 'UK', count: 3 }
        ]
      });

      (checkSpellingGrammarTool.execute as any).mockImplementation(() => Promise.resolve({ errors: [] }));

      const analyzer = new SpellingAnalyzerJob();
      const result = await analyzer.analyze(
        [new TextChunk('Text with organize and colour', 'chunk1')], 
        'Text with organize and colour'
      );

      expect(result.analysis).toContain('**Language Convention**: mixed English');
      expect(result.analysis).toContain('Mixed US/UK spelling detected');
    });

  });

  describe('error location finding', () => {
    it('should handle errors that cannot be located', async () => {
      const mockError = {
        text: "nonexistent",
        correction: "corrected",
        type: 'spelling' as const,
        importance: 30,
      };

      (checkSpellingGrammarTool.execute as any).mockImplementation(() => Promise.resolve({
        errors: [mockError],
      });
      
      // Override the default grade mock for this test
      (grading.calculateGrade as any).mockReturnValue({
        grade: 90,
        category: 'Excellent',
        description: 'Excellent!',
        statistics: {
          totalErrors: 1,
          errorDensity: 1.0,
          errorsByType: { spelling: 1, grammar: 0 },
          errorsBySeverity: { critical: 0, major: 0, minor: 1, trivial: 0 }
        }
      });

      const chunk = Object.assign(new TextChunk('This text does not contain the error', 'chunk1'), {
        findTextAbsolute: vi.fn().mockImplementation(() => Promise.resolve(null) // Cannot find location
      });

      const analyzer = new SpellingAnalyzerJob();
      const result = await analyzer.analyze([chunk], 'This text does not contain the error');

      // Should not create comment for unlocatable error
      expect(result.comments).toHaveLength(0);
      // But should still include in analysis
      expect(result.summary).toContain('1 issue');
    });

    it('should handle multiple errors in same chunk', async () => {
      const mockErrors = [
        { text: "teh", correction: "the", type: 'spelling' as const, importance: 20 },
        { text: "recieve", correction: "receive", type: 'spelling' as const, importance: 25 },
      ];

      (checkSpellingGrammarTool.execute as any).mockImplementation(() => Promise.resolve({
        errors: mockErrors,
      });

      const chunk = Object.assign(
        new TextChunk('I will recieve teh package', 'chunk1', { position: { start: 0, end: 26 } }), 
        {
          findTextAbsolute: vi.fn()
            .mockImplementationOnce(() => Promise.resolve({ startOffset: 16, endOffset: 19, quotedText: 'teh' }))
            .mockImplementationOnce(() => Promise.resolve({ startOffset: 7, endOffset: 14, quotedText: 'recieve' }))
        }
      );

      const analyzer = new SpellingAnalyzerJob();
      const result = await analyzer.analyze([chunk], 'I will recieve teh package');

      expect(result.comments).toHaveLength(2);
      expect(chunk.findTextAbsolute).toHaveBeenCalledTimes(2);
    });
  });

  describe('importance calculation', () => {
    it('should map importance scores correctly', async () => {
      const testCases = [
        { importance: 10, expectedCommentImportance: 2 },  // trivial
        { importance: 30, expectedCommentImportance: 4 },  // minor
        { importance: 60, expectedCommentImportance: 6 },  // major
        { importance: 90, expectedCommentImportance: 9 },  // critical
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        (checkSpellingGrammarTool.execute as any).mockImplementation(() => Promise.resolve({
          errors: [{
            text: "error",
            correction: "correct",
            type: 'spelling' as const,
            importance: testCase.importance,
          }],
        });

        const chunk = Object.assign(new TextChunk('error', 'chunk1'), {
          findTextAbsolute: vi.fn().mockImplementation(() => Promise.resolve({
            startOffset: 0,
            endOffset: 5,
            quotedText: 'error'
          })
        });

        const analyzer = new SpellingAnalyzerJob();
        const result = await analyzer.analyze([chunk], 'error');

        expect(result.comments[0].importance).toBe(testCase.expectedCommentImportance);
      }
    });
  });
});
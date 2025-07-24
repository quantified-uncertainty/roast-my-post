// Jest test file
import { SpellingAnalyzerJob } from './index';
import { TextChunk } from '../../TextChunk';
import { checkSpellingGrammarTool } from '@/tools/check-spelling-grammar';

jest.mock('@/tools/check-spelling-grammar');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SpellingAnalyzerJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          type: 'spelling' as const,
          context: "This is thier house",
          importance: 30,
        },
        {
          text: "dont",
          correction: "don't",
          type: 'grammar' as const,
          context: "They dont know",
          importance: 40,
        },
      ];

      (checkSpellingGrammarTool.execute as jest.Mock).mockResolvedValue({
        errors: mockErrors,
        llmInteractions: [{
          provider: 'claude',
          model: 'claude-3-opus-20240229',
          messages: [],
          response: { content: 'test' },
          inputTokens: 100,
          outputTokens: 200,
          cost: 0.01,
        }],
      });

      const chunks: TextChunk[] = [
        new TextChunk('This is thier house', 'chunk1', {
          position: { start: 0, end: 19 },
        }),
        new TextChunk('They dont know', 'chunk2', {
          position: { start: 20, end: 34 },
        }),
      ];

      const analyzer = new SpellingAnalyzerJob();

      const result = await analyzer.analyze(chunks, 'This is thier house\nThey dont know');

      expect(result.summary).toContain('2 issues');
      expect(result.summary).toContain('1 spelling');
      expect(result.summary).toContain('1 grammar');
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0].description).toContain('Spelling');
      expect(result.comments[0].description).toContain('thier');
      expect(result.comments[0].description).toContain('their');
      expect(result.cost).toBe(0.01);
      expect(result.llmInteractions).toHaveLength(1);
    });

    it('should handle empty document', async () => {
      (checkSpellingGrammarTool.execute as jest.Mock).mockResolvedValue({
        errors: [],
        llmInteractions: [{
          provider: 'claude',
          model: 'claude-3-opus-20240229',
          messages: [],
          response: { content: 'test' },
          inputTokens: 50,
          outputTokens: 10,
          cost: 0.001,
        }],
      });

      const analyzer = new SpellingAnalyzerJob();

      const result = await analyzer.analyze([new TextChunk('No errors here.', 'chunk1')], 'No errors here.');

      expect(result.summary).toBe('No spelling or grammar errors found.');
      expect(result.analysis).toContain('free of spelling and grammar errors');
      expect(result.comments).toHaveLength(0);
    });

    it('should not run analysis twice', async () => {
      (checkSpellingGrammarTool.execute as jest.Mock).mockResolvedValue({
        errors: [],
        llmInteractions: [],
      });

      const analyzer = new SpellingAnalyzerJob();

      const chunks = [new TextChunk('Test', 'chunk1')];
      const result1 = await analyzer.analyze(chunks, 'Test');
      const result2 = await analyzer.analyze(chunks, 'Test');

      expect(result1).toBe(result2);
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
      (checkSpellingGrammarTool.execute as jest.Mock).mockResolvedValue({
        errors: [{
          text: "teh",
          correction: "the",
          type: 'spelling' as const,
          importance: 20,
        }],
        llmInteractions: [],
      });

      const analyzer = new SpellingAnalyzerJob();

      const chunks = [new TextChunk('teh', 'chunk1', { position: { start: 0, end: 3 } })];
      await analyzer.analyze(chunks, 'teh');
      const debugInfo = analyzer.getDebugInfo();

      expect(debugInfo).toEqual({
        hasRun: true,
        errorsCount: 1,
        commentsCount: 1,
        totalCost: 0,
        llmInteractionsCount: 0,
      });
    });
  });
});
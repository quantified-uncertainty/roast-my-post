// Jest test file
import { MathAnalyzerJob } from './index';
import { TextChunk } from '../../TextChunk';
import { extractMathExpressionsTool } from '@/tools/extract-math-expressions';

jest.mock('@/tools/extract-math-expressions');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MathAnalyzerJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('displayName', () => {
    it('should return correct display name', () => {
      expect(MathAnalyzerJob.displayName()).toBe('MATH');
    });
  });

  describe('promptForWhenToUse', () => {
    it('should return appropriate prompt', () => {
      const prompt = MathAnalyzerJob.promptForWhenToUse();
      expect(prompt).toContain('math of any kind');
      expect(prompt).toContain('Equations and formulas');
      expect(prompt).toContain('Statistical calculations');
    });
  });

  describe('routingExamples', () => {
    it('should provide appropriate routing examples', () => {
      const examples = MathAnalyzerJob.routingExamples();
      expect(examples).toHaveLength(3);
      
      expect(examples[0]).toEqual({
        chunkText: "The population grew by 15% over the last decade, from 1.2M to 1.38M",
        shouldProcess: true,
        reason: "Contains percentage calculation that should be verified",
      });

      expect(examples[1]).toEqual({
        chunkText: "Mathematics has been called the language of the universe",
        shouldProcess: false,
        reason: "Discusses math conceptually but contains no actual math",
      });
    });
  });

  describe('analyze', () => {
    it('should extract math expressions and generate comments', async () => {
      const mockExpressions = [
        {
          originalText: "2 + 2 = 5",
          hasError: true,
          errorType: "Calculation Error",
          errorExplanation: "2 + 2 equals 4, not 5",
          correctedVersion: "2 + 2 = 4",
          complexityScore: 10,
          contextImportanceScore: 50,
          errorSeverityScore: 70,
          verificationStatus: 'verified' as const,
        },
        {
          originalText: "E = mc²",
          hasError: false,
          complexityScore: 60,
          contextImportanceScore: 80,
          errorSeverityScore: 0,
          verificationStatus: 'verified' as const,
        },
      ];

      (extractMathExpressionsTool.execute as jest.Mock).mockResolvedValue({
        expressions: mockExpressions,
        llmInteraction: {
          provider: 'claude',
          model: 'claude-3-opus-20240229',
          messages: [],
          response: { content: 'test' },
          inputTokens: 100,
          outputTokens: 200,
          cost: 0.01,
        },
      });

      const chunks: TextChunk[] = [
        new TextChunk('Basic math: 2 + 2 = 5', 'chunk1', {
          position: { start: 0, end: 20 },
        }),
        new TextChunk('Physics formula: E = mc²', 'chunk2', {
          position: { start: 21, end: 45 },
        }),
      ];

      const analyzer = new MathAnalyzerJob({
        documentText: 'Basic math: 2 + 2 = 5\nPhysics formula: E = mc²',
        chunks,
      });

      const result = await analyzer.analyze({ userId: 'test-user' });

      expect(result.summary).toContain('2 mathematical expressions');
      expect(result.summary).toContain('1 with errors');
      expect(result.comments).toHaveLength(1); // Only the error gets a comment
      expect(result.comments[0].description).toContain('Calculation Error');
      expect(result.cost).toBe(0);
      expect(result.llmInteractions).toHaveLength(0);
    });

    it('should handle empty document', async () => {
      (extractMathExpressionsTool.execute as jest.Mock).mockResolvedValue({
        expressions: [],
        llmInteraction: {
          provider: 'claude',
          model: 'claude-3-opus-20240229',
          messages: [],
          response: { content: 'test' },
          inputTokens: 50,
          outputTokens: 10,
          cost: 0.001,
        },
      });

      const analyzer = new MathAnalyzerJob({
        documentText: 'No math here, just text.',
        chunks: [new TextChunk('No math here, just text.', 'chunk1')],
      });

      const result = await analyzer.analyze();

      expect(result.summary).toBe('No mathematical expressions found.');
      expect(result.analysis).toContain('No mathematical calculations');
      expect(result.comments).toHaveLength(0);
    });

    it('should not run analysis twice', async () => {
      (extractMathExpressionsTool.execute as jest.Mock).mockResolvedValue({
        expressions: [],
        llmInteraction: {
          provider: 'claude',
          model: 'claude-3-opus-20240229',
          messages: [],
          response: { content: 'test' },
          inputTokens: 50,
          outputTokens: 10,
          cost: 0.001,
        },
      });

      const analyzer = new MathAnalyzerJob({
        documentText: 'Test',
        chunks: [new TextChunk('Test', 'chunk1')],
      });

      const result1 = await analyzer.analyze();
      const result2 = await analyzer.analyze();

      expect(result1).toBe(result2);
      expect(extractMathExpressionsTool.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResults', () => {
    it('should throw error if analysis not run', () => {
      const analyzer = new MathAnalyzerJob({
        documentText: 'Test',
        chunks: [],
      });

      expect(() => analyzer.getResults()).toThrow(
        'Analysis has not been run yet. Call analyze() first.'
      );
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', async () => {
      (extractMathExpressionsTool.execute as jest.Mock).mockResolvedValue({
        expressions: [{
          originalText: "1 + 1 = 2",
          hasError: false,
          complexityScore: 10,
          contextImportanceScore: 20,
          errorSeverityScore: 0,
          verificationStatus: 'verified' as const,
        }],
        llmInteraction: {
          provider: 'claude',
          model: 'claude-3-opus-20240229',
          messages: [],
          response: { content: 'test' },
          inputTokens: 50,
          outputTokens: 10,
          cost: 0.001,
        },
      });

      const analyzer = new MathAnalyzerJob({
        documentText: '1 + 1 = 2',
        chunks: [new TextChunk('1 + 1 = 2', 'chunk1')],
      });

      await analyzer.analyze();
      const debugInfo = analyzer.getDebugInfo();

      expect(debugInfo).toEqual({
        hasRun: true,
        expressionsCount: 1,
        commentsCount: 0,
        totalCost: 0,
        llmInteractionsCount: 0,
      });
    });
  });
});
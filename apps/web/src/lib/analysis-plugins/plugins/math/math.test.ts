// Jest test file
import { MathAnalyzerJob } from './index';
import { TextChunk } from '../../TextChunk';
import { extractMathExpressionsTool } from '@/tools/extract-math-expressions';
import { checkMathHybridTool } from '@/tools/check-math-hybrid';

jest.mock('@/tools/extract-math-expressions', () => ({
  extractMathExpressionsTool: {
    execute: jest.fn()
  }
}));

jest.mock('@/tools/check-math-hybrid', () => ({
  checkMathHybridTool: {
    execute: jest.fn()
  }
}));

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

  describe('name', () => {
    it('should return correct display name', () => {
      const analyzer = new MathAnalyzerJob();
      expect(analyzer.name()).toBe('MATH');
    });
  });

  describe('promptForWhenToUse', () => {
    it('should return appropriate prompt', () => {
      const analyzer = new MathAnalyzerJob();
      const prompt = analyzer.promptForWhenToUse();
      expect(prompt).toContain('math of any kind');
      expect(prompt).toContain('Equations and formulas');
      expect(prompt).toContain('Statistical calculations');
    });
  });

  describe('routingExamples', () => {
    it('should provide appropriate routing examples', () => {
      const analyzer = new MathAnalyzerJob();
      const examples = analyzer.routingExamples();
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
          lineNumber: 1,
          surroundingContext: "Basic math: 2 + 2 = 5"
        },
        {
          originalText: "E = mc²",
          hasError: false,
          complexityScore: 60,
          contextImportanceScore: 80,
          errorSeverityScore: 0,
          verificationStatus: 'verified' as const,
          lineNumber: 2,
          surroundingContext: "Physics formula: E = mc²"
        },
      ];

      // Mock extract-math-expressions to return expressions from each chunk
      (extractMathExpressionsTool.execute as jest.Mock)
        .mockResolvedValueOnce({
          expressions: [mockExpressions[0]]
        })
        .mockResolvedValueOnce({
          expressions: [mockExpressions[1]]
        });

      // Mock check-math-hybrid to verify the first expression as false
      (checkMathHybridTool.execute as jest.Mock)
        .mockResolvedValueOnce({
          statement: '2 + 2 = 5',
          status: 'verified_false',
          explanation: '2 + 2 equals 4, not 5',
          verifiedBy: 'mathjs',
          toolsUsed: ['mathjs'],
          conciseCorrection: '5 → 4',
          errorDetails: {
            errorType: 'calculation',
            severity: 'major',
            conciseCorrection: '5 → 4'
          }
        })
        .mockResolvedValueOnce({
          statement: 'E = mc²',
          status: 'verified_true',
          explanation: 'This is the correct formula for mass-energy equivalence',
          verifiedBy: 'llm',
          toolsUsed: ['mathjs', 'llm']
        });

      const chunks: TextChunk[] = [
        Object.assign(new TextChunk('Basic math: 2 + 2 = 5', 'chunk1', {
          position: { start: 0, end: 20 },
        }), {
          findTextAbsolute: jest.fn().mockResolvedValue({
            startOffset: 12,
            endOffset: 21,
            quotedText: '2 + 2 = 5'
          })
        }),
        Object.assign(new TextChunk('Physics formula: E = mc²', 'chunk2', {
          position: { start: 21, end: 45 },
        }), {
          findTextAbsolute: jest.fn().mockResolvedValue({
            startOffset: 37,
            endOffset: 45,
            quotedText: 'E = mc²'
          })
        }),
      ];

      const analyzer = new MathAnalyzerJob();

      const result = await analyzer.analyze(chunks, 'Basic math: 2 + 2 = 5\nPhysics formula: E = mc²');

      expect(result.summary).toContain('2 mathematical expressions');
      expect(result.summary).toContain('1 with errors');
      expect(result.summary).toContain('Hybrid verification found 1 issue');
      expect(result.comments).toHaveLength(2); // Both extraction and hybrid create comments for errors
      // Check that at least one comment contains the correction
      const hasCorrection = result.comments.some(c => c.description.includes('5 → 4') || c.description.includes('5</span> → <span'));
      expect(hasCorrection).toBe(true);
      expect(result.cost).toBe(0); // No cost tracking without llmInteraction
    }, 10000); // Increase timeout

    it('should handle empty document', async () => {
      (extractMathExpressionsTool.execute as jest.Mock).mockResolvedValue({
        expressions: []
      });

      const analyzer = new MathAnalyzerJob();
      const chunks = [new TextChunk('No math here, just text.', 'chunk1')];

      const result = await analyzer.analyze(chunks, 'No math here, just text.');

      expect(result.summary).toBe('No mathematical content found.');
      expect(result.analysis).toContain('No mathematical calculations');
      expect(result.comments).toHaveLength(0);
    });

    it('should not run analysis twice', async () => {
      (extractMathExpressionsTool.execute as jest.Mock).mockResolvedValue({
        expressions: []
      });

      const analyzer = new MathAnalyzerJob();
      const chunks = [new TextChunk('Test', 'chunk1')];

      const result1 = await analyzer.analyze(chunks, 'Test');
      const result2 = await analyzer.analyze(chunks, 'Test');

      expect(result1).toEqual(result2);
      expect(extractMathExpressionsTool.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResults', () => {
    it('should throw error if analysis not run', () => {
      const analyzer = new MathAnalyzerJob();
      expect(() => analyzer.getResults()).toThrow('Analysis has not been run yet');
    });

    it('should return cached results after analysis', async () => {
      (extractMathExpressionsTool.execute as jest.Mock).mockResolvedValue({
        expressions: []
      });

      const analyzer = new MathAnalyzerJob();
      const chunks = [new TextChunk('Test', 'chunk1')];

      const analysisResult = await analyzer.analyze(chunks, 'Test');
      const cachedResult = analyzer.getResults();

      expect(cachedResult).toEqual(analysisResult);
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', async () => {
      (extractMathExpressionsTool.execute as jest.Mock).mockResolvedValue({
        expressions: [{
          originalText: "1 + 1 = 2",
          hasError: false,
          complexityScore: 10,
          contextImportanceScore: 30,
          errorSeverityScore: 0,
          verificationStatus: 'verified' as const,
          lineNumber: 1,
          surroundingContext: "Test: 1 + 1 = 2"
        }]
      });

      // Mock check-math-hybrid for the single expression
      (checkMathHybridTool.execute as jest.Mock).mockResolvedValue({
        statement: '1 + 1 = 2',
        status: 'verified_true',
        explanation: 'Correct',
        verifiedBy: 'mathjs',
        toolsUsed: ['mathjs']
      });

      const analyzer = new MathAnalyzerJob();
      const chunks = [new TextChunk('Test: 1 + 1 = 2', 'chunk1')];

      await analyzer.analyze(chunks, 'Test: 1 + 1 = 2');
      
      const debug = analyzer.getDebugInfo();
      
      expect(debug.expressionsCount).toBe(1);
      expect(debug.commentsCount).toBe(0); // No errors, no comments
      expect(debug.llmInteractionsCount).toBe(0); // No LLM interactions tracked
    }, 10000); // Increase timeout
  });
});
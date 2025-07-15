import { MathPlugin } from '../plugins/MathPlugin';
import { TextChunk } from '../TextChunk';

// Mock Claude wrapper
jest.mock('@/lib/claude/wrapper', () => ({
  callClaudeWithTool: jest.fn(),
  MODEL_CONFIG: {
    analysis: 'claude-sonnet-4-20250514'
  }
}));

import { callClaudeWithTool } from '@/lib/claude/wrapper';
import { RichLLMInteraction } from '@/types/llm';

describe('MathPlugin', () => {
  let plugin: MathPlugin;
  let mockCallClaude: jest.MockedFunction<typeof callClaudeWithTool>;

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new MathPlugin();
    mockCallClaude = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
  });

  describe('routing examples', () => {
    it('should provide appropriate routing examples', () => {
      const examples = plugin.getRoutingExamples();

      expect(examples.shouldHandle).toContain('2 + 2 = 5');
      expect(examples.shouldHandle).toContain('The calculation shows 10 × 3 = 33');
      expect(examples.shouldNotHandle).toContain('The team scored 5 goals');
      expect(examples.shouldNotHandle).toContain('I was born in 1985');
    });
  });

  describe('processChunk', () => {
    const mockLLMInteraction: RichLLMInteraction = {
      model: 'claude-sonnet-4-20250514',
      prompt: 'analysis prompt',
      response: 'analysis response',
      tokensUsed: { prompt: 200, completion: 100, total: 300 },
      timestamp: new Date(),
      duration: 1000
    };

    it('should detect mathematical errors', async () => {
      const mockResult = {
        errors: [
          {
            type: 'calculation',
            location: 'first equation',
            description: '2 + 2 equals 4, not 5',
            severity: 'high',
            suggestion: 'Correct the calculation: 2 + 2 = 4'
          }
        ],
        summary: {
          totalErrors: 1,
          errorsByType: { calculation: 1, unit: 0, logic: 0 },
          overallAssessment: 'Contains mathematical errors that need correction'
        }
      };

      mockCallClaude.mockResolvedValueOnce({
        response: {} as any,
        interaction: mockLLMInteraction,
        toolResult: mockResult
      });

      const chunk = new TextChunk('test1', 'The equation 2 + 2 = 5 is correct.', 0, 35, {});
      const result = await plugin.processChunk(chunk);

      expect(result.chunkId).toBe('test1');
      expect(result.pluginName).toBe('MATH');
      expect(result.processed).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('calculation');
      expect(result.issues[0].severity).toBe('high');
      expect(result.llmInteractions).toHaveLength(1);
    });

    it('should handle text with no mathematical errors', async () => {
      const mockResult = {
        errors: [],
        summary: {
          totalErrors: 0,
          errorsByType: { calculation: 0, unit: 0, logic: 0 },
          overallAssessment: 'No mathematical errors detected'
        }
      };

      mockCallClaude.mockResolvedValueOnce({
        response: {} as any,
        interaction: mockLLMInteraction,
        toolResult: mockResult
      });

      const chunk = new TextChunk('test2', 'The equation 2 + 2 = 4 is correct.', 0, 35, {});
      const result = await plugin.processChunk(chunk);

      expect(result.chunkId).toBe('test2');
      expect(result.processed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle LLM errors gracefully', async () => {
      mockCallClaude.mockRejectedValueOnce(new Error('LLM call failed'));

      const chunk = new TextChunk('test3', '2 + 2 = 5', 0, 9, {});
      const result = await plugin.processChunk(chunk);

      expect(result.chunkId).toBe('test3');
      expect(result.processed).toBe(false);
      expect(result.issues).toHaveLength(0);
      expect(result.llmInteractions).toHaveLength(0);
    });

    it('should track metadata correctly', async () => {
      const mockResult = {
        errors: [
          { type: 'calculation', location: 'equation', description: 'Error', severity: 'medium', suggestion: 'Fix' },
          { type: 'unit', location: 'measurement', description: 'Unit error', severity: 'low', suggestion: 'Correct units' }
        ],
        summary: {
          totalErrors: 2,
          errorsByType: { calculation: 1, unit: 1, logic: 0 },
          overallAssessment: 'Multiple errors found'
        }
      };

      mockCallClaude.mockResolvedValueOnce({
        response: {} as any,
        interaction: mockLLMInteraction,
        toolResult: mockResult
      });

      const chunk = new TextChunk('test4', 'Complex math with errors', 0, 25, {});
      const result = await plugin.processChunk(chunk);

      expect(result.metadata.totalErrors).toBe(2);
      expect(result.metadata.errorsByType).toEqual({ calculation: 1, unit: 1, logic: 0 });
      expect(result.metadata.overallAssessment).toBe('Multiple errors found');
    });
  });

  describe('synthesize', () => {
    it('should generate synthesis when no chunks are processed', async () => {
      const synthesis = await plugin.synthesize();
      
      expect(synthesis).toContain('No mathematical content was analyzed');
    });

    it('should generate synthesis with error statistics', async () => {
      // Simulate processing some chunks first
      plugin['errorCounts'] = { calculation: 2, unit: 1, logic: 0 };
      plugin['totalChunks'] = 5;

      const synthesis = await plugin.synthesize();
      
      expect(synthesis).toContain('Mathematical Analysis Summary');
      expect(synthesis).toContain('2 calculation errors');
      expect(synthesis).toContain('1 unit errors');
      expect(synthesis).toContain('Processed 5 chunks');
    });
  });

  describe('error categorization', () => {
    it('should categorize different types of errors correctly', () => {
      const calculationError = (plugin as any).categorizeError('The calculation 2+2=5 is wrong');
      const unitError = (plugin as any).categorizeError('The measurement is 5 meters per second squared');
      const logicError = (plugin as any).categorizeError('If x > y and y > z, then z > x');

      expect(calculationError).toBe('calculation');
      expect(unitError).toBe('unit');
      expect(logicError).toBe('logic');
    });

    it('should default to calculation for unclear errors', () => {
      const unknownError = (plugin as any).categorizeError('Something is wrong but unclear');
      
      expect(unknownError).toBe('calculation');
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { ExtractFactualClaimsTool } from './index';
import { z } from 'zod';
import { ToolContext } from '../base/Tool';

// Mock Claude wrapper
vi.mock('@roast/ai', () => ({
  callClaudeWithTool: vi.fn()
}));

import { callClaudeWithTool } from '../../claude/wrapper';

describe('ExtractFactualClaimsTool', () => {
  const tool = new ExtractFactualClaimsTool();
  const mockContext: ToolContext = {
    userId: 'test-user',
    logger: { 
      info: vi.fn(), 
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any
  };
  
  const mockCallClaudeWithTool = callClaudeWithTool as any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('input validation', () => {
    it('should validate required fields', async () => {
      const invalidInput = {}; // Missing text
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should validate text length limits', async () => {
      const invalidInput = { text: 'a'.repeat(50001) }; // Too long
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });

    it('should accept valid input with defaults', async () => {
      const validInput = { text: 'The Berlin Wall fell in 1989.' };
      
      // Mock extraction response
      mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve({
        response: {
          content: [{
            type: 'tool_use',
            input: {
              claims: [{
                originalText: 'The Berlin Wall fell in 1989',
                topic: 'Historical events',
                importanceScore: 85,
                checkabilityScore: 90,
                truthProbability: 95
              }]
            }
          }],
          usage: { input_tokens: 100, output_tokens: 50 }
        } as any,
        interaction: {
          model: 'claude-3-5-sonnet-20241022',
          prompt: 'test prompt',
          response: 'test response',
          tokensUsed: { prompt: 100, completion: 50, total: 150 },
          timestamp: new Date(),
          duration: 1000
        },
        toolResult: {
          claims: [{
            originalText: 'The Berlin Wall fell in 1989',
            topic: 'Historical events',
            importanceScore: 85,
            checkabilityScore: 90,
            truthProbability: 95
          }]
        }
      });
      
      const result = await tool.run(validInput, mockContext);
      
      expect(result.claims).toHaveLength(1);
      expect(result.summary.totalFound).toBe(1);
      expect(result.summary.aboveThreshold).toBe(1);
      expect(result.claims[0].originalText).toBe('The Berlin Wall fell in 1989');
    });
  });

  describe('execute', () => {
    it('should extract factual claims successfully', async () => {
      const input = {
        text: 'The unemployment rate in the US was 3.7% in December 2023. Apple Inc. was founded in 1976.',
        minQualityThreshold: 50,
        maxClaims: 30
      };
      
      const mockClaims = [
        {
          originalText: 'The unemployment rate in the US was 3.7% in December 2023',
          topic: 'Economic statistics',
          importanceScore: 80,
          checkabilityScore: 85,
          truthProbability: 70
        },
        {
          originalText: 'Apple Inc. was founded in 1976',
          topic: 'Corporate history',
          importanceScore: 60,
          checkabilityScore: 95,
          truthProbability: 99
        }
      ];
      
      // Mock extraction response
      mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve({
        response: {
          content: [{
            type: 'tool_use',
            input: { claims: mockClaims }
          }],
          usage: { input_tokens: 200, output_tokens: 100 }
        } as any,
        interaction: {
          model: 'claude-3-5-sonnet-20241022',
          prompt: 'test prompt',
          response: 'test response',
          tokensUsed: { prompt: 200, completion: 100, total: 300 },
          timestamp: new Date(),
          duration: 1500
        },
        toolResult: { claims: mockClaims }
      });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.claims).toHaveLength(2);
      expect(result.summary.totalFound).toBe(2);
      expect(result.summary.aboveThreshold).toBe(2);
      
      // Check that claims are sorted by priority (importance + checkability + (100 - truthProbability))
      const firstPriority = result.claims[0].importanceScore + result.claims[0].checkabilityScore + (100 - result.claims[0].truthProbability);
      const secondPriority = result.claims[1].importanceScore + result.claims[1].checkabilityScore + (100 - result.claims[1].truthProbability);
      expect(firstPriority).toBeGreaterThanOrEqual(secondPriority);
    });

    it('should handle text with no factual claims', async () => {
      const input = {
        text: 'I think the weather will be nice tomorrow. This might be a good opportunity.'
      };
      
      // Mock empty extraction response
      mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve({
        response: {
          content: [{
            type: 'tool_use',
            input: { claims: [] }
          }],
          usage: { input_tokens: 100, output_tokens: 20 }
        } as any,
        interaction: {
          model: 'claude-3-5-sonnet-20241022',
          prompt: 'test prompt',
          response: 'test response',
          tokensUsed: { prompt: 100, completion: 20, total: 120 },
          timestamp: new Date(),
          duration: 800
        },
        toolResult: { claims: [] }
      });
      
      const result = await tool.execute({ ...input, minQualityThreshold: 50, maxClaims: 30 }, mockContext);
      
      expect(result.claims).toHaveLength(0);
      expect(result.summary.totalFound).toBe(0);
      expect(result.summary.aboveThreshold).toBe(0);
    });

    it('should filter claims based on quality threshold', async () => {
      const input = {
        text: 'Some text with claims.',
        minQualityThreshold: 70,
        maxClaims: 10
      };
      
      const mockClaims = [
        {
          originalText: 'High quality claim',
          topic: 'Topic A',
          importanceScore: 80,
          checkabilityScore: 80,
          truthProbability: 50
        },
        {
          originalText: 'Low quality claim',
          topic: 'Topic B',
          importanceScore: 40,
          checkabilityScore: 40,
          truthProbability: 50
        }
      ];
      
      mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve({
        response: {
          content: [{
            type: 'tool_use',
            input: { claims: mockClaims }
          }],
          usage: { input_tokens: 150, output_tokens: 80 }
        } as any,
        interaction: {
          model: 'claude-3-5-sonnet-20241022',
          prompt: 'test prompt',
          response: 'test response',
          tokensUsed: { prompt: 150, completion: 80, total: 230 },
          timestamp: new Date(),
          duration: 1200
        },
        toolResult: { claims: mockClaims }
      });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.claims).toHaveLength(1); // Only high quality claim
      expect(result.summary.totalFound).toBe(2);
      expect(result.summary.aboveThreshold).toBe(1);
      expect(result.claims[0].originalText).toBe('High quality claim');
    });

    it('should prioritize claims with low truth probability', async () => {
      const input = {
        text: 'Some text with claims.',
        minQualityThreshold: 50,
        maxClaims: 10
      };
      
      const mockClaims = [
        {
          originalText: 'Likely true claim',
          topic: 'Topic A',
          importanceScore: 70,
          checkabilityScore: 70,
          truthProbability: 90
        },
        {
          originalText: 'Likely false claim',
          topic: 'Topic B',
          importanceScore: 70,
          checkabilityScore: 70,
          truthProbability: 30
        }
      ];
      
      mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve({
        response: {
          content: [{
            type: 'tool_use',
            input: { claims: mockClaims }
          }],
          usage: { input_tokens: 150, output_tokens: 80 }
        } as any,
        interaction: {
          model: 'claude-3-5-sonnet-20241022',
          prompt: 'test prompt',
          response: 'test response',
          tokensUsed: { prompt: 150, completion: 80, total: 230 },
          timestamp: new Date(),
          duration: 1200
        },
        toolResult: { claims: mockClaims }
      });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.claims).toHaveLength(2);
      // The likely false claim should be prioritized (sorted first)
      expect(result.claims[0].originalText).toBe('Likely false claim');
      expect(result.claims[0].truthProbability).toBe(30);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const input = {
        text: 'Some text'
      };
      
      mockCallClaudeWithTool.mockImplementationOnce(() => Promise.reject(new Error('API Error')));
      
      await expect(tool.execute({ ...input, minQualityThreshold: 50, maxClaims: 30 }, mockContext))
        .rejects.toThrow('API Error');
    });
  });
});
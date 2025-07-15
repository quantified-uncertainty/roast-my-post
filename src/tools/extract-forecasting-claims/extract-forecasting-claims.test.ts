import { ExtractForecastingClaimsTool } from './index';
import { z } from 'zod';
import { ToolContext } from '../base/Tool';
import { createMockLLMInteraction } from '@/lib/claude/testUtils';

// Mock Claude wrapper
jest.mock('@/lib/claude/wrapper');
import { mockClaudeToolResponse } from '@/lib/claude/__mocks__/wrapper';

// Mock the Anthropic client factory
jest.mock('@/types/openai', () => ({
  ...jest.requireActual('@/types/openai'),
  createAnthropicClient: jest.fn(() => ({
    messages: {
      create: jest.fn()
    }
  }))
}));

import { createAnthropicClient } from '@/types/openai';

describe.skip('ExtractForecastingClaimsTool (legacy tests - needs mock update for callClaudeWithTool)', () => {
  const tool = new ExtractForecastingClaimsTool();
  const mockContext: ToolContext = {
    userId: 'test-user',
    logger: { 
      info: jest.fn(), 
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any
  };
  
  const mockClient = {
    messages: {
      create: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAnthropicClient as jest.Mock).mockReturnValue(mockClient);
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
      const invalidInput = { text: 'a'.repeat(10001) }; // Too long
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should validate maxDetailedAnalysis range', async () => {
      const invalidInput = { 
        text: 'Some text with predictions',
        maxDetailedAnalysis: 11 // Too high
      };
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });

    it('should accept valid input with defaults', async () => {
      const validInput = { text: 'AI will surpass human intelligence by 2030.' };
      
      // Mock extraction response
      mockClient.messages.create
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use',
            input: {
              forecasts: [{
                text: 'AI will surpass human intelligence by 2030',
                topic: 'AI development',
                timeframe: '2030'
              }]
            }
          }],
          usage: { input_tokens: 100, output_tokens: 50 }
        })
        // Mock selection response
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use',
            input: {
              selections: [{
                index: 0,
                reasoning: 'Significant technological prediction with clear timeframe'
              }]
            }
          }],
          usage: { input_tokens: 150, output_tokens: 30 }
        });
      
      const result = await tool.run(validInput, mockContext);
      
      expect(result.forecasts).toHaveLength(1);
      expect(result.totalFound).toBe(1);
      expect(result.selectedForAnalysis).toBe(1);
      expect(result.llmInteractions).toHaveLength(2);
      expect(result.forecasts[0].worthDetailedAnalysis).toBe(true);
      expect(result.forecasts[0].reasoning).toBe('Significant technological prediction with clear timeframe');
    });
  });

  describe('execute', () => {
    it('should extract and analyze forecasting claims successfully', async () => {
      const input = {
        text: 'The stock market will crash in 2024. There\'s a 70% chance of recession. Climate change might accelerate.',
        agentInstructions: 'Focus on economic predictions',
        maxDetailedAnalysis: 2
      };
      
      // Mock extraction response
      const mockForecasts = [
        {
          text: 'The stock market will crash in 2024',
          topic: 'Stock market',
          timeframe: '2024'
        },
        {
          text: 'There\'s a 70% chance of recession',
          topic: 'Economic recession',
          probability: 70
        },
        {
          text: 'Climate change might accelerate',
          topic: 'Climate change'
        }
      ];
      
      mockClient.messages.create
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use',
            input: { forecasts: mockForecasts }
          }],
          usage: { input_tokens: 200, output_tokens: 100 }
        })
        // Mock selection response - select first two
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use',
            input: {
              selections: [
                { index: 0, reasoning: 'Specific market prediction with timeline' },
                { index: 1, reasoning: 'Quantified economic forecast' }
              ]
            }
          }],
          usage: { input_tokens: 300, output_tokens: 80 }
        });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.forecasts).toHaveLength(3);
      expect(result.totalFound).toBe(3);
      expect(result.selectedForAnalysis).toBe(2);
      expect(result.llmInteractions).toHaveLength(2);
      
      // Check selection results
      expect(result.forecasts[0].worthDetailedAnalysis).toBe(true);
      expect(result.forecasts[1].worthDetailedAnalysis).toBe(true);
      expect(result.forecasts[2].worthDetailedAnalysis).toBe(false);
      
      expect(result.forecasts[0].reasoning).toBe('Specific market prediction with timeline');
      expect(result.forecasts[1].reasoning).toBe('Quantified economic forecast');
    });
    
    it('should handle text with no forecasts', async () => {
      const input = {
        text: 'This is just descriptive text about the past with no predictions.'
      };
      
      // Mock empty extraction response
      mockClient.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          input: { forecasts: [] }
        }],
        usage: { input_tokens: 100, output_tokens: 20 }
      });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.forecasts).toHaveLength(0);
      expect(result.totalFound).toBe(0);
      expect(result.selectedForAnalysis).toBe(0);
      expect(result.llmInteractions).toHaveLength(1); // Only extraction call
    });

    it('should handle forecasts with probability and timeframe', async () => {
      const input = {
        text: 'There is a 60% chance that Bitcoin will reach $100k by end of 2024.'
      };
      
      // Mock extraction response with probability and timeframe
      mockClient.messages.create
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use',
            input: {
              forecasts: [{
                text: 'Bitcoin will reach $100k by end of 2024',
                topic: 'Bitcoin price',
                probability: 60,
                timeframe: 'end of 2024'
              }]
            }
          }],
          usage: { input_tokens: 120, output_tokens: 60 }
        })
        .mockResolvedValueOnce({
          content: [{
            type: 'tool_use',
            input: {
              selections: [{
                index: 0,
                reasoning: 'Specific cryptocurrency prediction with probability and timeframe'
              }]
            }
          }],
          usage: { input_tokens: 180, output_tokens: 40 }
        });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.forecasts[0].probability).toBe(60);
      expect(result.forecasts[0].timeframe).toBe('end of 2024');
      expect(result.forecasts[0].topic).toBe('Bitcoin price');
    });
  });

  describe('error handling', () => {
    it('should handle extraction errors', async () => {
      const input = { text: 'Some text with predictions' };
      const error = new Error('Anthropic API error');
      
      mockClient.messages.create.mockRejectedValueOnce(error);
      
      await expect(tool.execute(input, mockContext))
        .rejects.toThrow('Anthropic API error');
    });

    it('should handle malformed tool responses', async () => {
      const input = { text: 'Some text with predictions' };
      
      // Mock malformed response
      mockClient.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Not a tool use' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.forecasts).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });
  });
});

describe('ExtractForecastingClaimsTool with wrapper mocks', () => {
  const tool = new ExtractForecastingClaimsTool();
  const mockContext: ToolContext = {
    userId: 'test-user',
    logger: { 
      info: jest.fn(), 
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('input validation', () => {
    it('should validate required fields', async () => {
      const invalidInput = {}; // Missing text
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should validate text length limits', async () => {
      const invalidInput = { text: 'a'.repeat(10001) }; // Too long
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
  });

  describe('execute with mocked wrapper', () => {
    it('should extract and analyze forecasting claims successfully', async () => {
      const input = {
        text: 'AI will surpass human intelligence by 2050. There is a 70% chance of recession in 2025.',
        maxDetailedAnalysis: 2
      };
      
      // Mock extraction response
      mockClaudeToolResponse({
        forecasts: [
          {
            text: 'AI will surpass human intelligence by 2050',
            topic: 'Artificial intelligence',
            timeframe: '2050'
          },
          {
            text: 'There is a 70% chance of recession in 2025',
            topic: 'Economic recession',
            probability: 70,
            timeframe: '2025'
          }
        ]
      });
      
      // Mock selection response
      mockClaudeToolResponse({
        selections: [
          { index: 0, reasoning: 'Significant technological prediction with clear timeframe' },
          { index: 1, reasoning: 'Quantified economic forecast with specific probability' }
        ]
      });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.forecasts).toHaveLength(2);
      expect(result.totalFound).toBe(2);
      expect(result.selectedForAnalysis).toBe(2);
      expect(result.llmInteractions).toHaveLength(2);
      
      // Check selection results
      expect(result.forecasts[0].worthDetailedAnalysis).toBe(true);
      expect(result.forecasts[1].worthDetailedAnalysis).toBe(true);
      expect(result.forecasts[0].reasoning).toBe('Significant technological prediction with clear timeframe');
    });
    
    it('should handle text with no forecasts', async () => {
      const input = {
        text: 'This is just descriptive text about the past with no predictions.'
      };
      
      // Mock empty extraction response
      mockClaudeToolResponse({
        forecasts: []
      });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.forecasts).toHaveLength(0);
      expect(result.totalFound).toBe(0);
      expect(result.selectedForAnalysis).toBe(0);
      expect(result.llmInteractions).toHaveLength(1);
    });

    it('should limit selections to maxDetailedAnalysis', async () => {
      const input = {
        text: 'Multiple predictions here',
        maxDetailedAnalysis: 1
      };
      
      // Mock extraction with 3 forecasts
      mockClaudeToolResponse({
        forecasts: [
          { text: 'Forecast 1', topic: 'Topic 1' },
          { text: 'Forecast 2', topic: 'Topic 2' },
          { text: 'Forecast 3', topic: 'Topic 3' }
        ]
      });
      
      // Mock selection of only 1 (due to limit)
      mockClaudeToolResponse({
        selections: [
          { index: 0, reasoning: 'Most relevant forecast' }
        ]
      });
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.totalFound).toBe(3);
      expect(result.selectedForAnalysis).toBe(1);
      expect(result.forecasts[0].worthDetailedAnalysis).toBe(true);
      expect(result.forecasts[1].worthDetailedAnalysis).toBe(false);
      expect(result.forecasts[2].worthDetailedAnalysis).toBe(false);
    });

    it('should use agent instructions when provided', async () => {
      const input = {
        text: 'Economic and tech predictions',
        agentInstructions: 'Focus on economic predictions only'
      };
      
      // Mock extraction
      mockClaudeToolResponse({
        forecasts: [{
          id: 'forecast-1',
          claim: 'AI will surpass human intelligence by 2050',
          probability: 0.3,
          confidence: 'medium',
          timeframe: '2050',
          category: 'Technology'
        }]
      });
      
      // Mock selection
      mockClaudeToolResponse({
        selections: []
      });
      
      const result = await tool.execute(input, mockContext);
      
      // Verify agent instructions were included in prompts
      expect(result.llmInteractions).toHaveLength(2);
      expect(result.llmInteractions[1].prompt).toContain('Focus on economic predictions only');
    });
  });
});
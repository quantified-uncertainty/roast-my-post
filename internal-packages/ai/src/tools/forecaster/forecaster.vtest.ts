import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { ForecasterTool } from './index';
import { z } from 'zod';
import { ToolContext } from '../base/Tool';

// Mock the forecast generator
vi.mock('./generator', () => ({
  generateForecastWithAggregation: vi.fn()
}));

import { generateForecastWithAggregation } from './generator';

describe('ForecasterTool', () => {
  const tool = new ForecasterTool();
  const mockContext: ToolContext = {
    userId: 'test-user',
    logger: { 
      info: vi.fn(), 
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('input validation', () => {
    it('should validate required fields', async () => {
      const invalidInput = {}; // Missing question
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should validate question length', async () => {
      const invalidInput = { question: '' }; // Too short
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should validate question max length', async () => {
      const invalidInput = { question: 'a'.repeat(501) }; // Too long
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should accept valid input with defaults', async () => {
      const validInput = { question: 'Will AGI arrive by 2030?' };
      
      const mockResponse = {
        forecast: {
          probability: 35,
          description: 'Based on 6 analyses...',
          consensus: 'medium'
        },
        individual_forecasts: [
          { probability: 30, reasoning: 'Reason 1' },
          { probability: 40, reasoning: 'Reason 2' },
          { probability: 35, reasoning: 'Reason 3' }
        ],
        statistics: {
          mean: 35,
          std_dev: 5
        },
        outliers_removed: []
      };
      
      (generateForecastWithAggregation as any).mockImplementationOnce(() => Promise.resolve(mockResponse));
      
      const result = await tool.run(validInput, mockContext);
      
      expect(result.probability).toBe(35);
      expect(result.consensus).toBe('medium');
      expect(generateForecastWithAggregation).toHaveBeenCalledWith({
        question: 'Will AGI arrive by 2030?',
        context: undefined,
        numForecasts: 6, // Default value
        usePerplexity: false // Default value
      });
    });
  });
  
  describe('execute', () => {
    it('should generate forecast successfully', async () => {
      const input = {
        question: 'Will Bitcoin reach $100k by 2025?',
        context: 'Current price is around $45k',
        numForecasts: 3
      };
      
      const mockResponse = {
        forecast: {
          probability: 65,
          description: 'Based on 3 independent analyses, considering current adoption trends...',
          consensus: 'high'
        },
        individual_forecasts: [
          { probability: 60, reasoning: 'Strong institutional adoption' },
          { probability: 70, reasoning: 'Historical cycles suggest growth' },
          { probability: 65, reasoning: 'Regulatory clarity improving' }
        ],
        statistics: {
          mean: 65,
          std_dev: 5
        },
        outliers_removed: []
      };
      
      (generateForecastWithAggregation as any).mockImplementationOnce(() => Promise.resolve(mockResponse));
      
      const result = await tool.execute(input, mockContext);
      
      expect(result).toEqual({
        probability: 65,
        description: 'Based on 3 independent analyses, considering current adoption trends...',
        consensus: 'high',
        individualForecasts: [
          { probability: 60, reasoning: 'Strong institutional adoption' },
          { probability: 70, reasoning: 'Historical cycles suggest growth' },
          { probability: 65, reasoning: 'Regulatory clarity improving' }
        ],
        statistics: {
          mean: 65,
          stdDev: 5
        },
        perplexityResults: undefined
      });
    });
    
  });
  
  describe('hooks', () => {
    it('should call beforeExecute hook', async () => {
      const input = { question: 'Test?' };
      
      (generateForecastWithAggregation as any).mockImplementationOnce(() => Promise.resolve({
        forecast: { probability: 50, description: 'Test', consensus: 'medium' },
        individual_forecasts: [],
        statistics: { mean: 50, std_dev: 0 },
        outliers_removed: [],
        llmInteractions: []
      }));
      
      await tool.run(input, mockContext);
      
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[ForecasterTool] Starting forecast with 6 samples'
      );
    });
    
    it('should call afterExecute hook', async () => {
      const input = { question: 'Test?' };
      
      (generateForecastWithAggregation as any).mockImplementationOnce(() => Promise.resolve({
        forecast: { probability: 75, description: 'Test', consensus: 'high' },
        individual_forecasts: [],
        statistics: { mean: 75, std_dev: 0 },
        outliers_removed: [],
        llmInteractions: []
      }));
      
      await tool.run(input, mockContext);
      
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[ForecasterTool] Completed forecast: 75% (high consensus)'
      );
    });
  });
  
  describe('error handling', () => {
    it('should handle forecast generation errors', async () => {
      const input = { question: 'Test?' };
      const error = new Error('API error');
      
      (generateForecastWithAggregation as any).mockImplementationOnce(() => Promise.reject(error));
      
      await expect(tool.execute(input, mockContext))
        .rejects.toThrow('API error');
      
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        '[ForecasterTool] Error generating forecast:',
        error
      );
    });
  });
});
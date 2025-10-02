import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { PerplexityResearchTool } from './index';
import { z } from 'zod';
import { ToolContext } from '../base/Tool';

// Mock the Perplexity client
vi.mock('./client', () => ({
  PerplexityClient: vi.fn().mockImplementation(() => ({
    query: vi.fn()
  }))
}));

import { PerplexityClient } from './client';

describe('PerplexityResearchTool', () => {
  const tool = new PerplexityResearchTool();
  const mockContext: ToolContext = {
    userId: 'test-user',
    logger: { 
      info: vi.fn(), 
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any
  };
  
  const mockClient = {
    query: vi.fn(),
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    (PerplexityClient as any).mockImplementation(() => mockClient);
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.HELICONE_API_KEY = 'test-helicone-key';
  });
  
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.HELICONE_API_KEY;
  });
  
  describe('input validation', () => {
    it('should validate required fields', async () => {
      const invalidInput = {}; // Missing query
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should validate query length', async () => {
      const invalidInput = { query: '' }; // Too short
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should accept valid input with defaults', async () => {
      const validInput = { query: 'What are the latest developments in AI?' };
      
      const mockResponse = {
        summary: 'Recent AI developments include...',
        keyFindings: ['Finding 1', 'Finding 2'],
        sources: [
          { title: 'Source 1', url: 'https://example.com/1', snippet: 'Snippet 1' }
        ]
      };
      
      // Mock the query to return JSON response
      mockClient.query.mockImplementationOnce(() => Promise.resolve({
        content: JSON.stringify(mockResponse),
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
      }));
      
      const result = await tool.run(validInput, mockContext);
      
      expect(result.summary).toBe('Recent AI developments include...');
      expect(result.keyFindings).toHaveLength(2);
      expect(result.sources).toHaveLength(1);
      
      expect(mockClient.query).toHaveBeenCalled();
    });
  });
  
  describe('execute', () => {
    it('should perform research successfully', async () => {
      const input = {
        query: 'Latest quantum computing breakthroughs',
        focusArea: 'technical' as const,
        maxSources: 3
      };
      
      const mockResponse = {
        summary: 'Quantum computing has seen significant advances...',
        keyFindings: [
          'IBM achieved 433-qubit processor',
          'Google demonstrated quantum error correction',
          'Microsoft announced topological qubits'
        ],
        sources: [
          { 
            title: 'IBM Quantum Breakthrough', 
            url: 'https://ibm.com/quantum', 
            snippet: 'IBM unveils new quantum processor...' 
          },
          { 
            title: 'Google Quantum AI', 
            url: 'https://quantum.google', 
            snippet: 'Error correction milestone achieved...' 
          }
        ]
      };
      
      // Mock the query to return JSON response
      mockClient.query.mockImplementationOnce(() => Promise.resolve({
        content: JSON.stringify(mockResponse),
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
      }));
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.summary).toBe('Quantum computing has seen significant advances...');
      expect(result.keyFindings).toHaveLength(3);
      expect(result.sources).toHaveLength(2);
    });
    
    it('should include forecasting context when requested', async () => {
      const input = {
        query: 'Will AI surpass human intelligence by 2030?',
        includeForecastingContext: true
      };
      
      const mockResearchResponse = {
        summary: 'AI progress towards AGI...',
        keyFindings: ['Current capabilities', 'Rate of progress'],
        sources: []
      };
      
      const mockForecastContext = 'Based on current trends and expert predictions...';
      
      // Mock the research query to return JSON response
      mockClient.query.mockImplementationOnce(() => Promise.resolve({
        content: JSON.stringify(mockResearchResponse),
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
      }));
      
      // Mock the forecasting context query
      mockClient.query.mockImplementationOnce(() => Promise.resolve({
        content: mockForecastContext,
        usage: { prompt_tokens: 30, completion_tokens: 80, total_tokens: 110 }
      }));
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.forecastingContext).toBe(mockForecastContext);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('access validation', () => {
    it('should fail without OpenRouter API key', async () => {
      delete process.env.OPENROUTER_API_KEY;
      
      const isValid = await tool.validateAccess(mockContext);
      
      expect(isValid).toBe(false);
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        '[PerplexityResearch] Missing OPENROUTER_API_KEY'
      );
    });
    
    it('should pass with API keys', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      process.env.HELICONE_API_KEY = 'test-helicone-key';
      
      const isValid = await tool.validateAccess(mockContext);
      
      expect(isValid).toBe(true);
    });
  });
  
  describe('error handling', () => {
    it('should handle research errors', async () => {
      const input = { query: 'Test query' };
      const error = new Error('OpenRouter API error');
      
      // Mock the query method to reject for both structured and fallback calls
      mockClient.query.mockImplementation(() => Promise.reject(error));
      
      await expect(tool.execute(input, mockContext))
        .rejects.toThrow('OpenRouter API error');
      
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        '[PerplexityResearch] Error:',
        error
      );
    });
    
    it('should handle fallback when JSON parsing fails', async () => {
      const input = { query: 'Test query' };
      
      // Mock first query call (structured research) to fail, then second query call to succeed
      mockClient.query
        .mockImplementationOnce(() => Promise.reject(new Error('Structured research failed')))
        .mockImplementationOnce(() => Promise.resolve({
          content: 'This is a plain text response with some findings:\n- Finding 1\n- Finding 2\n- Finding 3',
          usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
        }));
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.summary).toBe('This is a plain text response with some findings:\n- Finding 1\n- Finding 2\n- Finding 3');
      expect(result.keyFindings).toHaveLength(3);
      expect(result.keyFindings[0]).toBe('Finding 1');
      expect(result.sources).toHaveLength(0);
      expect(mockContext.logger.warn).toHaveBeenCalledWith(
        '[PerplexityResearch] Structured research failed, using fallback mode'
      );
    });
  });
});
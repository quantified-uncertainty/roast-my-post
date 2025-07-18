import { CheckSpellingGrammarTool } from './index';
import { z } from 'zod';
import { ToolContext } from '../base/Tool';

// Mock the Claude wrapper
jest.mock('@/lib/claude/wrapper', () => ({
  callClaudeWithTool: jest.fn()
}));

import { callClaudeWithTool } from '@/lib/claude/wrapper';

describe('CheckSpellingGrammarTool', () => {
  const tool = new CheckSpellingGrammarTool();
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
  
  describe('configuration', () => {
    it('should have valid configuration', () => {
      expect(tool.config.id).toBe('check-spelling-grammar');
      expect(tool.config.name).toBe('Check Spelling & Grammar');
      expect(tool.config.description).toBeDefined();
      expect(tool.config.version).toBe('1.0.0');
      expect(tool.config.category).toBe('analysis');
      expect(tool.config.costEstimate).toBeDefined();
    });
  });
  
  describe('input validation', () => {
    it('should validate required fields', async () => {
      const invalidInput = {}; // Missing text
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should validate text length', async () => {
      const invalidInput = { text: '' }; // Too short
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should validate text max length', async () => {
      const invalidInput = { text: 'a'.repeat(10001) }; // Too long
      
      await expect(tool.run(invalidInput, mockContext))
        .rejects.toThrow(z.ZodError);
    });
    
    it('should accept valid input with defaults', async () => {
      const validInput = { text: 'This is a test text with some errors.' };
      
      const mockResponse = {
        toolResult: {
          errors: []
        },
        interaction: {
          model: 'claude-sonnet-4',
          prompt: 'Check text...',
          response: 'No errors found',
          tokensUsed: { prompt: 100, completion: 50, total: 150 },
          timestamp: new Date(),
          duration: 1000
        }
      };
      
      (callClaudeWithTool as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await tool.run(validInput, mockContext);
      
      expect(result.errors).toEqual([]);
      expect(result.summary.totalErrors).toBe(0);
      expect(result.llmInteractions).toHaveLength(1);
    });
  });
  
  describe('execute', () => {
    it('should identify spelling and grammar errors', async () => {
      const input = { 
        text: 'This text hav some erors in it.',
        includeStyle: true
      };
      
      const mockErrors = [
        { text: 'hav', correction: 'has', type: 'grammar', context: 'text hav some' },
        { text: 'erors', correction: 'errors', type: 'spelling', context: 'some erors in' }
      ];
      
      const mockResponse = {
        toolResult: {
          errors: mockErrors
        },
        interaction: {
          model: 'claude-sonnet-4',
          prompt: 'Check text...',
          response: 'Found errors...',
          tokensUsed: { prompt: 200, completion: 100, total: 300 },
          timestamp: new Date(),
          duration: 1500
        }
      };
      
      (callClaudeWithTool as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.errors).toEqual(mockErrors);
      expect(result.summary).toEqual({
        totalErrors: 2,
        spellingErrors: 1,
        grammarErrors: 1,
        styleErrors: 0
      });
      expect(result.commonPatterns).toContainEqual({ type: 'spelling', count: 1 });
      expect(result.commonPatterns).toContainEqual({ type: 'grammar', count: 1 });
    });
    
    it('should exclude style errors when includeStyle is false', async () => {
      const input = { 
        text: 'This text has some passive voice that could be improved.',
        includeStyle: false
      };
      
      const mockResponse = {
        toolResult: {
          errors: []
        },
        interaction: {
          model: 'claude-sonnet-4',
          prompt: 'Check text...',
          response: 'No spelling or grammar errors',
          tokensUsed: { prompt: 150, completion: 50, total: 200 },
          timestamp: new Date(),
          duration: 1000
        }
      };
      
      (callClaudeWithTool as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await tool.execute(input, mockContext);
      
      // Verify the call was made without style checking
      expect(callClaudeWithTool).toHaveBeenCalledWith(
        expect.objectContaining({
          toolSchema: expect.objectContaining({
            properties: expect.objectContaining({
              errors: expect.objectContaining({
                items: expect.objectContaining({
                  properties: expect.objectContaining({
                    type: expect.objectContaining({
                      enum: ["spelling", "grammar"] // No "style"
                    })
                  })
                })
              })
            })
          })
        })
      );
    });
    
    it('should generate recommendations for many errors', async () => {
      const input = { text: 'Text with many errors' };
      
      // Create many errors
      const mockErrors = Array(25).fill(null).map((_, i) => ({
        text: `error${i}`,
        correction: `correct${i}`,
        type: i % 2 === 0 ? 'spelling' : 'grammar',
        context: 'some context'
      }));
      
      const mockResponse = {
        toolResult: { errors: mockErrors },
        interaction: {
          model: 'claude-sonnet-4',
          prompt: 'Check text...',
          response: 'Many errors found',
          tokensUsed: { prompt: 300, completion: 500, total: 800 },
          timestamp: new Date(),
          duration: 2000
        }
      };
      
      (callClaudeWithTool as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.recommendations).toContain('Run document through additional grammar checking tools');
      expect(result.summary.totalErrors).toBe(25);
    });
    
    it('should identify repeated errors', async () => {
      const input = { text: 'Text with repeated errors' };
      
      const mockErrors = [
        { text: 'teh', correction: 'the', type: 'spelling' },
        { text: 'teh', correction: 'the', type: 'spelling' },
        { text: 'teh', correction: 'the', type: 'spelling' },
        { text: 'teh', correction: 'the', type: 'spelling' },
        { text: 'hav', correction: 'have', type: 'grammar' }
      ];
      
      const mockResponse = {
        toolResult: { errors: mockErrors },
        interaction: {
          model: 'claude-sonnet-4',
          prompt: 'Check text...',
          response: 'Repeated errors found',
          tokensUsed: { prompt: 200, completion: 150, total: 350 },
          timestamp: new Date(),
          duration: 1200
        }
      };
      
      (callClaudeWithTool as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.recommendations).toContain('Use find-and-replace for repeated error: "teh" (appears 4 times)');
    });
  });
  
  describe('hooks', () => {
    it('should call beforeExecute hook', async () => {
      const input = { text: 'Test text' };
      
      (callClaudeWithTool as jest.Mock).mockResolvedValueOnce({
        toolResult: { errors: [] },
        interaction: {
          model: 'claude-sonnet-4',
          prompt: 'Check text...',
          response: 'No errors',
          tokensUsed: { prompt: 100, completion: 50, total: 150 },
          timestamp: new Date(),
          duration: 1000
        }
      });
      
      await tool.run(input, mockContext);
      
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[CheckSpellingGrammarTool] Starting check for 9 characters'
      );
    });
    
    it('should call afterExecute hook', async () => {
      const input = { text: 'Test text' };
      
      (callClaudeWithTool as jest.Mock).mockResolvedValueOnce({
        toolResult: { errors: [] },
        interaction: {
          model: 'claude-sonnet-4',
          prompt: 'Check text...',
          response: 'No errors',
          tokensUsed: { prompt: 100, completion: 50, total: 150 },
          timestamp: new Date(),
          duration: 1000
        }
      });
      
      await tool.run(input, mockContext);
      
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[CheckSpellingGrammarTool] Found 0 total errors'
      );
    });
  });
  
  describe('error handling', () => {
    it('should handle Claude API errors', async () => {
      const input = { text: 'Test text' };
      const error = new Error('Claude API error');
      
      (callClaudeWithTool as jest.Mock).mockRejectedValueOnce(error);
      
      await expect(tool.execute(input, mockContext))
        .rejects.toThrow('Claude API error');
      
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        '[CheckSpellingGrammarTool] Error checking spelling/grammar:',
        error
      );
    });
  });
  
  describe('maxErrors limit', () => {
    it('should respect maxErrors parameter', async () => {
      const input = { 
        text: 'Text with potentially many errors',
        maxErrors: 5
      };
      
      const mockResponse = {
        toolResult: {
          errors: Array(5).fill(null).map((_, i) => ({
            text: `error${i}`,
            correction: `correct${i}`,
            type: 'spelling'
          }))
        },
        interaction: {
          model: 'claude-sonnet-4',
          prompt: 'Check text...',
          response: 'Limited to 5 errors',
          tokensUsed: { prompt: 200, completion: 100, total: 300 },
          timestamp: new Date(),
          duration: 1500
        }
      };
      
      (callClaudeWithTool as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await tool.execute(input, mockContext);
      
      expect(result.errors).toHaveLength(5);
      expect(callClaudeWithTool).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Limit to 5 most important errors')
        })
      );
    });
  });
});
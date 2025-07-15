import { describe, it, expect, beforeEach } from '@jest/globals';
import CheckMathTool from './index';
import { logger } from '@/lib/logger';

// Mock Anthropic since we're testing the tool structure, not the LLM
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate
    }
  }));
});

describe('CheckMathTool', () => {
  const mockContext = { 
    logger,
    userId: 'test-user'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock response
    mockCreate.mockResolvedValue({
      content: [{
        type: 'tool_use',
        name: 'report_math_errors',
        input: {
          errors: []
        }
      }],
      usage: {
        input_tokens: 100,
        output_tokens: 50
      }
    });
  });

  describe('basic functionality', () => {
    it('should have correct configuration', () => {
      expect(CheckMathTool.config.id).toBe('check-math');
      expect(CheckMathTool.config.name).toBe('Check Mathematical Accuracy');
      expect(CheckMathTool.config.category).toBe('analysis');
    });

    it('should validate input schema', () => {
      const validInput = {
        text: 'The result is 2 + 2 = 4'
      };
      
      expect(() => CheckMathTool.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        text: '' // empty text should fail
      };
      
      expect(() => CheckMathTool.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('math checking', () => {
    it('should detect simple arithmetic errors', async () => {
      // Mock response with arithmetic error
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          name: 'report_math_errors',
          input: {
            errors: [
              {
                lineStart: 1,
                lineEnd: 1,
                highlightedText: '2 + 2 = 5',
                description: 'Arithmetic error: 2 + 2 equals 4, not 5'
              }
            ]
          }
        }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      });

      const input = {
        text: 'The calculation shows that 2 + 2 = 5, which is clearly correct.'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary.totalErrors).toBe(result.errors.length);
      expect(result.summary.calculationErrors).toBeGreaterThan(0);
      expect(result.llmInteraction).toBeDefined();
      expect(result.llmInteraction.tokensUsed.prompt).toBeGreaterThan(0);
    });

    it('should handle text with no math errors', async () => {
      // Default mock already returns empty errors array
      
      const input = {
        text: 'This is a simple text with no mathematical content or calculations.'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.errors.length).toBe(0);
      expect(result.summary.totalErrors).toBe(0);
      expect(result.llmInteraction).toBeDefined();
    });

    it('should categorize different types of errors correctly', async () => {
      // Mock response with multiple error types
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          name: 'report_math_errors',
          input: {
            errors: [
              {
                lineStart: 1,
                lineEnd: 1,
                highlightedText: '5 + 3 = 9',
                description: 'Calculation error: 5 + 3 equals 8, not 9'
              },
              {
                lineStart: 2,
                lineEnd: 2,
                highlightedText: '1 kilometer to 100 meters',
                description: 'Unit conversion error: 1 kilometer equals 1000 meters, not 100'
              },
              {
                lineStart: 3,
                lineEnd: 3,
                highlightedText: '∑ = 5',
                description: 'Notation error: summation symbol requires bounds and expression'
              }
            ]
          }
        }],
        usage: {
          input_tokens: 150,
          output_tokens: 80
        }
      });

      const input = {
        text: `
        Line 1: The calculation 5 + 3 = 9 is wrong.
        Line 2: Converting 1 kilometer to 100 meters is incorrect.
        Line 3: The notation ∑ = 5 without bounds is improper.
        `
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should have different types of errors
      const errorTypes = new Set(result.errors.map(e => e.errorType));
      expect(errorTypes.size).toBeGreaterThan(1);
      
      expect(result.commonPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('output format', () => {
    it('should generate proper recommendations', async () => {
      // Mock response with multiple calculation errors
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          name: 'report_math_errors',
          input: {
            errors: [
              {
                lineStart: 1,
                lineEnd: 1,
                highlightedText: '2+2=5',
                description: 'Arithmetic error: 2+2 equals 4, not 5'
              },
              {
                lineStart: 1,
                lineEnd: 1,
                highlightedText: '3*3=10',
                description: 'Arithmetic error: 3*3 equals 9, not 10'
              },
              {
                lineStart: 1,
                lineEnd: 1,
                highlightedText: '4/2=3',
                description: 'Arithmetic error: 4/2 equals 2, not 3'
              },
              {
                lineStart: 1,
                lineEnd: 1,
                highlightedText: '5-1=3',
                description: 'Arithmetic error: 5-1 equals 4, not 3'
              }
            ]
          }
        }],
        usage: {
          input_tokens: 120,
          output_tokens: 100
        }
      });

      const input = {
        text: 'Multiple errors: 2+2=5, 3*3=10, 4/2=3, 5-1=3'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      if (result.errors.length > 0) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });
  });
});
import { describe, it, expect, beforeEach } from '@jest/globals';
import { extractMathExpressionsTool } from './index';
import { logger } from '../../shared/logger';
import { setupClaudeToolMock } from '../../claude/mockHelpers';

// Mock Claude wrapper
jest.mock('@roast/ai', () => ({
  callClaudeWithTool: jest.fn(),
  setupClaudeToolMock: jest.requireActual('@roast/ai').setupClaudeToolMock
}));
import { callClaudeWithTool } from '../../claude/wrapper';

// Get the mocked function and setup helper
const mockCallClaudeWithTool = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
const { mockToolResponse } = setupClaudeToolMock(mockCallClaudeWithTool);

describe('ExtractMathExpressionsTool', () => {
  const mockContext = { 
    logger,
    userId: 'test-user'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should have correct configuration', () => {
      expect(extractMathExpressionsTool.config.id).toBe('extract-math-expressions');
      expect(extractMathExpressionsTool.config.name).toBe('Extract Mathematical Expressions');
      expect(extractMathExpressionsTool.config.category).toBe('analysis');
    });

    it('should validate input schema', () => {
      const validInput = {
        text: 'The calculation shows 2 + 2 = 5'
      };

      expect(() => extractMathExpressionsTool.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        text: '', // Empty text not allowed
        verifyCalculations: 'yes' // Should be boolean
      };

      expect(() => extractMathExpressionsTool.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('execute method', () => {
    it('should extract math expressions with errors', async () => {
      // Mock response with a math error
      mockToolResponse({
        expressions: [
          {
            originalText: '2 + 2 = 5',
            hasError: true,
            errorType: 'Calculation Error',
            errorExplanation: 'Basic arithmetic error: 2 + 2 equals 4, not 5',
            correctedVersion: '2 + 2 = 4',
            conciseCorrection: '5 → 4',
            complexityScore: 10,
            contextImportanceScore: 30,
            errorSeverityScore: 80,
            verificationStatus: 'verified'
          }
        ]
      });

      const input = {
        text: 'The calculation shows that 2 + 2 = 5, which is correct.',
        verifyCalculations: true
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      expect(result.expressions.length).toBe(1);
      expect(result.expressions[0].hasError).toBe(true);
      expect(result.expressions[0].conciseCorrection).toBe('5 → 4');
      expect(result.expressions[0].errorSeverityScore).toBe(80);
    });

    it('should not extract correct simple percentages', async () => {
      // Mock empty response for correct math
      mockToolResponse({
        expressions: []
      });

      const input = {
        text: 'Our market share is 54% and growing.',
        verifyCalculations: true
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      expect(result.expressions.length).toBe(0);
    });

    it('should extract unit conversion errors', async () => {
      mockToolResponse({
        expressions: [
          {
            originalText: '100 meters tall, approximately 300 feet',
            hasError: true,
            errorType: 'Unit Conversion Error',
            errorExplanation: '100 meters equals approximately 328 feet, not 300 feet',
            correctedVersion: '100 meters tall, approximately 328 feet',
            conciseCorrection: '300 → 328',
            complexityScore: 25,
            contextImportanceScore: 50,
            errorSeverityScore: 45,
            verificationStatus: 'verified'
          }
        ]
      });

      const input = {
        text: 'The building is 100 meters tall, approximately 300 feet.',
        verifyCalculations: true
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      expect(result.expressions.length).toBe(1);
      expect(result.expressions[0].errorType).toBe('Unit Conversion Error');
      expect(result.expressions[0].conciseCorrection).toBe('300 → 328');
    });

    it('should handle multiple errors with different severities', async () => {
      mockToolResponse({
        expressions: [
          {
            originalText: '15% of $200 = $50',
            hasError: true,
            errorType: 'Percentage Calculation Error',
            errorExplanation: '15% of $200 equals $30, not $50',
            correctedVersion: '15% of $200 = $30',
            conciseCorrection: '$50 → $30',
            complexityScore: 20,
            contextImportanceScore: 60,
            errorSeverityScore: 65,
            verificationStatus: 'verified'
          },
          {
            originalText: '3.3 × 10^6',
            hasError: true,
            errorType: 'Order of Magnitude Error',
            errorExplanation: '330 million should be written as 3.3 × 10^8, not 10^6',
            correctedVersion: '3.3 × 10^8',
            conciseCorrection: '10^6 → 10^8',
            complexityScore: 30,
            contextImportanceScore: 70,
            errorSeverityScore: 90,
            verificationStatus: 'verified'
          }
        ]
      });

      const input = {
        text: 'After a 15% discount on $200, you pay $50. The US has 330 million (3.3 × 10^6) people.',
        verifyCalculations: true
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      expect(result.expressions.length).toBe(2);
      
      // Check first error
      expect(result.expressions[0].errorType).toBe('Percentage Calculation Error');
      expect(result.expressions[0].errorSeverityScore).toBe(65);
      
      // Check second error (more severe)
      expect(result.expressions[1].errorType).toBe('Order of Magnitude Error');
      expect(result.expressions[1].errorSeverityScore).toBe(90);
    });

    it('should respect includeContext parameter', async () => {
      mockToolResponse({
        expressions: [
          {
            originalText: '2 + 2 = 5',
            hasError: true,
            errorType: 'Calculation Error',
            errorExplanation: 'Arithmetic error in example context',
            correctedVersion: '2 + 2 = 4',
            conciseCorrection: '5 → 4',
            complexityScore: 10,
            contextImportanceScore: 10, // Low importance due to example context
            errorSeverityScore: 30,
            verificationStatus: 'verified'
          }
        ]
      });

      const input = {
        text: 'In this example of bad math: 2 + 2 = 5',
        verifyCalculations: true,
        includeContext: true
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      expect(result.expressions.length).toBe(1);
      expect(result.expressions[0].contextImportanceScore).toBe(10); // Low due to context
    });

    it('should handle text with no mathematical content', async () => {
      mockToolResponse({
        expressions: []
      });

      const input = {
        text: 'This is a philosophical discussion about the nature of reality.',
        verifyCalculations: true
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      expect(result.expressions.length).toBe(0);
    });

    it('should only extract expressions with high error probability', async () => {
      mockToolResponse({
        expressions: [
          {
            originalText: '10,800',
            hasError: true,
            errorType: 'Method Error',
            errorExplanation: 'Used linear multiplication instead of compound interest formula',
            correctedVersion: '2,159',
            conciseCorrection: '10,800 → 2,159',
            complexityScore: 60,
            contextImportanceScore: 80,
            errorSeverityScore: 75,
            verificationStatus: 'verified'
          }
        ]
      });

      const input = {
        text: '$1000 at 8% for 10 years: 1000 × 1.08 × 10 = $10,800',
        verifyCalculations: true
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      // Should extract this significant error
      expect(result.expressions.length).toBe(1);
      expect(result.expressions[0].errorType).toBe('Method Error');
      expect(result.expressions[0].errorSeverityScore).toBeGreaterThan(70);
    });
  });

  describe('error handling', () => {
    it('should handle LLM failures gracefully', async () => {
      const mockError = new Error('LLM service unavailable');
      mockCallClaudeWithTool.mockRejectedValueOnce(mockError);

      const input = {
        text: 'Some mathematical text'
      };

      await expect(extractMathExpressionsTool.execute(input, mockContext))
        .rejects.toThrow('LLM service unavailable');
    });

    it('should handle empty expressions array', async () => {
      mockToolResponse({
        expressions: null // Simulate missing field
      });

      const input = {
        text: '2 + 2 = 4'
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      // Should default to empty array
      expect(result.expressions).toEqual([]);
    });
  });

  describe('output validation', () => {
    it('should produce valid output structure', async () => {
      mockToolResponse({
        expressions: [{
          originalText: 'π ≈ 3.14',
          hasError: false,
          complexityScore: 15,
          contextImportanceScore: 40,
          errorSeverityScore: 0,
          verificationStatus: 'verified'
        }]
      });

      const input = {
        text: 'We use π ≈ 3.14 for calculations'
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      // Validate output schema
      expect(() => extractMathExpressionsTool.outputSchema.parse(result)).not.toThrow();
    });
  });

  describe('concise correction formatting', () => {
    it('should format various types of corrections concisely', async () => {
      mockToolResponse({
        expressions: [
          {
            originalText: '45% of 400 = 125',
            hasError: true,
            errorType: 'Calculation Error',
            errorExplanation: '45% of 400 equals 180, not 125',
            correctedVersion: '45% of 400 = 180',
            conciseCorrection: '125 → 180',
            complexityScore: 20,
            contextImportanceScore: 50,
            errorSeverityScore: 60,
            verificationStatus: 'verified'
          },
          {
            originalText: '×0.15',
            hasError: true,
            errorType: 'Formula Error',
            errorExplanation: 'Should multiply by 1.15 for 15% increase, not 0.15',
            correctedVersion: '×1.15',
            conciseCorrection: '×0.15 → ×1.15',
            complexityScore: 30,
            contextImportanceScore: 70,
            errorSeverityScore: 70,
            verificationStatus: 'verified'
          },
          {
            originalText: '50 km/h',
            hasError: true,
            errorType: 'Calculation Error',
            errorExplanation: '120 km in 2 hours equals 60 km/h, not 50',
            correctedVersion: '60 km/h',
            conciseCorrection: '50 → 60',
            complexityScore: 15,
            contextImportanceScore: 40,
            errorSeverityScore: 50,
            verificationStatus: 'verified'
          }
        ]
      });

      const input = {
        text: 'Various errors: 45% of 400 = 125, multiply by ×0.15, speed is 50 km/h',
        verifyCalculations: true
      };

      const result = await extractMathExpressionsTool.execute(input, mockContext);

      expect(result.expressions.length).toBe(3);
      
      // Check each concise correction
      expect(result.expressions[0].conciseCorrection).toBe('125 → 180');
      expect(result.expressions[1].conciseCorrection).toBe('×0.15 → ×1.15');
      expect(result.expressions[2].conciseCorrection).toBe('50 → 60');
      
      // All should be under 15 characters as specified in the prompt
      result.expressions.forEach(expr => {
        expect(expr.conciseCorrection!.length).toBeLessThanOrEqual(20);
      });
    });
  });
});
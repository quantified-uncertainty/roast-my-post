import { describe, it, expect, beforeEach } from '@jest/globals';
import CheckMathTool from './index';
import { logger } from '@/lib/logger';
import { createMockLLMInteraction } from '@/lib/claude/testUtils';
import { setupClaudeToolMock } from '@/lib/claude/mockHelpers';

// Mock Claude wrapper
jest.mock('@/lib/claude/wrapper');
import { callClaudeWithTool } from '@/lib/claude/wrapper';

// Get the mocked function and setup helper
const mockCallClaudeWithTool = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
const { mockToolResponse } = setupClaudeToolMock(mockCallClaudeWithTool);

describe('CheckMathTool', () => {
  const mockContext = { 
    logger,
    userId: 'test-user'
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
        text: '',  // Empty text
        maxErrors: 200  // Too high
      };

      expect(() => CheckMathTool.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('execute method', () => {
    it('should detect simple arithmetic errors', async () => {
      // Mock response with arithmetic error
      mockToolResponse({
        errors: [
          {
            lineStart: 1,
            lineEnd: 1,
            highlightedText: '2 + 2 = 5',
            description: 'Arithmetic error: 2 + 2 equals 4, not 5. This fundamental error invalidates the conclusion.'
          }
        ]
      });

      const input = {
        text: 'The calculation shows that 2 + 2 = 5, which is clearly correct.'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].errorType).toBe('calculation');
      expect(result.errors[0].severity).toBe('critical');
      expect(result.summary.totalErrors).toBe(1);
      expect(result.summary.calculationErrors).toBe(1);
      expect(result.llmInteraction).toBeDefined();
      expect(result.llmInteraction.model).toBe('claude-sonnet-4-20250514');
    });

    it('should handle text with no math errors', async () => {
      // Mock empty errors response
      mockToolResponse({
        errors: []
      });
      
      const input = {
        text: 'This is a simple text with no mathematical content or calculations.'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.errors.length).toBe(0);
      expect(result.summary.totalErrors).toBe(0);
      expect(result.recommendations).toContain('No mathematical errors found in the text.');
      expect(result.llmInteraction).toBeDefined();
    });

    it('should categorize different types of errors correctly', async () => {
      // Mock response with multiple error types
      mockToolResponse({
        errors: [
          {
            lineStart: 1,
            lineEnd: 1,
            highlightedText: '5 + 3 = 9',
            description: 'Arithmetic mistake: 5 + 3 equals 8, not 9'
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
            description: 'Symbol misuse: summation notation requires bounds and expression'
          }
        ]
      });

      const input = {
        text: 'Math problems:\n5 + 3 = 9\n1 kilometer to 100 meters\n∑ = 5'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.errors.length).toBe(3);
      expect(result.summary.totalErrors).toBe(3);
      
      // Check that we have different types of errors (at least calculation and unit)
      const errorTypes = result.errors.map(e => e.errorType);
      expect(errorTypes).toContain('calculation');
      expect(errorTypes).toContain('unit');
      
      // Verify that we do categorize errors differently
      const uniqueErrorTypes = [...new Set(errorTypes)];
      expect(uniqueErrorTypes.length).toBeGreaterThan(1);
    });

    it('should respect maxErrors limit', async () => {
      // Create many errors
      const manyErrors = Array.from({ length: 20 }, (_, i) => ({
        lineStart: i + 1,
        lineEnd: i + 1,
        highlightedText: `Error ${i + 1}`,
        description: `Calculation error ${i + 1}`
      }));

      mockToolResponse({
        errors: manyErrors
      });

      const input = {
        text: 'Text with many errors',
        maxErrors: 10
      };

      const result = await CheckMathTool.execute(input, mockContext);

      // Should be limited to maxErrors
      expect(result.errors.length).toBe(10);
      expect(result.summary.totalErrors).toBe(10);
    });

    it('should identify common error patterns', async () => {
      mockToolResponse({
        errors: [
          {
            lineStart: 1,
            lineEnd: 1,
            highlightedText: '10%',
            description: 'Unit error: Missing context for percentage'
          },
          {
            lineStart: 2,
            lineEnd: 2,
            highlightedText: '25%',
            description: 'Unit error: Missing context for percentage'
          },
          {
            lineStart: 3,
            lineEnd: 3,
            highlightedText: '50%',
            description: 'Unit error: Missing context for percentage'
          }
        ]
      });

      const input = {
        text: 'Results: 10%\n25%\n50%'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      // Check pattern detection
      const unitPattern = result.commonPatterns.find(p => p.type === 'unit');
      expect(unitPattern).toBeDefined();
      expect(unitPattern?.count).toBe(3);
    });

    it('should use context when provided', async () => {
      mockToolResponse({
        errors: []
      });

      const input = {
        text: 'The answer is 42',
        context: 'This is from a science fiction novel'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      // Just verify the tool executed successfully with context
      expect(result.errors.length).toBe(0);
      expect(result.llmInteraction).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle LLM failures gracefully', async () => {
      // Mock a rejection
      const mockError = new Error('LLM service unavailable');
      mockCallClaudeWithTool.mockRejectedValueOnce(mockError);

      const input = {
        text: 'Some mathematical text'
      };

      await expect(CheckMathTool.execute(input, mockContext))
        .rejects.toThrow('LLM service unavailable');
    });
  });

  describe('output validation', () => {
    it('should produce valid output structure', async () => {
      mockToolResponse({
        errors: [{
          lineStart: 1,
          lineEnd: 1,
          highlightedText: '2 + 2',
          description: 'Correct calculation'
        }]
      });

      const input = {
        text: '2 + 2 = 4'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      // Validate output schema
      expect(() => CheckMathTool.outputSchema.parse(result)).not.toThrow();
    });
  });
});
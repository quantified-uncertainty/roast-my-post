import { describe, it, expect, beforeEach, vi } from 'vitest';
import CheckMathTool from './index';
import { logger } from '../../shared/logger';
import { createMockLLMInteraction } from '../../claude/testUtils';
import { setupClaudeToolMock } from '../../claude/mockHelpers';

// Mock Claude wrapper
vi.mock('../../claude/wrapper', () => ({
  callClaudeWithTool: vi.fn(),
  MODEL_CONFIG: {
    analysis: "claude-sonnet-test",
    routing: "claude-3-haiku-20240307"
  }
}));

import { callClaudeWithTool } from '../../claude/wrapper';

describe('CheckMathTool', () => {
  const mockContext = { 
    logger,
    userId: 'test-user'
  };

  let mockCallClaudeWithTool: any;
  let mockToolResponse: ReturnType<typeof setupClaudeToolMock>['mockToolResponse'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up the mock helper
    mockCallClaudeWithTool = vi.mocked(callClaudeWithTool);
    const mockHelper = setupClaudeToolMock(mockCallClaudeWithTool);
    mockToolResponse = mockHelper.mockToolResponse;
  });

  describe('basic functionality', () => {
    it('should have correct configuration', () => {
      expect(CheckMathTool.config.id).toBe('math-validator-llm');
      expect(CheckMathTool.config.name).toBe('Math Validator (LLM)');
      expect(CheckMathTool.config.category).toBe('checker');
    });

    it('should validate input schema', () => {
      const validInput = {
        statement: 'The result is 2 + 2 = 4'
      };

      expect(() => CheckMathTool.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        statement: ''  // Empty statement
      };

      expect(() => CheckMathTool.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('execute method', () => {
    it('should detect simple arithmetic errors', async () => {
      // Mock response with arithmetic error
      mockToolResponse({
        status: 'verified_false',
        explanation: 'The arithmetic is incorrect. 2 + 2 equals 4, not 5.',
        reasoning: 'Simple addition: 2 + 2 = 4. The statement claims it equals 5, which is false.',
        errorDetails: {
          errorType: 'calculation',
          severity: 'major',
          displayCorrection: '<r:replace from="5" to="4"/>',
          expectedValue: '4',
          actualValue: '5'
        }
      });

      const input = {
        statement: '2 + 2 = 5'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.status).toBe('verified_false');
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails?.errorType).toBe('calculation');
      expect(result.errorDetails?.severity).toBe('major');
      expect(result.errorDetails?.displayCorrection).toBe('<r:replace from="5" to="4"/>');
    });

    it('should verify correct statements', async () => {
      // Mock response for correct statement
      mockToolResponse({
        status: 'verified_true',
        explanation: 'The arithmetic is correct. 2 + 2 equals 4.',
        reasoning: 'Simple addition: 2 + 2 = 4. The statement correctly states this.'
      });
      
      const input = {
        statement: '2 + 2 = 4'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.status).toBe('verified_true');
      expect(result.errorDetails).toBeUndefined();
    });

    it('should handle statements that cannot be verified', async () => {
      // Mock response for unverifiable statement
      mockToolResponse({
        status: 'cannot_verify',
        explanation: 'This statement contains variables or conditions that cannot be verified without additional context.',
        reasoning: 'The value of x is not provided, so we cannot verify if x + 2 = 5.'
      });

      const input = {
        statement: 'x + 2 = 5'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.status).toBe('cannot_verify');
      expect(result.errorDetails).toBeUndefined();
    });

    it('should detect unit conversion errors', async () => {
      // Mock response with unit error
      mockToolResponse({
        status: 'verified_false',
        explanation: 'Unit conversion error: 1 kilometer equals 1000 meters, not 100 meters.',
        reasoning: 'The metric system defines 1 km = 1000 m. The statement incorrectly claims 1 km = 100 m.',
        errorDetails: {
          errorType: 'unit',
          severity: 'critical',
          displayCorrection: '<r:replace from="100 m" to="1000 m"/>',
          expectedValue: '1000 meters',
          actualValue: '100 meters'
        }
      });

      const input = {
        statement: '1 kilometer equals 100 meters'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.status).toBe('verified_false');
      expect(result.errorDetails?.errorType).toBe('unit');
      expect(result.errorDetails?.severity).toBe('critical');
      expect(result.errorDetails?.displayCorrection).toBe('<r:replace from="100 m" to="1000 m"/>');
    });

    it('should handle context when provided', async () => {
      // Mock response considering context
      mockToolResponse({
        status: 'verified_true',
        explanation: 'In the context of engineering approximations, using π ≈ 3.14 is acceptable.',
        reasoning: 'While π is irrational (3.14159...), the context indicates this is for engineering calculations where 3.14 is a standard approximation.'
      });

      const input = {
        statement: 'For this calculation, we use π = 3.14',
        context: 'Engineering approximation with 2 decimal places'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.status).toBe('verified_true');
      expect(result.explanation).toContain('engineering approximations');
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockCallClaudeWithTool.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const input = {
        statement: '2 + 2 = 4'
      };

      const result = await CheckMathTool.execute(input, mockContext);

      expect(result.status).toBe('cannot_verify');
      expect(result.explanation).toContain('technical error');
    });
  });

  describe('error categorization', () => {
    it('should identify calculation errors', async () => {
      mockToolResponse({
        status: 'verified_false',
        explanation: 'Multiplication error: 5 × 7 = 35, not 40.',
        reasoning: 'Basic multiplication: 5 × 7 = 35.',
        errorDetails: {
          errorType: 'calculation',
          severity: 'major',
          displayCorrection: '<r:replace from="40" to="35"/>'
        }
      });

      const result = await CheckMathTool.execute({ statement: '5 × 7 = 40' }, mockContext);

      expect(result.errorDetails?.errorType).toBe('calculation');
    });

    it('should identify logic errors', async () => {
      mockToolResponse({
        status: 'verified_false',
        explanation: 'Logic error: If a > b and b > c, then a must be greater than c, not less than c.',
        reasoning: 'Transitive property violation.',
        errorDetails: {
          errorType: 'logic',
          severity: 'critical',
          displayCorrection: '<r:replace from="a < c" to="a > c"/>'
        }
      });

      const result = await CheckMathTool.execute({ 
        statement: 'Given a > b and b > c, therefore a < c' 
      }, mockContext);

      expect(result.errorDetails?.errorType).toBe('logic');
    });

    it('should identify notation errors', async () => {
      mockToolResponse({
        status: 'verified_false',
        explanation: 'Notation error: The expression mixes incompatible notation systems.',
        reasoning: 'Cannot mix set notation with arithmetic operations in this way.',
        errorDetails: {
          errorType: 'notation',
          severity: 'minor',
          displayCorrection: '<r:replace from="Fix notation consistency" to="Fix notation consistency"/>'
        }
      });

      const result = await CheckMathTool.execute({ 
        statement: 'The set {1, 2, 3} + 4 = {5, 6, 7}' 
      }, mockContext);

      expect(result.errorDetails?.errorType).toBe('notation');
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// jest globals are available by default
import { checkMathHybridTool } from './index';
import { checkMathWithMathJsTool } from '../check-math-with-mathjs';
import { checkMathTool } from '../check-math';
import { logger } from '../../shared/logger';
import type { CheckMathAgenticOutput } from '../check-math-with-mathjs/types';
import type { CheckMathOutput } from '../check-math/index';

// Mock the dependent tools
vi.mock('../check-math-with-mathjs');
vi.mock('../check-math');

const mockCheckMathWithMathJs = checkMathWithMathJsTool.execute as any;
const mockCheckMath = checkMathTool.execute as any;

// Helper to create mock llmInteraction
const createMockLLMInteraction = () => ({
  model: 'test',
  prompt: 'test',
  response: 'test',
  tokensUsed: { prompt: 0, completion: 0, total: 0 },
  timestamp: new Date(),
  duration: 0
});

describe('CheckMathHybridTool', () => {
  const mockContext = {
    logger,
    userId: 'test-user'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should have correct configuration', () => {
      expect(checkMathHybridTool.config.id).toBe('check-math-hybrid');
      expect(checkMathHybridTool.config.name).toBe('Hybrid Mathematical Checker');
      expect(checkMathHybridTool.config.category).toBe('analysis');
    });

    it('should validate input schema', () => {
      const validInput = {
        statement: '2 + 2 = 4'
      };

      expect(() => checkMathHybridTool.inputSchema.parse(validInput)).not.toThrow();
    });
  });

  describe('execute method', () => {
    it('should use only MathJS when it can verify', async () => {
      // Mock MathJS successfully verifying
      const mathJsResult: CheckMathAgenticOutput = {
        statement: '2 + 2 = 4',
        status: 'verified_true',
        explanation: 'The calculation is correct: 2 + 2 = 4',
        verificationDetails: {
          mathJsExpression: '2 + 2',
          computedValue: '4',
          steps: [{ expression: '2 + 2', result: '4' }]
        },
        llmInteraction: createMockLLMInteraction()
      };

      mockCheckMathWithMathJs.mockImplementationOnce(() => Promise.resolve(mathJsResult);

      const result = await checkMathHybridTool.execute(
        { statement: '2 + 2 = 4' },
        mockContext
      );

      expect(result.status).toBe('verified_true');
      expect(result.verifiedBy).toBe('mathjs');
      expect(result.toolsUsed).toEqual(['mathjs']);
      expect(result.mathJsResult).toBeDefined();
      expect(result.llmResult).toBeUndefined();
      expect(mockCheckMath).not.toHaveBeenCalled();
    });

    it('should fall back to LLM when MathJS cannot verify', async () => {
      // Mock MathJS unable to verify
      const mathJsResult: CheckMathAgenticOutput = {
        statement: 'The limit of 1/x as x approaches infinity is 0',
        status: 'cannot_verify',
        explanation: 'Cannot express this limit calculation in MathJS',
        llmInteraction: createMockLLMInteraction()
      };

      const llmResult: CheckMathOutput = {
        statement: 'The limit of 1/x as x approaches infinity is 0',
        status: 'verified_true',
        explanation: 'This is correct. As x approaches infinity, 1/x approaches 0.',
        reasoning: 'By the definition of limits, lim(x→∞) 1/x = 0',
      };

      mockCheckMathWithMathJs.mockImplementationOnce(() => Promise.resolve(mathJsResult);
      mockCheckMath.mockImplementationOnce(() => Promise.resolve(llmResult);

      const result = await checkMathHybridTool.execute(
        { statement: 'The limit of 1/x as x approaches infinity is 0' },
        mockContext
      );

      expect(result.status).toBe('verified_true');
      expect(result.verifiedBy).toBe('llm');
      expect(result.toolsUsed).toEqual(['mathjs', 'llm']);
      expect(result.mathJsResult).toBeUndefined();
      expect(result.llmResult).toBeDefined();
      expect(mockCheckMath).toHaveBeenCalled();
    });

    it('should detect errors with MathJS', async () => {
      // Mock MathJS detecting an error
      const mathJsResult: CheckMathAgenticOutput = {
        statement: '2 + 2 = 5',
        status: 'verified_false',
        explanation: 'Calculation error: 2 + 2 = 4, not 5',
        verificationDetails: {
          mathJsExpression: '2 + 2',
          computedValue: '4',
          steps: [{ expression: '2 + 2', result: '4' }]
        },
        llmInteraction: createMockLLMInteraction(),
        errorDetails: {
          errorType: 'calculation',
          severity: 'major',
          conciseCorrection: '5 → 4',
          expectedValue: '4',
          actualValue: '5'
        },
      };

      mockCheckMathWithMathJs.mockImplementationOnce(() => Promise.resolve(mathJsResult);

      const result = await checkMathHybridTool.execute(
        { statement: '2 + 2 = 5' },
        mockContext
      );

      expect(result.status).toBe('verified_false');
      expect(result.verifiedBy).toBe('mathjs');
      expect(result.toolsUsed).toEqual(['mathjs']);
      expect(result.conciseCorrection).toBe('5 → 4');
      expect(result.mathJsResult).toBeDefined();
      expect(mockCheckMath).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock MathJS throwing an error
      mockCheckMathWithMathJs.mockImplementationOnce(() => Promise.reject(new Error('MathJS evaluation failed')));

      const result = await checkMathHybridTool.execute(
        { statement: '2 + 2 = 4' },
        mockContext
      );

      expect(result.status).toBe('cannot_verify');
      expect(result.explanation).toContain('technical error');
      expect(result.verifiedBy).toBe('mathjs');
      expect(result.toolsUsed).toEqual(['mathjs']);
    });

    it('should extract concise correction from LLM when MathJS cannot', async () => {
      // Mock MathJS cannot verify
      const mathJsResult: CheckMathAgenticOutput = {
        statement: 'The derivative of x^2 is 3x',
        status: 'cannot_verify',
        explanation: 'Cannot verify derivative statements',
        llmInteraction: createMockLLMInteraction()
      };

      const llmResult: CheckMathOutput = {
        statement: 'The derivative of x^2 is 3x',
        status: 'verified_false',
        explanation: 'The derivative of x^2 is 2x, not 3x',
        reasoning: 'Using power rule: d/dx(x^n) = nx^(n-1), so d/dx(x^2) = 2x',
        errorDetails: {
          errorType: 'calculation',
          severity: 'major',
          conciseCorrection: '3x → 2x'
        },
      };

      mockCheckMathWithMathJs.mockImplementationOnce(() => Promise.resolve(mathJsResult);
      mockCheckMath.mockImplementationOnce(() => Promise.resolve(llmResult);

      const result = await checkMathHybridTool.execute(
        { statement: 'The derivative of x^2 is 3x' },
        mockContext
      );

      expect(result.status).toBe('verified_false');
      expect(result.conciseCorrection).toBe('3x → 2x');
      expect(result.verifiedBy).toBe('llm');
    });
  });
});
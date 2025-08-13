import { describe, it, expect, beforeAll } from '@jest/globals';
import { checkMathWithMathJsTool } from './index';
import { logger } from '../../shared/logger';

describe('Direct Evaluation Path', () => {
  const mockContext = {
    logger,
    userId: 'test-user'
  };

  describe('Critical approximation cases', () => {
    it('should correctly reject π = 3.0 via direct evaluation', async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: 'π = 3.0' },
        mockContext
      );

      expect(result.status).toBe('verified_false');
      expect(result.explanation).toContain('incorrect');
      expect(result.explanation).toContain('3.1'); // π rounds to 3.1, not 3.0
      
      // Should use direct evaluation, not LLM
      expect(result.llmInteraction?.model).toBe('direct-evaluation');
    });

    it('should correctly accept π = 3.14 via direct evaluation', async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: 'π = 3.14' },
        mockContext
      );

      expect(result.status).toBe('verified_true');
      expect(result.explanation).toContain('correct');
      expect(result.llmInteraction?.model).toBe('direct-evaluation');
    });

    it('should correctly accept 10/3 = 3.33 via direct evaluation', async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: '10/3 = 3.33' },
        mockContext
      );

      expect(result.status).toBe('verified_true');
      expect(result.explanation).toContain('correct');
      expect(result.llmInteraction?.model).toBe('direct-evaluation');
    });

    it('should correctly reject 10/3 = 3.0 via direct evaluation', async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: '10/3 = 3.0' },
        mockContext
      );

      expect(result.status).toBe('verified_false');
      expect(result.explanation).toContain('incorrect');
      expect(result.explanation).toContain('3.3'); // 10/3 rounds to 3.3, not 3.0
      expect(result.llmInteraction?.model).toBe('direct-evaluation');
    });

    it('should handle √2 = 1.414 correctly', async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: '√2 = 1.414' },
        mockContext
      );

      expect(result.status).toBe('verified_true');
      expect(result.llmInteraction?.model).toBe('direct-evaluation');
    });

    it('should handle 2 + 2 = 4 correctly', async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: '2 + 2 = 4' },
        mockContext
      );

      expect(result.status).toBe('verified_true');
      expect(result.llmInteraction?.model).toBe('direct-evaluation');
    });

    it('should handle 2 + 2 = 5 correctly', async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: '2 + 2 = 5' },
        mockContext
      );

      expect(result.status).toBe('verified_false');
      expect(result.explanation).toContain('4');
      expect(result.llmInteraction?.model).toBe('direct-evaluation');
    });
  });

  describe('Decimal precision edge cases', () => {
    it('should treat 3.0 as having 1 decimal place, not 0', async () => {
      const result = await checkMathWithMathJsTool.execute(
        { statement: 'π = 3.0' },
        mockContext
      );

      // The key issue: 3.0 has 1 decimal place, so π should round to 3.1
      expect(result.status).toBe('verified_false');
      
      // Check the verification details if available
      if (result.verificationDetails) {
        expect(result.verificationDetails.computedValue).toContain('3.14');
      }
      
      // Check error details show the correct rounding
      if (result.errorDetails) {
        expect(result.errorDetails.expectedValue).toContain('3.1');
      }
    });

    it('should treat 3 (no decimal) as having 0 decimal places', async () => {
      // For comparison, if someone wrote "π = 3" (without .0)
      const result = await checkMathWithMathJsTool.execute(
        { statement: 'π = 3' },
        mockContext
      );

      // With 0 decimal places, π rounds to 3, so this would be accepted
      expect(result.status).toBe('verified_true');
      expect(result.llmInteraction?.model).toBe('direct-evaluation');
    });
  });
});
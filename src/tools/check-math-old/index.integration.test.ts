import { checkMathWithMathJsTool } from './index';
import { logger } from '@/lib/logger';

describe('CheckMathWithMathJsTool Integration Tests', () => {
  const mockContext = {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Simple expressions that should use direct MathJS evaluation', () => {
    it('should verify simple arithmetic quickly', async () => {
      const startTime = Date.now();
      const result = await checkMathWithMathJsTool.execute({
        statement: '2 + 2 = 4'
      }, mockContext);
      const duration = Date.now() - startTime;
      
      expect(result.status).toBe('verified_true');
      expect(duration).toBeLessThan(100); // Should be nearly instant
      expect(result.verificationDetails?.mathJsExpression).toBe('2 + 2 == 4');
    });

    it('should catch simple arithmetic errors', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: '2 + 2 = 5'
      }, mockContext);
      
      expect(result.status).toBe('verified_false');
      expect(result.errorDetails?.conciseCorrection).toBe('5 → 4');
      expect(result.errorDetails?.errorType).toBe('calculation');
    });

    it('should handle percentage calculations', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: '30% of 150 is 45'
      }, mockContext);
      
      expect(result.status).toBe('verified_true');
    });

    it('should handle unit conversions', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: '5 kilometers equals 5000 meters'
      }, mockContext);
      
      expect(result.status).toBe('verified_true');
    });
  });

  describe('Complex expressions requiring LLM extraction', () => {
    it('should handle statistical statements', async () => {
      const startTime = Date.now();
      const result = await checkMathWithMathJsTool.execute({
        statement: 'The risk of death in 2019 was 0.00202% per person-day'
      }, mockContext);
      const duration = Date.now() - startTime;
      
      // This should go through extraction first, then maybe full LLM
      expect(duration).toBeLessThan(5000); // Should be under 5 seconds with Haiku
      expect(['verified_true', 'cannot_verify']).toContain(result.status);
    });

    it('should handle scientific notation', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: '3.39*10^-7 equals 0.000000339'
      }, mockContext);
      
      expect(result.status).toBe('verified_true');
    });

    it('should handle word problems', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: 'If I have twenty apples and give away twelve, I have eight left',
        context: 'Word problem with numbers written as words'
      }, mockContext);
      
      expect(result.status).toBe('verified_true');
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle malformed expressions gracefully', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: '2 + + 3 = 5'
      }, mockContext);
      
      expect(result.status).toBe('cannot_verify');
      expect(result.explanation).toContain('verify');
    });

    it('should handle non-mathematical statements', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: 'The sky is blue'
      }, mockContext);
      
      expect(result.status).toBe('cannot_verify');
    });

    it('should handle very long mathematical expressions', async () => {
      const longExpression = '1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + ' +
                           '11 + 12 + 13 + 14 + 15 + 16 + 17 + 18 + 19 + 20 = 210';
      
      const result = await checkMathWithMathJsTool.execute({
        statement: longExpression
      }, mockContext);
      
      expect(result.status).toBe('verified_true');
    });

    it('should handle expressions with special characters', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: '√16 + π ≈ 7.14'
      }, mockContext);
      
      // Should handle special math symbols
      expect(['verified_true', 'verified_false']).toContain(result.status);
    });
  });

  describe('Performance under load', () => {
    it('should handle multiple expressions in sequence efficiently', async () => {
      const expressions = [
        '2 + 2 = 4',
        '10 * 5 = 50',
        '100 / 4 = 25',
        '7 - 3 = 4',
        '2^8 = 256'
      ];
      
      const startTime = Date.now();
      const results = await Promise.all(
        expressions.map(statement => 
          checkMathWithMathJsTool.execute({ statement }, mockContext)
        )
      );
      const totalDuration = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.status === 'verified_true')).toBe(true);
      expect(totalDuration).toBeLessThan(1000); // All should complete in under 1 second
    });

    it('should handle a mix of simple and complex expressions', async () => {
      const expressions = [
        { statement: '2 + 2 = 4', expected: 'verified_true' },
        { statement: '30% of 150 is 45', expected: 'verified_true' },
        { statement: 'The probability is 0.00202%', expected: 'cannot_verify' },
        { statement: '5 km = 5000 m', expected: 'verified_true' },
        { statement: '3.14159 ≈ π', expected: 'verified_true' }
      ];
      
      const startTime = Date.now();
      const results = await Promise.all(
        expressions.map(({ statement }) => 
          checkMathWithMathJsTool.execute({ statement }, mockContext)
        )
      );
      const totalDuration = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(totalDuration).toBeLessThan(10000); // Should complete in under 10 seconds total
    });
  });

  describe('LLM extraction fallback', () => {
    it('should extract and evaluate complex equality', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: 'The sum of the first 10 natural numbers equals 55'
      }, mockContext);
      
      // Should extract "1+2+3+4+5+6+7+8+9+10 == 55" or similar
      expect(result.status).toBe('verified_true');
      if (result.verificationDetails?.mathJsExpression) {
        expect(result.verificationDetails.computedValue).toContain('true');
      }
    });

    it('should handle extraction retries for ambiguous statements', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: 'Half of sixty plus twenty equals fifty'
      }, mockContext);
      
      // Could be interpreted as (60/2) + 20 = 50 or 60/2 + 20 = 50
      expect(['verified_true', 'verified_false']).toContain(result.status);
    });
  });

  describe('Error details and corrections', () => {
    it('should provide clear corrections for calculation errors', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: '15 * 7 = 100'
      }, mockContext);
      
      expect(result.status).toBe('verified_false');
      expect(result.errorDetails?.conciseCorrection).toBe('100 → 105');
      expect(result.errorDetails?.errorType).toBe('calculation');
      expect(result.errorDetails?.severity).toBe('major');
    });

    it('should handle rounding errors appropriately', async () => {
      const result = await checkMathWithMathJsTool.execute({
        statement: '1/3 = 0.333'
      }, mockContext);
      
      // Should recognize this as approximately correct or a rounding issue
      expect(['verified_true', 'verified_false']).toContain(result.status);
      if (result.status === 'verified_false') {
        expect(result.errorDetails?.errorType).toBe('calculation');
      }
    });
  });
});
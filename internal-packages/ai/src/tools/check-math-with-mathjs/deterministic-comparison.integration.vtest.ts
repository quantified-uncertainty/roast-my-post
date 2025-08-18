import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { compareNumericValues } from './numeric-comparison';

/**
 * Integration test focusing on edge cases and special MathJS scenarios
 * that aren't covered by unit tests or e2e tests.
 */
describe('MathJS Integration Edge Cases', () => {
  describe('Special values and edge cases', () => {
    it('should handle division by zero', () => {
      const computed = evaluate('5/0');
      const result = compareNumericValues('Infinity', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toBe('Special values match');
    });

    it('should handle 0/0 = NaN', () => {
      const computed = evaluate('0/0');
      const result = compareNumericValues('NaN', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toBe('Special values match');
    });

    it('should handle very small differences with tolerance', () => {
      const computed = 1.0000000001;
      const result = compareNumericValues('1.0000000002', computed, {
        allowApproximation: false,
        absoluteTolerance: 1e-9
      });
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toContain('absolute tolerance');
    });
  });

  describe('Scientific notation', () => {
    it('should handle 1.23e5 = 123000', () => {
      const computed = evaluate('1.23e5');
      const result = compareNumericValues('123000', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toBe('Exact match');
    });
  });
});
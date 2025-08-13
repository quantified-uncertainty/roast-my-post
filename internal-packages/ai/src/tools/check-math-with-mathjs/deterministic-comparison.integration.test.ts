import { describe, it, expect } from '@jest/globals';
import { evaluate } from 'mathjs';
import { compareNumericValues, formatNumber } from './numeric-comparison';

/**
 * Integration test to verify deterministic numeric comparison with MathJS
 * These tests ensure our comparison logic correctly handles approximations
 * without relying on LLM prompts.
 */
describe('Deterministic Comparison Integration', () => {
  describe('Real-world approximation cases', () => {
    it('should handle 10/3 = 3.33 correctly', () => {
      const computed = evaluate('10/3');
      const result = compareNumericValues('3.33', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toContain('Reasonable approximation');
      expect(result.decimalPlaces).toBe(2);
      expect(result.roundedComputedValue).toBe(3.33);
    });

    it('should handle π = 3.14 correctly', () => {
      const computed = evaluate('pi');
      const result = compareNumericValues('3.14', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toContain('Reasonable approximation');
      expect(result.decimalPlaces).toBe(2);
    });

    it('should handle √2 = 1.414 correctly', () => {
      const computed = evaluate('sqrt(2)');
      const result = compareNumericValues('1.414', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toContain('Reasonable approximation');
      expect(result.decimalPlaces).toBe(3);
    });

    it('should reject π = 3.0', () => {
      const computed = evaluate('pi');
      const result = compareNumericValues('3.0', computed);
      
      expect(result.isEqual).toBe(false);
      expect(result.reason).toContain('Values do not match');
      expect(result.roundedComputedValue).toBe(3.1); // π rounds to 3.1, not 3.0
    });

    it('should reject 10/3 = 3.34', () => {
      const computed = evaluate('10/3');
      const result = compareNumericValues('3.34', computed);
      
      expect(result.isEqual).toBe(false);
      expect(result.reason).toContain('Values do not match');
      expect(result.roundedComputedValue).toBe(3.34); // But 10/3 = 3.33, not 3.34
    });
  });

  describe('Percentage calculations', () => {
    it('should handle 15% of 200 = 30', () => {
      const computed = evaluate('15% * 200');
      const result = compareNumericValues('30', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toBe('Exact match');
    });

    it('should handle 33.33% of 100 ≈ 33.33', () => {
      const computed = evaluate('33.33% * 100');
      const result = compareNumericValues('33.33', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toContain('approximation');
    });
  });

  describe('Division and rounding', () => {
    it('should handle 100 ÷ 7 = 14.29', () => {
      const computed = evaluate('100 / 7');
      const result = compareNumericValues('14.29', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toContain('Reasonable approximation');
      expect(result.decimalPlaces).toBe(2);
    });

    it('should handle 22/7 ≈ 3.14 (pi approximation)', () => {
      const computed = evaluate('22/7');
      const result = compareNumericValues('3.14', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toContain('Reasonable approximation');
    });
  });

  describe('Scientific notation and large numbers', () => {
    it('should handle 1.23e5 = 123000', () => {
      const computed = evaluate('1.23e5');
      const result = compareNumericValues('123000', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toBe('Exact match');
    });

    it('should handle very small differences with tolerance', () => {
      const computed = 1.0000000001;
      const result = compareNumericValues('1', computed, {
        absoluteTolerance: 1e-9
      });
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toContain('absolute tolerance');
    });
  });

  describe('Edge cases', () => {
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

    it('should handle negative zero', () => {
      const computed = evaluate('-0');
      const result = compareNumericValues('0', computed);
      
      expect(result.isEqual).toBe(true);
      expect(result.reason).toBe('Exact match'); // -0 === 0 in JavaScript
    });
  });

  describe('Format number utility', () => {
    it('should format numbers appropriately', () => {
      expect(formatNumber(3.14159, 3)).toBe('3.142');
      expect(formatNumber(10/3, 2)).toBe('3.33');
      expect(formatNumber(Math.PI, 4)).toBe('3.1416');
      expect(formatNumber(1000000, 2)).toBe('1000000');
      expect(formatNumber(0.0001234, 6)).toBe('0.000123');
    });
  });
});
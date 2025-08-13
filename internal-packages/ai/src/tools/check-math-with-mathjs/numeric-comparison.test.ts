import { describe, it, expect } from '@jest/globals';
import {
  countDecimalPlaces,
  roundToDecimalPlaces,
  compareNumericValues,
  parseEqualityStatement,
  formatNumber
} from './numeric-comparison';

describe('Numeric Comparison Utilities', () => {
  describe('countDecimalPlaces', () => {
    it('should count decimal places correctly', () => {
      expect(countDecimalPlaces('3.14')).toBe(2);
      expect(countDecimalPlaces('3.140')).toBe(2); // Trailing zeros removed
      expect(countDecimalPlaces('3.0')).toBe(1); // Keep one decimal if explicit
      expect(countDecimalPlaces('3')).toBe(0);
      expect(countDecimalPlaces('3.14159')).toBe(5);
      expect(countDecimalPlaces('1.23e5')).toBe(2); // Scientific notation
      expect(countDecimalPlaces('Infinity')).toBe(-1);
      expect(countDecimalPlaces('NaN')).toBe(-1);
    });
  });

  describe('roundToDecimalPlaces', () => {
    it('should round numbers correctly', () => {
      expect(roundToDecimalPlaces(3.14159, 2)).toBe(3.14);
      expect(roundToDecimalPlaces(3.14159, 3)).toBe(3.142);
      expect(roundToDecimalPlaces(3.335, 2)).toBe(3.34); // Rounding up
      expect(roundToDecimalPlaces(3.334, 2)).toBe(3.33); // Rounding down
      expect(roundToDecimalPlaces(10/3, 2)).toBe(3.33);
      expect(roundToDecimalPlaces(10/3, 3)).toBe(3.333);
    });
  });

  describe('compareNumericValues', () => {
    describe('exact matches', () => {
      it('should recognize exact matches', () => {
        const result = compareNumericValues('4', 4);
        expect(result.isEqual).toBe(true);
        expect(result.reason).toBe('Exact match');
      });
    });

    describe('approximations', () => {
      it('should accept reasonable approximations based on stated precision', () => {
        // 10/3 = 3.33 (rounded to 2 decimals)
        const result1 = compareNumericValues('3.33', 10/3);
        expect(result1.isEqual).toBe(true);
        expect(result1.reason).toContain('Reasonable approximation');
        expect(result1.decimalPlaces).toBe(2);

        // π = 3.14 (rounded to 2 decimals)
        const result2 = compareNumericValues('3.14', Math.PI);
        expect(result2.isEqual).toBe(true);
        expect(result2.reason).toContain('Reasonable approximation');

        // √2 = 1.414 (rounded to 3 decimals)
        const result3 = compareNumericValues('1.414', Math.sqrt(2));
        expect(result3.isEqual).toBe(true);
        expect(result3.reason).toContain('Reasonable approximation');
      });

      it('should reject poor approximations', () => {
        // π ≠ 3.0 (3.14159... rounds to 3.1, not 3.0)
        const result1 = compareNumericValues('3.0', Math.PI);
        expect(result1.isEqual).toBe(false);
        expect(result1.reason).toContain('Values do not match');

        // 10/3 ≠ 3.0 (3.333... rounds to 3.3, not 3.0)
        const result2 = compareNumericValues('3.0', 10/3);
        expect(result2.isEqual).toBe(false);
        expect(result2.reason).toContain('Values do not match');

        // 10/3 ≠ 3.34 (3.333... rounds to 3.33, not 3.34)
        const result3 = compareNumericValues('3.34', 10/3);
        expect(result3.isEqual).toBe(false);
      });
    });

    describe('tolerance options', () => {
      it('should respect absolute tolerance', () => {
        const result = compareNumericValues('1.0000001', 1.0, {
          allowApproximation: false,
          absoluteTolerance: 1e-6
        });
        expect(result.isEqual).toBe(true);
        expect(result.reason).toContain('Within absolute tolerance');
      });

      it('should respect relative tolerance', () => {
        const result = compareNumericValues('1000.5', 1000, {
          allowApproximation: false,
          useRelativeTolerance: true,
          relativeTolerance: 0.001 // 0.1%
        });
        expect(result.isEqual).toBe(true);
        expect(result.reason).toContain('Within relative tolerance');
      });
    });

    describe('special values', () => {
      it('should handle infinity and NaN', () => {
        const infResult = compareNumericValues('Infinity', Infinity);
        expect(infResult.isEqual).toBe(true);
        expect(infResult.reason).toBe('Special values match');

        const nanResult = compareNumericValues('NaN', NaN);
        expect(nanResult.isEqual).toBe(true);
        expect(nanResult.reason).toBe('Special values match');

        const mismatchResult = compareNumericValues('5', Infinity);
        expect(mismatchResult.isEqual).toBe(false);
        expect(mismatchResult.reason).toBe('Computed value is not finite');
      });
    });
  });

  describe('parseEqualityStatement', () => {
    it('should parse various equality operators', () => {
      expect(parseEqualityStatement('2 + 2 = 4')).toEqual({ left: '2 + 2', right: '4' });
      expect(parseEqualityStatement('10/3 == 3.33')).toEqual({ left: '10/3', right: '3.33' });
      expect(parseEqualityStatement('π ≈ 3.14')).toEqual({ left: 'π', right: '3.14' });
      expect(parseEqualityStatement('a ≅ b')).toEqual({ left: 'a', right: 'b' });
      expect(parseEqualityStatement('x === y')).toEqual({ left: 'x', right: 'y' });
    });

    it('should return null for non-equality statements', () => {
      expect(parseEqualityStatement('2 + 2')).toBe(null);
      expect(parseEqualityStatement('= 4')).toBe(null);
      expect(parseEqualityStatement('just text')).toBe(null);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers nicely', () => {
      expect(formatNumber(3.14159, 3)).toBe('3.142');
      expect(formatNumber(3.0, 2)).toBe('3');
      expect(formatNumber(3.10, 2)).toBe('3.1');
      expect(formatNumber(1000000, 2)).toBe('1000000');
      expect(formatNumber(0.0001, 4)).toBe('0.0001');
      expect(formatNumber(0.0001, 3)).toBe('0');
      expect(formatNumber(Infinity)).toBe('Infinity');
      expect(formatNumber(NaN)).toBe('NaN');
    });
  });
});

describe('Math Evaluation Test Cases', () => {
  // Test cases from the PR review
  describe('approximation handling', () => {
    it('should accept 10/3 = 3.33 as correct', () => {
      const result = compareNumericValues('3.33', 10/3);
      expect(result.isEqual).toBe(true);
    });

    it('should accept π = 3.14 as correct', () => {
      const result = compareNumericValues('3.14', Math.PI);
      expect(result.isEqual).toBe(true);
    });

    it('should accept √2 = 1.414 as correct', () => {
      const result = compareNumericValues('1.414', Math.sqrt(2));
      expect(result.isEqual).toBe(true);
    });

    it('should reject π = 3.0 as incorrect', () => {
      const result = compareNumericValues('3.0', Math.PI);
      expect(result.isEqual).toBe(false);
    });

    it('should reject 10/3 = 3.0 as incorrect', () => {
      const result = compareNumericValues('3.0', 10/3);
      expect(result.isEqual).toBe(false);
    });
  });
});
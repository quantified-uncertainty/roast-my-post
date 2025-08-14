import { describe, it, expect } from '@jest/globals';
import {
  parseMathExpression,
  evaluateEquality,
  checkEqualityExpression,
  formatForMathJS,
  parseEqualityStatement
} from './mathjs-parser-utils';

describe('MathJS Parser Utilities', () => {
  describe('parseMathExpression', () => {
    it('should parse simple equality expressions', () => {
      const result = parseMathExpression('2 + 2 == 4');
      expect(result).not.toBeNull();
      expect(result?.isEquality).toBe(true);
      expect(result?.isSimpleEquality).toBe(true);
      expect(result?.operator).toBe('equal');
    });

    it('should parse inequality expressions', () => {
      const result = parseMathExpression('5 > 3');
      expect(result).not.toBeNull();
      expect(result?.isEquality).toBe(true);
      expect(result?.isSimpleEquality).toBe(false);
      expect(result?.operator).toBe('larger');
    });

    it('should parse non-equality expressions', () => {
      const result = parseMathExpression('2 + 2');
      expect(result).not.toBeNull();
      expect(result?.isEquality).toBe(false);
      expect(result?.isSimpleEquality).toBe(false);
    });

    it('should handle invalid expressions', () => {
      const result = parseMathExpression('this is not math');
      expect(result).toBeNull();
    });
  });

  describe('evaluateEquality', () => {
    it('should evaluate both sides of an equality', () => {
      const parsed = parseMathExpression('2 + 2 == 4');
      const result = evaluateEquality(parsed!);
      
      expect(result).not.toBeNull();
      expect(result?.leftValue).toBe(4);
      expect(result?.rightValue).toBe(4);
      expect(result?.operator).toBe('equal');
    });

    it('should handle complex expressions', () => {
      const parsed = parseMathExpression('sqrt(16) == 2 * 2');
      const result = evaluateEquality(parsed!);
      
      expect(result).not.toBeNull();
      expect(result?.leftValue).toBe(4);
      expect(result?.rightValue).toBe(4);
    });

    it('should return null for non-equality expressions', () => {
      const parsed = parseMathExpression('2 + 2');
      const result = evaluateEquality(parsed!);
      
      expect(result).toBeNull();
    });
  });

  describe('checkEqualityExpression', () => {
    it('should check simple equality expressions', () => {
      const result = checkEqualityExpression('2 + 2 == 4');
      
      expect(result.isEquality).toBe(true);
      expect(result.leftValue).toBe(4);
      expect(result.rightValue).toBe(4);
      expect(result.evaluationResult).toBe(true);
    });

    it('should check false equality expressions', () => {
      const result = checkEqualityExpression('2 + 2 == 5');
      
      expect(result.isEquality).toBe(true);
      expect(result.leftValue).toBe(4);
      expect(result.rightValue).toBe(5);
      expect(result.evaluationResult).toBe(false);
    });

    it('should handle percentage calculations', () => {
      const result = checkEqualityExpression('15% * 200 == 30');
      
      expect(result.isEquality).toBe(true);
      expect(result.leftValue).toBe(30);
      expect(result.rightValue).toBe(30);
      expect(result.evaluationResult).toBe(true);
    });

    it('should handle unit conversions', () => {
      const result = checkEqualityExpression('1 km == 1000 m');
      
      expect(result.isEquality).toBe(true);
      // MathJS should handle unit conversion
      expect(result.evaluationResult).toBe(true);
    });
  });

  describe('formatForMathJS', () => {
    it('should convert mathematical symbols', () => {
      expect(formatForMathJS('π')).toBe('pi');
      expect(formatForMathJS('2 × 3')).toBe('2 * 3');
      expect(formatForMathJS('6 ÷ 2')).toBe('6 / 2');
      expect(formatForMathJS('5 − 3')).toBe('5 - 3');
      expect(formatForMathJS('√16')).toBe('sqrt(16)');
      expect(formatForMathJS('∞')).toBe('Infinity');
    });

    it('should convert single = to ==', () => {
      expect(formatForMathJS('2 + 2 = 4')).toBe('2 + 2 == 4');
      expect(formatForMathJS('x = 5')).toBe('x == 5');
    });

    it('should not convert == to ===', () => {
      expect(formatForMathJS('2 == 2')).toBe('2 == 2');
      expect(formatForMathJS('x != y')).toBe('x != y');
    });

    it('should convert approximation symbols', () => {
      expect(formatForMathJS('π ≈ 3.14')).toBe('pi == 3.14');
      expect(formatForMathJS('a ≅ b')).toBe('a == b');
    });
  });

  describe('parseEqualityStatement', () => {
    it('should parse statements with = operator', () => {
      const result = parseEqualityStatement('2 + 2 = 4');
      
      expect(result).not.toBeNull();
      expect(result?.isEquality).toBe(true);
      expect(result?.leftValue).toBe(4);
      expect(result?.rightValue).toBe(4);
    });

    it('should parse statements with special symbols', () => {
      const result = parseEqualityStatement('π ≈ 3.14');
      
      expect(result).not.toBeNull();
      expect(result?.isEquality).toBe(true);
      expect(result?.leftValue).toBeCloseTo(3.14159, 4);
      expect(result?.rightValue).toBe(3.14);
    });

    it('should handle complex expressions', () => {
      const result = parseEqualityStatement('10/3 = 3.33');
      
      expect(result).not.toBeNull();
      expect(result?.isEquality).toBe(true);
      expect(result?.leftValue).toBeCloseTo(3.333, 3);
      expect(result?.rightValue).toBe(3.33);
    });

    it('should return null for non-equality statements', () => {
      const result = parseEqualityStatement('2 + 2');
      
      expect(result).toBeNull();
    });

    it('should return null for invalid statements', () => {
      const result = parseEqualityStatement('this is not math');
      
      expect(result).toBeNull();
    });
  });
});
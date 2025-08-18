import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// jest globals are available by default
import { categorizeErrorAdvanced, determineSeverityAdvanced } from './errorCategories';
import type { MathErrorType } from '../shared/math-schemas';

describe('errorCategories', () => {
  describe('categorizeErrorAdvanced', () => {
    it('should categorize calculation errors with high confidence', () => {
      const testCases = [
        'The calculation 2 + 2 = 5 is incorrect',
        'Arithmetic error: the sum should be 45, not 40',
        'Wrong multiplication: 7 × 8 = 54 (should be 56)',
        'Computational error in the final result'
      ];
      
      for (const description of testCases) {
        const { type, confidence } = categorizeErrorAdvanced(description);
        expect(type).toBe('calculation');
        expect(confidence).toBeGreaterThan(0.5);
      }
    });
    
    it('should categorize unit errors accurately', () => {
      const testCases = [
        'Unit conversion error: 1 km is not 100 meters',
        'Incorrect dimension: mixing meters and feet',
        'Temperature scale error: 0°C is not 0°F',
        'Wrong unit: result should be in kilometers, not miles'
      ];
      
      for (const description of testCases) {
        const { type, confidence } = categorizeErrorAdvanced(description);
        expect(type).toBe('unit');
        expect(confidence).toBeGreaterThan(0.5);
      }
    });
    
    it('should categorize logic errors', () => {
      const testCases = [
        'Logical fallacy: this conclusion does not follow from the premise',
        'Invalid reasoning: the proof has a flaw',
        'Contradiction in the mathematical argument',
        'The inference is not supported by the given theorem'
      ];
      
      for (const description of testCases) {
        const { type, confidence } = categorizeErrorAdvanced(description);
        expect(type).toBe('logic');
        expect(confidence).toBeGreaterThan(0.5);
      }
    });
    
    it('should categorize notation errors', () => {
      const testCases = [
        'Incorrect notation: missing parentheses changes order of operations',
        'Wrong symbol used for the integral',
        'Formula syntax error: exponent should be superscript',
        'Equation formatting issue with brackets'
      ];
      
      for (const description of testCases) {
        const { type, confidence } = categorizeErrorAdvanced(description);
        expect(type).toBe('notation');
        expect(confidence).toBeGreaterThan(0.5);
      }
    });
    
    it('should default to conceptual for unclear descriptions', () => {
      const testCases = [
        'This seems wrong somehow',
        'The approach is questionable',
        'There might be an issue here'
      ];
      
      for (const description of testCases) {
        const { type, confidence } = categorizeErrorAdvanced(description);
        expect(type).toBe('conceptual');
        expect(confidence).toBeLessThan(0.5);
      }
    });
    
    it('should handle complex descriptions with multiple indicators', () => {
      const description = 'Calculation error in unit conversion: 1 mile = 1.6 km is wrong notation';
      const { type, confidence } = categorizeErrorAdvanced(description);
      
      // Should pick the type with highest weighted score
      expect(['calculation', 'unit', 'notation']).toContain(type);
      expect(confidence).toBeGreaterThan(0.5);
    });
  });
  
  describe('determineSeverityAdvanced', () => {
    it('should identify critical errors', () => {
      const testCases: Array<{ type: MathErrorType; desc: string }> = [
        { type: 'calculation', desc: 'This completely invalidates the conclusion' },
        { type: 'logic', desc: 'Fundamental error in the proof' },
        { type: 'unit', desc: 'Fatal error: mixing incompatible units' }
      ];
      
      for (const { type, desc } of testCases) {
        const { severity, confidence } = determineSeverityAdvanced(type, desc);
        expect(severity).toBe('critical');
        expect(confidence).toBeGreaterThan(0.7);
      }
    });
    
    it('should identify major errors', () => {
      const testCases: Array<{ type: MathErrorType; desc: string }> = [
        { type: 'calculation', desc: 'Incorrect arithmetic result' },
        { type: 'unit', desc: 'Wrong conversion factor used' },
        { type: 'logic', desc: 'Flawed reasoning in the argument' }
      ];
      
      for (const { type, desc } of testCases) {
        const { severity, confidence } = determineSeverityAdvanced(type, desc);
        expect(severity).toBe('major');
        expect(confidence).toBeGreaterThan(0.5);
      }
    });
    
    it('should identify minor errors', () => {
      const testCases: Array<{ type: MathErrorType; desc: string }> = [
        { type: 'notation', desc: 'Minor formatting issue' },
        { type: 'notation', desc: 'Style preference for equation layout' },
        { type: 'conceptual', desc: 'Could be improved slightly' }
      ];
      
      for (const { type, desc } of testCases) {
        const { severity, confidence } = determineSeverityAdvanced(type, desc);
        expect(severity).toBe('minor');
        expect(confidence).toBeGreaterThan(0.5);
      }
    });
    
    it('should default calculation errors to major', () => {
      const { severity, confidence } = determineSeverityAdvanced('calculation', 'Some calculation issue');
      expect(severity).toBe('major');
      expect(confidence).toBeGreaterThanOrEqual(0.5);
    });
    
    it('should default notation errors to minor', () => {
      const { severity, confidence } = determineSeverityAdvanced('notation', 'Some notation issue');
      expect(severity).toBe('minor');
      expect(confidence).toBeGreaterThanOrEqual(0.5);
    });
  });
});
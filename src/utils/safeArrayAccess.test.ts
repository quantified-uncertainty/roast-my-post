import { describe, it, expect } from '@jest/globals';
import { getRandomElement, safeArrayAccess, getPercentile } from './safeArrayAccess';

describe('safeArrayAccess utilities', () => {
  describe('getRandomElement', () => {
    it('should return default value for empty array', () => {
      const result = getRandomElement([], 'default');
      expect(result).toBe('default');
    });
    
    it('should return default value for null/undefined array', () => {
      expect(getRandomElement(null, 'default')).toBe('default');
      expect(getRandomElement(undefined, 'default')).toBe('default');
    });
    
    it('should return the only element for single-element array', () => {
      const result = getRandomElement(['only'], 'default');
      expect(result).toBe('only');
    });
    
    it('should return an element from the array', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];
      const result = getRandomElement(array, 'default');
      expect(array).toContain(result);
    });
    
    it('should work with different types', () => {
      const numbers = [1, 2, 3, 4, 5];
      const result = getRandomElement(numbers, 0);
      expect(numbers).toContain(result);
      
      const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const objResult = getRandomElement(objects, { id: 0 });
      expect(objects).toContain(objResult);
    });
  });
  
  describe('safeArrayAccess', () => {
    it('should return default for null/undefined array', () => {
      expect(safeArrayAccess(null, 0, 'default')).toBe('default');
      expect(safeArrayAccess(undefined, 0, 'default')).toBe('default');
    });
    
    it('should return default for negative index', () => {
      const array = ['a', 'b', 'c'];
      expect(safeArrayAccess(array, -1, 'default')).toBe('default');
    });
    
    it('should return default for index >= length', () => {
      const array = ['a', 'b', 'c'];
      expect(safeArrayAccess(array, 3, 'default')).toBe('default');
      expect(safeArrayAccess(array, 10, 'default')).toBe('default');
    });
    
    it('should return element at valid index', () => {
      const array = ['a', 'b', 'c'];
      expect(safeArrayAccess(array, 0, 'default')).toBe('a');
      expect(safeArrayAccess(array, 1, 'default')).toBe('b');
      expect(safeArrayAccess(array, 2, 'default')).toBe('c');
    });
    
    it('should work with empty array', () => {
      expect(safeArrayAccess([], 0, 'default')).toBe('default');
    });
  });
  
  describe('getPercentile', () => {
    it('should return NaN for empty array', () => {
      expect(getPercentile([], 0.5)).toBeNaN();
    });
    
    it('should return NaN for null/undefined array', () => {
      expect(getPercentile(null, 0.5)).toBeNaN();
      expect(getPercentile(undefined, 0.5)).toBeNaN();
    });
    
    it('should return the only value for single-element array', () => {
      expect(getPercentile([42], 0)).toBe(42);
      expect(getPercentile([42], 0.5)).toBe(42);
      expect(getPercentile([42], 1)).toBe(42);
    });
    
    it('should calculate correct percentiles for sorted array', () => {
      const sorted = [1, 2, 3, 4, 5];
      
      expect(getPercentile(sorted, 0)).toBe(1);      // Min
      expect(getPercentile(sorted, 0.25)).toBe(2);   // Q1
      expect(getPercentile(sorted, 0.5)).toBe(3);    // Median
      expect(getPercentile(sorted, 0.75)).toBe(4);   // Q3
      expect(getPercentile(sorted, 1)).toBe(5);      // Max
    });
    
    it('should interpolate between values', () => {
      const sorted = [10, 20, 30, 40];
      
      // 0.125 * 3 = 0.375, so between index 0 and 1
      // Weight = 0.375, so 10 * 0.625 + 20 * 0.375 = 6.25 + 7.5 = 13.75
      expect(getPercentile(sorted, 0.125)).toBeCloseTo(13.75);
      
      // 0.625 * 3 = 1.875, so between index 1 and 2
      // Weight = 0.875, so 20 * 0.125 + 30 * 0.875 = 2.5 + 26.25 = 28.75
      expect(getPercentile(sorted, 0.625)).toBeCloseTo(28.75);
    });
    
    it('should handle percentiles outside 0-1 range', () => {
      const sorted = [1, 2, 3, 4, 5];
      
      expect(getPercentile(sorted, -0.5)).toBe(1);   // Clamped to 0
      expect(getPercentile(sorted, 1.5)).toBe(5);    // Clamped to 1
    });
    
    it('should work with large arrays', () => {
      const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
      
      expect(getPercentile(sorted, 0.25)).toBeCloseTo(25.75);
      expect(getPercentile(sorted, 0.5)).toBeCloseTo(50.5);
      expect(getPercentile(sorted, 0.75)).toBeCloseTo(75.25);
    });
  });
});
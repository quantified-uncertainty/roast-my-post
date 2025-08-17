import { describe, it, expect } from 'vitest';

describe('Simple Math Tests', () => {
  it('should add numbers correctly', () => {
    expect(1 + 1).toBe(2);
    expect(2 + 2).toBe(4);
  });

  it('should subtract numbers correctly', () => {
    expect(5 - 3).toBe(2);
    expect(10 - 7).toBe(3);
  });

  it('should multiply numbers correctly', () => {
    expect(3 * 4).toBe(12);
    expect(5 * 6).toBe(30);
  });

  it('should handle string operations', () => {
    expect('hello' + ' ' + 'world').toBe('hello world');
    expect('test'.toUpperCase()).toBe('TEST');
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });

  it('should handle objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
  });
});
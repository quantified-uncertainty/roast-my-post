import { Decimal } from '@prisma/client/runtime/library';
import { 
  decimalToNumber, 
  serializeJob, 
  serializeJobNumeric,
  serializeDecimal,
  serializeDecimalToNumber 
} from '../prisma-serializers';

describe('decimalToNumber', () => {
  it('should return null for null or undefined', () => {
    expect(decimalToNumber(null)).toBe(null);
    expect(decimalToNumber(undefined)).toBe(null);
  });

  it('should return number as-is', () => {
    expect(decimalToNumber(42)).toBe(42);
    expect(decimalToNumber(0)).toBe(0);
    expect(decimalToNumber(-10.5)).toBe(-10.5);
  });

  it('should parse string numbers', () => {
    expect(decimalToNumber('42')).toBe(42);
    expect(decimalToNumber('10.99')).toBe(10.99);
    expect(decimalToNumber('-5.5')).toBe(-5.5);
  });

  it('should return null for invalid strings', () => {
    expect(decimalToNumber('not a number')).toBe(null);
    expect(decimalToNumber('')).toBe(null);
    expect(decimalToNumber('NaN')).toBe(null);
  });

  it('should handle Prisma Decimal objects', () => {
    const decimal = new Decimal(42.99);
    expect(decimalToNumber(decimal)).toBe(42.99);
    
    const bigDecimal = new Decimal('99999999.99');
    expect(decimalToNumber(bigDecimal)).toBe(99999999.99);
    
    const smallDecimal = new Decimal('0.00000001');
    expect(decimalToNumber(smallDecimal)).toBe(0.00000001);
  });

  it('should handle precision edge cases', () => {
    // Test with high precision decimals
    const preciseDecimal = new Decimal('10.123456789');
    const result = decimalToNumber(preciseDecimal);
    expect(result).toBeCloseTo(10.123456789, 9);
    
    // Test very large numbers
    const largeDecimal = new Decimal('999999999999.99');
    expect(decimalToNumber(largeDecimal)).toBe(999999999999.99);
    
    // Test very small numbers
    const tinyDecimal = new Decimal('0.0000000001');
    expect(decimalToNumber(tinyDecimal)).toBe(0.0000000001);
  });

  it('should handle objects with toNumber method', () => {
    const customDecimal = {
      toNumber: () => 42.5
    };
    expect(decimalToNumber(customDecimal)).toBe(42.5);
    
    // Test with throwing toNumber
    const badDecimal = {
      toNumber: () => { throw new Error('Bad decimal'); }
    };
    expect(() => decimalToNumber(badDecimal)).toThrow();
  });

  it('should handle edge case inputs', () => {
    expect(decimalToNumber(Infinity)).toBe(Infinity);
    expect(decimalToNumber(-Infinity)).toBe(-Infinity);
    expect(decimalToNumber({})).toBe(null);
    expect(decimalToNumber([])).toBe(0); // Number([]) === 0
    expect(decimalToNumber([42])).toBe(42); // Number([42]) === 42
    expect(decimalToNumber([1,2,3])).toBe(null); // Number([1,2,3]) === NaN
  });
});

describe('serializeJobNumeric', () => {
  it('should convert job with decimal prices to numbers', () => {
    const job = {
      id: '123',
      priceInDollars: new Decimal('42.99'),
      tasks: [
        { id: '1', priceInDollars: new Decimal('10.50') },
        { id: '2', priceInDollars: new Decimal('5.25') },
        { id: '3', priceInDollars: null }
      ]
    };

    const result = serializeJobNumeric(job);
    
    expect(result.priceInDollars).toBe(42.99);
    expect(result.tasks[0].priceInDollars).toBe(10.50);
    expect(result.tasks[1].priceInDollars).toBe(5.25);
    expect(result.tasks[2].priceInDollars).toBe(0);
  });

  it('should handle jobs without prices', () => {
    const job = {
      id: '123',
      priceInDollars: null,
      tasks: null
    };

    const result = serializeJobNumeric(job);
    
    expect(result.priceInDollars).toBe(null);
    expect(result.tasks).toBe(null);
  });

  it('should handle jobs with empty tasks', () => {
    const job = {
      id: '123',
      priceInDollars: new Decimal('100'),
      tasks: []
    };

    const result = serializeJobNumeric(job);
    
    expect(result.priceInDollars).toBe(100);
    expect(result.tasks).toEqual([]);
  });
});

describe('serializeDecimal', () => {
  it('should convert Decimal objects to strings', () => {
    const data = {
      price: new Decimal('42.99'),
      nested: {
        cost: new Decimal('10.50')
      },
      array: [
        new Decimal('1.25'),
        new Decimal('2.50')
      ]
    };

    const result = serializeDecimal(data);
    
    expect(result.price).toBe('42.99');
    expect(result.nested.cost).toBe('10.5');
    expect(result.array[0]).toBe('1.25');
    expect(result.array[1]).toBe('2.5');
  });

  it('should preserve non-Decimal values', () => {
    const data = {
      name: 'Test',
      count: 42,
      active: true,
      tags: ['a', 'b', 'c'],
      metadata: { key: 'value' }
    };

    const result = serializeDecimal(data);
    
    expect(result).toEqual(data);
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const data = {
      createdAt: date,
      nested: { updatedAt: date }
    };

    const result = serializeDecimal(data);
    
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(result.nested.updatedAt).toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('serializeDecimalToNumber', () => {
  it('should convert Decimal objects to numbers', () => {
    const data = {
      price: new Decimal('42.99'),
      nested: {
        cost: new Decimal('10.50')
      },
      array: [
        new Decimal('1.25'),
        new Decimal('2.50')
      ]
    };

    const result = serializeDecimalToNumber(data);
    
    expect(result.price).toBe(42.99);
    expect(result.nested.cost).toBe(10.50);
    expect(result.array[0]).toBe(1.25);
    expect(result.array[1]).toBe(2.50);
  });

  it('should preserve Date objects without conversion', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const data = {
      createdAt: date,
      price: new Decimal('99.99')
    };

    const result = serializeDecimalToNumber(data);
    
    expect(result.createdAt).toEqual(date);
    expect(result.price).toBe(99.99);
  });
});
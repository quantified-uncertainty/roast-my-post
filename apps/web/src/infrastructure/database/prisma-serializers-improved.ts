import { Decimal } from "@prisma/client/runtime/library";

/**
 * Type guard to check if a value is a Decimal-like object
 */
function isDecimalLike(value: unknown): value is { toNumber(): number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as any).toNumber === 'function'
  );
}

/**
 * Safely convert a Prisma Decimal to number with proper handling
 */
export function decimalToNumber(decimal: unknown): number | null {
  if (decimal === null || decimal === undefined) return null;
  
  // Already a number
  if (typeof decimal === 'number') return decimal;
  
  // String representation
  if (typeof decimal === 'string') {
    const parsed = parseFloat(decimal);
    return isNaN(parsed) ? null : parsed;
  }
  
  // Prisma Decimal object or Decimal-like object
  if (decimal instanceof Decimal || isDecimalLike(decimal)) {
    return decimal.toNumber();
  }
  
  // Last resort: try converting to number
  const converted = Number(decimal);
  return isNaN(converted) ? null : converted;
}

/**
 * Type for serialized objects where Decimals become strings
 */
type SerializedDecimal<T> = T extends Decimal
  ? string
  : T extends Date
  ? string
  : T extends (infer U)[]
  ? SerializedDecimal<U>[]
  : T extends object
  ? { [K in keyof T]: SerializedDecimal<T[K]> }
  : T;

/**
 * Serialize Prisma Decimal fields to strings for Next.js Server Component compatibility
 */
export function serializeDecimal<T>(obj: T): SerializedDecimal<T> {
  if (obj === null || obj === undefined) {
    return obj as SerializedDecimal<T>;
  }

  if (obj instanceof Decimal) {
    return obj.toString() as SerializedDecimal<T>;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as SerializedDecimal<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeDecimal(item)) as SerializedDecimal<T>;
  }

  if (typeof obj === 'object') {
    const serialized = {} as SerializedDecimal<T>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        (serialized as any)[key] = serializeDecimal(obj[key]);
      }
    }
    return serialized;
  }

  return obj as SerializedDecimal<T>;
}

/**
 * Type for serialized objects where Decimals become numbers
 */
type SerializedDecimalNumber<T> = T extends Decimal
  ? number
  : T extends (infer U)[]
  ? SerializedDecimalNumber<U>[]
  : T extends object
  ? { [K in keyof T]: SerializedDecimalNumber<T[K]> }
  : T;

/**
 * Serialize Prisma Decimal fields to numbers for numeric operations
 */
export function serializeDecimalToNumber<T>(obj: T): SerializedDecimalNumber<T> {
  if (obj === null || obj === undefined) {
    return obj as SerializedDecimalNumber<T>;
  }

  if (obj instanceof Decimal) {
    return obj.toNumber() as SerializedDecimalNumber<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeDecimalToNumber(item)) as SerializedDecimalNumber<T>;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const serialized = {} as SerializedDecimalNumber<T>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        (serialized as any)[key] = serializeDecimalToNumber(obj[key]);
      }
    }
    return serialized;
  }

  return obj as SerializedDecimalNumber<T>;
}

/**
 * Serialize data for Server Components with proper error handling
 */
export function serializeForServerComponent<T>(
  data: T,
  options: { convertDecimalsToNumbers?: boolean } = {}
): SerializedDecimal<T> | SerializedDecimalNumber<T> {
  try {
    if (options.convertDecimalsToNumbers) {
      return serializeDecimalToNumber(data);
    }
    return serializeDecimal(data);
  } catch (error) {
    console.error('Failed to serialize data for Server Component:', error);
    // Return the original data if serialization fails
    // This is safer than throwing in a Server Component
    return data as any;
  }
}
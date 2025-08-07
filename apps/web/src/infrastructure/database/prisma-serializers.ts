// Type helpers for better type safety
type DecimalLike = { toNumber: () => number; toString: () => string };
type Serializable = string | number | boolean | null | undefined | Date | DecimalLike;

/**
 * Mapped type that converts Decimal fields to strings
 */
export type SerializedDecimal<T> = T extends DecimalLike
  ? string
  : T extends Date
  ? string
  : T extends Array<infer U>
  ? Array<SerializedDecimal<U>>
  : T extends object
  ? { [K in keyof T]: SerializedDecimal<T[K]> }
  : T;

/**
 * Mapped type that converts Decimal fields to numbers
 */
export type SerializedDecimalNumber<T> = T extends DecimalLike
  ? number
  : T extends Array<infer U>
  ? Array<SerializedDecimalNumber<U>>
  : T extends object
  ? { [K in keyof T]: SerializedDecimalNumber<T[K]> }
  : T;

/**
 * Safely convert a Prisma Decimal to number with proper handling
 * @param decimal - The Prisma Decimal object or any value that might be a price
 * @returns The numeric value or null if conversion fails
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
  
  // Check for Prisma Decimal object using duck typing
  // We can't import Decimal directly as it includes Node.js dependencies
  if (typeof decimal === 'object' && decimal && 
      decimal.constructor && decimal.constructor.name === 'Decimal' &&
      'toNumber' in decimal && typeof (decimal as any).toNumber === 'function') {
    return (decimal as any).toNumber();
  }
  
  // Object with toNumber method (duck typing for Decimal-like objects)
  if (typeof decimal === 'object' && decimal && 'toNumber' in decimal) {
    const decimalLike = decimal as { toNumber: () => number };
    if (typeof decimalLike.toNumber === 'function') {
      return decimalLike.toNumber();
    }
  }
  
  // Last resort: try converting to number
  const converted = Number(decimal);
  return isNaN(converted) ? null : converted;
}

/**
 * Serialize Prisma Decimal fields to strings for Next.js Server Component compatibility
 * This prevents "Decimal objects are not supported" errors when passing data to Client Components
 */
export function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Check for Prisma Decimal object using duck typing
  if (typeof obj === 'object' && obj && 
      obj.constructor && obj.constructor.name === 'Decimal' &&
      'toString' in obj && typeof (obj as any).toString === 'function') {
    return (obj as any).toString() as any;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal) as any;
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeDecimal(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}

/**
 * Serialize Prisma Decimal fields to numbers for numeric operations
 * Use this when you need to perform calculations on the client side
 */
export function serializeDecimalToNumber<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Check for Prisma Decimal object using duck typing
  if (typeof obj === 'object' && obj && 
      obj.constructor && obj.constructor.name === 'Decimal' &&
      'toNumber' in obj && typeof (obj as any).toNumber === 'function') {
    return (obj as any).toNumber() as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimalToNumber) as any;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeDecimalToNumber(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}

// Type definitions for better type safety
interface JobLike {
  priceInDollars?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  [key: string]: unknown;
}

interface TaskLike {
  priceInDollars?: unknown;
  [key: string]: unknown;
}

interface JobWithTasks extends JobLike {
  tasks?: TaskLike[] | null;
}

interface EvaluationVersionLike {
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  [key: string]: unknown;
}

/**
 * Serialize a single Job object (converts Decimal to string)
 */
export function serializeJob<T extends JobLike>(job: T): T & {
  priceInDollars: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
} {
  return {
    ...job,
    priceInDollars: job.priceInDollars ? String(job.priceInDollars) : null,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : 
               typeof job.createdAt === 'string' ? job.createdAt : null,
    updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : 
               typeof job.updatedAt === 'string' ? job.updatedAt : null,
    startedAt: job.startedAt instanceof Date ? job.startedAt.toISOString() : 
               typeof job.startedAt === 'string' ? job.startedAt : null,
    completedAt: job.completedAt instanceof Date ? job.completedAt.toISOString() : 
                 typeof job.completedAt === 'string' ? job.completedAt : null,
  };
}

/**
 * Serialize a Job with numeric price (for calculations)
 */
export function serializeJobNumeric<T extends JobWithTasks>(job: T): T & {
  priceInDollars: number | null;
  tasks: Array<TaskLike & { priceInDollars: number }> | null;
} {
  return {
    ...job,
    priceInDollars: decimalToNumber(job.priceInDollars),
    tasks: job.tasks ? job.tasks.map((task) => ({
      ...task,
      priceInDollars: decimalToNumber(task.priceInDollars) ?? 0,
    })) : null,
  };
}

/**
 * Serialize multiple jobs with numeric prices
 */
export function serializeJobsNumeric<T extends JobWithTasks>(jobs: T[]): Array<ReturnType<typeof serializeJobNumeric>> {
  return jobs.map(job => serializeJobNumeric(job));
}

/**
 * Serialize evaluation version with decimal fields
 */
export function serializeEvaluationVersion<T extends EvaluationVersionLike>(evalVersion: T): T & {
  createdAt: string | null;
  updatedAt: string | null;
} {
  return {
    ...evalVersion,
    createdAt: evalVersion.createdAt instanceof Date ? evalVersion.createdAt.toISOString() : 
               typeof evalVersion.createdAt === 'string' ? evalVersion.createdAt : null,
    updatedAt: evalVersion.updatedAt instanceof Date ? evalVersion.updatedAt.toISOString() : 
               typeof evalVersion.updatedAt === 'string' ? evalVersion.updatedAt : null,
  };
}

/**
 * Generic serializer for any Prisma result
 * Converts all Decimal fields to strings and Dates to ISO strings
 */
export function serializePrismaResult<T>(result: T): T {
  return serializeDecimal(result);
}

// ============================================================================
// Type-safe versions with better type inference
// ============================================================================

/**
 * Type-safe version of serializeDecimal with proper return type
 * Use this when you need type safety for the serialized result
 */
export function serializeDecimalTyped<T>(obj: T): SerializedDecimal<T> {
  return serializeDecimal(obj) as SerializedDecimal<T>;
}

/**
 * Type-safe version of serializeDecimalToNumber with proper return type
 */
export function serializeDecimalToNumberTyped<T>(obj: T): SerializedDecimalNumber<T> {
  return serializeDecimalToNumber(obj) as SerializedDecimalNumber<T>;
}

/**
 * Type guard to check if a value is Decimal-like
 */
export function isDecimalLike(value: unknown): value is DecimalLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    'toString' in value &&
    typeof (value as any).toNumber === 'function' &&
    typeof (value as any).toString === 'function'
  );
}

/**
 * Type guard to check if a value needs serialization
 */
export function needsSerialization(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (value instanceof Date) return true;
  if (isDecimalLike(value)) return true;
  if (Array.isArray(value)) return value.some(needsSerialization);
  if (typeof value === 'object') {
    return Object.values(value).some(needsSerialization);
  }
  return false;
}
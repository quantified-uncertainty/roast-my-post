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

/**
 * Serialize a single Job object (converts Decimal to string)
 */
export function serializeJob(job: any) {
  return {
    ...job,
    priceInDollars: job.priceInDollars ? job.priceInDollars.toString() : null,
    createdAt: job.createdAt ? job.createdAt.toISOString() : null,
    updatedAt: job.updatedAt ? job.updatedAt.toISOString() : null,
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
  };
}

/**
 * Serialize a Job with numeric price (for calculations)
 */
export function serializeJobNumeric(job: any) {
  return {
    ...job,
    priceInDollars: decimalToNumber(job.priceInDollars),
    tasks: job.tasks ? job.tasks.map((task: any) => ({
      ...task,
      priceInDollars: decimalToNumber(task.priceInDollars) ?? 0,
    })) : null,
  };
}

/**
 * Serialize multiple jobs with numeric prices
 */
export function serializeJobsNumeric(jobs: any[]) {
  return jobs.map(serializeJobNumeric);
}

/**
 * Serialize evaluation version with decimal fields
 */
export function serializeEvaluationVersion(evalVersion: any) {
  return {
    ...evalVersion,
    createdAt: evalVersion.createdAt ? evalVersion.createdAt.toISOString() : null,
    updatedAt: evalVersion.updatedAt ? evalVersion.updatedAt.toISOString() : null,
  };
}

/**
 * Generic serializer for any Prisma result
 * Converts all Decimal fields to strings and Dates to ISO strings
 */
export function serializePrismaResult<T>(result: T): T {
  return serializeDecimal(result);
}
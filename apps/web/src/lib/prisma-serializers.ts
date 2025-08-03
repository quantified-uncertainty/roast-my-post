import { Prisma } from "@roast/db";

/**
 * Serialize Prisma Decimal fields to strings for Next.js Server Component compatibility
 * This prevents "Decimal objects are not supported" errors when passing data to Client Components
 */
export function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Prisma.Decimal) {
    return obj.toString() as any;
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

  if (obj instanceof Prisma.Decimal) {
    return Number(obj) as any;
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
    priceInDollars: job.priceInDollars ? Number(job.priceInDollars) : null,
    tasks: job.tasks?.map((task: any) => ({
      ...task,
      priceInDollars: task.priceInDollars ? Number(task.priceInDollars) : 0,
    })),
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
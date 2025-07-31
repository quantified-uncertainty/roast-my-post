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
 * Serialize a single Job object
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
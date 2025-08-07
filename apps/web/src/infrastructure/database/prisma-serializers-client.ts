/**
 * Client-safe version of prisma serializers
 * This file can be imported in browser environments
 */

/**
 * Safely convert a potential Decimal to number with proper handling
 * @param decimal - Any value that might be a price
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
  
  // Object with toNumber method (duck typing for Decimal-like objects)
  if (typeof decimal === 'object' && decimal && 'toNumber' in decimal && typeof (decimal as any).toNumber === 'function') {
    return (decimal as any).toNumber();
  }
  
  // Last resort: try converting to number
  const converted = Number(decimal);
  return isNaN(converted) ? null : converted;
}

/**
 * Serialize a single Job object (converts Decimal to string)
 */
export function serializeJob(job: any) {
  return {
    ...job,
    priceInDollars: job.priceInDollars ? String(job.priceInDollars) : null,
    createdAt: job.createdAt ? (job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt) : null,
    updatedAt: job.updatedAt ? (job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt) : null,
    startedAt: job.startedAt ? (job.startedAt instanceof Date ? job.startedAt.toISOString() : job.startedAt) : null,
    completedAt: job.completedAt ? (job.completedAt instanceof Date ? job.completedAt.toISOString() : job.completedAt) : null,
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
    createdAt: evalVersion.createdAt ? (evalVersion.createdAt instanceof Date ? evalVersion.createdAt.toISOString() : evalVersion.createdAt) : null,
    updatedAt: evalVersion.updatedAt ? (evalVersion.updatedAt instanceof Date ? evalVersion.updatedAt.toISOString() : evalVersion.updatedAt) : null,
  };
}
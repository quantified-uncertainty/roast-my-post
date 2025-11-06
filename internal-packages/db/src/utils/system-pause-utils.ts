/**
 * System Pause Utilities
 *
 * Handles checking and managing system-wide API pause status.
 * When the system is paused, all new LLM operations are blocked.
 */

import { prisma as defaultPrisma } from '../client';
import type { PrismaClient } from '../client';
import { generateId } from './generateId';

export interface ActivePause {
  id: string;
  startedAt: Date;
  reason: string;
}

/**
 * Check if the system is currently paused
 */
export async function isSystemPaused(
  prismaClient?: typeof defaultPrisma
): Promise<boolean> {
  const client = prismaClient || defaultPrisma;

  const activePause = await client.systemPause.findFirst({
    where: { endedAt: null },
    select: { id: true }
  });

  return activePause !== null;
}

/**
 * Get the active pause (if any) with full details
 */
export async function getActivePause(
  prismaClient?: typeof defaultPrisma
): Promise<ActivePause | null> {
  const client = prismaClient || defaultPrisma;

  const pause = await client.systemPause.findFirst({
    where: { endedAt: null },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      startedAt: true,
      reason: true
    }
  });

  return pause;
}

/**
 * Create a new system pause
 */
export async function createSystemPause(
  reason: string,
  prismaClient?: typeof defaultPrisma
): Promise<ActivePause> {
  const client = prismaClient || defaultPrisma;

  const pause = await client.systemPause.create({
    data: {
      id: generateId(),
      reason
    },
    select: {
      id: true,
      startedAt: true,
      reason: true
    }
  });

  return pause;
}

/**
 * End all active pauses
 */
export async function endActivePauses(
  prismaClient?: typeof defaultPrisma
): Promise<number> {
  const client = prismaClient || defaultPrisma;

  const result = await client.systemPause.updateMany({
    where: { endedAt: null },
    data: { endedAt: new Date() }
  });

  return result.count;
}

/**
 * Custom error class for when system is paused
 */
export class SystemPausedError extends Error {
  public readonly reason: string;
  public readonly pausedAt: Date;

  constructor(activePause: ActivePause) {
    super(
      `API access is currently paused: ${activePause.reason}. ` +
      `Paused since ${activePause.startedAt.toISOString()}.`
    );
    this.name = 'SystemPausedError';
    this.reason = activePause.reason;
    this.pausedAt = activePause.startedAt;
  }
}

/**
 * Check if system is paused and throw error if it is
 * This is a convenience function for use in API routes
 */
export async function assertSystemNotPaused(
  prismaClient?: typeof defaultPrisma
): Promise<void> {
  const activePause = await getActivePause(prismaClient);

  if (activePause) {
    throw new SystemPausedError(activePause);
  }
}

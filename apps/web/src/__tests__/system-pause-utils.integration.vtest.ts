/**
 * Integration tests for system pause utilities
 */

import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@roast/db';
import {
  isSystemPaused,
  getActivePause,
  createSystemPause,
  endActivePauses,
  assertSystemNotPaused,
  SystemPausedError,
} from '@roast/db';

describe('System Pause Utils (Integration)', () => {
  afterEach(async () => {
    await prisma.systemPause.deleteMany({
      where: { reason: { contains: '[TEST]' } },
    });
  });

  describe('createSystemPause', () => {
    it('should create and persist a system pause', async () => {
      const reason = '[TEST] Maintenance window';
      const pause = await createSystemPause(reason, prisma);

      expect(pause.id).toBeDefined();
      expect(pause.reason).toBe(reason);
      expect(pause.startedAt).toBeInstanceOf(Date);

      const dbPause = await prisma.systemPause.findUnique({
        where: { id: pause.id },
      });
      expect(dbPause?.reason).toBe(reason);
    });
  });

  describe('isSystemPaused', () => {
    it('should return false when no active pause exists', async () => {
      expect(await isSystemPaused(prisma)).toBe(false);
    });

    it('should return true when active pause exists', async () => {
      await createSystemPause('[TEST] Active pause', prisma);
      expect(await isSystemPaused(prisma)).toBe(true);
    });

    it('should return false after pause is ended', async () => {
      await createSystemPause('[TEST] Temporary pause', prisma);
      await endActivePauses(prisma);
      expect(await isSystemPaused(prisma)).toBe(false);
    });
  });

  describe('getActivePause', () => {
    it('should return null when no active pause exists', async () => {
      expect(await getActivePause(prisma)).toBeNull();
    });

    it('should return active pause with correct details', async () => {
      const reason = '[TEST] Current pause';
      const created = await createSystemPause(reason, prisma);
      const active = await getActivePause(prisma);

      expect(active?.id).toBe(created.id);
      expect(active?.reason).toBe(reason);
    });

    it('should return most recent pause when multiple exist', async () => {
      await createSystemPause('[TEST] First pause', prisma);
      await new Promise(resolve => setTimeout(resolve, 10));
      const second = await createSystemPause('[TEST] Second pause', prisma);

      const active = await getActivePause(prisma);
      expect(active?.id).toBe(second.id);
    });
  });

  describe('endActivePauses', () => {
    it('should return 0 when no active pauses exist', async () => {
      expect(await endActivePauses(prisma)).toBe(0);
    });

    it('should end a single active pause', async () => {
      const pause = await createSystemPause('[TEST] To be ended', prisma);
      expect(await endActivePauses(prisma)).toBe(1);

      const dbPause = await prisma.systemPause.findUnique({
        where: { id: pause.id },
      });
      expect(dbPause?.endedAt).toBeInstanceOf(Date);
    });

    it('should end multiple active pauses', async () => {
      await createSystemPause('[TEST] Pause 1', prisma);
      await createSystemPause('[TEST] Pause 2', prisma);
      await createSystemPause('[TEST] Pause 3', prisma);

      expect(await endActivePauses(prisma)).toBe(3);
      expect(await isSystemPaused(prisma)).toBe(false);
    });
  });

  describe('assertSystemNotPaused', () => {
    it('should not throw when system is not paused', async () => {
      await expect(assertSystemNotPaused(prisma)).resolves.not.toThrow();
    });

    it('should throw SystemPausedError when paused', async () => {
      const reason = '[TEST] System paused';
      await createSystemPause(reason, prisma);

      await expect(assertSystemNotPaused(prisma)).rejects.toThrow(SystemPausedError);

      try {
        await assertSystemNotPaused(prisma);
      } catch (error) {
        expect(error).toBeInstanceOf(SystemPausedError);
        if (error instanceof SystemPausedError) {
          expect(error.reason).toBe(reason);
          expect(error.message).toContain(reason);
        }
      }
    });
  });
});

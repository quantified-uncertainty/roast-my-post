/**
 * Integration tests for system pause utilities
 * These tests use the actual database and test the full functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  // Clean up test data after each test
  afterEach(async () => {
    await prisma.systemPause.deleteMany({
      where: {
        reason: { contains: '[TEST]' },
      },
    });
  });

  describe('createSystemPause', () => {
    it('should create a new system pause', async () => {
      const reason = '[TEST] Maintenance window';
      const pause = await createSystemPause(reason, prisma);

      expect(pause).toBeDefined();
      expect(pause.id).toBeDefined();
      expect(pause.reason).toBe(reason);
      expect(pause.startedAt).toBeInstanceOf(Date);

      // Verify it was created in the database
      const dbPause = await prisma.systemPause.findUnique({
        where: { id: pause.id },
      });
      expect(dbPause).toBeDefined();
      expect(dbPause?.reason).toBe(reason);
    });

    it('should create pause with current timestamp', async () => {
      const before = new Date();
      const pause = await createSystemPause('[TEST] Test pause', prisma);
      const after = new Date();

      expect(pause.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(pause.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('isSystemPaused', () => {
    it('should return false when no active pause exists', async () => {
      const paused = await isSystemPaused(prisma);
      expect(paused).toBe(false);
    });

    it('should return true when an active pause exists', async () => {
      await createSystemPause('[TEST] Active pause', prisma);

      const paused = await isSystemPaused(prisma);
      expect(paused).toBe(true);
    });

    it('should return false after pause is ended', async () => {
      await createSystemPause('[TEST] Temporary pause', prisma);
      await endActivePauses(prisma);

      const paused = await isSystemPaused(prisma);
      expect(paused).toBe(false);
    });
  });

  describe('getActivePause', () => {
    it('should return null when no active pause exists', async () => {
      const pause = await getActivePause(prisma);
      expect(pause).toBeNull();
    });

    it('should return active pause details', async () => {
      const reason = '[TEST] Current pause';
      const created = await createSystemPause(reason, prisma);

      const active = await getActivePause(prisma);
      expect(active).toBeDefined();
      expect(active?.id).toBe(created.id);
      expect(active?.reason).toBe(reason);
      expect(active?.startedAt).toEqual(created.startedAt);
    });

    it('should return most recent pause when multiple active pauses exist', async () => {
      // Create first pause
      await createSystemPause('[TEST] First pause', prisma);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create second pause
      const secondPause = await createSystemPause('[TEST] Second pause', prisma);

      const active = await getActivePause(prisma);
      expect(active?.id).toBe(secondPause.id);
      expect(active?.reason).toBe('[TEST] Second pause');
    });

    it('should not return ended pauses', async () => {
      // Create and end a pause
      await createSystemPause('[TEST] Ended pause', prisma);
      await endActivePauses(prisma);

      const active = await getActivePause(prisma);
      expect(active).toBeNull();
    });
  });

  describe('endActivePauses', () => {
    it('should return 0 when no active pauses exist', async () => {
      const count = await endActivePauses(prisma);
      expect(count).toBe(0);
    });

    it('should end a single active pause', async () => {
      const pause = await createSystemPause('[TEST] To be ended', prisma);

      const count = await endActivePauses(prisma);
      expect(count).toBe(1);

      // Verify it was ended in the database
      const dbPause = await prisma.systemPause.findUnique({
        where: { id: pause.id },
      });
      expect(dbPause?.endedAt).toBeDefined();
      expect(dbPause?.endedAt).toBeInstanceOf(Date);
    });

    it('should end multiple active pauses', async () => {
      await createSystemPause('[TEST] Pause 1', prisma);
      await createSystemPause('[TEST] Pause 2', prisma);
      await createSystemPause('[TEST] Pause 3', prisma);

      const count = await endActivePauses(prisma);
      expect(count).toBe(3);

      const stillActive = await isSystemPaused(prisma);
      expect(stillActive).toBe(false);
    });

    it('should not affect already ended pauses', async () => {
      // Create and end a pause
      const oldPause = await createSystemPause('[TEST] Old pause', prisma);
      await endActivePauses(prisma);

      const firstEnd = await prisma.systemPause.findUnique({
        where: { id: oldPause.id },
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create new pause and end all
      await createSystemPause('[TEST] New pause', prisma);
      await endActivePauses(prisma);

      // Old pause's endedAt should not change
      const secondEnd = await prisma.systemPause.findUnique({
        where: { id: oldPause.id },
      });

      expect(firstEnd?.endedAt).toEqual(secondEnd?.endedAt);
    });
  });

  describe('assertSystemNotPaused', () => {
    it('should not throw when system is not paused', async () => {
      await expect(assertSystemNotPaused(prisma)).resolves.not.toThrow();
    });

    it('should throw SystemPausedError when system is paused', async () => {
      const reason = '[TEST] System paused for testing';
      await createSystemPause(reason, prisma);

      await expect(assertSystemNotPaused(prisma)).rejects.toThrow(
        SystemPausedError
      );

      try {
        await assertSystemNotPaused(prisma);
      } catch (error) {
        expect(error).toBeInstanceOf(SystemPausedError);
        if (error instanceof SystemPausedError) {
          expect(error.reason).toBe(reason);
          expect(error.pausedAt).toBeInstanceOf(Date);
          expect(error.message).toContain(reason);
        }
      }
    });

    it('should not throw after pause is ended', async () => {
      await createSystemPause('[TEST] Temporary pause', prisma);
      await endActivePauses(prisma);

      await expect(assertSystemNotPaused(prisma)).resolves.not.toThrow();
    });
  });

  describe('SystemPausedError', () => {
    it('should have correct error properties', async () => {
      const pause = await createSystemPause('[TEST] Error test', prisma);
      const error = new SystemPausedError(pause);

      expect(error.name).toBe('SystemPausedError');
      expect(error.reason).toBe(pause.reason);
      expect(error.pausedAt).toEqual(pause.startedAt);
      expect(error.message).toContain(pause.reason);
      expect(error.message).toContain(pause.startedAt.toISOString());
    });

    it('should be instanceof Error', async () => {
      const pause = await createSystemPause('[TEST] Instance test', prisma);
      const error = new SystemPausedError(pause);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SystemPausedError);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent pause checks correctly', async () => {
      await createSystemPause('[TEST] Concurrent test', prisma);

      // Multiple concurrent checks should all detect the pause
      const checks = await Promise.all([
        isSystemPaused(prisma),
        isSystemPaused(prisma),
        isSystemPaused(prisma),
      ]);

      expect(checks).toEqual([true, true, true]);
    });

    it('should handle ending pauses during concurrent checks', async () => {
      await createSystemPause('[TEST] Race condition test', prisma);

      // Start multiple operations concurrently
      const operations = [
        getActivePause(prisma),
        getActivePause(prisma),
        endActivePauses(prisma),
      ];

      const results = await Promise.all(operations);

      // At least one should detect the pause before it's ended
      const [first, second, endCount] = results;

      // End count should be 1 (one pause was ended)
      expect(endCount).toBe(1);

      // After ending, no active pause should exist
      const finalCheck = await getActivePause(prisma);
      expect(finalCheck).toBeNull();
    });
  });
});

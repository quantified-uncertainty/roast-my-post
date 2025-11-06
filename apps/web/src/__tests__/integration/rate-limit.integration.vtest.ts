/**
 * Rate Limiting Integration Tests
 *
 * ⚠️ WARNING: These tests require a TEST database and will modify data.
 * DO NOT run against production or development databases with real user data!
 *
 * To run these tests:
 * 1. Set up a separate test database
 * 2. Set TEST_DATABASE_URL in your environment
 * 3. Run: pnpm test src/__tests__/integration/rate-limit.integration.vtest.ts
 *
 * These tests are skipped by default in CI (test:ci excludes integration tests).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkAvailableQuota,
  incrementRateLimit,
  RateLimitError,
  NotFoundError,
  type QuotaCheck
} from '@roast/db';
import { prisma } from '@/infrastructure/database/prisma';

// Skip these tests if not explicitly running integration tests
// This prevents accidental modification of dev database
const runDatabaseTests = process.env.RUN_DB_TESTS === 'true';

describe.skipIf(!runDatabaseTests)('Rate Limiting', () => {
  const testUserId = 'test-user-rate-limit-' + Date.now();

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.user.deleteMany({
      where: { id: testUserId }
    });
  });

  describe('checkAvailableQuota', () => {
    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        checkAvailableQuota('non-existent-user', prisma, 1)
      ).rejects.toThrow(NotFoundError);
    });

    it('should return correct quota info for REGULAR plan user', async () => {
      // Create a test user with REGULAR plan
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 5,
          evalsThisMonth: 50,
          hourResetAt: new Date(Date.now() + 3600000), // 1 hour from now
          monthResetAt: new Date(Date.now() + 86400000 * 30), // 30 days from now
        }
      });

      const result: QuotaCheck = await checkAvailableQuota(testUserId, prisma, 3);

      expect(result).toMatchObject({
        hasEnoughQuota: true,
        hourlyRemaining: 15, // 20 - 5
        monthlyRemaining: 250, // 300 - 50
        hourlyLimit: 20,
        monthlyLimit: 300
      });
    });

    it('should return correct quota info for PRO plan user', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'PRO',
          evalsThisHour: 10,
          evalsThisMonth: 100,
          hourResetAt: new Date(Date.now() + 3600000),
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      const result = await checkAvailableQuota(testUserId, prisma, 5);

      expect(result).toMatchObject({
        hasEnoughQuota: true,
        hourlyRemaining: 90, // 100 - 10
        monthlyRemaining: 900, // 1000 - 100
        hourlyLimit: 100,
        monthlyLimit: 1000
      });
    });

    it('should detect insufficient hourly quota', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 18, // Only 2 remaining
          evalsThisMonth: 50,
          hourResetAt: new Date(Date.now() + 3600000),
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      const result = await checkAvailableQuota(testUserId, prisma, 5);

      expect(result.hasEnoughQuota).toBe(false);
      expect(result.hourlyRemaining).toBe(2);
    });

    it('should detect insufficient monthly quota', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 5,
          evalsThisMonth: 298, // Only 2 remaining
          hourResetAt: new Date(Date.now() + 3600000),
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      const result = await checkAvailableQuota(testUserId, prisma, 5);

      expect(result.hasEnoughQuota).toBe(false);
      expect(result.monthlyRemaining).toBe(2);
    });

    it('should reset hourly counter when reset time has passed', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 20, // At limit
          evalsThisMonth: 50,
          hourResetAt: new Date(Date.now() - 1000), // Reset time in the past
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      const result = await checkAvailableQuota(testUserId, prisma, 5);

      expect(result.hasEnoughQuota).toBe(true);
      expect(result.hourlyRemaining).toBe(20); // Should be reset to full
    });

    it('should handle null reset times (first time user)', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 0,
          evalsThisMonth: 0,
          hourResetAt: null,
          monthResetAt: null,
        }
      });

      const result = await checkAvailableQuota(testUserId, prisma, 5);

      expect(result.hasEnoughQuota).toBe(true);
      expect(result.hourlyRemaining).toBe(20);
      expect(result.monthlyRemaining).toBe(300);
    });
  });

  describe('incrementRateLimit', () => {
    it('should increment counters successfully when quota available', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 5,
          evalsThisMonth: 50,
          hourResetAt: new Date(Date.now() + 3600000),
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      await incrementRateLimit(testUserId, prisma, 3);

      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.evalsThisHour).toBe(8); // 5 + 3
      expect(user?.evalsThisMonth).toBe(53); // 50 + 3
    });

    it('should throw RateLimitError when hourly quota exceeded', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 18, // Only 2 remaining
          evalsThisMonth: 50,
          hourResetAt: new Date(Date.now() + 3600000),
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      await expect(
        incrementRateLimit(testUserId, prisma, 5)
      ).rejects.toThrow(RateLimitError);

      // Verify counters were NOT incremented
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.evalsThisHour).toBe(18); // Unchanged
      expect(user?.evalsThisMonth).toBe(50); // Unchanged
    });

    it('should throw RateLimitError when monthly quota exceeded', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 5,
          evalsThisMonth: 298, // Only 2 remaining
          hourResetAt: new Date(Date.now() + 3600000),
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      await expect(
        incrementRateLimit(testUserId, prisma, 5)
      ).rejects.toThrow(RateLimitError);

      // Verify counters were NOT incremented
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.evalsThisHour).toBe(5); // Unchanged
      expect(user?.evalsThisMonth).toBe(298); // Unchanged
    });

    it('should reset and increment when reset time has passed', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 20, // At limit
          evalsThisMonth: 50,
          hourResetAt: new Date(Date.now() - 1000), // Reset time in the past
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      await incrementRateLimit(testUserId, prisma, 5);

      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.evalsThisHour).toBe(5); // Reset and incremented
      expect(user?.hourResetAt).toBeTruthy();
      expect(user?.hourResetAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should include retryAfter in RateLimitError', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 20, // At limit
          evalsThisMonth: 50,
          hourResetAt: new Date(Date.now() + 3600000), // 1 hour from now
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      try {
        await incrementRateLimit(testUserId, prisma, 1);
        expect.fail('Should have thrown RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        const rateLimitError = error as RateLimitError;
        expect(rateLimitError.details?.retryAfter).toBeTruthy();
        expect(rateLimitError.details?.retryAfter).toBeInstanceOf(Date);
      }
    });

    it('should use Serializable isolation to prevent race conditions', async () => {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 18, // Only 2 slots remaining
          evalsThisMonth: 50,
          hourResetAt: new Date(Date.now() + 3600000),
          monthResetAt: new Date(Date.now() + 86400000 * 30),
        }
      });

      // Simulate two concurrent requests
      const promises = [
        incrementRateLimit(testUserId, prisma, 2),
        incrementRateLimit(testUserId, prisma, 2)
      ];

      const results = await Promise.allSettled(promises);

      // One should succeed, one should fail (due to serializable isolation)
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);

      // Final counter should be 20 (18 + 2), not 22
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.evalsThisHour).toBe(20);
    });
  });

  describe('calculateRetryAfter bug fix', () => {
    it('should return LATEST reset time when both limits exceeded', async () => {
      const hourResetAt = new Date(Date.now() + 3600000); // 1 hour from now
      const monthResetAt = new Date(Date.now() + 86400000 * 30); // 30 days from now

      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          plan: 'REGULAR',
          evalsThisHour: 20, // At hourly limit
          evalsThisMonth: 300, // At monthly limit
          hourResetAt,
          monthResetAt,
        }
      });

      try {
        await incrementRateLimit(testUserId, prisma, 1);
        expect.fail('Should have thrown RateLimitError');
      } catch (error) {
        const rateLimitError = error as RateLimitError;
        const retryAfter = rateLimitError.details?.retryAfter;

        // Should return the LATEST (monthly) reset time, not the earliest (hourly)
        expect(retryAfter).toBeTruthy();
        expect(retryAfter!.getTime()).toBeGreaterThan(hourResetAt.getTime());
        expect(Math.abs(retryAfter!.getTime() - monthResetAt.getTime())).toBeLessThan(1000);
      }
    });
  });
});

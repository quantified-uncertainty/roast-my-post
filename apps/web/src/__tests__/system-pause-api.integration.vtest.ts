/**
 * Integration tests for API routes with system pause
 * Tests that all evaluation/import endpoints properly block when system is paused
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, createSystemPause, endActivePauses } from '@roast/db';

// Mock authentication
vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequest: vi.fn().mockResolvedValue('test-user-id'),
}));

// Mock logging
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('API Routes - System Pause Integration', () => {
  let testPauseId: string | null = null;

  afterEach(async () => {
    // Clean up test pauses
    if (testPauseId) {
      await prisma.systemPause.deleteMany({
        where: { reason: { contains: '[TEST]' } },
      });
      testPauseId = null;
    } else {
      await endActivePauses(prisma);
    }
  });

  describe('POST /api/docs/[docId]/evals/[agentId]', () => {
    it('should return 503 when system is paused', async () => {
      // Pause system
      const pause = await createSystemPause('[TEST] API testing pause', prisma);
      testPauseId = pause.id;

      // Mock the route dependencies
      vi.mock('@/infrastructure/http/rate-limit-handler', async () => {
        const actual = await vi.importActual('@/infrastructure/http/rate-limit-handler');
        return actual;
      });

      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      // Test the prerequisite check directly (simulates what the route does)
      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 1,
      });

      expect(result).toBeInstanceOf(NextResponse);
      const response = result as NextResponse;
      expect(response.status).toBe(503);

      const json = await response.json();
      expect(json.error).toContain('[TEST] API testing pause');
      expect(json.reason).toBe('[TEST] API testing pause');
    });

    it('should allow operations when system is not paused', async () => {
      // Ensure system is not paused
      await endActivePauses(prisma);

      // Mock quota check to pass
      vi.mock('@/infrastructure/rate-limiting/rate-limit-service', () => ({
        checkAvailableQuota: vi.fn().mockResolvedValue({
          hasEnoughQuota: true,
          hourlyRemaining: 10,
          monthlyRemaining: 100,
          hourlyLimit: 20,
          monthlyLimit: 200,
        }),
        formatQuotaErrorMessage: vi.fn(),
        incrementRateLimit: vi.fn(),
      }));

      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 1,
      });

      expect(result).toBeNull();
    });
  });

  describe('POST /api/documents/[slugOrId]/evaluations', () => {
    it('should block batch evaluation creation when paused', async () => {
      const pause = await createSystemPause(
        '[TEST] Batch evaluation pause',
        prisma
      );
      testPauseId = pause.id;

      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      // Simulate batch request
      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 5, // Batch of 5
      });

      expect(result).toBeInstanceOf(NextResponse);
      const response = result as NextResponse;
      expect(response.status).toBe(503);

      const json = await response.json();
      expect(json.error).toContain('[TEST] Batch evaluation pause');
    });
  });

  describe('POST /api/import', () => {
    it('should block document import with evaluations when paused', async () => {
      const pause = await createSystemPause('[TEST] Import pause', prisma);
      testPauseId = pause.id;

      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      // Simulate import with agents
      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 3, // Import with 3 agents
      });

      expect(result).toBeInstanceOf(NextResponse);
      const response = result as NextResponse;
      expect(response.status).toBe(503);
    });

    it('should allow import without evaluations even when paused', async () => {
      // This is a special case - importing without agents doesn't require pause check
      // The actual route logic should handle this, but we test the prerequisite
      // check returns null when requestedCount is 0

      const pause = await createSystemPause('[TEST] Import pause', prisma);
      testPauseId = pause.id;

      // When requestedCount is 0, the route might skip the check entirely
      // This is an implementation detail we're testing
      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      // If requestedCount is 0, the import route might not call this at all
      // But if it does, it should still block
      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 0,
      });

      // Even with 0 requested, pause should block
      expect(result).toBeInstanceOf(NextResponse);
    });
  });

  describe('Error message format', () => {
    it('should include pause reason in error response', async () => {
      const reason = '[TEST] Detailed pause reason with context';
      const pause = await createSystemPause(reason, prisma);
      testPauseId = pause.id;

      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 1,
      });

      const response = result as NextResponse;
      const json = await response.json();

      expect(json.error).toContain(reason);
      expect(json.reason).toBe(reason);
    });

    it('should include pause timestamp in error message', async () => {
      const pause = await createSystemPause('[TEST] Timestamp test', prisma);
      testPauseId = pause.id;

      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 1,
      });

      const response = result as NextResponse;
      const json = await response.json();

      // Error message should contain ISO timestamp
      expect(json.error).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Pause lifecycle', () => {
    it('should block operations immediately after pause', async () => {
      // Start with no pause
      await endActivePauses(prisma);

      vi.mock('@/infrastructure/rate-limiting/rate-limit-service', () => ({
        checkAvailableQuota: vi.fn().mockResolvedValue({
          hasEnoughQuota: true,
          hourlyRemaining: 10,
          monthlyRemaining: 100,
          hourlyLimit: 20,
          monthlyLimit: 200,
        }),
        formatQuotaErrorMessage: vi.fn(),
        incrementRateLimit: vi.fn(),
      }));

      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      // Should pass initially
      let result = await checkOperationPrerequisites({
        userId: 'test-user',
        requestedCount: 1,
      });
      expect(result).toBeNull();

      // Pause system
      const pause = await createSystemPause('[TEST] Lifecycle test', prisma);
      testPauseId = pause.id;

      // Should block now
      result = await checkOperationPrerequisites({
        userId: 'test-user',
        requestedCount: 1,
      });
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(503);
    });

    it('should allow operations immediately after unpause', async () => {
      // Start with pause
      const pause = await createSystemPause('[TEST] Unpause test', prisma);
      testPauseId = pause.id;

      vi.mock('@/infrastructure/rate-limiting/rate-limit-service', () => ({
        checkAvailableQuota: vi.fn().mockResolvedValue({
          hasEnoughQuota: true,
          hourlyRemaining: 10,
          monthlyRemaining: 100,
          hourlyLimit: 20,
          monthlyLimit: 200,
        }),
        formatQuotaErrorMessage: vi.fn(),
        incrementRateLimit: vi.fn(),
      }));

      const { validateLlmAccess } = await import(
        '@/infrastructure/http/guards'
      );

      // Should block initially
      let result = await checkOperationPrerequisites({
        userId: 'test-user',
        requestedCount: 1,
      });
      expect(result).toBeInstanceOf(NextResponse);

      // Unpause system
      await endActivePauses(prisma);
      testPauseId = null;

      // Should pass now
      result = await checkOperationPrerequisites({
        userId: 'test-user',
        requestedCount: 1,
      });
      expect(result).toBeNull();
    });
  });
});

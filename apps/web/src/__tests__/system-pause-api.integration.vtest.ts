/**
 * Integration tests for API routes with system pause
 * Tests that evaluation/import endpoints properly block when system is paused
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
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
  afterEach(async () => {
    // Clean up test pauses
    await prisma.systemPause.deleteMany({
      where: { reason: { contains: '[TEST]' } },
    });
  });

  describe('validateLlmAccess guard', () => {
    it('should block when system is paused', async () => {
      const pause = await createSystemPause('[TEST] API testing pause', prisma);

      vi.mock('@/infrastructure/http/rate-limit-handler', async () => {
        const actual = await vi.importActual('@/infrastructure/http/rate-limit-handler');
        return actual;
      });

      const { validateLlmAccess } = await import('@/infrastructure/http/guards');
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

    it('should allow operations when not paused', async () => {
      await endActivePauses(prisma);

      vi.mock('@/infrastructure/rate-limiting/rate-limit-service', () => ({
        checkAvailableQuota: vi.fn().mockResolvedValue({
          hasEnoughQuota: true,
          hourlyRemaining: 10,
          monthlyRemaining: 100,
        }),
      }));

      const { validateLlmAccess } = await import('@/infrastructure/http/guards');
      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 1,
      });

      expect(result).toBeNull();
    });

    it('should include pause reason and timestamp in error', async () => {
      const reason = '[TEST] Detailed pause reason';
      await createSystemPause(reason, prisma);

      const { validateLlmAccess } = await import('@/infrastructure/http/guards');
      const result = await validateLlmAccess({
        userId: 'test-user',
        requestedCount: 1,
      });

      const response = result as NextResponse;
      const json = await response.json();
      expect(json.error).toContain(reason);
      expect(json.reason).toBe(reason);
      expect(json.error).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { validateLlmAccess } from '../../guards/llm-operation-guard';
import { SystemPausedError } from '@roast/db';

// Mock dependencies
vi.mock('@roast/db', async () => {
  const actual = await vi.importActual('@roast/db');
  return {
    ...actual,
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
    },
    assertSystemNotPaused: vi.fn(),
  };
});

vi.mock('../../rate-limit-handler', () => ({
  checkQuotaAvailable: vi.fn(),
}));

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { assertSystemNotPaused } from '@roast/db';
import { checkQuotaAvailable } from '../../rate-limit-handler';
import { logger } from '@/infrastructure/logging/logger';

describe('validateLlmAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('system pause checks', () => {
    it('should return null when system is not paused and quota is available', async () => {
      vi.mocked(assertSystemNotPaused).mockResolvedValue(undefined);
      vi.mocked(checkQuotaAvailable).mockResolvedValue(null);

      const result = await validateLlmAccess({
        userId: 'user-123',
        requestedCount: 1,
      });

      expect(result).toBeNull();
      expect(assertSystemNotPaused).toHaveBeenCalled();
      expect(checkQuotaAvailable).toHaveBeenCalledWith({ userId: 'user-123', requestedCount: 1 });
    });

    it('should return 503 error when system is paused', async () => {
      const mockPause = {
        id: 'pause-1',
        startedAt: new Date('2025-01-01'),
        reason: 'API rate limit exceeded',
      };
      vi.mocked(assertSystemNotPaused).mockRejectedValue(
        new SystemPausedError(mockPause)
      );

      const result = await validateLlmAccess({
        userId: 'user-123',
        requestedCount: 1,
      });

      expect(result).toBeInstanceOf(NextResponse);
      const json = await result!.json();
      expect(json.error).toContain('API rate limit exceeded');
      expect(json.reason).toBe('API rate limit exceeded');
      expect(result!.status).toBe(503);
    });

    it('should log when operation is blocked by system pause', async () => {
      const mockPause = {
        id: 'pause-1',
        startedAt: new Date('2025-01-01T10:00:00Z'),
        reason: 'Maintenance',
      };
      vi.mocked(assertSystemNotPaused).mockRejectedValue(
        new SystemPausedError(mockPause)
      );

      await validateLlmAccess({
        userId: 'user-123',
        requestedCount: 5,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'LLM operation blocked: system paused',
        expect.objectContaining({
          event: 'llm_operation_blocked_pause',
          userId: 'user-123',
          requestedCount: 5,
          reason: 'Maintenance',
        })
      );
    });

    it('should rethrow non-SystemPausedError errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      vi.mocked(assertSystemNotPaused).mockRejectedValue(unexpectedError);

      await expect(
        validateLlmAccess({
          userId: 'user-123',
          requestedCount: 1,
        })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('quota checks', () => {
    beforeEach(() => {
      // System not paused for these tests
      vi.mocked(assertSystemNotPaused).mockResolvedValue(undefined);
    });

    it('should return 429 error when quota is insufficient', async () => {
      const quotaError = NextResponse.json(
        { error: 'Quota exceeded: 5 requested' },
        { status: 429 }
      );
      vi.mocked(checkQuotaAvailable).mockResolvedValue(quotaError);

      const result = await validateLlmAccess({
        userId: 'user-123',
        requestedCount: 5,
      });

      expect(result).toBeInstanceOf(NextResponse);
      const json = await result!.json();
      expect(json.error).toContain('Quota exceeded');
      expect(result!.status).toBe(429);
    });
  });

  describe('prerequisite check order', () => {
    it('should check system pause before checking quota', async () => {
      const callOrder: string[] = [];

      vi.mocked(assertSystemNotPaused).mockImplementation(async () => {
        callOrder.push('pause');
      });
      vi.mocked(checkQuotaAvailable).mockImplementation(async () => {
        callOrder.push('quota');
        return null;
      });

      await validateLlmAccess({
        userId: 'user-123',
        requestedCount: 1,
      });

      expect(callOrder).toEqual(['pause', 'quota']);
    });

    it('should not check quota if system is paused', async () => {
      const mockPause = {
        id: 'pause-1',
        startedAt: new Date(),
        reason: 'Paused',
      };
      vi.mocked(assertSystemNotPaused).mockRejectedValue(
        new SystemPausedError(mockPause)
      );

      await validateLlmAccess({
        userId: 'user-123',
        requestedCount: 1,
      });

      expect(checkQuotaAvailable).not.toHaveBeenCalled();
    });
  });
});

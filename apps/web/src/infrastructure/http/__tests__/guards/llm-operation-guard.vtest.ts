import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { validateLlmAccess } from '../../guards/llm-operation-guard';
import { SystemPausedError } from '@roast/db';

// Mock dependencies
vi.mock('@roast/db', async () => {
  const actual = await vi.importActual('@roast/db');
  return {
    ...actual,
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

  it('should return null when system not paused and quota available', async () => {
    vi.mocked(assertSystemNotPaused).mockResolvedValue(undefined);
    vi.mocked(checkQuotaAvailable).mockResolvedValue(null);

    const result = await validateLlmAccess({
      userId: 'user-123',
      requestedCount: 1,
    });

    expect(result).toBeNull();
    expect(assertSystemNotPaused).toHaveBeenCalled();
    expect(checkQuotaAvailable).toHaveBeenCalledWith({
      userId: 'user-123',
      requestedCount: 1
    });
  });

  it('should return 503 when system is paused', async () => {
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

  it('should log when blocked by system pause', async () => {
    const mockPause = {
      id: 'pause-1',
      startedAt: new Date('2025-01-01'),
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

  it('should return 429 when quota is insufficient', async () => {
    vi.mocked(assertSystemNotPaused).mockResolvedValue(undefined);
    const quotaError = NextResponse.json(
      { error: 'Quota exceeded' },
      { status: 429 }
    );
    vi.mocked(checkQuotaAvailable).mockResolvedValue(quotaError);

    const result = await validateLlmAccess({
      userId: 'user-123',
      requestedCount: 5,
    });

    expect(result).toBeInstanceOf(NextResponse);
    expect(result!.status).toBe(429);
  });

  it('should check pause before quota', async () => {
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
    vi.mocked(assertSystemNotPaused).mockRejectedValue(
      new SystemPausedError({
        id: 'pause-1',
        startedAt: new Date(),
        reason: 'Paused',
      })
    );

    await validateLlmAccess({
      userId: 'user-123',
      requestedCount: 1,
    });

    expect(checkQuotaAvailable).not.toHaveBeenCalled();
  });
});

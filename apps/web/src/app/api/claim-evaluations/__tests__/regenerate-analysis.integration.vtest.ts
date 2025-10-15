/**
 * Integration tests for POST /api/claim-evaluations/[id]/analysis/regenerate
 *
 * Tests analysis regeneration with parent/sibling/child variation gathering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma, generateId } from '@roast/db';
import { POST } from '../[id]/analysis/regenerate/route';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/infrastructure/auth/auth', () => ({
  auth: vi.fn(() => Promise.resolve({
    user: { id: 'test-user-id', email: 'test@example.com' }
  }))
}));

// Mock logger
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock rate limiter
vi.mock('@/infrastructure/http/rate-limiter', () => ({
  strictRateLimit: {
    check: vi.fn(() => Promise.resolve({ success: true }))
  },
  getClientIdentifier: vi.fn(() => 'test-client')
}));

// Mock analysis function
vi.mock('@roast/ai/server', () => ({
  analyzeClaimEvaluation: vi.fn((input) => {
    // Return analysis that includes info about variations count
    const variationCount = input.variations?.length || 1;
    return Promise.resolve({
      analysisText: `Analyzed ${variationCount} variation(s). Test analysis with comprehensive findings.`
    });
  })
}));

describe('POST /api/claim-evaluations/[id]/analysis/regenerate', () => {
  let testUserId: string;
  let parentId: string;
  let variation1Id: string;
  let variation2Id: string;
  let variation3Id: string;

  beforeEach(async () => {
    // Create test user
    testUserId = 'test-user-id';
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    // Create parent evaluation
    parentId = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: parentId,
        userId: testUserId,
        claim: 'Parent: Sugar is unhealthy',
        rawOutput: {
          evaluations: [
            { model: 'claude', hasError: false, successfulResponse: { agreement: 70 } },
            { model: 'gpt-4', hasError: false, successfulResponse: { agreement: 65 } },
          ],
          summary: { mean: 67.5, count: 2 }
        },
        summaryMean: 67.5,
      }
    });

    // Create variation 1 (child of parent)
    variation1Id = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: variation1Id,
        userId: testUserId,
        claim: 'Variation 1: Sugar is very unhealthy',
        variationOf: parentId,
        submitterNotes: 'Added emphasis',
        tags: ['magnitude-test', 'framing'],
        rawOutput: {
          evaluations: [
            { model: 'claude', hasError: false, successfulResponse: { agreement: 85 } },
            { model: 'gpt-4', hasError: false, successfulResponse: { agreement: 80 } },
          ],
          summary: { mean: 82.5, count: 2 }
        },
        summaryMean: 82.5,
      }
    });

    // Create variation 2 (sibling of variation1)
    variation2Id = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: variation2Id,
        userId: testUserId,
        claim: 'Variation 2: Sugar might be unhealthy',
        variationOf: parentId,
        submitterNotes: 'Added hedging',
        tags: ['magnitude-test', 'hedging'],
        rawOutput: {
          evaluations: [
            { model: 'claude', hasError: false, successfulResponse: { agreement: 45 } },
            { model: 'gpt-4', hasError: false, successfulResponse: { agreement: 50 } },
          ],
          summary: { mean: 47.5, count: 2 }
        },
        summaryMean: 47.5,
      }
    });

    // Create variation 3 (child of variation1)
    variation3Id = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: variation3Id,
        userId: testUserId,
        claim: 'Variation 3: Sugar is extremely unhealthy',
        variationOf: variation1Id, // Child of variation1, not parent
        submitterNotes: 'Even more emphasis',
        tags: ['magnitude-test', 'extreme'],
        rawOutput: {
          evaluations: [
            { model: 'claude', hasError: false, successfulResponse: { agreement: 90 } },
            { model: 'gpt-4', hasError: false, successfulResponse: { agreement: 88 } },
          ],
          summary: { mean: 89, count: 2 }
        },
        summaryMean: 89,
      }
    });
  });

  afterEach(async () => {
    // Clean up
    await prisma.claimEvaluation.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.deleteMany({
      where: { id: testUserId }
    });
  });

  it('should gather parent and siblings when regenerating for a variation', async () => {
    // Regenerate analysis for variation1
    // Should include: parent, variation1, variation2 (sibling), but NOT variation3 (child of variation1)
    const request = new NextRequest(
      `http://localhost/api/claim-evaluations/${variation1Id}/analysis/regenerate`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: Promise.resolve({ id: variation1Id }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.analysisText).toBeDefined();
    expect(data.analysisGeneratedAt).toBeDefined();

    // Should have gathered: parent + variation1 + variation2 = 3 evaluations
    // (variation3 is a child of variation1, so not included in "related")
    expect(data.relatedEvaluationsCount).toBeGreaterThanOrEqual(3);
    expect(data.totalEvaluationsAnalyzed).toBeGreaterThanOrEqual(6); // 2 model runs each * 3 evaluations

    // Verify the mocked function was called with variations
    const { analyzeClaimEvaluation } = await import('@roast/ai/server');
    const callArgs = vi.mocked(analyzeClaimEvaluation).mock.calls[0][0];
    expect(callArgs.variations).toBeDefined();
    expect(callArgs.variations!.length).toBeGreaterThanOrEqual(3);

    // Verify database was updated
    const updatedEval = await prisma.claimEvaluation.findUnique({
      where: { id: variation1Id },
      select: { analysisText: true, analysisGeneratedAt: true }
    });

    expect(updatedEval!.analysisText).toBe(data.analysisText);
    expect(updatedEval!.analysisGeneratedAt).not.toBeNull();
  });

  it('should gather children when regenerating for parent', async () => {
    // Regenerate analysis for parent
    // Should include: parent, variation1, variation2 (direct children)
    const request = new NextRequest(
      `http://localhost/api/claim-evaluations/${parentId}/analysis/regenerate`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: Promise.resolve({ id: parentId }) });
    expect(response.status).toBe(200);

    const data = await response.json();

    // Should have gathered: parent + 2 direct children (variation1, variation2)
    // variation3 is NOT a direct child of parent (it's a child of variation1)
    expect(data.relatedEvaluationsCount).toBeGreaterThanOrEqual(3);
  });

  it('should return 500 if analysis generation fails', async () => {
    // Mock analysis to fail
    const { analyzeClaimEvaluation } = await import('@roast/ai/server');
    vi.mocked(analyzeClaimEvaluation).mockRejectedValueOnce(new Error('LLM service unavailable'));

    const request = new NextRequest(
      `http://localhost/api/claim-evaluations/${parentId}/analysis/regenerate`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: Promise.resolve({ id: parentId }) });

    // For the dedicated regeneration endpoint, analysis failure should be fatal
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe('Failed to generate analysis');
    expect(data.details).toContain('LLM service unavailable');
  });

  it('should return 404 for non-existent evaluation', async () => {
    const fakeId = generateId(16);
    const request = new NextRequest(
      `http://localhost/api/claim-evaluations/${fakeId}/analysis/regenerate`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: Promise.resolve({ id: fakeId }) });
    expect(response.status).toBe(404);
  });

  it('should return 403 when user does not own evaluation', async () => {
    // Mock different user
    const { auth } = await import('@/infrastructure/auth/auth');
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'different-user', email: 'other@example.com' }
    } as any);

    const request = new NextRequest(
      `http://localhost/api/claim-evaluations/${parentId}/analysis/regenerate`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: Promise.resolve({ id: parentId }) });
    expect(response.status).toBe(403);
  });

  it('should handle standalone evaluation without variations', async () => {
    // Create standalone evaluation (no parent, no children)
    const standaloneId = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: standaloneId,
        userId: testUserId,
        claim: 'Standalone claim',
        rawOutput: {
          evaluations: [
            { model: 'claude', hasError: false, successfulResponse: { agreement: 50 } },
          ],
          summary: { mean: 50, count: 1 }
        },
        summaryMean: 50,
      }
    });

    const request = new NextRequest(
      `http://localhost/api/claim-evaluations/${standaloneId}/analysis/regenerate`,
      { method: 'POST' }
    );

    const response = await POST(request, { params: Promise.resolve({ id: standaloneId }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.relatedEvaluationsCount).toBe(1); // Just the standalone evaluation itself
    expect(data.totalEvaluationsAnalyzed).toBe(1); // Just one model run

    // Clean up
    await prisma.claimEvaluation.delete({ where: { id: standaloneId } });
  });
});

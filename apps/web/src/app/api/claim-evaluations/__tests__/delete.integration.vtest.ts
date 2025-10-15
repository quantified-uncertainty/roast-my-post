/**
 * Integration tests for DELETE /api/claim-evaluations/[id]
 *
 * Tests CASCADE delete behavior and transaction safety
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma, generateId } from '@roast/db';
import { DELETE } from '../[id]/route';
import { NextRequest } from 'next/server';

// Mock auth to return a test user
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

describe('DELETE /api/claim-evaluations/[id]', () => {
  let testUserId: string;
  let parentEvaluationId: string;
  let variation1Id: string;
  let variation2Id: string;

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
    parentEvaluationId = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: parentEvaluationId,
        userId: testUserId,
        claim: 'Parent claim',
        rawOutput: { summary: { mean: 50 } },
        summaryMean: 50,
      }
    });

    // Create variation 1
    variation1Id = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: variation1Id,
        userId: testUserId,
        claim: 'Variation 1 claim',
        rawOutput: { summary: { mean: 60 } },
        summaryMean: 60,
        variationOf: parentEvaluationId,
        submitterNotes: 'First variation',
      }
    });

    // Create variation 2
    variation2Id = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: variation2Id,
        userId: testUserId,
        claim: 'Variation 2 claim',
        rawOutput: { summary: { mean: 70 } },
        summaryMean: 70,
        variationOf: parentEvaluationId,
        submitterNotes: 'Second variation',
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.claimEvaluation.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.deleteMany({
      where: { id: testUserId }
    });
  });

  it('should CASCADE delete variations when parent is deleted', async () => {
    // Verify setup: parent should have 2 variations
    const parentBefore = await prisma.claimEvaluation.findUnique({
      where: { id: parentEvaluationId },
      include: { _count: { select: { variations: true } } }
    });
    expect(parentBefore?._count.variations).toBe(2);

    // Create mock request
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${parentEvaluationId}`, {
      method: 'DELETE'
    });

    // Call DELETE endpoint
    const response = await DELETE(request, { params: Promise.resolve({ id: parentEvaluationId }) });

    expect(response.status).toBe(200);

    // Verify parent is deleted
    const parentAfter = await prisma.claimEvaluation.findUnique({
      where: { id: parentEvaluationId }
    });
    expect(parentAfter).toBeNull();

    // Verify variations are CASCADE deleted
    const variation1After = await prisma.claimEvaluation.findUnique({
      where: { id: variation1Id }
    });
    expect(variation1After).toBeNull();

    const variation2After = await prisma.claimEvaluation.findUnique({
      where: { id: variation2Id }
    });
    expect(variation2After).toBeNull();

    // Verify all evaluations are gone
    const remainingEvals = await prisma.claimEvaluation.findMany({
      where: { userId: testUserId }
    });
    expect(remainingEvals).toHaveLength(0);
  });

  it('should delete variation without affecting parent or siblings', async () => {
    // Delete variation1
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${variation1Id}`, {
      method: 'DELETE'
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: variation1Id }) });
    expect(response.status).toBe(200);

    // Verify variation1 is deleted
    const variation1After = await prisma.claimEvaluation.findUnique({
      where: { id: variation1Id }
    });
    expect(variation1After).toBeNull();

    // Verify parent still exists
    const parentAfter = await prisma.claimEvaluation.findUnique({
      where: { id: parentEvaluationId },
      include: { _count: { select: { variations: true } } }
    });
    expect(parentAfter).not.toBeNull();
    expect(parentAfter?._count.variations).toBe(1); // Only variation2 remains

    // Verify variation2 still exists
    const variation2After = await prisma.claimEvaluation.findUnique({
      where: { id: variation2Id }
    });
    expect(variation2After).not.toBeNull();
  });

  it('should return 404 for non-existent evaluation', async () => {
    const fakeId = generateId(16);
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${fakeId}`, {
      method: 'DELETE'
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: fakeId }) });
    expect(response.status).toBe(404);
  });

  it('should return 403 when user does not own evaluation', async () => {
    // Mock auth to return different user
    const { auth } = await import('@/infrastructure/auth/auth');
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'different-user-id', email: 'other@example.com' }
    } as any);

    const request = new NextRequest(`http://localhost/api/claim-evaluations/${parentEvaluationId}`, {
      method: 'DELETE'
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: parentEvaluationId }) });
    expect(response.status).toBe(403);

    // Verify evaluation was NOT deleted
    const evalAfter = await prisma.claimEvaluation.findUnique({
      where: { id: parentEvaluationId }
    });
    expect(evalAfter).not.toBeNull();
  });
});

/**
 * Integration tests for PATCH /api/claim-evaluations/[id]
 *
 * Tests transaction safety when adding runs to existing evaluations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma, generateId } from '@roast/db';
import { PATCH } from '../[id]/route';
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

// Mock claim evaluator tool
vi.mock('@roast/ai/server', () => ({
  claimEvaluatorTool: {
    execute: vi.fn(() => Promise.resolve({
      evaluations: [
        { model: 'test-model', hasError: false, successfulResponse: { agreement: 75 } },
        { model: 'test-model', hasError: false, successfulResponse: { agreement: 80 } },
      ],
      summary: { mean: 77.5, count: 2 }
    }))
  },
  analyzeClaimEvaluation: vi.fn(() => Promise.resolve({
    analysisText: 'Test analysis generated'
  }))
}));

// Mock AI logger
vi.mock('@roast/ai', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}));

describe('PATCH /api/claim-evaluations/[id]', () => {
  let testUserId: string;
  let evaluationId: string;

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

    // Create existing evaluation with 2 runs
    evaluationId = generateId(16);
    await prisma.claimEvaluation.create({
      data: {
        id: evaluationId,
        userId: testUserId,
        claim: 'Test claim',
        context: 'Test context',
        rawOutput: {
          evaluations: [
            { model: 'model-1', hasError: false, successfulResponse: { agreement: 50 } },
            { model: 'model-1', hasError: false, successfulResponse: { agreement: 60 } },
          ],
          summary: { mean: 55, count: 2 }
        },
        summaryMean: 55,
        explanationLength: 100,
        temperature: 0.7,
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

  it('should add runs and update evaluation atomically', async () => {
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${evaluationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runs: [
          { model: 'test-model', runs: 2 }
        ]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: evaluationId }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.addedEvaluations).toBe(2);
    expect(data.totalEvaluations).toBe(4); // 2 original + 2 new
    expect(data.newSummaryMean).toBeCloseTo(65.625, 1); // (50+60+75+80)/4

    // Verify database was updated atomically
    const updatedEval = await prisma.claimEvaluation.findUnique({
      where: { id: evaluationId }
    });

    expect(updatedEval).not.toBeNull();
    expect(updatedEval!.summaryMean).toBeCloseTo(65.625, 1);

    const rawOutput = updatedEval!.rawOutput as any;
    expect(rawOutput.evaluations).toHaveLength(4);
    expect(rawOutput.summary.count).toBe(4);
  });

  it('should handle analysis generation gracefully if it fails', async () => {
    // Mock analysis to fail
    const { analyzeClaimEvaluation } = await import('@roast/ai/server');
    vi.mocked(analyzeClaimEvaluation).mockRejectedValueOnce(new Error('Analysis failed'));

    const request = new NextRequest(`http://localhost/api/claim-evaluations/${evaluationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runs: [{ model: 'test-model', runs: 1 }]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: evaluationId }) });

    // Should still succeed even if analysis fails
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.addedEvaluations).toBe(2); // Mock returns 2 evaluations
    expect(data.analysisText).toBeNull(); // Analysis failed, should be null
  });

  it('should validate total evaluations limit', async () => {
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${evaluationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runs: [
          { model: 'model-1', runs: 15 },
          { model: 'model-2', runs: 10 }, // Total = 25, exceeds limit of 20
        ]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: evaluationId }) });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Too many evaluations');
    expect(data.error).toContain('25');
  });

  it('should return 404 for non-existent evaluation', async () => {
    const fakeId = generateId(16);
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${fakeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runs: [{ model: 'test-model', runs: 1 }]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: fakeId }) });
    expect(response.status).toBe(404);
  });

  it('should return 403 when user does not own evaluation', async () => {
    // Mock different user
    const { auth } = await import('@/infrastructure/auth/auth');
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'different-user', email: 'other@example.com' }
    } as any);

    const request = new NextRequest(`http://localhost/api/claim-evaluations/${evaluationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runs: [{ model: 'test-model', runs: 1 }]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: evaluationId }) });
    expect(response.status).toBe(403);

    // Verify evaluation was NOT modified
    const evalAfter = await prisma.claimEvaluation.findUnique({
      where: { id: evaluationId }
    });
    expect((evalAfter!.rawOutput as any).evaluations).toHaveLength(2); // Still original 2
  });

  it('should validate request body schema', async () => {
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${evaluationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runs: [
          { model: 'test-model', runs: 0 } // Invalid: runs must be >= 1
        ]
      })
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: evaluationId }) });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Invalid request data');
    expect(data.details).toBeDefined();
  });
});

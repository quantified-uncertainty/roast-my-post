import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../route';
import { prisma, generateId } from '@roast/db';
import { NextRequest } from 'next/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';

describe('POST /api/claim-evaluations/[id]/rerun', () => {
  let testUserId: string;
  let testClaimId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        id: generateId(16),
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test claim evaluation with initial results
    const initialRawOutput: ClaimEvaluatorOutput = {
      evaluations: [
        {
          model: 'anthropic/claude-sonnet-4.5',
          provider: 'anthropic',
          hasError: false,
          responseTimeMs: 1000,
          successfulResponse: {
            agreement: 75,
            confidence: 85,
            agreementLevel: 'Probably true',
            reasoning: 'Initial evaluation reasoning',
          },
        },
      ],
      summary: { mean: 75 },
    };

    const claim = await prisma.claimEvaluation.create({
      data: {
        id: generateId(16),
        userId: testUserId,
        claim: 'Test claim for rerun',
        context: 'Test context',
        summaryMean: 75,
        rawOutput: initialRawOutput as any,
        temperature: 0.7,
        tags: ['test'],
      },
    });
    testClaimId = claim.id;
  });

  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost/api/claim-evaluations/test/rerun', {
      method: 'POST',
      body: JSON.stringify({ additionalRuns: 1 }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: testClaimId }),
    });

    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent claim', async () => {
    const request = new NextRequest('http://localhost/api/claim-evaluations/nonexistent/rerun', {
      method: 'POST',
      headers: {
        'x-user-id': testUserId, // Simulated auth
      },
      body: JSON.stringify({ additionalRuns: 1 }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: 'nonexistent-id' }),
    });

    expect(response.status).toBe(404);
  });

  it('should validate request schema', async () => {
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${testClaimId}/rerun`, {
      method: 'POST',
      headers: {
        'x-user-id': testUserId,
      },
      body: JSON.stringify({ additionalRuns: 'invalid' }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: testClaimId }),
    });

    expect(response.status).toBe(400);
  });

  it('should reject excessive additionalRuns', async () => {
    const request = new NextRequest(`http://localhost/api/claim-evaluations/${testClaimId}/rerun`, {
      method: 'POST',
      headers: {
        'x-user-id': testUserId,
      },
      body: JSON.stringify({ additionalRuns: 100 }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: testClaimId }),
    });

    expect(response.status).toBe(400);
  });

  it('should check ownership before allowing rerun', async () => {
    // Create another user
    const otherUser = await prisma.user.create({
      data: {
        id: generateId(16),
        email: `other-${Date.now()}@example.com`,
        name: 'Other User',
      },
    });

    const request = new NextRequest(`http://localhost/api/claim-evaluations/${testClaimId}/rerun`, {
      method: 'POST',
      headers: {
        'x-user-id': otherUser.id, // Different user
      },
      body: JSON.stringify({ additionalRuns: 1 }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: testClaimId }),
    });

    expect(response.status).toBe(403);
  });
});

// Note: Full integration test with actual LLM calls would go in a separate .integration.vtest.ts file

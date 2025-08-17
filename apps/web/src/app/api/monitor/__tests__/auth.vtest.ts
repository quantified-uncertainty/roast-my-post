import { vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getStats } from '../stats/route';
import { GET as getEvaluations } from '../evaluations/route';
import { GET as getJobs } from '../jobs/route';

// Mock the auth helpers
vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/infrastructure/auth/auth', () => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock('@/infrastructure/http/api-response-helpers', () => ({
  commonErrors: {
    unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })),
    forbidden: vi.fn(() => new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 })),
    serverError: vi.fn((message) => new Response(JSON.stringify({ error: message }), { status: 500 })),
  },
}));

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@roast/db', () => ({
  prisma: {
    job: { groupBy: vi.fn(), findMany: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
    evaluation: { findMany: vi.fn(), count: vi.fn() },
    evaluationComment: { count: vi.fn() },
    evaluationVersion: { aggregate: vi.fn() },
    document: { count: vi.fn() },
    agent: { count: vi.fn() },
    $transaction: vi.fn(),
  },
  JobStatus: {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
}));

import { authenticateRequest } from '@/infrastructure/auth/auth-helpers';
import { isAdmin } from '@/infrastructure/auth/auth';

describe('Monitor Routes Authentication', () => {
  const mockRequest = new NextRequest('http://localhost:3000/api/monitor/test');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/monitor/stats', () => {
    it('should return 401 when not authenticated', async () => {
      (authenticateRequest as jest.Mock).mockResolvedValue(undefined);
      
      const response = await getStats(mockRequest);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should return data when authenticated', async () => {
      (authenticateRequest as jest.Mock).mockResolvedValue('user-123');
      (isAdmin as jest.Mock).mockResolvedValue(true);
      
      // Mock all the required database calls
      const { prisma } = require('@roast/db');
      
      // Job stats grouped by status
      prisma.job.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { id: 10 } },
        { status: 'FAILED', _count: { id: 2 } },
        { status: 'RUNNING', _count: { id: 1 } },
      ]);
      
      // Jobs created today
      prisma.job.findMany.mockResolvedValue([]);
      
      // Job aggregates
      prisma.job.aggregate.mockResolvedValue({ 
        _avg: { durationInSeconds: 45.5 }, 
        _sum: { priceInDollars: 12.34 } 
      });
      
      // Counts
      prisma.job.count.mockResolvedValue(0);
      prisma.evaluation.count.mockResolvedValue(0);
      prisma.evaluationComment.count.mockResolvedValue(0);
      prisma.evaluationVersion.aggregate.mockResolvedValue({ _avg: { grade: 7.5 } });
      prisma.document.count.mockResolvedValue(0);
      prisma.agent.count.mockResolvedValue(0);
      
      // Transaction for recent counts
      prisma.$transaction.mockResolvedValue([5, 3]);
      
      const response = await getStats(mockRequest);
      if (response.status !== 200) {
        const errorData = await response.json();
        console.error('Response error:', errorData);
        console.error('Response status:', response.status);
      }
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Verify the response structure
      expect(data).toHaveProperty('jobs');
      expect(data).toHaveProperty('evaluations');
      expect(data).toHaveProperty('documents');
      expect(data).toHaveProperty('agents');
      
      // Check some specific values
      expect(data.jobs.total).toBe(13); // 10 + 2 + 1
      expect(data.evaluations.avgGrade).toBe(7.5);
    });
  });

  describe('/api/monitor/evaluations', () => {
    it('should return 401 when not authenticated', async () => {
      (authenticateRequest as jest.Mock).mockResolvedValue(undefined);
      
      const response = await getEvaluations(mockRequest);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('/api/monitor/jobs', () => {
    it('should return 401 when not authenticated', async () => {
      (authenticateRequest as jest.Mock).mockResolvedValue(undefined);
      
      const response = await getJobs(mockRequest);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });
});
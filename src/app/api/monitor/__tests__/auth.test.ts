import { NextRequest } from 'next/server';
import { GET as getStats } from '../stats/route';
import { GET as getEvaluations } from '../evaluations/route';
import { GET as getJobs } from '../jobs/route';

// Mock the auth helpers
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: { groupBy: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), count: jest.fn() },
    evaluation: { findMany: jest.fn(), count: jest.fn() },
    evaluationComment: { count: jest.fn() },
    evaluationVersion: { aggregate: jest.fn() },
    document: { count: jest.fn() },
    agent: { count: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { authenticateRequest } from '@/lib/auth-helpers';

describe('Monitor Routes Authentication', () => {
  const mockRequest = new NextRequest('http://localhost:3000/api/monitor/test');

  beforeEach(() => {
    jest.clearAllMocks();
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
      
      // Mock all the required database calls
      const { prisma } = require('@/lib/prisma');
      prisma.job.groupBy.mockResolvedValue([]);
      prisma.job.findMany.mockResolvedValue([]);
      prisma.job.aggregate.mockResolvedValue({ _avg: { durationInSeconds: null }, _sum: { costInCents: null } });
      prisma.evaluation.count.mockResolvedValue(0);
      prisma.evaluationComment.count.mockResolvedValue(0);
      prisma.evaluationVersion.aggregate.mockResolvedValue({ _avg: { grade: null } });
      prisma.$transaction.mockResolvedValue([0, 0]);
      
      const response = await getStats(mockRequest);
      expect(response.status).toBe(200);
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
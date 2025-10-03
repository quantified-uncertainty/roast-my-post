import { vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@roast/db';

// Mock dependencies
vi.mock('@roast/db', () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(),
    },
    job: {
      findMany: vi.fn(),
    },
  },
}));

describe('GET /api/agents/[agentId]/jobs', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 for non-existent agent', async () => {
    (prisma.agent.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/jobs`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should return all jobs for agent', async () => {
    (prisma.agent.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({ 
      id: mockAgentId 
    });
    
    const mockJobs = [
      {
        id: 'job-1',
        status: 'completed',
        createdAt: new Date('2024-01-01'),
        startedAt: new Date('2024-01-01T00:01:00Z'),
        completedAt: new Date('2024-01-01T00:05:00Z'),
        error: null,
        priceInDollars: 0.10,
        durationInSeconds: 240,
        attempts: 1,
        originalJobId: null,
        evaluation: {
          id: 'eval-1',
          document: { 
            id: 'doc-1',
            versions: [{ title: 'Document One' }]
          },
          agent: {
            id: 'agent-1',
            versions: [{ name: 'Agent One' }]
          }
        },
        evaluationVersion: {
          id: 'eval-version-1',
          grade: 85,
          summary: 'Good evaluation',
          comments: []
        },
        agentEvalBatch: null,
      },
      {
        id: 'job-2',
        status: 'pending',
        createdAt: new Date('2024-01-02'),
        startedAt: null,
        completedAt: null,
        error: null,
        priceInDollars: null,
        durationInSeconds: null,
        attempts: 0,
        originalJobId: null,
        evaluation: {
          id: 'eval-2',
          document: { 
            id: 'doc-2',
            versions: [{ title: 'Document Two' }]
          },
          agent: {
            id: 'agent-1',
            versions: [{ name: 'Agent One' }]
          }
        },
        evaluationVersion: null,
        agentEvalBatch: {
          id: 'batch-123',
          name: 'Test Batch'
        },
      },
    ];
    
    (prisma.job.findMany as vi.MockedFunction<any>).mockResolvedValueOnce(mockJobs);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/jobs`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      jobs: [
        {
          id: 'job-1',
          status: 'completed',
          createdAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:05:00.000Z',
          startedAt: '2024-01-01T00:01:00.000Z',
          error: null,
          priceInDollars: 0.10,
          durationInSeconds: 240,
          document: {
            id: 'doc-1',
            title: 'Document One',
          },
          agent: {
            id: 'agent-1',
            name: 'Agent One',
          },
          evaluation: {
            id: 'eval-1',
          },
          evaluationVersion: {
            id: 'eval-version-1',
            grade: 85,
            summary: 'Good evaluation',
            commentsCount: 0,
          },
          batch: null,
        },
        {
          id: 'job-2',
          status: 'pending',
          createdAt: '2024-01-02T00:00:00.000Z',
          completedAt: null,
          startedAt: null,
          error: null,
          priceInDollars: null,
          durationInSeconds: null,
          document: {
            id: 'doc-2',
            title: 'Document Two',
          },
          agent: {
            id: 'agent-1',
            name: 'Agent One',
          },
          evaluation: {
            id: 'eval-2',
          },
          evaluationVersion: null,
          batch: {
            id: 'batch-123',
            name: 'Test Batch',
          },
        },
      ]
    });
    
    expect(prisma.job.findMany).toHaveBeenCalledWith({
      where: {
        evaluation: {
          agentId: mockAgentId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: expect.any(Object),
    });
  });

  it('should filter by batchId when provided', async () => {
    (prisma.agent.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({ 
      id: mockAgentId 
    });
    
    const batchId = 'batch-456';
    (prisma.job.findMany as vi.MockedFunction<any>).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/jobs?batchId=${batchId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    
    expect(prisma.job.findMany).toHaveBeenCalledWith({
      where: {
        evaluation: {
          agentId: mockAgentId,
        },
        agentEvalBatchId: batchId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: expect.any(Object),
    });
  });

  it('should handle database errors', async () => {
    (prisma.agent.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({ 
      id: mockAgentId 
    });
    
    (prisma.job.findMany as vi.MockedFunction<any>).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/jobs`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch jobs');
  });
});
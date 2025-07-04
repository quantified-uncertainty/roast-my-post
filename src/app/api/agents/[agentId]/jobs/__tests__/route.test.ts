import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAndVerifyAgentAccess } from '@/lib/auth-agent-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-agent-helpers', () => ({
  authenticateAndVerifyAgentAccess: jest.fn(),
}));

describe('GET /api/agents/[agentId]/jobs', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication and agent ownership', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: null, 
      agent: null 
    });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/jobs`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(401);
  });

  it('should return all jobs for agent', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: mockUser, 
      agent: { id: mockAgentId } 
    });
    
    const mockJobs = [
      {
        id: 'job-1',
        type: 'evaluation',
        status: 'completed',
        batchId: null,
        createdAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-01T00:05:00Z'),
        evaluation: {
          id: 'eval-1',
          documentId: 'doc-1',
          document: { title: 'Document One' },
        },
      },
      {
        id: 'job-2',
        type: 'evaluation',
        status: 'pending',
        batchId: 'batch-123',
        createdAt: new Date('2024-01-02'),
        completedAt: null,
        evaluation: null,
      },
    ];
    
    (prisma.job.findMany as jest.Mock).mockResolvedValueOnce(mockJobs);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/jobs`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockJobs);
    
    expect(prisma.job.findMany).toHaveBeenCalledWith({
      where: {
        payload: {
          path: ['agentId'],
          equals: mockAgentId,
        },
      },
      include: {
        evaluation: {
          select: {
            id: true,
            documentId: true,
            document: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should filter by batchId when provided', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: mockUser, 
      agent: { id: mockAgentId } 
    });
    
    const batchId = 'batch-456';
    (prisma.job.findMany as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/jobs?batchId=${batchId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    
    expect(prisma.job.findMany).toHaveBeenCalledWith({
      where: {
        payload: {
          path: ['agentId'],
          equals: mockAgentId,
        },
        batchId: batchId,
      },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should handle database errors', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: mockUser, 
      agent: { id: mockAgentId } 
    });
    
    (prisma.job.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/jobs`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch jobs');
  });
});
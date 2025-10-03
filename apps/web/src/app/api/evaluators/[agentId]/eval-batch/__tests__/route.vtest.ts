import { vi } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@roast/db';
import { authenticateRequestSessionFirst } from '@/infrastructure/auth/auth-helpers';
import { getServices } from '@/application/services/ServiceFactory';

// Mock dependencies
vi.mock('@roast/db', () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
    },
    agentEvalBatch: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    job: {
      createMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequestSessionFirst: vi.fn(),
}));

// Mock the ServiceFactory to return mocked services
vi.mock('@/application/services/ServiceFactory', () => ({
  getServices: vi.fn(() => ({
    jobService: {
      createJob: vi.fn(),
    },
  })),
}));

// Mock crypto for UUID generation
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid'),
}));

describe('POST /api/agents/[agentId]/eval-batch', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication and agent ownership', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 5 }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    expect(response.status).toBe(401);
  });

  it('should validate request body', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    expect(response.status).toBe(400);
  });

  it('should enforce maximum target count of 100', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 150 }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    expect(response.status).toBe(400);
  });

  it('should create batch evaluation jobs', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    const mockAgent = {
      id: mockAgentId,
      submittedById: mockUser.id,
      submittedBy: mockUser,
    };
    
    const mockDocuments = [
      { 
        id: 'doc-1', 
        evaluations: [{ id: 'eval-1' }]
      },
      { 
        id: 'doc-2', 
        evaluations: [{ id: 'eval-2' }]
      },
      { 
        id: 'doc-3', 
        evaluations: [{ id: 'eval-3' }]
      },
    ];
    
    const mockBatch = {
      id: 'batch-123',
      name: null,
      agentId: mockAgentId,
      targetCount: 5,
    };
    
    const mockBatchWithCount = {
      ...mockBatch,
      createdAt: new Date(),
      _count: { jobs: 5 },
    };
    
    (prisma.agent.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(mockAgent);
    (prisma.document.findMany as vi.MockedFunction<any>).mockResolvedValueOnce(mockDocuments);
    (prisma.agentEvalBatch.create as vi.MockedFunction<any>).mockResolvedValueOnce(mockBatch);
    
    // Mock JobService.createJob calls (now uses service instead of direct Prisma)
    const mockJobService = (getServices as vi.MockedFunction<any>)().jobService;
    (mockJobService.createJob as vi.MockedFunction<any>)
      .mockResolvedValueOnce({ id: 'job-1', evaluationId: 'eval-1', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'job-2', evaluationId: 'eval-2', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'job-3', evaluationId: 'eval-3', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'job-4', evaluationId: 'eval-4', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'job-5', evaluationId: 'eval-5', status: 'PENDING' });
    
    (prisma.agentEvalBatch.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(mockBatchWithCount);
    (prisma.job.findMany as vi.MockedFunction<any>).mockResolvedValueOnce([
      { id: 'job-1', status: 'PENDING', evaluation: { document: { id: 'doc-1' } } },
      { id: 'job-2', status: 'PENDING', evaluation: { document: { id: 'doc-2' } } },
      { id: 'job-3', status: 'PENDING', evaluation: { document: { id: 'doc-3' } } },
      { id: 'job-4', status: 'PENDING', evaluation: { document: { id: 'doc-1' } } },
      { id: 'job-5', status: 'PENDING', evaluation: { document: { id: 'doc-2' } } },
    ]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 5 }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toMatchObject({
      batch: {
        id: 'batch-123',
        name: null,
        agentId: mockAgentId,
        targetCount: 5,
        jobCount: 5,
        documentIds: expect.arrayContaining(['doc-1', 'doc-2', 'doc-3']),
      },
      jobs: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          documentId: expect.any(String),
          status: 'PENDING',
        }),
      ]),
    });
    expect(data.jobs).toHaveLength(5);
    
    // Verify agent lookup
    expect(prisma.agent.findUnique).toHaveBeenCalledWith({
      where: { id: mockAgentId },
      include: {
        submittedBy: true,
      },
    });
    
    // Verify documents query finds documents with evaluations
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        evaluations: {
          some: {
            agentId: mockAgentId,
            versions: {
              some: {},
            },
          },
        },
      },
      select: {
        id: true,
        evaluations: {
          where: {
            agentId: mockAgentId,
          },
          select: {
            id: true,
          },
        },
      },
    });
  });

  it('should handle case when no documents need evaluation', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    const mockAgent = {
      id: mockAgentId,
      submittedById: mockUser.id,
      submittedBy: mockUser,
    };
    
    (prisma.agent.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(mockAgent);
    (prisma.document.findMany as vi.MockedFunction<any>).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 10 }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toEqual({
      error: 'No documents found with evaluations for this agent',
    });
    
    // Verify that no jobs were created when no documents found
    const mockJobService = (getServices as vi.MockedFunction<any>)().jobService;
    expect(mockJobService.createJob).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    (prisma.agent.findUnique as vi.MockedFunction<any>).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 5 }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Failed to create eval batch');
  });
});
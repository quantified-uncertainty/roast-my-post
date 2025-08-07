import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@roast/db';
import { authenticateRequest } from '@/infrastructure/auth/auth-helpers';

// Mock dependencies
jest.mock('@roast/db', () => ({
  prisma: {
    document: {
      findUnique: jest.fn(),
    },
    evaluation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    job: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/documents/[slugOrId]/evaluations', () => {
  const mockDocId = 'doc-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(401);
  });

  it('should return 404 if document not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    (prisma.document.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Document not found' });
  });

  it('should return evaluations for document', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    (prisma.document.findUnique as jest.Mock).mockResolvedValueOnce({ id: mockDocId });
    
    const mockEvaluations = [
      {
        id: 'eval-1',
        agentId: 'agent-1',
        createdAt: new Date('2024-01-01'),
        agent: {
          versions: [{
            name: 'Agent One',
            description: 'First agent description',
          }],
        },
        versions: [{
          id: 'eval-version-1',
          summary: 'First evaluation',
          analysis: 'Detailed analysis...',
          grade: 85,
          createdAt: new Date('2024-01-01'),
        }],
        jobs: [{
          status: 'COMPLETED',
          createdAt: new Date('2024-01-01'),
        }],
      },
      {
        id: 'eval-2',
        agentId: 'agent-2',
        createdAt: new Date('2024-01-02'),
        agent: {
          versions: [{
            name: 'Agent Two',
            description: 'Second agent description',
          }],
        },
        versions: [{
          id: 'eval-version-2',
          summary: 'Second evaluation',
          analysis: 'Different analysis...',
          grade: null,
          createdAt: new Date('2024-01-02'),
        }],
        jobs: [{
          status: 'PENDING',
          createdAt: new Date('2024-01-02'),
        }],
      },
    ];
    
    (prisma.evaluation.findMany as jest.Mock).mockResolvedValueOnce(mockEvaluations);
    (prisma.evaluation.count as jest.Mock).mockResolvedValueOnce(2);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      evaluations: [
        {
          id: 'eval-1',
          agentId: 'agent-1',
          agent: {
            name: 'Agent One',
            description: 'First agent description',
          },
          status: 'completed',
          createdAt: '2024-01-01T00:00:00.000Z',
          latestVersion: {
            summary: 'First evaluation',
            analysis: 'Detailed analysis...',
            grade: 85,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
        {
          id: 'eval-2',
          agentId: 'agent-2',
          agent: {
            name: 'Agent Two',
            description: 'Second agent description',
          },
          status: 'pending',
          createdAt: '2024-01-02T00:00:00.000Z',
          latestVersion: {
            summary: 'Second evaluation',
            analysis: 'Different analysis...',
            grade: null,
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        },
      ],
      total: 2,
    });
    
    expect(prisma.evaluation.findMany).toHaveBeenCalledWith({
      where: { documentId: mockDocId },
      include: {
        agent: {
          include: {
            versions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            summary: true,
            analysis: true,
            grade: true,
            createdAt: true,
          },
        },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });
});

describe('POST /api/documents/[slugOrId]/evaluations', () => {
  const mockDocId = 'doc-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-123' }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(401);
  });

  it('should validate request body', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(400);
  });

  it('should create evaluation job', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    (prisma.document.findUnique as jest.Mock).mockResolvedValueOnce({ 
      id: mockDocId,
    });
    
    const mockAgent = {
      id: 'agent-123',
    };
    
    const mockEvaluation = {
      id: 'eval-123',
    };
    
    const mockJob = {
      id: 'job-123',
      status: 'PENDING',
      createdAt: new Date(),
    };
    
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(mockAgent);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        evaluation: {
          findFirst: jest.fn().mockResolvedValueOnce(null),
          create: jest.fn().mockResolvedValueOnce(mockEvaluation),
        },
        job: {
          create: jest.fn().mockResolvedValueOnce(mockJob),
        },
      };
      return await callback(mockTx);
    });

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-123' }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({
      evaluationId: mockEvaluation.id,
      jobId: mockJob.id,
      status: 'pending',
      created: true,
    });
  });
});
import { vi } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@roast/db';
import { authenticateRequest } from '@/infrastructure/auth/auth-helpers';

// Mock dependencies
vi.mock('@roast/db', () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
    },
    evaluation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    job: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  Plan: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
  RateLimitError: class RateLimitError extends Error {},
}));

vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequest: vi.fn(),
}));

// Mock rate limiting handlers
vi.mock('@/infrastructure/http/rate-limit-handler', () => ({
  checkQuotaAvailable: vi.fn().mockResolvedValue(null), // null = quota available
  chargeQuota: vi.fn().mockResolvedValue(undefined),
}));

// Mock PrivacyService
vi.mock('@/infrastructure/auth/privacy-service', () => ({
  PrivacyService: {
    canViewDocument: vi.fn().mockResolvedValue(true),
  },
}));

// Mock the ServiceFactory with EvaluationService
const mockEvaluationService = {
  createEvaluation: vi.fn().mockResolvedValue({
    isError: () => false,
    unwrap: () => ({
      evaluationId: 'eval-123',
      agentId: 'agent-123',
      jobId: 'job-123',
      created: true
    }),
    error: () => null,
  }),
};

const mockGetServices = vi.fn(() => ({
  evaluationService: mockEvaluationService,
  createTransactionalServices: vi.fn(() => ({
    jobService: { createJob: vi.fn() }, // Keep for backwards compatibility if needed
  })),
}));

vi.mock('@/application/services/ServiceFactory', () => ({
  getServices: mockGetServices,
}));

describe('GET /api/documents/[slugOrId]/evaluations', () => {
  const mockDocId = 'doc-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(undefined);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(401);
  });

  it('should return 404 if document not found', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Document not found' });
  });

  it('should return evaluations for document', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({ 
      id: mockDocId,
      submittedById: mockUser.id, // User owns the document
    });
    
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
    
    (prisma.evaluation.findMany as vi.MockedFunction<any>).mockResolvedValueOnce(mockEvaluations);
    (prisma.evaluation.count as vi.MockedFunction<any>).mockResolvedValueOnce(2);

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
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(undefined);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-123' }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(401);
  });

  it('should validate request body', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(400);
  });

  it('should create evaluation job', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({
      id: mockDocId,
      submittedById: mockUser.id, // User owns the document
    });

    // Mock agent exists check for verifyAgents()
    const mockAgent = { id: 'agent-123' };
    (prisma.agent.findMany as vi.MockedFunction<any>).mockResolvedValueOnce([mockAgent]);

    // EvaluationService is already mocked at the top to return success
    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-123' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slugOrId: mockDocId }) });

    if (response.status !== 200) {
      const errorData = await response.json();
      console.error('Test error:', response.status, errorData);
    }

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      evaluationId: 'eval-123',
      jobId: 'job-123',
      status: 'pending',
      created: true,
    });
  });
});

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findFirst: jest.fn(),
    },
    evaluation: {
      findMany: jest.fn(),
    },
    job: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
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
        summary: 'First evaluation',
        analysis: 'Detailed analysis...',
        overallGrade: 85,
        createdAt: new Date('2024-01-01').toISOString(),
        agent: {
          name: 'Agent One',
          purpose: 'ASSESSOR',
        },
      },
      {
        id: 'eval-2',
        agentId: 'agent-2',
        summary: 'Second evaluation',
        analysis: 'Different analysis...',
        overallGrade: null,
        createdAt: new Date('2024-01-02').toISOString(),
        agent: {
          name: 'Agent Two',
          purpose: 'ADVISOR',
        },
      },
    ];
    
    (prisma.evaluation.findMany as jest.Mock).mockResolvedValueOnce(mockEvaluations);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockEvaluations);
    
    expect(prisma.evaluation.findMany).toHaveBeenCalledWith({
      where: { documentId: mockDocId },
      include: {
        agent: {
          select: {
            name: true,
            purpose: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
      currentVersionId: 'version-123',
    });
    
    const mockJob = {
      id: 'job-123',
      status: 'pending',
      createdAt: new Date(),
    };
    
    (prisma.job.create as jest.Mock).mockResolvedValueOnce(mockJob);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-123' }),
    });
    
    const response = await POST(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({
      jobId: mockJob.id,
      status: mockJob.status,
    });
    
    expect(prisma.job.create).toHaveBeenCalledWith({
      data: {
        type: 'evaluation',
        status: 'pending',
        payload: {
          documentId: mockDocId,
          documentVersionId: 'version-123',
          agentId: 'agent-123',
        },
        ownerId: mockUser.id,
      },
    });
  });
});
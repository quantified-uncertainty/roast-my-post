import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    evaluation: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/agents/[agentId]/evaluations', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return evaluations by agent', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockEvaluations = [
      {
        id: 'eval-1',
        agentId: mockAgentId,
        documentId: 'doc-1',
        summary: 'First evaluation summary',
        analysis: 'Detailed analysis...',
        overallGrade: 85,
        gradeComponents: { clarity: 90, accuracy: 80 },
        createdAt: new Date('2024-01-01'),
        document: {
          title: 'Document One',
          slug: 'document-one',
        },
        _count: {
          comments: 5,
        },
      },
      {
        id: 'eval-2',
        agentId: mockAgentId,
        documentId: 'doc-2',
        summary: 'Second evaluation summary',
        analysis: 'Another analysis...',
        overallGrade: null,
        gradeComponents: null,
        createdAt: new Date('2024-01-02'),
        document: {
          title: 'Document Two',
          slug: 'document-two',
        },
        _count: {
          comments: 3,
        },
      },
    ];
    
    (prisma.evaluation.findMany as jest.Mock).mockResolvedValueOnce(mockEvaluations);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockEvaluations);
    
    expect(prisma.evaluation.findMany).toHaveBeenCalledWith({
      where: {
        agentId: mockAgentId,
      },
      include: {
        document: {
          select: {
            title: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('should return empty array when agent has no evaluations', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.evaluation.findMany as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.evaluation.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch evaluations');
  });
});
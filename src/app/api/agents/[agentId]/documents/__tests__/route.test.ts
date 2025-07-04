import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/agents/[agentId]/documents', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return documents evaluated by agent', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockDocuments = [
      {
        id: 'doc-1',
        title: 'Document One',
        slug: 'document-one',
        createdAt: new Date('2024-01-01'),
        owner: {
          name: 'User One',
          email: 'user1@example.com',
        },
        evaluations: [
          {
            id: 'eval-1',
            agentId: mockAgentId,
            createdAt: new Date('2024-01-02'),
            overallGrade: 85,
          },
        ],
        _count: {
          evaluations: 3,
        },
      },
      {
        id: 'doc-2',
        title: 'Document Two',
        slug: 'document-two',
        createdAt: new Date('2024-01-03'),
        owner: {
          name: 'User Two',
          email: 'user2@example.com',
        },
        evaluations: [
          {
            id: 'eval-2',
            agentId: mockAgentId,
            createdAt: new Date('2024-01-04'),
            overallGrade: null,
          },
        ],
        _count: {
          evaluations: 1,
        },
      },
    ];
    
    (prisma.document.findMany as jest.Mock).mockResolvedValueOnce(mockDocuments);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockDocuments);
    
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        evaluations: {
          some: {
            agentId: mockAgentId,
          },
        },
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        evaluations: {
          where: {
            agentId: mockAgentId,
          },
          select: {
            id: true,
            createdAt: true,
            overallGrade: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            evaluations: true,
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
    (prisma.document.findMany as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.document.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch documents');
  });
});
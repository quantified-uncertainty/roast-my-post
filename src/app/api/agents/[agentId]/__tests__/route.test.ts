import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/agents/[agentId]', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return agent details when agent exists', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockAgent = {
      id: mockAgentId,
      name: 'Test Agent',
      purpose: 'ASSESSOR',
      description: 'A test agent',
      providesGrades: true,
      ownerId: 'some-user',
      isArchived: false,
      owner: { 
        id: 'some-user',
        name: 'Agent Owner',
        email: 'owner@example.com',
      },
      currentVersion: {
        versionNumber: 3,
        primaryInstructions: 'Detailed instructions...',
        selfCritiqueInstructions: 'Critique instructions...',
        readme: '# Agent README',
        createdAt: new Date('2024-01-01'),
      },
      _count: {
        evaluations: 42,
      },
    };
    
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(mockAgent);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockAgent);
    
    expect(prisma.agent.findUnique).toHaveBeenCalledWith({
      where: { id: mockAgentId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        currentVersion: {
          select: {
            versionNumber: true,
            primaryInstructions: true,
            selfCritiqueInstructions: true,
            readme: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            evaluations: true,
          },
        },
      },
    });
  });

  it('should return 404 when agent not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should handle archived agents', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const archivedAgent = {
      id: mockAgentId,
      name: 'Archived Agent',
      isArchived: true,
      // ... other fields
    };
    
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(archivedAgent);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    // Should still return archived agents
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.isArchived).toBe(true);
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.agent.findUnique as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch agent');
  });
});
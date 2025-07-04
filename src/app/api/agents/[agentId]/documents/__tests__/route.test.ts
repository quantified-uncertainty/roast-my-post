import { GET } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-helpers';
import { AgentModel } from '@/models/Agent';

// Mock dependencies
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/models/Agent', () => ({
  AgentModel: {
    getAgentWithOwner: jest.fn(),
    getAgentDocuments: jest.fn(),
  },
}));

describe('GET /api/agents/[agentId]/documents', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return documents evaluated by agent', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const mockAgent = { id: mockAgentId, name: 'Test Agent' };
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(mockAgent);
    
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
    
    (AgentModel.getAgentDocuments as jest.Mock).mockResolvedValueOnce(mockDocuments);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ documents: mockDocuments });
    
    expect(AgentModel.getAgentWithOwner).toHaveBeenCalledWith(mockAgentId, mockUser.id);
    expect(AgentModel.getAgentDocuments).toHaveBeenCalledWith(mockAgentId, 40);
  });

  it('should return empty array when agent has no evaluations', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const mockAgent = { id: mockAgentId, name: 'Test Agent' };
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(mockAgent);
    (AgentModel.getAgentDocuments as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ documents: [] });
  });

  it('should return 404 when agent not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    (AgentModel.getAgentWithOwner as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
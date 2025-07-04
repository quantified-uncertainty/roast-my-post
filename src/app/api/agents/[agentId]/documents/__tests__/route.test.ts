import { GET } from '../route';
import { NextRequest } from 'next/server';
import { AgentModel } from '@/models/Agent';

// Mock dependencies
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

  it('should return 404 for non-existent agent', async () => {
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should return documents evaluated by agent', async () => {
    
    const mockAgent = { id: mockAgentId, name: 'Test Agent' };
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(mockAgent);
    
    const mockDocuments = [
      {
        id: 'doc-1',
        title: 'Document One',
        slug: 'document-one',
        createdAt: new Date('2024-01-01').toISOString(),
        owner: {
          name: 'User One',
          email: 'user1@example.com',
        },
        evaluations: [
          {
            id: 'eval-1',
            agentId: mockAgentId,
            createdAt: new Date('2024-01-02').toISOString(),
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
        createdAt: new Date('2024-01-03').toISOString(),
        owner: {
          name: 'User Two',
          email: 'user2@example.com',
        },
        evaluations: [
          {
            id: 'eval-2',
            agentId: mockAgentId,
            createdAt: new Date('2024-01-04').toISOString(),
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
    
    expect(AgentModel.getAgentWithOwner).toHaveBeenCalledWith(mockAgentId);
    expect(AgentModel.getAgentDocuments).toHaveBeenCalledWith(mockAgentId, 40);
  });

  it('should return empty array when agent has no evaluations', async () => {
    
    const mockAgent = { id: mockAgentId, name: 'Test Agent' };
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(mockAgent);
    (AgentModel.getAgentDocuments as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ documents: [] });
  });


  it('should handle database errors', async () => {
    (AgentModel.getAgentWithOwner as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
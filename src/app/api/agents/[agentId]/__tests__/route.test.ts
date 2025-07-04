import { GET } from '../route';
import { NextRequest } from 'next/server';
import { AgentModel } from '@/models/Agent';
import { authenticateRequest } from '@/lib/auth-helpers';

// Mock dependencies
jest.mock('@/models/Agent', () => ({
  AgentModel: {
    getAgentWithOwner: jest.fn(),
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/agents/[agentId]', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should return agent details when agent exists', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const mockAgent = {
      id: mockAgentId,
      name: 'Test Agent',
      purpose: 'ASSESSOR',
      version: '3',
      description: 'A test agent',
      primaryInstructions: 'Detailed instructions...',
      selfCritiqueInstructions: 'Critique instructions...',
      providesGrades: true,
      extendedCapabilityId: undefined,
      readme: '# Agent README',
      owner: { 
        id: 'some-user',
        name: 'Agent Owner',
        email: 'owner@example.com',
      },
      isOwner: false,
    };
    
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(mockAgent);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockAgent);
    
    expect(AgentModel.getAgentWithOwner).toHaveBeenCalledWith(
      mockAgentId,
      mockUser.id
    );
  });

  it('should return 404 when agent not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should handle archived agents', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const archivedAgent = {
      id: mockAgentId,
      name: 'Archived Agent',
      purpose: 'ASSESSOR',
      version: '1',
      description: 'An archived agent',
      primaryInstructions: 'Instructions...',
      selfCritiqueInstructions: undefined,
      providesGrades: false,
      extendedCapabilityId: undefined,
      readme: undefined,
      owner: {
        id: 'some-user',
        name: 'Agent Owner',
        email: 'owner@example.com',
      },
      isOwner: false,
    };
    
    (AgentModel.getAgentWithOwner as jest.Mock).mockResolvedValueOnce(archivedAgent);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    // Should still return archived agents
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('Archived Agent');
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    (AgentModel.getAgentWithOwner as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch agent data');
  });
});
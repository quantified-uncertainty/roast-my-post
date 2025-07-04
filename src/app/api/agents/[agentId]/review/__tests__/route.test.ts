import { GET } from '../route';
import { NextRequest } from 'next/server';
import { AgentModel } from '@/models/Agent';

// Mock dependencies
jest.mock('@/models/Agent', () => ({
  AgentModel: {
    getAgentReview: jest.fn(),
  },
}));

describe('GET /api/agents/[agentId]/review', () => {
  const mockAgentId = 'agent-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return agent review successfully', async () => {
    const mockReview = {
      agentId: mockAgentId,
      reviewData: 'Test review data',
      createdAt: new Date('2024-01-01'),
    };
    
    (AgentModel.getAgentReview as jest.Mock).mockResolvedValueOnce(mockReview);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ review: mockReview });
    
    expect(AgentModel.getAgentReview).toHaveBeenCalledWith(mockAgentId);
  });

  it('should handle errors gracefully', async () => {
    (AgentModel.getAgentReview as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch agent review');
  });
});
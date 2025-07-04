import { GET } from '../route';
import { NextRequest } from 'next/server';
import { AgentModel } from '@/models/Agent';

// Mock dependencies
jest.mock('@/models/Agent', () => ({
  AgentModel: {
    getAgentEvaluations: jest.fn(),
  },
}));

describe('GET /api/agents/[agentId]/evaluations', () => {
  const mockAgentId = 'agent-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not require authentication', async () => {
    const mockEvaluations = [
      {
        id: 'eval-1',
        documentId: 'doc-1',
        documentTitle: 'Document One',
        createdAt: new Date('2024-01-01').toISOString(),
        status: 'completed',
        overallGrade: 85,
      },
    ];
    
    (AgentModel.getAgentEvaluations as jest.Mock).mockResolvedValueOnce(mockEvaluations);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ evaluations: mockEvaluations });
  });

  it('should return evaluations by agent', async () => {
    const mockEvaluations = [
      {
        id: 'eval-1',
        documentId: 'doc-1',
        documentTitle: 'Document One',
        createdAt: new Date('2024-01-01').toISOString(),
        status: 'completed',
        overallGrade: 85,
        summary: 'First evaluation summary',
      },
      {
        id: 'eval-2',
        documentId: 'doc-2',
        documentTitle: 'Document Two',
        createdAt: new Date('2024-01-02').toISOString(),
        status: 'pending',
        overallGrade: null,
        summary: null,
      },
    ];
    
    (AgentModel.getAgentEvaluations as jest.Mock).mockResolvedValueOnce(mockEvaluations);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ evaluations: mockEvaluations });
    
    expect(AgentModel.getAgentEvaluations).toHaveBeenCalledWith(mockAgentId);
  });

  it('should filter evaluations by batchId', async () => {
    const mockBatchId = 'batch-123';
    const mockEvaluations = [
      {
        id: 'eval-1',
        documentId: 'doc-1',
        documentTitle: 'Document One',
        batchId: mockBatchId,
        createdAt: new Date('2024-01-01').toISOString(),
        status: 'completed',
      },
    ];
    
    (AgentModel.getAgentEvaluations as jest.Mock).mockResolvedValueOnce(mockEvaluations);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations?batchId=${mockBatchId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ evaluations: mockEvaluations });
    
    expect(AgentModel.getAgentEvaluations).toHaveBeenCalledWith(mockAgentId, { batchId: mockBatchId });
  });

  it('should return empty array when agent has no evaluations', async () => {
    (AgentModel.getAgentEvaluations as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ evaluations: [] });
  });

  it('should handle database errors', async () => {
    (AgentModel.getAgentEvaluations as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch evaluations');
  });
});
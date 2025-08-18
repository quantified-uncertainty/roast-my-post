import { vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the Result class to match expected interface
vi.mock('@roast/domain', () => {
  const originalResult = {
    ok: (value: any) => ({
      isError: () => false,
      unwrap: () => value,
      error: () => null
    }),
    fail: (error: any) => ({
      isError: () => true,
      unwrap: () => { throw new Error('Cannot unwrap a failed result'); },
      error: () => error
    })
  };
  
  return {
    Result: originalResult,
    ValidationError: class ValidationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
      }
    },
    AppError: class AppError extends Error {
      constructor(message: string, code: string) {
        super(message);
        this.name = 'AppError';
      }
    },
    isDevelopment: () => false,
    isTest: () => true
  };
});

// Create mock services object
const mockAgentService = {
  getAgentWithOwner: vi.fn(),
  getAgentDocuments: vi.fn(),
};

const mockServices = {
  agentService: mockAgentService,
};

vi.mock('@/application/services/ServiceFactory', () => ({
  getServices: vi.fn(() => mockServices),
}));

describe('GET /api/agents/[agentId]/documents', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 for non-existent agent', async () => {
    const { Result } = require('@roast/domain');
    
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.ok(null));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should return documents evaluated by agent', async () => {
    const { Result } = require('@roast/domain');
    
    const mockAgent = { id: mockAgentId, name: 'Test Agent' };
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.ok(mockAgent));
    
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
    
    mockAgentService.getAgentDocuments.mockResolvedValueOnce(Result.ok(mockDocuments));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ documents: mockDocuments });
    
    expect(mockAgentService.getAgentWithOwner).toHaveBeenCalledWith(mockAgentId);
    expect(mockAgentService.getAgentDocuments).toHaveBeenCalledWith(mockAgentId, 40);
  });

  it('should return empty array when agent has no evaluations', async () => {
    const { Result } = require('@roast/domain');
    
    const mockAgent = { id: mockAgentId, name: 'Test Agent' };
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.ok(mockAgent));
    mockAgentService.getAgentDocuments.mockResolvedValueOnce(Result.ok([]));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ documents: [] });
  });


  it('should handle database errors', async () => {
    const { Result, AppError } = require('@roast/domain');
    
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.fail(new AppError('Database error', 'DB_ERROR')));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/documents`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });
});
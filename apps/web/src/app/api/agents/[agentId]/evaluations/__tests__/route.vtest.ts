import { vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock auth-helpers to avoid import issues
vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequest: vi.fn().mockResolvedValue(undefined),
}));

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
  getAgentEvaluations: vi.fn(),
};

const mockServices = {
  agentService: mockAgentService,
};

vi.mock('@/application/services/ServiceFactory', () => ({
  getServices: vi.fn(() => mockServices),
}));

describe('GET /api/agents/[agentId]/evaluations', () => {
  const mockAgentId = 'agent-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not require authentication', async () => {
    const { Result } = require('@roast/domain');
    
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
    
    mockAgentService.getAgentEvaluations.mockResolvedValueOnce(Result.ok(mockEvaluations));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ evaluations: mockEvaluations });
  });

  it('should return evaluations by agent', async () => {
    const { Result } = require('@roast/domain');
    
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
    
    mockAgentService.getAgentEvaluations.mockResolvedValueOnce(Result.ok(mockEvaluations));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ evaluations: mockEvaluations });
    
    expect(mockAgentService.getAgentEvaluations).toHaveBeenCalledWith(mockAgentId, { requestingUserId: undefined });
  });

  it('should filter evaluations by batchId', async () => {
    const { Result } = require('@roast/domain');
    
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
    
    mockAgentService.getAgentEvaluations.mockResolvedValueOnce(Result.ok(mockEvaluations));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations?batchId=${mockBatchId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ evaluations: mockEvaluations });
    
    expect(mockAgentService.getAgentEvaluations).toHaveBeenCalledWith(mockAgentId, { batchId: mockBatchId, requestingUserId: undefined });
  });

  it('should return empty array when agent has no evaluations', async () => {
    const { Result } = require('@roast/domain');
    
    mockAgentService.getAgentEvaluations.mockResolvedValueOnce(Result.ok([]));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ evaluations: [] });
  });

  it('should handle database errors', async () => {
    const { Result, AppError } = require('@roast/domain');
    
    mockAgentService.getAgentEvaluations.mockResolvedValueOnce(Result.fail(new AppError('Database error', 'DB_ERROR')));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/evaluations`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch evaluations');
  });
});
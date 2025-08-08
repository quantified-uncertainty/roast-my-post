import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the Result class to match expected interface
jest.mock('@roast/domain', () => {
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
  getAgentReview: jest.fn(),
};

const mockServices = {
  agentService: mockAgentService,
};

jest.mock('@/application/services/ServiceFactory', () => ({
  getServices: jest.fn(() => mockServices),
}));

describe('GET /api/agents/[agentId]/review', () => {
  const mockAgentId = 'agent-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return agent review successfully', async () => {
    const { Result } = require('@roast/domain');
    
    const mockReview = {
      agentId: mockAgentId,
      reviewData: 'Test review data',
      createdAt: new Date('2024-01-01').toISOString(),
    };
    
    mockAgentService.getAgentReview.mockResolvedValueOnce(Result.ok(mockReview));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ review: mockReview });
    
    expect(mockAgentService.getAgentReview).toHaveBeenCalledWith(mockAgentId);
  });

  it('should handle errors gracefully', async () => {
    const { Result, AppError } = require('@roast/domain');
    
    mockAgentService.getAgentReview.mockResolvedValueOnce(Result.fail(new AppError('Database error', 'DB_ERROR')));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch agent review');
  });
});
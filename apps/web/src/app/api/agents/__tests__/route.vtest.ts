import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequestSessionFirst } from '@/infrastructure/auth/auth-helpers';

// Mock dependencies
vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequestSessionFirst: vi.fn(),
}));

vi.mock('@roast/ai', async () => {
  const actual = await vi.importActual('@roast/ai');
  return {
    ...actual,
    AgentInputSchema: {
      parse: vi.fn((data) => data),
    },
  };
});

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
    NotFoundError: class NotFoundError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
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
  getAllAgents: vi.fn(),
  updateAgent: vi.fn(),
};

const mockServices = {
  agentService: mockAgentService,
};

vi.mock('@/application/services/ServiceFactory', () => ({
  getServices: vi.fn(() => mockServices),
  ServiceFactory: {
    getInstance: vi.fn(() => ({
      getAgentService: vi.fn(() => mockAgentService),
    }))
  }
}));

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all agents without authentication', async () => {
    // GET doesn't require authentication, it's public
    const { Result } = await import('@roast/domain');

    const mockAgents = [
      {
        id: 'agent-1',
        name: 'Agent One',
        version: '1',
        description: 'First agent',
      },
      {
        id: 'agent-2',
        name: 'Agent Two',
        version: '2',
        description: 'Second agent',
      },
    ];
    
    mockAgentService.getAllAgents.mockResolvedValueOnce(
      Result.ok(mockAgents)
    );

    const response = await GET();
    
    // Debug: log actual response if it fails
    if (response.status !== 200) {
      const errorData = await response.json();
      console.log('GET response error:', response.status, errorData);
    }
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      agents: mockAgents
    });
    
    expect(mockAgentService.getAllAgents).toHaveBeenCalled();
  });
});

describe('PUT /api/agents', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    vi.mocked(authenticateRequestSessionFirst).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Agent' }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it('should update agent when authenticated and valid', async () => {
    vi.mocked(authenticateRequestSessionFirst).mockResolvedValueOnce(mockUser.id);
    const { Result } = await import('@roast/domain');

    const agentData = {
      id: 'agent-1',
      name: 'Updated Agent',
      version: '2',
      description: 'Updated description',
    };

    mockAgentService.updateAgent.mockResolvedValueOnce(
      Result.ok(agentData)
    );

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });

    const response = await PUT(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ agent: agentData });
    
    expect(mockAgentService.updateAgent).toHaveBeenCalledWith(
      agentData,
      mockUser.id
    );
  });
});
import { vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/infrastructure/auth/auth-helpers';

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
};

const mockServices = {
  agentService: mockAgentService,
};

vi.mock('@/application/services/ServiceFactory', () => ({
  getServices: vi.fn(() => mockServices),
}));

vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequest: vi.fn(),
}));

describe('GET /api/agents/[agentId]', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    const { Result } = require('@roast/domain');
    
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(undefined);
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.ok(null));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should return agent details when agent exists', async () => {
    const { Result } = require('@roast/domain');
    
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    const mockAgent = {
      id: mockAgentId,
      name: 'Test Agent',
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
    
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.ok(mockAgent));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockAgent);
    
    expect(mockAgentService.getAgentWithOwner).toHaveBeenCalledWith(
      mockAgentId,
      mockUser.id
    );
  });

  it('should return 404 when agent not found', async () => {
    const { Result } = require('@roast/domain');
    
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.ok(null));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should handle archived agents', async () => {
    const { Result } = require('@roast/domain');
    
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    const archivedAgent = {
      id: mockAgentId,
      name: 'Archived Agent',
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
    
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.ok(archivedAgent));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    // Should still return archived agents
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('Archived Agent');
  });

  it('should handle database errors', async () => {
    const { Result, AppError } = require('@roast/domain');
    
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    mockAgentService.getAgentWithOwner.mockResolvedValueOnce(Result.fail(new AppError('Database error', 'DB_ERROR')));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}`);
    const response = await GET(request, { params: Promise.resolve({ agentId: mockAgentId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch agent data');
  });
});
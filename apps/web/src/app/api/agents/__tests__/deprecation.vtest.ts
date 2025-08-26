import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequestSessionFirst } from '@/infrastructure/auth/auth-helpers';
import { AgentInputSchema } from '@roast/ai';
import { Result } from '@roast/domain';

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

// Mock Result
vi.mock('@roast/domain', () => ({
  Result: {
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
  },
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
}));

// Mock services
const mockAgentService = {
  getAllAgents: vi.fn(),
  updateAgent: vi.fn(),
};

const mockServices = {
  agentService: mockAgentService,
};

vi.mock('@/application/services/ServiceFactory', () => ({
  getServices: vi.fn(() => mockServices),
}));

describe('Agent Deprecation Feature', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update agent with isDeprecated flag', async () => {
    vi.mocked(authenticateRequestSessionFirst).mockResolvedValueOnce(mockUser.id);
    
    const agentData = {
      agentId: 'agent-123',
      name: 'Test Agent',
      description: 'Test Description',
      primaryInstructions: 'Instructions',
      isDeprecated: true,
    };
    
    vi.mocked(AgentInputSchema.parse).mockReturnValueOnce(agentData);
    
    const updatedAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      version: 2,
      isDeprecated: true,
    };
    
    mockAgentService.updateAgent.mockResolvedValueOnce(
      Result.ok(updatedAgent)
    );

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.agent.isDeprecated).toBe(true);
    
    // Verify the service was called with isDeprecated
    expect(mockAgentService.updateAgent).toHaveBeenCalledWith(
      'agent-123',
      expect.objectContaining({
        isDeprecated: true,
      }),
      mockUser.id
    );
  });

  it('should handle un-deprecation (setting isDeprecated to false)', async () => {
    vi.mocked(authenticateRequestSessionFirst).mockResolvedValueOnce(mockUser.id);
    
    const agentData = {
      agentId: 'agent-123',
      name: 'Test Agent',
      description: 'Test Description',
      primaryInstructions: 'Instructions',
      isDeprecated: false,
    };
    
    vi.mocked(AgentInputSchema.parse).mockReturnValueOnce(agentData);
    
    const updatedAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      version: 3,
      isDeprecated: false,
    };
    
    mockAgentService.updateAgent.mockResolvedValueOnce(
      Result.ok(updatedAgent)
    );

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.agent.isDeprecated).toBe(false);
  });

  it('should not update isRecommended flag (admin-only)', async () => {
    vi.mocked(authenticateRequestSessionFirst).mockResolvedValueOnce(mockUser.id);
    
    const agentData = {
      agentId: 'agent-123',
      name: 'Test Agent',
      description: 'Test Description',
      primaryInstructions: 'Instructions',
      isRecommended: true, // User tries to set this
    };
    
    // The schema should not include isRecommended for regular users
    // so it gets stripped out
    const parsedData = {
      ...agentData,
      isRecommended: undefined, // Removed by schema
    };
    
    vi.mocked(AgentInputSchema.parse).mockReturnValueOnce(parsedData);
    
    const updatedAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      version: 2,
      isRecommended: false, // Remains unchanged
    };
    
    mockAgentService.updateAgent.mockResolvedValueOnce(
      Result.ok(updatedAgent)
    );

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(200);
    
    // Verify isRecommended was not passed to the service
    expect(mockAgentService.updateAgent).toHaveBeenCalledWith(
      'agent-123',
      expect.not.objectContaining({
        isRecommended: true,
      }),
      mockUser.id
    );
  });
});
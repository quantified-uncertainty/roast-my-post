import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequestSessionFirst } from '@/infrastructure/auth/auth-helpers';

// Mock dependencies
jest.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequestSessionFirst: jest.fn(),
}));

jest.mock('@roast/ai', () => {
  const actual = jest.requireActual('@roast/ai');
  return {
    ...actual,
    AgentInputSchema: {
      parse: jest.fn((data) => data),
    },
  };
});

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
  getAllAgents: jest.fn(),
  updateAgent: jest.fn(),
};

const mockServices = {
  agentService: mockAgentService,
};

jest.mock('@/application/services/ServiceFactory', () => ({
  getServices: jest.fn(() => mockServices),
  ServiceFactory: {
    getInstance: jest.fn(() => ({
      getAgentService: jest.fn(() => mockAgentService),
    }))
  }
}));

describe('GET /api/agents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all agents without authentication', async () => {
    // GET doesn't require authentication, it's public
    const { Result } = require('@roast/domain');

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
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Agent' }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it('should validate request body', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { AgentInputSchema } = require('@roast/ai');
    const { ZodError } = require('zod');
    
    AgentInputSchema.parse.mockImplementationOnce(() => {
      throw new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['name'],
          message: 'Required',
        },
      ]);
    });

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(400);
  });

  it('should require agentId for updates', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { AgentInputSchema } = require('@roast/ai');
    AgentInputSchema.parse.mockReturnValueOnce({
      name: 'New Agent',
      description: 'A new agent',
      primaryInstructions: 'Instructions...',
      // No agentId provided
    });

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Agent',
        description: 'A new agent',
        primaryInstructions: 'Instructions...',
      }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('agentId is required for updates');
  });

  it('should update existing agent and create new version', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { AgentInputSchema } = require('@roast/ai');
    const { Result } = require('@roast/domain');
    
    AgentInputSchema.parse.mockReturnValueOnce({
      agentId: 'agent-123',
      name: 'Updated Name',
      primaryInstructions: 'New instructions...',
    });
    
    const updatedAgent = {
      id: 'agent-123',
      name: 'Updated Name',
      version: 4,
    };
    
    mockAgentService.updateAgent.mockResolvedValueOnce(
      Result.ok(updatedAgent)
    );

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-123',
        name: 'Updated Name',
        primaryInstructions: 'New instructions...',
      }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      agent: updatedAgent,
      message: 'Successfully created version 4 of agent agent-123',
    });
    
    expect(mockAgentService.updateAgent).toHaveBeenCalledWith(
      'agent-123',
      {
        agentId: 'agent-123',
        name: 'Updated Name',
        primaryInstructions: 'New instructions...',
      },
      mockUser.id
    );
  });

  it('should handle permission errors from AgentService', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { AgentInputSchema } = require('@roast/ai');
    const { Result, ValidationError } = require('@roast/domain');
    
    AgentInputSchema.parse.mockReturnValueOnce({
      agentId: 'agent-123',
      name: 'Updated Name',
    });
    
    mockAgentService.updateAgent.mockResolvedValueOnce(
      Result.fail(new ValidationError('You do not have permission to update this agent'))
    );

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-123',
        name: 'Updated Name',
      }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(403);
    
    const data = await response.json();
    expect(data.error).toBe('You do not have permission to access this resource');
  });
});
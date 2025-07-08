import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest, authenticateRequestSessionFirst } from '@/lib/auth-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agent: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
  authenticateRequestSessionFirst: jest.fn(),
}));

jest.mock('@/models/Agent', () => ({
  AgentModel: {
    updateAgent: jest.fn(),
  },
  agentSchema: {
    parse: jest.fn((data) => data),
  },
}));

describe('GET /api/agents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all agents without authentication', async () => {
    // GET doesn't require authentication, it's public

    const mockDbAgents = [
      {
        id: 'agent-1',
        versions: [{
          name: 'Agent One',
          description: 'First agent',
          version: 1,
        }],
      },
      {
        id: 'agent-2',
        versions: [{
          name: 'Agent Two',
          description: 'Second agent',
          version: 2,
        }],
      },
    ];
    
    (prisma.agent.findMany as jest.Mock).mockResolvedValueOnce(mockDbAgents);

    const response = await GET();
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      agents: [
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
      ]
    });
    
    expect(prisma.agent.findMany).toHaveBeenCalledWith({
      include: {
        versions: {
          orderBy: {
            version: 'desc',
          },
          take: 1,
        },
      },
    });
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
    const { agentSchema } = require('@/models/Agent');
    const { ZodError } = require('zod');
    
    agentSchema.parse.mockImplementationOnce(() => {
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
    const { agentSchema } = require('@/models/Agent');
    agentSchema.parse.mockReturnValueOnce({
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
    const { agentSchema, AgentModel } = require('@/models/Agent');
    
    agentSchema.parse.mockReturnValueOnce({
      agentId: 'agent-123',
      name: 'Updated Name',
      primaryInstructions: 'New instructions...',
    });
    
    const updatedAgent = {
      id: 'agent-123',
      name: 'Updated Name',
      version: 4,
    };
    
    AgentModel.updateAgent.mockResolvedValueOnce(updatedAgent);

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
    
    expect(AgentModel.updateAgent).toHaveBeenCalledWith(
      'agent-123',
      {
        agentId: 'agent-123',
        name: 'Updated Name',
        primaryInstructions: 'New instructions...',
      },
      mockUser.id
    );
  });

  it('should handle permission errors from AgentModel', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { agentSchema, AgentModel } = require('@/models/Agent');
    
    agentSchema.parse.mockReturnValueOnce({
      agentId: 'agent-123',
      name: 'Updated Name',
    });
    
    AgentModel.updateAgent.mockRejectedValueOnce(
      new Error('You do not have permission to update this agent')
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
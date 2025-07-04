import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    agentVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/agents', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest('http://localhost:3000/api/agents');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return all non-archived agents', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockAgents = [
      {
        id: 'agent-1',
        name: 'Agent One',
        purpose: 'ASSESSOR',
        description: 'First agent',
        providesGrades: true,
        ownerId: mockUser.id,
        owner: { name: 'Test User' },
        currentVersion: {
          versionNumber: 1,
          primaryInstructions: 'Instructions...',
          selfCritiqueInstructions: null,
          readme: null,
        },
      },
      {
        id: 'agent-2',
        name: 'Agent Two',
        purpose: 'ADVISOR',
        description: 'Second agent',
        providesGrades: false,
        ownerId: 'other-user',
        owner: { name: 'Other User' },
        currentVersion: {
          versionNumber: 2,
          primaryInstructions: 'Different instructions...',
          selfCritiqueInstructions: 'Critique...',
          readme: 'README content',
        },
      },
    ];
    
    (prisma.agent.findMany as jest.Mock).mockResolvedValueOnce(mockAgents);

    const request = new NextRequest('http://localhost:3000/api/agents');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockAgents);
    
    expect(prisma.agent.findMany).toHaveBeenCalledWith({
      where: { isArchived: false },
      include: {
        owner: {
          select: { name: true },
        },
        currentVersion: {
          select: {
            versionNumber: true,
            primaryInstructions: true,
            selfCritiqueInstructions: true,
            readme: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('PUT /api/agents', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Agent' }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it('should validate request body', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(400);
  });

  it('should create a new agent when no ID provided', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const newAgent = {
      id: 'new-agent-id',
      name: 'New Agent',
      purpose: 'ASSESSOR',
      description: 'A new agent',
      providesGrades: true,
      currentVersionId: 'version-1',
    };
    
    (prisma.agent.create as jest.Mock).mockResolvedValueOnce(newAgent);
    (prisma.agentVersion.create as jest.Mock).mockResolvedValueOnce({
      id: 'version-1',
      versionNumber: 1,
    });

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Agent',
        purpose: 'ASSESSOR',
        description: 'A new agent',
        primaryInstructions: 'Instructions...',
        providesGrades: true,
      }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual(newAgent);
  });

  it('should update existing agent and create new version', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const existingAgent = {
      id: 'agent-123',
      ownerId: mockUser.id,
      name: 'Old Name',
      currentVersionId: 'old-version',
    };
    
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(existingAgent);
    (prisma.agentVersion.findFirst as jest.Mock).mockResolvedValueOnce({ versionNumber: 3 });
    
    const updatedAgent = {
      ...existingAgent,
      name: 'Updated Name',
      currentVersionId: 'new-version',
    };
    
    (prisma.agent.update as jest.Mock).mockResolvedValueOnce(updatedAgent);
    (prisma.agentVersion.create as jest.Mock).mockResolvedValueOnce({
      id: 'new-version',
      versionNumber: 4,
    });

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'agent-123',
        name: 'Updated Name',
        primaryInstructions: 'New instructions...',
      }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(200);
    
    expect(prisma.agentVersion.create).toHaveBeenCalledWith({
      data: {
        agentId: 'agent-123',
        versionNumber: 4,
        primaryInstructions: 'New instructions...',
        selfCritiqueInstructions: undefined,
        readme: undefined,
      },
    });
  });

  it('should prevent updating agents owned by other users', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const existingAgent = {
      id: 'agent-123',
      ownerId: 'other-user-id', // Different owner
      name: 'Agent Name',
    };
    
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(existingAgent);

    const request = new NextRequest('http://localhost:3000/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'agent-123',
        name: 'Updated Name',
      }),
    });
    
    const response = await PUT(request);
    expect(response.status).toBe(403);
    
    const data = await response.json();
    expect(data.error).toBe('You do not have permission to update this agent');
  });
});
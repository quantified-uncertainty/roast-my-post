import { POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAndVerifyAgentAccess } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findMany: jest.fn(),
    },
    job: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      document: { findMany: jest.fn() },
      job: { createMany: jest.fn() },
    })),
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateAndVerifyAgentAccess: jest.fn(),
}));

// Mock crypto for UUID generation
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

describe('POST /api/agents/[agentId]/eval-batch', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication and agent ownership', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: null, 
      agent: null 
    });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 5 }),
    });
    
    const response = await POST(request, { params: { agentId: mockAgentId } });
    expect(response.status).toBe(401);
  });

  it('should validate request body', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: mockUser, 
      agent: { id: mockAgentId } 
    });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    
    const response = await POST(request, { params: { agentId: mockAgentId } });
    expect(response.status).toBe(400);
  });

  it('should enforce maximum target count of 100', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: mockUser, 
      agent: { id: mockAgentId } 
    });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 150 }),
    });
    
    const response = await POST(request, { params: { agentId: mockAgentId } });
    expect(response.status).toBe(400);
  });

  it('should create batch evaluation jobs', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: mockUser, 
      agent: { id: mockAgentId } 
    });
    
    const mockDocuments = [
      { id: 'doc-1', currentVersionId: 'version-1' },
      { id: 'doc-2', currentVersionId: 'version-2' },
      { id: 'doc-3', currentVersionId: 'version-3' },
    ];
    
    (prisma.document.findMany as jest.Mock).mockResolvedValueOnce(mockDocuments);
    (prisma.job.createMany as jest.Mock).mockResolvedValueOnce({ count: 3 });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 5 }), // Requesting 5 but only 3 available
    });
    
    const response = await POST(request, { params: { agentId: mockAgentId } });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({
      batchId: 'mock-uuid',
      jobsCreated: 3,
      targetCount: 5,
    });
    
    // Verify documents query excludes already evaluated ones
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        evaluations: {
          none: {
            agentId: mockAgentId,
          },
        },
      },
      select: {
        id: true,
        currentVersionId: true,
      },
      take: 5,
    });
    
    // Verify job creation
    expect(prisma.job.createMany).toHaveBeenCalledWith({
      data: mockDocuments.map(doc => ({
        type: 'evaluation',
        status: 'pending',
        batchId: 'mock-uuid',
        payload: {
          documentId: doc.id,
          documentVersionId: doc.currentVersionId,
          agentId: mockAgentId,
        },
        ownerId: mockUser.id,
      })),
    });
  });

  it('should handle case when no documents need evaluation', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: mockUser, 
      agent: { id: mockAgentId } 
    });
    
    (prisma.document.findMany as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 10 }),
    });
    
    const response = await POST(request, { params: { agentId: mockAgentId } });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({
      message: 'No documents available for evaluation',
      jobsCreated: 0,
    });
    
    expect(prisma.job.createMany).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    (authenticateAndVerifyAgentAccess as jest.Mock).mockResolvedValueOnce({ 
      user: mockUser, 
      agent: { id: mockAgentId } 
    });
    
    (prisma.document.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/eval-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCount: 5 }),
    });
    
    const response = await POST(request, { params: { agentId: mockAgentId } });
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Failed to create batch jobs');
  });
});
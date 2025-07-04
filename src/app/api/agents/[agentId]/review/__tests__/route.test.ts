import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { generateEvaluationStream } from '../../../../../../lib/llm/generateEvaluation';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('../../../../../../lib/llm/generateEvaluation', () => ({
  generateEvaluationStream: jest.fn(),
}));

describe('GET /api/agents/[agentId]/review', () => {
  const mockAgentId = 'agent-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review?content=test`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should require content parameter', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Content parameter is required');
  });

  it('should return 404 if agent not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review?content=test`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Agent not found');
  });

  it('should return 403 if user does not own agent', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockAgent = {
      id: mockAgentId,
      ownerId: 'other-user-id', // Different owner
      currentVersion: {
        primaryInstructions: 'Instructions...',
      },
    };
    
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(mockAgent);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review?content=test`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('You do not have permission to review this agent');
  });

  it('should generate evaluation stream for valid request', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockAgent = {
      id: mockAgentId,
      name: 'Test Agent',
      purpose: 'ASSESSOR',
      providesGrades: true,
      ownerId: mockUser.id,
      currentVersion: {
        primaryInstructions: 'Agent instructions...',
        selfCritiqueInstructions: 'Critique instructions...',
      },
    };
    
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(mockAgent);
    
    // Mock the stream response
    const mockStream = new ReadableStream();
    (generateEvaluationStream as jest.Mock).mockResolvedValueOnce(mockStream);

    const testContent = 'This is test content for review';
    const request = new NextRequest(
      `http://localhost:3000/api/agents/${mockAgentId}/review?content=${encodeURIComponent(testContent)}`
    );
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
    
    expect(generateEvaluationStream).toHaveBeenCalledWith({
      agentName: 'Test Agent',
      agentPurpose: 'ASSESSOR',
      agentPrimaryInstructions: 'Agent instructions...',
      agentSelfCritiqueInstructions: 'Critique instructions...',
      documentTitle: 'Test Review',
      documentContent: testContent,
      providesGrades: true,
    });
  });

  it('should handle agents without grades', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockAgent = {
      id: mockAgentId,
      name: 'Advisory Agent',
      purpose: 'ADVISOR',
      providesGrades: false,
      ownerId: mockUser.id,
      currentVersion: {
        primaryInstructions: 'Advisory instructions...',
        selfCritiqueInstructions: null,
      },
    };
    
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce(mockAgent);
    
    const mockStream = new ReadableStream();
    (generateEvaluationStream as jest.Mock).mockResolvedValueOnce(mockStream);

    const request = new NextRequest(`http://localhost:3000/api/agents/${mockAgentId}/review?content=test`);
    const response = await GET(request, { params: { agentId: mockAgentId } });
    
    expect(response.status).toBe(200);
    
    expect(generateEvaluationStream).toHaveBeenCalledWith({
      agentName: 'Advisory Agent',
      agentPurpose: 'ADVISOR',
      agentPrimaryInstructions: 'Advisory instructions...',
      agentSelfCritiqueInstructions: null,
      documentTitle: 'Test Review',
      documentContent: 'test',
      providesGrades: false,
    });
  });
});
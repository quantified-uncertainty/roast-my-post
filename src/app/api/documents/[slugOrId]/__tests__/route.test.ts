import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth-helpers';
import { DocumentModel } from '@/models/Document';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    documentVersion: {
      update: jest.fn(),
    },
    evaluation: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    job: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/models/Document', () => ({
  DocumentModel: {
    getDocumentWithEvaluations: jest.fn(),
  },
}));

describe('GET /api/documents/[slugOrId]', () => {
  const mockDocId = 'doc-123';
  const mockSlug = 'test-document-slug';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not require authentication', async () => {
    const mockDocument = {
      id: mockDocId,
      title: 'Test Document',
      slug: mockSlug,
      author: 'Test Author',
      content: 'Document content...',
      publishedDate: new Date('2024-01-01').toISOString(),
      evaluations: [],
    };
    
    (DocumentModel.getDocumentWithEvaluations as jest.Mock).mockResolvedValueOnce(mockDocument);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockDocument);
  });

  it('should not expose submittedBy user email', async () => {
    const mockDocument = {
      id: mockDocId,
      title: 'Test Document',
      slug: mockSlug,
      author: 'Test Author',
      content: 'Document content...',
      publishedDate: new Date('2024-01-01').toISOString(),
      submittedById: 'user-456',
      submittedBy: {
        id: 'user-456',
        name: 'John Doe',
        image: 'https://example.com/avatar.jpg',
        // email should not be included
      },
      evaluations: [],
    };
    
    (DocumentModel.getDocumentWithEvaluations as jest.Mock).mockResolvedValueOnce(mockDocument);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Verify submittedBy user exists but email is not exposed
    expect(data.submittedBy).toBeDefined();
    expect(data.submittedBy.id).toBe('user-456');
    expect(data.submittedBy.name).toBe('John Doe');
    expect(data.submittedBy.email).toBeUndefined();
  });

  it('should find document by ID', async () => {
    const mockDocument = {
      id: mockDocId,
      title: 'Test Document',
      slug: mockSlug,
      content: 'Content...',
      evaluations: [],
    };
    
    (DocumentModel.getDocumentWithEvaluations as jest.Mock).mockResolvedValueOnce(mockDocument);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    expect(DocumentModel.getDocumentWithEvaluations).toHaveBeenCalledWith(mockDocId);
  });

  it('should find document by slug', async () => {
    const mockDocument = {
      id: mockDocId,
      title: 'Test Document',
      slug: mockSlug,
      content: 'Content...',
      evaluations: [],
    };
    
    (DocumentModel.getDocumentWithEvaluations as jest.Mock).mockResolvedValueOnce(mockDocument);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockSlug}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockSlug }) });
    
    expect(response.status).toBe(200);
    expect(DocumentModel.getDocumentWithEvaluations).toHaveBeenCalledWith(mockSlug);
  });

  it('should return 404 when document not found', async () => {
    (DocumentModel.getDocumentWithEvaluations as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/documents/non-existent`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: 'non-existent' }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Document not found');
  });
});

describe('PUT /api/documents/[slugOrId]', () => {
  const mockDocId = 'doc-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intendedAgentIds: ['agent-1'] }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(401);
  });

  it('should update intended agents', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const existingDoc = {
      id: mockDocId,
      versions: [{
        id: 'version-1',
        intendedAgents: [],
      }],
    };
    
    (prisma.document.findUnique as jest.Mock).mockResolvedValueOnce(existingDoc);
    (prisma.documentVersion.update as jest.Mock).mockResolvedValueOnce({
      id: 'version-1',
      intendedAgents: ['agent-1', 'agent-2'],
    });
    (prisma.evaluation.findMany as jest.Mock).mockResolvedValueOnce([]);
    
    const mockTransaction = jest.fn().mockImplementation(async (fn) => {
      return await fn({
        evaluation: {
          create: jest.fn().mockResolvedValue({ id: 'eval-1', agentId: 'agent-1' }),
        },
        job: {
          create: jest.fn().mockResolvedValue({ id: 'job-1' }),
        },
      });
    });
    (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intendedAgentIds: ['agent-1', 'agent-2'] }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.updatedFields.intendedAgents).toEqual(['agent-1', 'agent-2']);
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    (prisma.document.findUnique as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intendedAgentIds: ['agent-1'] }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Failed to update document');
  });
});
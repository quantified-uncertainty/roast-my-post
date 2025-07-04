import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    documentVersion: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/documents/[slugOrId]', () => {
  const mockDocId = 'doc-123';
  const mockSlug = 'test-document-slug';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);
    
    const mockDocument = {
      id: mockDocId,
      title: 'Test Document',
      slug: mockSlug,
      currentVersion: {
        content: 'Document content...',
        importUrl: 'https://example.com/article',
        metadata: { author: 'Test Author' },
      },
      _count: {
        evaluations: 5,
      },
    };
    
    (prisma.document.findFirst as jest.Mock).mockResolvedValueOnce(mockDocument);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockDocument);
  });

  it('should find document by ID', async () => {
    const mockDocument = {
      id: mockDocId,
      title: 'Test Document',
      slug: mockSlug,
      currentVersion: { content: 'Content...' },
      _count: { evaluations: 0 },
    };
    
    (prisma.document.findFirst as jest.Mock).mockResolvedValueOnce(mockDocument);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: mockDocId },
          { slug: mockDocId },
        ],
      },
      include: {
        currentVersion: {
          select: {
            content: true,
            importUrl: true,
            metadata: true,
          },
        },
        _count: {
          select: {
            evaluations: true,
          },
        },
      },
    });
  });

  it('should find document by slug', async () => {
    const mockDocument = {
      id: mockDocId,
      title: 'Test Document',
      slug: mockSlug,
      currentVersion: { content: 'Content...' },
      _count: { evaluations: 0 },
    };
    
    (prisma.document.findFirst as jest.Mock).mockResolvedValueOnce(mockDocument);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockSlug}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockSlug }) });
    
    expect(response.status).toBe(200);
    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: mockSlug },
          { slug: mockSlug },
        ],
      },
      include: expect.any(Object),
    });
  });

  it('should return 404 when document not found', async () => {
    (prisma.document.findFirst as jest.Mock).mockResolvedValueOnce(null);

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
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(401);
  });

  it('should update document and create new version', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const existingDoc = {
      id: mockDocId,
      ownerId: mockUser.id,
      currentVersionId: 'old-version',
      currentVersion: {
        content: 'Old content',
        metadata: { author: 'Old Author' },
      },
    };
    
    (prisma.document.findFirst as jest.Mock).mockResolvedValueOnce(existingDoc);
    
    const newVersion = {
      id: 'new-version',
      content: 'Updated content',
      metadata: { author: 'Updated Author' },
    };
    
    (prisma.documentVersion.create as jest.Mock).mockResolvedValueOnce(newVersion);
    
    const updatedDoc = {
      ...existingDoc,
      title: 'Updated Title',
      currentVersionId: 'new-version',
    };
    
    (prisma.document.update as jest.Mock).mockResolvedValueOnce(updatedDoc);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Title',
        content: 'Updated content',
        metadata: { author: 'Updated Author' },
      }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(200);
    
    expect(prisma.documentVersion.create).toHaveBeenCalledWith({
      data: {
        documentId: mockDocId,
        content: 'Updated content',
        metadata: { author: 'Updated Author' },
        importUrl: undefined,
      },
    });
    
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: mockDocId },
      data: {
        title: 'Updated Title',
        currentVersionId: 'new-version',
      },
    });
  });

  it('should prevent updating documents owned by others', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const existingDoc = {
      id: mockDocId,
      ownerId: 'other-user-id', // Different owner
      title: 'Document',
    };
    
    (prisma.document.findFirst as jest.Mock).mockResolvedValueOnce(existingDoc);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(403);
    
    const data = await response.json();
    expect(data.error).toBe('You do not have permission to update this document');
  });
});
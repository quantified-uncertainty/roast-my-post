import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth-helpers';
import { DocumentModel } from '@/models/Document';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/models/Document', () => ({
  DocumentModel: {
    getRecentDocumentsWithEvaluations: jest.fn(),
    formatDocumentFromDB: jest.fn(),
  },
}));

describe('GET /api/documents/search', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return recent documents when no query provided', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { DocumentModel } = require('@/models/Document');
    
    const mockDocuments = [
      { id: 'doc1', title: 'Recent Doc 1' },
      { id: 'doc2', title: 'Recent Doc 2' },
    ];
    
    DocumentModel.getRecentDocumentsWithEvaluations.mockResolvedValueOnce(mockDocuments);
    (prisma.document.count as jest.Mock).mockResolvedValueOnce(10);

    const request = new NextRequest('http://localhost:3000/api/documents/search');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      documents: mockDocuments,
      total: 10,
      hasMore: false,
    });
  });

  it('should search documents with query', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { DocumentModel } = require('@/models/Document');
    
    const mockDBResults = [
      {
        id: 'doc-1',
        title: 'Test Document',
        versions: [{ searchableText: 'test document content' }],
        submittedBy: { id: 'user1', name: 'User One', email: 'user1@example.com', image: null },
        evaluations: [],
      },
      {
        id: 'doc-2',
        title: 'Another Test',
        versions: [{ searchableText: 'another test content' }],
        submittedBy: { id: 'user2', name: 'User Two', email: 'user2@example.com', image: null },
        evaluations: [],
      },
    ];
    
    const mockFormattedResults = [
      { id: 'doc-1', title: 'Test Document', formattedData: true },
      { id: 'doc-2', title: 'Another Test', formattedData: true },
    ];
    
    (prisma.document.findMany as jest.Mock).mockResolvedValueOnce(mockDBResults);
    (prisma.document.count as jest.Mock).mockResolvedValueOnce(2);
    DocumentModel.formatDocumentFromDB
      .mockReturnValueOnce(mockFormattedResults[0])
      .mockReturnValueOnce(mockFormattedResults[1]);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&limit=10&offset=0');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toEqual({
      documents: mockFormattedResults,
      total: 2,
      hasMore: false,
      query: 'test',
    });
    
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        OR: expect.arrayContaining([
          expect.objectContaining({
            versions: expect.objectContaining({
              some: expect.objectContaining({
                searchableText: expect.objectContaining({ contains: 'test' }),
              }),
            }),
          }),
        ]),
      },
      take: 10,
      skip: 0,
      orderBy: { publishedDate: 'desc' },
      include: expect.any(Object),
    });
  });

  it('should search content when searchContent is true', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { DocumentModel } = require('@/models/Document');
    
    (prisma.document.findMany as jest.Mock).mockResolvedValueOnce([]);
    (prisma.document.count as jest.Mock).mockResolvedValueOnce(0);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&searchContent=true');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    
    // Verify that content search was included in the query
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            expect.objectContaining({
              versions: expect.objectContaining({
                some: expect.objectContaining({
                  content: expect.objectContaining({ contains: 'test', mode: 'insensitive' }),
                }),
              }),
            }),
          ]),
        },
      })
    );
  });

  it('should return empty results for no matches', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    (prisma.document.findMany as jest.Mock).mockResolvedValueOnce([]);
    (prisma.document.count as jest.Mock).mockResolvedValueOnce(0);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=nonexistent');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      documents: [],
      total: 0,
      hasMore: false,
      query: 'nonexistent',
    });
  });

  it('should handle pagination parameters', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    const { DocumentModel } = require('@/models/Document');
    
    const mockResults = Array.from({ length: 5 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Document ${i}`,
      versions: [{ searchableText: `test document ${i}` }],
      submittedBy: { id: 'user1', name: 'User', email: 'user@example.com', image: null },
      evaluations: [],
    }));
    
    const mockFormattedResults = mockResults.map(r => ({ ...r, formattedData: true }));
    
    (prisma.document.findMany as jest.Mock).mockResolvedValueOnce(mockResults);
    (prisma.document.count as jest.Mock).mockResolvedValueOnce(50);
    mockResults.forEach((_, i) => {
      DocumentModel.formatDocumentFromDB
        .mockReturnValueOnce(mockFormattedResults[i]);
    });

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&limit=5&offset=10');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.documents).toHaveLength(5);
    expect(data.hasMore).toBe(true);
    expect(data.total).toBe(50);
    
    // Verify the prisma call includes proper take and skip
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        skip: 10,
      })
    );
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    (prisma.document.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to search documents');
  });
});
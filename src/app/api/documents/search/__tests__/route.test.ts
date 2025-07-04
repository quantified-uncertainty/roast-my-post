import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/documents/search', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should require search query parameter', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });

    const request = new NextRequest('http://localhost:3000/api/documents/search');
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Search query is required');
  });

  it('should search documents by title and metadata', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockResults = [
      {
        id: 'doc-1',
        title: 'Test Document',
        slug: 'test-document',
        created_at: new Date('2024-01-01'),
        owner_name: 'User One',
        import_url: 'https://example.com/doc1',
        rank: 0.8,
      },
      {
        id: 'doc-2',
        title: 'Another Test',
        slug: 'another-test',
        created_at: new Date('2024-01-02'),
        owner_name: 'User Two',
        import_url: null,
        rank: 0.6,
      },
    ];
    
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockResults);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&limit=10&offset=0');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toEqual({
      results: mockResults.map(r => ({
        ...r,
        createdAt: r.created_at,
        ownerName: r.owner_name,
        importUrl: r.import_url,
        created_at: undefined,
        owner_name: undefined,
        import_url: undefined,
      })),
      total: mockResults.length,
      query: 'test',
      limit: 10,
      offset: 0,
    });
  });

  it('should search content when searchContent is true', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&searchContent=true');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    
    // Verify the query includes content search
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const query = queryCall[0][0]; // Get the SQL query string
    expect(query).toContain('dv."searchableText"'); // Should search in content
  });

  it('should respect limit and offset parameters', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&limit=25&offset=50');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.limit).toBe(25);
    expect(data.offset).toBe(50);
    
    // Verify the query includes LIMIT and OFFSET
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const query = queryCall[0][0];
    expect(query).toContain('LIMIT');
    expect(query).toContain('OFFSET');
  });

  it('should enforce maximum limit of 100', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&limit=200');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.limit).toBe(100); // Should be capped at 100
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Search failed');
  });
});
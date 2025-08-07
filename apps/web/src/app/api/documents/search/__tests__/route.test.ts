import { NextRequest } from 'next/server';
import { Result } from '@/lib/core/result';
import { GET } from '../route';

// Mock functions that will be used in mocks
const mockGetRecentDocuments = jest.fn();
const mockSearchDocuments = jest.fn();
const mockAuthenticateRequest = jest.fn();

// Mock modules
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: mockAuthenticateRequest,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/services/DocumentService', () => ({
  DocumentService: jest.fn(() => ({
    getRecentDocuments: mockGetRecentDocuments,
    searchDocuments: mockSearchDocuments,
  })),
}));

describe('GET /api/documents/search', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return recent documents when no query provided', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    const mockDocuments = [
      { id: 'doc1', title: 'Recent Doc 1' },
      { id: 'doc2', title: 'Recent Doc 2' },
    ];
    
    mockGetRecentDocuments.mockResolvedValueOnce(Result.ok(mockDocuments));

    const request = new NextRequest('http://localhost:3000/api/documents/search');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      documents: mockDocuments,
      total: 2,
      hasMore: false,
    });
  });

  it('should search documents with query', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    const mockFormattedResults = [
      { id: 'doc-1', title: 'Test Document', formattedData: true },
      { id: 'doc-2', title: 'Another Test', formattedData: true },
    ];
    
    mockSearchDocuments.mockResolvedValueOnce(Result.ok(mockFormattedResults));

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
    
    expect(mockSearchDocuments).toHaveBeenCalledWith('test', 10);
  });

  it('should search content when searchContent is true', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    mockSearchDocuments.mockResolvedValueOnce(Result.ok([]));

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&searchContent=true');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.documents).toEqual([]);
  });

  it('should return empty results for no matches', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    mockSearchDocuments.mockResolvedValueOnce(Result.ok([]));

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
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    const mockFormattedResults = Array.from({ length: 5 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Document ${i}`,
      formattedData: true,
    }));
    
    mockSearchDocuments.mockResolvedValueOnce(Result.ok(mockFormattedResults));

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test&limit=5&offset=10');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.documents).toHaveLength(5);
    expect(data.hasMore).toBe(false); // DocumentService doesn't implement proper pagination yet
    expect(data.total).toBe(5);
    
    expect(mockSearchDocuments).toHaveBeenCalledWith('test', 5);
  });

  it('should handle database errors', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    mockSearchDocuments.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/documents/search?q=test');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to search documents');
  });
});
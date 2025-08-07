import { NextRequest } from 'next/server';
import { Result } from '@/lib/core/result';
import { NotFoundError, AuthorizationError, ValidationError } from '@/lib/core/errors';
import { GET, PUT } from '../route';

// Mock functions that will be used in mocks
const mockGetDocumentForReader = jest.fn();
const mockUpdateDocument = jest.fn();
const mockDeleteDocument = jest.fn();
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
    getDocumentForReader: mockGetDocumentForReader,
    updateDocument: mockUpdateDocument,
    deleteDocument: mockDeleteDocument,
  })),
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
    
    mockGetDocumentForReader.mockResolvedValueOnce(Result.ok(mockDocument));

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockDocument);
  });

  it('should not expose submittedBy user email', async () => {
    const mockDocumentFromDB = {
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
        // Email should be excluded by the service
      },
      evaluations: [],
    };
    
    mockGetDocumentForReader.mockResolvedValueOnce(Result.ok(mockDocumentFromDB));

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
    
    mockGetDocumentForReader.mockResolvedValueOnce(Result.ok(mockDocument));

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    expect(mockGetDocumentForReader).toHaveBeenCalledWith(mockDocId, undefined);
  });

  it('should find document by slug', async () => {
    const mockDocument = {
      id: mockDocId,
      title: 'Test Document',
      slug: mockSlug,
      content: 'Content...',
      evaluations: [],
    };
    
    mockGetDocumentForReader.mockResolvedValueOnce(Result.ok(mockDocument));

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockSlug}`);
    const response = await GET(request, { params: Promise.resolve({ slugOrId: mockSlug }) });
    
    expect(response.status).toBe(200);
    expect(mockGetDocumentForReader).toHaveBeenCalledWith(mockSlug, undefined);
  });

  it('should return 404 when document not found', async () => {
    mockGetDocumentForReader.mockResolvedValueOnce(
      Result.fail(new NotFoundError('Document', 'non-existent'))
    );

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
    mockAuthenticateRequest.mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intendedAgentIds: ['agent-1'] }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    expect(response.status).toBe(401);
  });

  it('should update intended agents', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    mockUpdateDocument.mockResolvedValueOnce(Result.ok(undefined));

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intendedAgentIds: ['agent-1', 'agent-2'] }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      mockDocId,
      mockUser.id,
      { title: undefined, content: undefined, intendedAgentIds: ['agent-1', 'agent-2'] }
    );
  });

  it('should return 404 when document not found', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    mockUpdateDocument.mockResolvedValueOnce(
      Result.fail(new NotFoundError('Document', mockDocId))
    );

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intendedAgentIds: ['agent-1'] }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  it('should return 403 when user does not own document', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    mockUpdateDocument.mockResolvedValueOnce(
      Result.fail(new AuthorizationError('You do not have permission to update this document'))
    );

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intendedAgentIds: ['agent-1'] }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('permission');
  });

  it('should validate intendedAgentIds is an array', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce(mockUser.id);
    
    mockUpdateDocument.mockResolvedValueOnce(
      Result.fail(new ValidationError('intendedAgentIds must be an array'))
    );

    const request = new NextRequest(`http://localhost:3000/api/documents/${mockDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intendedAgentIds: 'not-an-array' }),
    });
    
    const response = await PUT(request, { params: Promise.resolve({ slugOrId: mockDocId }) });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('must be an array');
  });
});
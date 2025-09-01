import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/application/services/ServiceFactory', () => ({
  getServices: vi.fn(),
}));

// Import after mocks
import { NextRequest } from 'next/server';
import { Result } from '@roast/domain';
import { GET } from '../route';
import { authenticateRequest } from '@/infrastructure/auth/auth-helpers';
import { getServices } from '@/application/services/ServiceFactory';

// Type the mocked functions
const mockAuthenticateRequest = vi.mocked(authenticateRequest);
const mockGetServices = vi.mocked(getServices);

describe('Document Search Privacy', () => {
  const mockDocumentService = {
    getRecentDocuments: vi.fn(),
    searchDocuments: vi.fn(),
    // Add other methods to match full service shape
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocument: vi.fn(),
    getDocumentBySlug: vi.fn(),
    updatePrivacy: vi.fn(),
  };

  const mockServices = {
    documentService: mockDocumentService,
    // Add other services
    agentService: {},
    evaluationService: {},
    jobService: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServices.mockReturnValue(mockServices as any);
  });

  describe('Anonymous Users', () => {
    it('should only return public documents when no auth', async () => {
      mockAuthenticateRequest.mockResolvedValue(null);

      const publicDocs = [
        { id: '1', title: 'Public Doc', isPrivate: false },
        { id: '2', title: 'Another Public', isPrivate: false },
      ];

      mockDocumentService.searchDocuments.mockResolvedValue(Result.ok(publicDocs));

      const request = new NextRequest('http://localhost/api/documents/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDocumentService.searchDocuments).toHaveBeenCalledWith('test', 50, undefined);
      expect(data.documents).toEqual(publicDocs);
    });

    it('should pass undefined userId for recent documents when not authenticated', async () => {
      mockAuthenticateRequest.mockResolvedValue(null);

      const publicDocs = [
        { id: '1', title: 'Recent Public', isPrivate: false },
      ];

      mockDocumentService.getRecentDocuments.mockResolvedValue(Result.ok(publicDocs));

      const request = new NextRequest('http://localhost/api/documents/search');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDocumentService.getRecentDocuments).toHaveBeenCalledWith(50, undefined);
      expect(data.documents).toEqual(publicDocs);
    });
  });

  describe('Authenticated Users', () => {
    it('should pass userId to search when authenticated', async () => {
      const userId = 'user-123';
      mockAuthenticateRequest.mockResolvedValue(userId);

      const mixedDocs = [
        { id: '1', title: 'Public Doc', isPrivate: false },
        { id: '2', title: 'My Private Doc', isPrivate: true, submittedById: userId },
      ];

      mockDocumentService.searchDocuments.mockResolvedValue(Result.ok(mixedDocs));

      const request = new NextRequest('http://localhost/api/documents/search?q=doc');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDocumentService.searchDocuments).toHaveBeenCalledWith('doc', 50, userId);
      expect(data.documents).toEqual(mixedDocs);
    });

    it('should pass userId for recent documents when authenticated', async () => {
      const userId = 'user-456';
      mockAuthenticateRequest.mockResolvedValue(userId);

      const mixedDocs = [
        { id: '1', title: 'Recent Public', isPrivate: false },
        { id: '2', title: 'Recent Private', isPrivate: true, submittedById: userId },
      ];

      mockDocumentService.getRecentDocuments.mockResolvedValue(Result.ok(mixedDocs));

      const request = new NextRequest('http://localhost/api/documents/search');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDocumentService.getRecentDocuments).toHaveBeenCalledWith(50, userId);
      expect(data.documents).toEqual(mixedDocs);
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      mockAuthenticateRequest.mockResolvedValue('user-123');

      mockDocumentService.searchDocuments.mockResolvedValue(
        Result.fail({ message: 'Search failed' } as any)
      );

      const request = new NextRequest('http://localhost/api/documents/search?q=error');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Search failed');
    });
  });
});
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

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

describe('Document Search Privacy', () => {
  const mockDocumentService = {
    getRecentDocuments: vi.fn(),
    searchDocuments: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const { getServices } = require('@/application/services/ServiceFactory');
    getServices.mockReturnValue({ documentService: mockDocumentService });
  });

  describe('Anonymous Users', () => {
    it('should only return public documents when no auth', async () => {
      const { authenticateRequest } = require('@/infrastructure/auth/auth-helpers');
      authenticateRequest.mockResolvedValue(null);

      const publicDocs = [
        { id: '1', title: 'Public Doc', isPrivate: false },
        { id: '2', title: 'Another Public', isPrivate: false },
      ];

      mockDocumentService.searchDocuments.mockResolvedValue({
        isError: () => false,
        unwrap: () => publicDocs,
      });

      const request = new NextRequest('http://localhost/api/documents/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDocumentService.searchDocuments).toHaveBeenCalledWith('test', 50, undefined);
      expect(data.documents).toEqual(publicDocs);
    });

    it('should pass undefined userId for recent documents when not authenticated', async () => {
      const { authenticateRequest } = require('@/infrastructure/auth/auth-helpers');
      authenticateRequest.mockResolvedValue(null);

      const publicDocs = [
        { id: '1', title: 'Recent Public', isPrivate: false },
      ];

      mockDocumentService.getRecentDocuments.mockResolvedValue({
        isError: () => false,
        unwrap: () => publicDocs,
      });

      const request = new NextRequest('http://localhost/api/documents/search');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDocumentService.getRecentDocuments).toHaveBeenCalledWith(50, undefined);
      expect(data.documents).toEqual(publicDocs);
    });
  });

  describe('Authenticated Users', () => {
    it('should pass userId to search when authenticated', async () => {
      const { authenticateRequest } = require('@/infrastructure/auth/auth-helpers');
      const userId = 'user-123';
      authenticateRequest.mockResolvedValue(userId);

      const mixedDocs = [
        { id: '1', title: 'Public Doc', isPrivate: false },
        { id: '2', title: 'My Private Doc', isPrivate: true, submittedById: userId },
      ];

      mockDocumentService.searchDocuments.mockResolvedValue({
        isError: () => false,
        unwrap: () => mixedDocs,
      });

      const request = new NextRequest('http://localhost/api/documents/search?q=doc');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDocumentService.searchDocuments).toHaveBeenCalledWith('doc', 50, userId);
      expect(data.documents).toEqual(mixedDocs);
    });

    it('should pass userId for recent documents when authenticated', async () => {
      const { authenticateRequest } = require('@/infrastructure/auth/auth-helpers');
      const userId = 'user-456';
      authenticateRequest.mockResolvedValue(userId);

      const mixedDocs = [
        { id: '1', title: 'Recent Public', isPrivate: false },
        { id: '2', title: 'Recent Private', isPrivate: true, submittedById: userId },
      ];

      mockDocumentService.getRecentDocuments.mockResolvedValue({
        isError: () => false,
        unwrap: () => mixedDocs,
      });

      const request = new NextRequest('http://localhost/api/documents/search');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDocumentService.getRecentDocuments).toHaveBeenCalledWith(50, userId);
      expect(data.documents).toEqual(mixedDocs);
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      const { authenticateRequest } = require('@/infrastructure/auth/auth-helpers');
      authenticateRequest.mockResolvedValue('user-123');

      mockDocumentService.searchDocuments.mockResolvedValue({
        isError: () => true,
        error: () => ({ message: 'Search failed' }),
      });

      const request = new NextRequest('http://localhost/api/documents/search?q=error');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Search failed');
    });
  });
});
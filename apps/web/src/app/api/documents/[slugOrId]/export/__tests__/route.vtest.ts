import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('@/models/Document', () => ({
  DocumentModel: {
    getDocumentWithEvaluations: vi.fn(),
  },
}));

vi.mock('@/infrastructure/export/document-export-service', () => ({
  DocumentExportService: {
    export: vi.fn(),
  },
}));

vi.mock('@/infrastructure/auth/privacy-service', () => ({
  PrivacyService: {
    getCacheHeaders: vi.fn(),
  },
}));

describe('GET /api/documents/[slugOrId]/export', () => {
  const mockDocId = 'doc-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cache Headers', () => {
    it('should set private cache headers for private documents', async () => {
      const { authenticateRequest } = await import('@/infrastructure/auth/auth-helpers');
      const { DocumentModel } = await import('@/models/Document');
      const { DocumentExportService } = await import('@/infrastructure/export/document-export-service');
      const { PrivacyService } = await import('@/infrastructure/auth/privacy-service');

      // Setup mocks
      vi.mocked(authenticateRequest).mockResolvedValue(mockUserId);
      vi.mocked(DocumentModel.getDocumentWithEvaluations).mockResolvedValue({
        id: mockDocId,
        title: 'Private Document',
        isPrivate: true,
        content: 'Private content',
        publishedDate: new Date(),
        reviews: [],
      } as any);

      vi.mocked(DocumentExportService.export).mockReturnValue({
        content: '{"test": "data"}',
        contentType: 'application/json',
        fileName: 'doc-123.json',
      });

      const privateCacheHeaders = {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };
      vi.mocked(PrivacyService.getCacheHeaders).mockReturnValue(privateCacheHeaders);

      // Make request
      const request = new NextRequest(`http://localhost/api/documents/${mockDocId}/export?format=json`);
      const response = await GET(request, {
        params: Promise.resolve({ slugOrId: mockDocId }),
      });

      // Verify cache headers
      expect(PrivacyService.getCacheHeaders).toHaveBeenCalledWith(true);
      expect(response.headers.get('Cache-Control')).toBe('private, no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });

    it('should set public cache headers for public documents', async () => {
      const { authenticateRequest } = await import('@/infrastructure/auth/auth-helpers');
      const { DocumentModel } = await import('@/models/Document');
      const { DocumentExportService } = await import('@/infrastructure/export/document-export-service');
      const { PrivacyService } = await import('@/infrastructure/auth/privacy-service');

      // Setup mocks
      vi.mocked(authenticateRequest).mockResolvedValue(undefined); // Anonymous user
      vi.mocked(DocumentModel.getDocumentWithEvaluations).mockResolvedValue({
        id: mockDocId,
        title: 'Public Document',
        isPrivate: false,
        content: 'Public content',
        publishedDate: new Date(),
        reviews: [],
      } as any);

      vi.mocked(DocumentExportService.export).mockReturnValue({
        content: '{"test": "data"}',
        contentType: 'application/json',
        fileName: 'doc-123.json',
      });

      const publicCacheHeaders = {
        'Cache-Control': 'public, max-age=3600',
      };
      vi.mocked(PrivacyService.getCacheHeaders).mockReturnValue(publicCacheHeaders);

      // Make request
      const request = new NextRequest(`http://localhost/api/documents/${mockDocId}/export?format=json`);
      const response = await GET(request, {
        params: Promise.resolve({ slugOrId: mockDocId }),
      });

      // Verify cache headers
      expect(PrivacyService.getCacheHeaders).toHaveBeenCalledWith(false);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Pragma')).toBeNull();
      expect(response.headers.get('Expires')).toBeNull();
    });

    it('should handle undefined isPrivate as public (false)', async () => {
      const { authenticateRequest } = await import('@/infrastructure/auth/auth-helpers');
      const { DocumentModel } = await import('@/models/Document');
      const { DocumentExportService } = await import('@/infrastructure/export/document-export-service');
      const { PrivacyService } = await import('@/infrastructure/auth/privacy-service');

      // Setup mocks with undefined isPrivate
      vi.mocked(authenticateRequest).mockResolvedValue(undefined);
      vi.mocked(DocumentModel.getDocumentWithEvaluations).mockResolvedValue({
        id: mockDocId,
        title: 'Document',
        isPrivate: undefined, // Undefined privacy
        content: 'Content',
        publishedDate: new Date(),
        reviews: [],
      } as any);

      vi.mocked(DocumentExportService.export).mockReturnValue({
        content: '{"test": "data"}',
        contentType: 'application/json',
        fileName: 'doc-123.json',
      });

      const publicCacheHeaders = {
        'Cache-Control': 'public, max-age=3600',
      };
      vi.mocked(PrivacyService.getCacheHeaders).mockReturnValue(publicCacheHeaders);

      // Make request
      const request = new NextRequest(`http://localhost/api/documents/${mockDocId}/export?format=json`);
      await GET(request, {
        params: Promise.resolve({ slugOrId: mockDocId }),
      });

      // Verify it defaults to false (public)
      expect(PrivacyService.getCacheHeaders).toHaveBeenCalledWith(false);
    });
  });

  describe('Privacy Enforcement', () => {
    it('should return 404 for private documents accessed by anonymous users', async () => {
      const { authenticateRequest } = await import('@/infrastructure/auth/auth-helpers');
      const { DocumentModel } = await import('@/models/Document');

      // Setup mocks
      vi.mocked(authenticateRequest).mockResolvedValue(undefined); // Anonymous
      vi.mocked(DocumentModel.getDocumentWithEvaluations).mockResolvedValue(null); // Access denied

      // Make request
      const request = new NextRequest(`http://localhost/api/documents/${mockDocId}/export?format=json`);
      const response = await GET(request, {
        params: Promise.resolve({ slugOrId: mockDocId }),
      });

      // Verify response
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Document not found');
    });

    it('should allow owner to export private documents', async () => {
      const { authenticateRequest } = await import('@/infrastructure/auth/auth-helpers');
      const { DocumentModel } = await import('@/models/Document');
      const { DocumentExportService } = await import('@/infrastructure/export/document-export-service');
      const { PrivacyService } = await import('@/infrastructure/auth/privacy-service');

      // Setup mocks
      vi.mocked(authenticateRequest).mockResolvedValue(mockUserId);
      vi.mocked(DocumentModel.getDocumentWithEvaluations).mockResolvedValue({
        id: mockDocId,
        title: 'Private Document',
        isPrivate: true,
        submittedById: mockUserId,
        content: 'Private content',
        publishedDate: new Date(),
        reviews: [],
      } as any);

      vi.mocked(DocumentExportService.export).mockReturnValue({
        content: '{"test": "data"}',
        contentType: 'application/json',
        fileName: 'doc-123.json',
      });

      vi.mocked(PrivacyService.getCacheHeaders).mockReturnValue({
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      // Make request
      const request = new NextRequest(`http://localhost/api/documents/${mockDocId}/export?format=json`);
      const response = await GET(request, {
        params: Promise.resolve({ slugOrId: mockDocId }),
      });

      // Verify success
      expect(response.status).toBe(200);
      expect(DocumentModel.getDocumentWithEvaluations).toHaveBeenCalledWith(mockDocId, false, mockUserId);
    });
  });
});
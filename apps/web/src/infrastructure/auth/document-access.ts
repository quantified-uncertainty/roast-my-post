import { NextRequest } from 'next/server';
import { PrivacyService } from './privacy-service';

/**
 * DocumentAccessControl delegates all operations to PrivacyService
 * Maintained for backward compatibility with existing code
 */
export class DocumentAccessControl {
  /**
   * Check if a user can view a specific document
   */
  static async canViewDocument(
    documentId: string,
    userId?: string
  ): Promise<boolean> {
    return PrivacyService.canViewDocument(documentId, userId);
  }

  /**
   * Get Prisma where clause for viewable documents in listings
   */
  static getViewableDocumentsFilter(userId?: string) {
    return PrivacyService.getViewableDocumentsFilter(userId);
  }

  /**
   * Verify document access for API routes
   */
  static async verifyApiAccess(
    request: NextRequest,
    documentId: string
  ) {
    return PrivacyService.verifyApiAccess(request, documentId);
  }

  /**
   * Get Prisma filter for documents with their evaluations
   */
  static getDocumentWithEvaluationsFilter(documentId: string, userId?: string) {
    return {
      id: documentId,
      ...PrivacyService.getViewableDocumentsFilter(userId)
    };
  }
}
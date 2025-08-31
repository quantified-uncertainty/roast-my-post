import { prisma } from '@roast/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from './auth-helpers';

/**
 * Centralized service for all privacy-related operations
 * Consolidates privacy filtering, access control, and ownership verification
 */
export class PrivacyService {
  /**
   * Creates a Prisma filter for viewable documents
   * Used in database queries to filter based on privacy settings
   */
  static getViewableDocumentsFilter(userId?: string) {
    if (!userId) {
      // Anonymous users can only see public docs
      return { isPrivate: false };
    }
    
    // Authenticated users can see public docs and their own private docs
    return {
      OR: [
        { isPrivate: false },
        { submittedById: userId }
      ]
    };
  }

  /**
   * Creates a nested filter for relations that have documents
   * Used when filtering evaluations, comments, etc. that belong to documents
   */
  static getNestedDocumentFilter(userId?: string, fieldName: string = 'document') {
    const baseFilter = this.getViewableDocumentsFilter(userId);
    
    if (!userId) {
      return { [fieldName]: baseFilter };
    }
    
    return {
      [fieldName]: baseFilter
    };
  }

  /**
   * Creates a filter for evaluations that checks document privacy
   * Used in queries that need to filter evaluations by document privacy
   */
  static getEvaluationPrivacyFilter(userId?: string) {
    if (!userId) {
      return { document: { isPrivate: false } };
    }

    return {
      OR: [
        { document: { isPrivate: false } },
        { document: { submittedById: userId } }
      ]
    };
  }

  /**
   * Check if a user can view a specific document
   * Returns true if the document is public or owned by the user
   */
  static async canViewDocument(
    documentId: string,
    userId?: string
  ): Promise<boolean> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        isPrivate: true,
        submittedById: true
      }
    });

    if (!doc) return false;
    
    // Public documents are always viewable
    if (!doc.isPrivate) return true;
    
    // Private documents require auth and ownership
    if (!userId) return false;
    return doc.submittedById === userId;
  }

  /**
   * Check if a user owns a specific document
   * Used for operations that require ownership (edit, delete, etc.)
   */
  static async isDocumentOwner(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { submittedById: true }
    });

    return doc?.submittedById === userId;
  }

  /**
   * Verify document access for API routes
   * Returns the requesting user ID if access is allowed, or returns an error response
   * Standardizes the 404 response for privacy violations to prevent information leakage
   */
  static async verifyApiAccess(
    request: NextRequest,
    documentId: string
  ): Promise<
    | { denied: false; userId?: string }
    | { denied: true; response: NextResponse }
  > {
    // Get requesting user (supports both authenticated and anonymous)
    const requestingUserId = await authenticateRequest(request);
    
    // Check if user can view the document
    const canView = await this.canViewDocument(documentId, requestingUserId);
    
    if (!canView) {
      // Return 404 (not 403) to prevent information leakage
      return {
        denied: true,
        response: NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        )
      };
    }
    
    return { denied: false, userId: requestingUserId };
  }

  /**
   * Verify document ownership for API routes that require ownership
   * Returns the user ID if ownership is confirmed, or returns an error response
   */
  static async verifyOwnership(
    request: NextRequest,
    documentId: string
  ): Promise<
    | { denied: false; userId: string }
    | { denied: true; response: NextResponse }
  > {
    const requestingUserId = await authenticateRequest(request);
    
    if (!requestingUserId) {
      return {
        denied: true,
        response: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      };
    }
    
    const isOwner = await this.isDocumentOwner(documentId, requestingUserId);
    
    if (!isOwner) {
      // Return 404 to prevent information leakage about document existence
      return {
        denied: true,
        response: NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        )
      };
    }
    
    return { denied: false, userId: requestingUserId };
  }

  /**
   * Get cache control headers based on document privacy
   * Private documents should not be cached by CDNs or browsers
   */
  static getCacheHeaders(isPrivate: boolean): Record<string, string> {
    if (isPrivate) {
      return {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };
    }
    
    return {
      'Cache-Control': 'public, max-age=3600', // 1 hour cache for public docs
    };
  }

  /**
   * Standardized error response for privacy violations
   * Always returns 404 to prevent information leakage
   */
  static createPrivacyErrorResponse(): NextResponse {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }
}
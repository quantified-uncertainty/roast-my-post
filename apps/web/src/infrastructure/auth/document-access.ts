import { prisma } from '@roast/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from './auth-helpers';

export class DocumentAccessControl {
  /**
   * Check if a user can view a specific document
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
    
    // Public documents (isPrivate = false) are always viewable
    if (!doc.isPrivate) return true;
    
    // Private documents require auth and ownership
    if (!userId) return false;
    return doc.submittedById === userId;
  }

  /**
   * Get Prisma where clause for viewable documents in listings
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
   * Verify document access for API routes
   * Returns the requesting user ID if access is allowed, or returns an error response
   * 
   * Usage:
   * ```typescript
   * const accessResult = await DocumentAccessControl.verifyApiAccess(req, docId);
   * if (accessResult.denied) {
   *   return accessResult.response;
   * }
   * const requestingUserId = accessResult.userId;
   * ```
   */
  static async verifyApiAccess(
    request: NextRequest,
    documentId: string
  ): Promise<
    | { denied: false; userId?: string }
    | { denied: true; response: NextResponse }
  > {
    // Get requesting user (optional - supports both authenticated and anonymous)
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
   * Get Prisma filter for documents with their evaluations
   * Ensures evaluations are only included for viewable documents
   */
  static getDocumentWithEvaluationsFilter(documentId: string, userId?: string) {
    return {
      id: documentId,
      ...this.getViewableDocumentsFilter(userId)
    };
  }
}
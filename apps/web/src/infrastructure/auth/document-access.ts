import { prisma } from '@roast/db';

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
}
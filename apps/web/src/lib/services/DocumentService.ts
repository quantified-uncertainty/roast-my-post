/**
 * Document Service
 * 
 * Business logic layer for document operations.
 * Coordinates between repositories, handles validation,
 * and implements business rules.
 */

import { DocumentRepository } from '@/lib/repositories/DocumentRepository';
import { DocumentValidator } from '@/lib/domain/document/DocumentValidator';
import { EvaluationService } from '@/lib/services/EvaluationService';
import { 
  DocumentEntity,
  DocumentWithEvaluations,
  CreateDocumentData,
  UpdateDocumentData
} from '@/lib/domain/document/Document.entity';
import { 
  NotFoundError,
  ValidationError,
  AuthorizationError,
  AppError
} from '@/lib/core/errors';
import { Result } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export interface CreateDocumentRequest {
  title?: string;
  content: string;
  authors?: string;
  publishedDate?: Date | string | null;
  url?: string | null;
  platforms?: string[];
  importUrl?: string;
  ephemeralBatchId?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  intendedAgentIds?: string[];
}

export class DocumentService {
  constructor(
    private readonly docRepo = new DocumentRepository(),
    private readonly validator = new DocumentValidator(),
    private readonly evaluationService = new EvaluationService()
  ) {}

  /**
   * Create a new document
   */
  async createDocument(
    userId: string,
    data: CreateDocumentRequest,
    agentIds?: string[]
  ): Promise<Result<DocumentEntity, AppError>> {
    try {
      // Generate title if not provided
      if (!data.title || data.title.trim().length === 0) {
        data.title = this.validator.generateTitleFromContent(data.content);
      }

      // Validate input
      const validation = this.validator.validateCreate(data);
      if (!validation.isValid) {
        return Result.fail(
          new ValidationError('Invalid document data', validation.errors)
        );
      }

      // Sanitize data
      const sanitized = this.validator.sanitizeCreateData(data);

      // Create document
      const createData: CreateDocumentData = {
        ...sanitized,
        submittedById: userId,
        importUrl: data.importUrl,
        ephemeralBatchId: data.ephemeralBatchId
      };

      const document = await this.docRepo.create(createData);

      // Schedule evaluations if requested
      if (agentIds && agentIds.length > 0) {
        const evaluationResult = await this.evaluationService.createEvaluationsForDocument({
          documentId: document.id,
          agentIds,
          userId
        });

        if (evaluationResult.isError()) {
          logger.warn('Failed to create some evaluations', {
            documentId: document.id,
            agentIds,
            error: evaluationResult.error()
          });
          // Don't fail document creation if evaluation creation fails
        } else {
          logger.info('Evaluations created successfully', {
            documentId: document.id,
            evaluationsCreated: evaluationResult.unwrap().length,
            agentIds
          });
        }
      }

      return Result.ok(document);
    } catch (error) {
      logger.error('Error creating document', { error, userId, data });
      return Result.fail(
        new AppError('Failed to create document', 'DOCUMENT_CREATE_ERROR', 500, error)
      );
    }
  }

  /**
   * Get a document for the reader view
   */
  async getDocumentForReader(
    docId: string,
    userId?: string,
    includeStale = false
  ): Promise<Result<DocumentWithEvaluations, AppError>> {
    try {
      const doc = await this.docRepo.findWithEvaluations(docId, includeStale);
      
      if (!doc) {
        return Result.fail(
          new NotFoundError('Document', docId)
        );
      }

      // Check permissions if document is private
      // (Add privacy logic here when implemented)

      return Result.ok(doc);
    } catch (error) {
      logger.error('Error fetching document', { error, docId });
      return Result.fail(
        new AppError('Failed to fetch document', 'DOCUMENT_FETCH_ERROR', 500, error)
      );
    }
  }

  /**
   * Get a simple document by ID
   */
  async getDocument(docId: string): Promise<Result<DocumentEntity, AppError>> {
    try {
      const doc = await this.docRepo.findById(docId);
      
      if (!doc) {
        return Result.fail(
          new NotFoundError('Document', docId)
        );
      }

      return Result.ok(doc);
    } catch (error) {
      logger.error('Error fetching document', { error, docId });
      return Result.fail(
        new AppError('Failed to fetch document', 'DOCUMENT_FETCH_ERROR', 500, error)
      );
    }
  }

  /**
   * Update a document
   */
  async updateDocument(
    docId: string,
    userId: string,
    updates: UpdateDocumentRequest
  ): Promise<Result<void, AppError>> {
    try {
      // Check ownership
      const isOwner = await this.docRepo.checkOwnership(docId, userId);
      if (!isOwner) {
        return Result.fail(
          new AuthorizationError('You do not have permission to update this document')
        );
      }

      // Validate updates
      const validation = this.validator.validateUpdate(updates);
      if (!validation.isValid) {
        return Result.fail(
          new ValidationError('Invalid update data', validation.errors)
        );
      }

      // Update content (creates new version)
      if (updates.content !== undefined || updates.title !== undefined) {
        const doc = await this.docRepo.findById(docId);
        if (!doc) {
          return Result.fail(new NotFoundError('Document', docId));
        }

        const content = updates.content !== undefined ? updates.content : doc.content;
        const title = updates.title !== undefined ? updates.title : doc.title;

        await this.docRepo.updateContent(docId, content, title);
      }

      // Update metadata (doesn't create new version)
      if (updates.intendedAgentIds !== undefined) {
        await this.docRepo.updateMetadata(docId, {
          intendedAgentIds: updates.intendedAgentIds
        });
      }

      return Result.ok(undefined);
    } catch (error) {
      logger.error('Error updating document', { error, docId, userId });
      return Result.fail(
        new AppError('Failed to update document', 'DOCUMENT_UPDATE_ERROR', 500, error)
      );
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    docId: string,
    userId: string
  ): Promise<Result<void, AppError>> {
    try {
      // Check ownership
      const isOwner = await this.docRepo.checkOwnership(docId, userId);
      if (!isOwner) {
        return Result.fail(
          new AuthorizationError('You do not have permission to delete this document')
        );
      }

      const deleted = await this.docRepo.delete(docId);
      if (!deleted) {
        return Result.fail(
          new NotFoundError('Document', docId)
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      logger.error('Error deleting document', { error, docId, userId });
      return Result.fail(
        new AppError('Failed to delete document', 'DOCUMENT_DELETE_ERROR', 500, error)
      );
    }
  }

  /**
   * Get documents for a user
   */
  async getUserDocuments(
    userId: string,
    limit = 50
  ): Promise<Result<DocumentWithEvaluations[], AppError>> {
    try {
      const documents = await this.docRepo.findByUser(userId, limit);
      return Result.ok(documents);
    } catch (error) {
      logger.error('Error fetching user documents', { error, userId });
      return Result.fail(
        new AppError('Failed to fetch user documents', 'DOCUMENTS_FETCH_ERROR', 500, error)
      );
    }
  }

  /**
   * Get recent documents
   */
  async getRecentDocuments(
    limit = 50
  ): Promise<Result<DocumentWithEvaluations[], AppError>> {
    try {
      const documents = await this.docRepo.findRecent(limit);
      return Result.ok(documents);
    } catch (error) {
      logger.error('Error fetching recent documents', { error });
      return Result.fail(
        new AppError('Failed to fetch recent documents', 'DOCUMENTS_FETCH_ERROR', 500, error)
      );
    }
  }

  /**
   * Get all documents (admin only)
   */
  async getAllDocuments(): Promise<Result<DocumentWithEvaluations[], AppError>> {
    try {
      const documents = await this.docRepo.findAll();
      return Result.ok(documents);
    } catch (error) {
      logger.error('Error fetching all documents', { error });
      return Result.fail(
        new AppError('Failed to fetch documents', 'DOCUMENTS_FETCH_ERROR', 500, error)
      );
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(
    query: string,
    limit = 50
  ): Promise<Result<any[], AppError>> {
    try {
      if (!query || query.trim().length < 2) {
        return Result.fail(
          new ValidationError('Search query must be at least 2 characters')
        );
      }

      const results = await this.docRepo.search(query.trim(), limit);
      return Result.ok(results);
    } catch (error) {
      logger.error('Error searching documents', { error, query });
      return Result.fail(
        new AppError('Failed to search documents', 'SEARCH_ERROR', 500, error)
      );
    }
  }

  /**
   * Check if a user owns a document
   */
  async checkOwnership(
    docId: string,
    userId: string
  ): Promise<Result<boolean, AppError>> {
    try {
      const isOwner = await this.docRepo.checkOwnership(docId, userId);
      return Result.ok(isOwner);
    } catch (error) {
      logger.error('Error checking document ownership', { error, docId, userId });
      return Result.fail(
        new AppError('Failed to check ownership', 'OWNERSHIP_CHECK_ERROR', 500, error)
      );
    }
  }

  /**
   * Get document statistics
   */
  async getStatistics(): Promise<Result<any, AppError>> {
    try {
      const stats = await this.docRepo.getStatistics();
      return Result.ok(stats);
    } catch (error) {
      logger.error('Error fetching document statistics', { error });
      return Result.fail(
        new AppError('Failed to fetch statistics', 'STATISTICS_ERROR', 500, error)
      );
    }
  }

  /**
   * Validate document content without creating
   */
  async validateDocument(data: CreateDocumentRequest): Promise<Result<void, AppError>> {
    const validation = this.validator.validateCreate(data);
    if (!validation.isValid) {
      return Result.fail(
        new ValidationError('Invalid document data', validation.errors)
      );
    }
    return Result.ok(undefined);
  }
}
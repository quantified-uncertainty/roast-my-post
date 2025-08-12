/**
 * Document Repository
 *
 * Pure data access layer for documents.
 * Handles all database operations related to documents.
 * Returns domain entities with minimal dependencies.
 */
import { prisma as defaultPrisma } from '../client';
export interface DocumentEntity {
    id: string;
    title: string;
    content: string;
    author: string;
    publishedDate: Date | null;
    url: string | null;
    platforms: string[];
    submittedById: string;
    importUrl: string | null;
    ephemeralBatchId: string | null;
    createdAt: Date;
    updatedAt: Date;
    markdownPrepend?: string;
}
export interface DocumentWithEvaluations {
    id: string;
    title: string;
    content: string;
    author: string;
    publishedDate: string | null;
    url: string | null;
    platforms: string[];
    createdAt: Date;
    updatedAt: Date;
    submittedBy?: {
        id: string;
        name: string | null;
        email: string;
    };
    importUrl: string | null;
    ephemeralBatchId: string | null;
    reviews: any[];
    intendedAgents: string[];
}
export interface CreateDocumentData {
    id?: string;
    title: string;
    content: string;
    authors: string;
    publishedDate?: Date | null;
    url?: string | null;
    platforms?: string[];
    submittedById: string;
    importUrl?: string;
    ephemeralBatchId?: string;
}
export interface UpdateDocumentData {
    intendedAgentIds?: string[];
}
export interface DocumentRepositoryInterface {
    findById(id: string): Promise<DocumentEntity | null>;
    findWithEvaluations(id: string, includeStale?: boolean): Promise<DocumentWithEvaluations | null>;
    findByUser(userId: string, limit?: number): Promise<DocumentWithEvaluations[]>;
    findRecent(limit?: number): Promise<DocumentWithEvaluations[]>;
    findAll(): Promise<DocumentWithEvaluations[]>;
    create(data: CreateDocumentData): Promise<DocumentEntity>;
    updateContent(id: string, content: string, title: string): Promise<void>;
    updateMetadata(id: string, data: {
        intendedAgentIds?: string[];
    }): Promise<void>;
    delete(id: string): Promise<boolean>;
    checkOwnership(docId: string, userId: string): Promise<boolean>;
    search(query: string, limit?: number): Promise<any[]>;
    getStatistics(): Promise<any>;
}
export declare class DocumentRepository implements DocumentRepositoryInterface {
    private prisma;
    constructor(prismaClient?: typeof defaultPrisma);
    /**
     * Find a document by ID
     */
    findById(id: string): Promise<DocumentEntity | null>;
    /**
     * Find a document with evaluations by ID
     */
    findWithEvaluations(id: string, includeStale?: boolean): Promise<DocumentWithEvaluations | null>;
    /**
     * Find documents by user
     */
    findByUser(userId: string, limit?: number): Promise<DocumentWithEvaluations[]>;
    /**
     * Find recent documents
     */
    findRecent(limit?: number): Promise<DocumentWithEvaluations[]>;
    /**
     * Find all documents (admin only)
     */
    findAll(): Promise<DocumentWithEvaluations[]>;
    /**
     * Create a new document
     */
    create(data: CreateDocumentData): Promise<DocumentEntity>;
    /**
     * Update document content (creates new version)
     */
    updateContent(id: string, content: string, title: string): Promise<void>;
    /**
     * Update document metadata (doesn't create new version)
     */
    updateMetadata(id: string, data: {
        intendedAgentIds?: string[];
    }): Promise<void>;
    /**
     * Delete a document
     */
    delete(id: string): Promise<boolean>;
    /**
     * Check if user owns a document
     */
    checkOwnership(docId: string, userId: string): Promise<boolean>;
    /**
     * Search documents
     */
    search(query: string, limit?: number): Promise<any[]>;
    /**
     * Get document statistics
     */
    getStatistics(): Promise<any>;
    /**
     * Convert database record to domain entity
     */
    private toDomainEntity;
    /**
     * Convert database record to document with evaluations
     */
    private toDocumentWithEvaluations;
}
//# sourceMappingURL=DocumentRepository.d.ts.map
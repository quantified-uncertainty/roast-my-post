/**
 * Document Domain Entity
 *
 * Pure business object representing a document in the system.
 * This entity is framework-agnostic and contains only business logic.
 * No database or framework dependencies.
 */

import {
  MAX_DOCUMENT_WORD_COUNT,
  MIN_DOCUMENT_CONTENT_LENGTH,
  MAX_DOCUMENT_CONTENT_LENGTH,
} from '../../validators/constants';

export class DocumentEntity {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly content: string,
    public readonly authorName: string,
    public readonly publishedDate: Date | null,
    public readonly url: string | null,
    public readonly platforms: string[],
    public readonly submittedById: string,
    public readonly importUrl?: string,
    public readonly ephemeralBatchId?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    private readonly markdownPrepend?: string | null
  ) {}

  /**
   * Get the full content including any markdown prepend
   */
  getFullContent(): string {
    if (this.markdownPrepend) {
      return this.markdownPrepend + this.content;
    }
    return this.content;
  }

  /**
   * Check if this document is owned by the given user
   */
  isOwnedBy(userId: string): boolean {
    return this.submittedById === userId;
  }

  /**
   * Check if the document can be evaluated
   * Business rule: Document must have at least 100 characters
   */
  canBeEvaluated(): boolean {
    return this.content.length >= 100;
  }

  /**
   * Get the word count of the content
   */
  getWordCount(): number {
    return this.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if document needs markdown prepend
   * Business rule: Documents without headers benefit from prepend
   */
  needsMarkdownPrepend(): boolean {
    return !this.content.trim().startsWith('#');
  }

  /**
   * Check if document is from an external source
   */
  isImported(): boolean {
    return !!this.importUrl;
  }

  /**
   * Check if document is part of an ephemeral batch
   */
  isEphemeral(): boolean {
    return !!this.ephemeralBatchId;
  }

  /**
   * Get reading time estimate in minutes
   * Assumes average reading speed of 200 words per minute
   */
  getEstimatedReadingTime(): number {
    const wordCount = this.getWordCount();
    return Math.ceil(wordCount / 200);
  }

  /**
   * Check if document content is within acceptable limits
   */
  isContentLengthValid(): { valid: boolean; error?: string } {
    const wordCount = this.getWordCount();

    if (this.content.length < MIN_DOCUMENT_CONTENT_LENGTH) {
      return { valid: false, error: `Content must be at least ${MIN_DOCUMENT_CONTENT_LENGTH} characters` };
    }

    if (this.content.length > MAX_DOCUMENT_CONTENT_LENGTH) {
      return { valid: false, error: `Content cannot exceed ${MAX_DOCUMENT_CONTENT_LENGTH.toLocaleString()} characters` };
    }

    if (wordCount > MAX_DOCUMENT_WORD_COUNT) {
      return { valid: false, error: `Content cannot exceed ${MAX_DOCUMENT_WORD_COUNT.toLocaleString()} words` };
    }

    return { valid: true };
  }

  /**
   * Get a slug-friendly version of the title
   */
  getSlug(): string {
    return this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Create a summary of the document for preview
   */
  getSummary(maxLength: number = 200): string {
    const plainText = this.content
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[^`]*```/gs, '')
      .trim();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    return plainText.substring(0, maxLength).trim() + '...';
  }
}

/**
 * Extended document entity that includes evaluations
 */
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
    name?: string | null;
    email?: string | null;
  };
  importUrl?: string;
  ephemeralBatchId?: string;
  reviews: any[]; // Will be properly typed with Evaluation entity
  intendedAgents: string[];
}

/**
 * Data required to create a new document
 */
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

/**
 * Data for updating a document
 */
export interface UpdateDocumentData {
  title?: string;
  content?: string;
  intendedAgentIds?: string[];
}
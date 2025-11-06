/**
 * Document Validator
 *
 * Handles all document validation logic.
 * Pure functions with no external dependencies.
 */

import {
  MAX_DOCUMENT_WORD_COUNT,
  MIN_DOCUMENT_CONTENT_LENGTH,
  MAX_DOCUMENT_CONTENT_LENGTH,
} from './constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidatedDocument {
  title: string;
  content: string;
  authors: string;
  publishedDate?: Date | null;
  url?: string | null;
  platforms?: string[];
}

export class DocumentValidator {
  private readonly MIN_CONTENT_LENGTH = MIN_DOCUMENT_CONTENT_LENGTH;
  private readonly MAX_CONTENT_LENGTH = MAX_DOCUMENT_CONTENT_LENGTH;
  private readonly MAX_WORD_COUNT = MAX_DOCUMENT_WORD_COUNT;
  private readonly MIN_TITLE_LENGTH = 1;
  private readonly MAX_TITLE_LENGTH = 200;
  private readonly MAX_AUTHOR_LENGTH = 100;
  private readonly MAX_URL_LENGTH = 500;
  private readonly MAX_PLATFORMS = 10;

  /**
   * Validate document data for creation
   */
  validateCreate(data: any): ValidationResult {
    const errors: string[] = [];

    // Content validation
    if (!data.content || typeof data.content !== 'string') {
      errors.push('Content is required and must be a string');
    } else {
      const contentErrors = this.validateContent(data.content);
      errors.push(...contentErrors);
    }

    // Title validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Title is required and must be a string');
    } else {
      const titleErrors = this.validateTitle(data.title);
      errors.push(...titleErrors);
    }

    // Authors validation
    if (!data.authors || typeof data.authors !== 'string') {
      errors.push('Author is required and must be a string');
    } else {
      const authorErrors = this.validateAuthor(data.authors);
      errors.push(...authorErrors);
    }

    // Optional fields validation
    if (data.url) {
      const urlErrors = this.validateUrl(data.url);
      errors.push(...urlErrors);
    }

    if (data.publishedDate) {
      const dateErrors = this.validatePublishedDate(data.publishedDate);
      errors.push(...dateErrors);
    }

    if (data.platforms) {
      const platformErrors = this.validatePlatforms(data.platforms);
      errors.push(...platformErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate document update data
   */
  validateUpdate(data: any): ValidationResult {
    const errors: string[] = [];

    if (data.content !== undefined) {
      if (typeof data.content !== 'string') {
        errors.push('Content must be a string');
      } else {
        const contentErrors = this.validateContent(data.content);
        errors.push(...contentErrors);
      }
    }

    if (data.title !== undefined) {
      if (typeof data.title !== 'string') {
        errors.push('Title must be a string');
      } else {
        const titleErrors = this.validateTitle(data.title);
        errors.push(...titleErrors);
      }
    }

    if (data.intendedAgentIds !== undefined) {
      if (!Array.isArray(data.intendedAgentIds)) {
        errors.push('Intended agent IDs must be an array');
      } else if (data.intendedAgentIds.some((id: any) => typeof id !== 'string')) {
        errors.push('All agent IDs must be strings');
      } else if (data.intendedAgentIds.length > 50) {
        errors.push('Cannot assign more than 50 agents to a document');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate content
   */
  private validateContent(content: string): string[] {
    const errors: string[] = [];
    const trimmedContent = content.trim();

    if (trimmedContent.length < this.MIN_CONTENT_LENGTH) {
      errors.push(`Content must be at least ${this.MIN_CONTENT_LENGTH} characters`);
    }

    if (trimmedContent.length > this.MAX_CONTENT_LENGTH) {
      errors.push(`Content cannot exceed ${this.MAX_CONTENT_LENGTH} characters`);
    }

    const wordCount = this.getWordCount(trimmedContent);
    if (wordCount > this.MAX_WORD_COUNT) {
      errors.push(`Content cannot exceed ${this.MAX_WORD_COUNT} words`);
    }

    return errors;
  }

  /**
   * Validate title
   */
  private validateTitle(title: string): string[] {
    const errors: string[] = [];
    const trimmedTitle = title.trim();

    if (trimmedTitle.length < this.MIN_TITLE_LENGTH) {
      errors.push('Title cannot be empty');
    }

    if (trimmedTitle.length > this.MAX_TITLE_LENGTH) {
      errors.push(`Title cannot exceed ${this.MAX_TITLE_LENGTH} characters`);
    }

    return errors;
  }

  /**
   * Validate author
   */
  private validateAuthor(author: string): string[] {
    const errors: string[] = [];
    const trimmedAuthor = author.trim();

    if (trimmedAuthor.length === 0) {
      errors.push('Author cannot be empty');
    }

    if (trimmedAuthor.length > this.MAX_AUTHOR_LENGTH) {
      errors.push(`Author name cannot exceed ${this.MAX_AUTHOR_LENGTH} characters`);
    }

    return errors;
  }

  /**
   * Validate URL
   */
  private validateUrl(url: string): string[] {
    const errors: string[] = [];

    if (typeof url !== 'string') {
      errors.push('URL must be a string');
      return errors;
    }

    if (url.length > this.MAX_URL_LENGTH) {
      errors.push(`URL cannot exceed ${this.MAX_URL_LENGTH} characters`);
    }

    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }

    return errors;
  }

  /**
   * Validate published date
   */
  private validatePublishedDate(date: any): string[] {
    const errors: string[] = [];

    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        errors.push('Invalid date');
      } else if (date > new Date()) {
        errors.push('Published date cannot be in the future');
      }
    } else if (typeof date === 'string') {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        errors.push('Invalid date format');
      } else if (parsed > new Date()) {
        errors.push('Published date cannot be in the future');
      }
    } else {
      errors.push('Published date must be a Date or date string');
    }

    return errors;
  }

  /**
   * Validate platforms
   */
  private validatePlatforms(platforms: any): string[] {
    const errors: string[] = [];

    if (!Array.isArray(platforms)) {
      errors.push('Platforms must be an array');
      return errors;
    }

    if (platforms.length > this.MAX_PLATFORMS) {
      errors.push(`Cannot have more than ${this.MAX_PLATFORMS} platforms`);
    }

    const invalidPlatforms = platforms.filter(p => typeof p !== 'string' || p.trim().length === 0);
    if (invalidPlatforms.length > 0) {
      errors.push('All platforms must be non-empty strings');
    }

    return errors;
  }

  /**
   * Get word count from content
   */
  private getWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Sanitize and prepare document data for creation
   */
  sanitizeCreateData(data: any): ValidatedDocument {
    return {
      title: this.sanitizeString(data.title, this.MAX_TITLE_LENGTH),
      content: this.sanitizeString(data.content, this.MAX_CONTENT_LENGTH),
      authors: this.sanitizeString(data.authors || 'Unknown', this.MAX_AUTHOR_LENGTH),
      publishedDate: this.sanitizeDate(data.publishedDate),
      url: data.url ? this.sanitizeString(data.url, this.MAX_URL_LENGTH) : null,
      platforms: this.sanitizePlatforms(data.platforms)
    };
  }

  /**
   * Sanitize string value
   */
  private sanitizeString(value: any, maxLength: number): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().substring(0, maxLength);
  }

  /**
   * Sanitize date value
   */
  private sanitizeDate(value: any): Date | null {
    if (!value) return null;
    
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    if (date > new Date()) return null;
    
    return date;
  }

  /**
   * Sanitize platforms array
   */
  private sanitizePlatforms(platforms: any): string[] {
    if (!Array.isArray(platforms)) return [];
    
    return platforms
      .filter(p => typeof p === 'string' && p.trim().length > 0)
      .map(p => p.trim())
      .slice(0, this.MAX_PLATFORMS);
  }

  /**
   * Generate title from content if not provided
   */
  generateTitleFromContent(content: string): string {
    // Remove markdown formatting
    const plainText = content
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[^`]*```/gs, '')
      .trim();

    // Get first sentence or first 50 characters
    const firstSentence = plainText.match(/^[^.!?]+[.!?]?/)?.[0] || plainText;
    const title = firstSentence.slice(0, 50).trim();
    
    // Add ellipsis if truncated
    return title.length < firstSentence.length ? `${title}...` : title;
  }
}
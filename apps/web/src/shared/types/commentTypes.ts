/**
 * Comment type definitions and adapters
 * 
 * This module provides type-safe conversions between AI package comments
 * and database comment structures.
 */

import type { Comment as AIComment } from '@roast/ai';
import type { Comment as DatabaseComment } from './databaseTypes';

/**
 * Extended comment interface that includes all possible fields
 * from both AI and database representations
 */
export interface ExtendedComment extends Partial<Omit<AIComment, 'metadata' | 'header' | 'level' | 'source'>> {
  // Required database fields
  id?: string;
  commentText?: string;
  commentType?: string;
  agentId?: string;
  
  // Optional fields that may come from AI (override to allow null)
  header?: string | null;
  level?: 'error' | 'warning' | 'info' | 'suggestion' | 'success' | null;
  source?: string | null;
  metadata?: Record<string, any> | null;
  
  // Legacy fields for compatibility
  description?: string;
  content?: string;
  text?: string;
}

/**
 * Type guard to check if a comment has the required database fields
 */
export function isValidDatabaseComment(comment: any): comment is DatabaseComment {
  return (
    typeof comment === 'object' &&
    comment !== null &&
    typeof comment.description === 'string'
  );
}

/**
 * Convert an AI comment to database format with proper null handling
 */
export function aiCommentToDatabaseComment(
  comment: AIComment | ExtendedComment,
  defaults: {
    id: string;
    evaluationId: string;
  }
): DatabaseComment {
  // Handle different text field names
  const description = 
    (comment as ExtendedComment).content || 
    comment.description || 
    (comment as any).text || 
    (comment as any).commentText ||
    '';

  // Note: highlight fields are now flat in the database comment structure,
  // but we're converting from AI comment which still has nested highlight
  const highlightStartOffset = comment.highlight?.startOffset ?? 0;
  const highlightEndOffset = comment.highlight?.endOffset ?? 0;
  const highlightQuotedText = comment.highlight?.quotedText ?? '';
  const highlightIsValid = comment.highlight?.isValid ?? true;
  const highlightPrefix = comment.highlight?.prefix ?? null;
  const highlightError = comment.highlight?.error ?? null;

  return {
    id: defaults.id,
    evaluationId: defaults.evaluationId,
    agentId: (comment as ExtendedComment).agentId || null,
    description,
    importance: comment.importance ?? null,
    grade: comment.grade ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Highlight fields are now flat in the database comment
    highlightStartOffset,
    highlightEndOffset,
    highlightQuotedText,
    highlightIsValid,
    highlightPrefix,
    highlightError,
    // Add any extended fields that might be in the comment
    ...(comment.header !== undefined && { header: comment.header }),
    ...(comment.level !== undefined && { level: comment.level }),
    ...(comment.source !== undefined && { source: comment.source }),
    ...(comment.metadata !== undefined && { metadata: comment.metadata }),
  } as DatabaseComment;
}

/**
 * Batch convert AI comments to database format
 */
export function aiCommentsToDatabaseComments(
  comments: (AIComment | ExtendedComment)[],
  evaluationId: string
): DatabaseComment[] {
  return comments.map((comment, index) => 
    aiCommentToDatabaseComment(comment, {
      id: `comment-${index}`,
      evaluationId,
    })
  );
}

/**
 * Type-safe property accessor for comments
 * Returns null instead of undefined for database compatibility
 */
export function getCommentProperty<T>(
  comment: ExtendedComment,
  property: keyof ExtendedComment,
  defaultValue: T | null = null
): T | null {
  const value = comment[property];
  return value !== undefined ? (value as T) : defaultValue;
}
/**
 * Type adapters for workflow data
 * 
 * Bridges the impedance mismatch between:
 * - Database layer: uses `null` for missing values (SQL convention)
 * - AI layer: uses `undefined` for optional properties (TypeScript convention)
 */

import type { Comment } from '../../shared/types';

/**
 * Database comment type (simplified for workflows)
 */
export interface DbComment extends Omit<Comment, 'grade' | 'importance' | 'highlight'> {
  grade: number | null;
  importance: number | null;
  highlight?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    isValid: boolean;
    prefix?: string | null;
    error?: string | null;
  };
}

/**
 * Convert AI package Comments to database-compatible format
 * Maps undefined -> null for database storage
 */
export function aiCommentsToDbComments(comments: Comment[]): DbComment[] {
  return comments.map(comment => ({
    ...comment,
    grade: comment.grade ?? null,
    importance: comment.importance ?? null,
    highlight: comment.highlight ? {
      ...comment.highlight,
      prefix: comment.highlight.prefix ?? null,
      error: comment.highlight.error ?? null,
    } : undefined
  }));
}
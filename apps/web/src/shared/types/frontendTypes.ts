/**
 * Frontend types that bridge database and UI components
 * 
 * These types represent the data structures used in UI components,
 * which may differ from database structures for better ergonomics.
 */

import type { Comment as DbComment } from './databaseTypes';

/**
 * Frontend Comment type with nested highlight structure
 * This is what UI components expect to work with
 */
export interface FrontendComment extends Omit<DbComment, 'highlightStartOffset' | 'highlightEndOffset' | 'highlightQuotedText' | 'highlightPrefix' | 'highlightError' | 'highlightIsValid'> {
  highlight?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    isValid: boolean;
    prefix?: string | null;
    error?: string | null;
  } | null;
}

/**
 * Convert database comment to frontend comment
 */
export function dbCommentToFrontend(comment: DbComment): FrontendComment {
  const { 
    highlightStartOffset,
    highlightEndOffset,
    highlightQuotedText,
    highlightPrefix,
    highlightError,
    highlightIsValid,
    ...rest 
  } = comment;
  
  return {
    ...rest,
    highlight: highlightQuotedText ? {
      startOffset: highlightStartOffset,
      endOffset: highlightEndOffset,
      quotedText: highlightQuotedText,
      isValid: highlightIsValid,
      prefix: highlightPrefix,
      error: highlightError,
    } : null,
  };
}

/**
 * Convert frontend comment to database comment
 */
export function frontendCommentToDb(comment: FrontendComment): DbComment {
  const { highlight, ...rest } = comment;
  
  return {
    ...rest,
    highlightStartOffset: highlight?.startOffset ?? 0,
    highlightEndOffset: highlight?.endOffset ?? 0,
    highlightQuotedText: highlight?.quotedText ?? '',
    highlightIsValid: highlight?.isValid ?? false,
    highlightPrefix: highlight?.prefix ?? null,
    highlightError: highlight?.error ?? null,
  } as DbComment;
}
import type { Comment as DbComment } from "@/types/databaseTypes";
import type { Comment as AiComment } from "@roast/ai";

/**
 * Unified comment type that works with both database and AI representations
 * This reduces the need for constant type conversions
 */
export interface UnifiedComment extends Omit<DbComment, 'importance' | 'grade' | 'highlight'> {
  // Optional fields that work with both null and undefined
  importance?: number | null;
  grade?: number | null;
  
  // Extended highlight type that handles both representations
  highlight?: {
    startOffset: number | null;
    endOffset: number | null;
    quotedText: string;
    isValid: boolean;
    prefix?: string | null;
    error?: string | null;
  } | null;
  
  // UI-specific extensions
  agentName?: string;
}

/**
 * Convert any comment type to UnifiedComment
 */
export function toUnifiedComment(comment: DbComment | AiComment, agentName?: string): UnifiedComment {
  return {
    ...comment,
    importance: comment.importance ?? null,
    grade: comment.grade ?? null,
    highlight: comment.highlight ? {
      ...comment.highlight,
      startOffset: comment.highlight.startOffset ?? null,
      endOffset: comment.highlight.endOffset ?? null,
      prefix: comment.highlight.prefix ?? null,
      error: comment.highlight.error ?? null,
    } : null,
    agentName,
  };
}

/**
 * Convert array of comments to unified format
 */
export function toUnifiedComments(
  comments: (DbComment | AiComment)[], 
  agentName?: string
): UnifiedComment[] {
  return comments.map(c => toUnifiedComment(c, agentName));
}
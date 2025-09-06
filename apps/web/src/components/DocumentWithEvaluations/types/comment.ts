import type { Comment as DbComment } from "@/shared/types/databaseTypes";
import type { Comment as AiComment } from "@roast/ai";

/**
 * Unified comment type that works with both database and AI representations
 * This reduces the need for constant type conversions
 */
export interface UnifiedComment extends Omit<DbComment, 'importance' | 'grade'> {
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
  // Check if this is a DbComment (has flat highlight fields) or AiComment (has nested highlight)
  const isDbComment = 'highlightStartOffset' in comment;
  
  if (isDbComment) {
    const dbComment = comment as DbComment;
    return {
      ...dbComment,
      importance: dbComment.importance ?? null,
      grade: dbComment.grade ?? null,
      highlight: {
        startOffset: dbComment.highlightStartOffset,
        endOffset: dbComment.highlightEndOffset,
        quotedText: dbComment.highlightQuotedText,
        isValid: dbComment.highlightIsValid,
        prefix: dbComment.highlightPrefix,
        error: dbComment.highlightError,
      },
      agentName,
    };
  } else {
    const aiComment = comment as AiComment;
    // For AiComment, we need to provide flat fields for DbComment compatibility
    // and normalize the nested highlight structure
    const highlight = aiComment.highlight;
    return {
      ...aiComment,
      // Flat highlight fields for DbComment compatibility
      highlightStartOffset: highlight?.startOffset ?? 0,
      highlightEndOffset: highlight?.endOffset ?? 0,
      highlightQuotedText: highlight?.quotedText ?? '',
      highlightPrefix: highlight?.prefix ?? null,
      highlightError: highlight?.error ?? null,
      highlightIsValid: highlight?.isValid ?? false,
      // Normalized optional fields
      importance: aiComment.importance ?? null,
      grade: aiComment.grade ?? null,
      // Normalized nested highlight
      highlight: highlight ? {
        startOffset: highlight.startOffset ?? null,
        endOffset: highlight.endOffset ?? null,
        quotedText: highlight.quotedText,
        isValid: highlight.isValid,
        prefix: highlight.prefix ?? null,
        error: highlight.error ?? null,
      } : null,
      agentName,
    } as UnifiedComment;
  }
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
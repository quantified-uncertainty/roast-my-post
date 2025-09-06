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
    return {
      ...aiComment,
      // Provide flat highlight fields for DbComment compatibility
      highlightStartOffset: aiComment.highlight?.startOffset ?? 0,
      highlightEndOffset: aiComment.highlight?.endOffset ?? 0,
      highlightQuotedText: aiComment.highlight?.quotedText ?? '',
      highlightPrefix: aiComment.highlight?.prefix ?? null,
      highlightError: aiComment.highlight?.error ?? null,
      highlightIsValid: aiComment.highlight?.isValid ?? false,
      importance: aiComment.importance ?? null,
      grade: aiComment.grade ?? null,
      highlight: aiComment.highlight 
        ? {
            ...aiComment.highlight,
            startOffset: aiComment.highlight.startOffset ?? null,
            endOffset: aiComment.highlight.endOffset ?? null,
            prefix: aiComment.highlight.prefix ?? null,
            error: aiComment.highlight.error ?? null,
          } 
        : null,
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
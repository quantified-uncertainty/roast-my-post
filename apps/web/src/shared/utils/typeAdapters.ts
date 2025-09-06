/**
 * Type adapters between database types and AI package types
 * 
 * This bridges the impedance mismatch between:
 * - Database layer: uses `null` for missing values (SQL convention)
 * - AI layer: uses `undefined` for optional properties (TypeScript convention)
 */

import type { Comment as AiComment, Evaluation as AiEvaluation } from '@roast/ai';
import type { Comment as DbComment, Evaluation as DbEvaluation } from '@/shared/types/databaseTypes';
import type { FrontendComment } from '@/shared/types/frontendTypes';

/**
 * Convert database Comment to AI package Comment
 * Maps null -> undefined for optional fields
 */
export function dbCommentToAiComment(dbComment: DbComment): AiComment {
  return {
    ...dbComment,
    importance: dbComment.importance ?? 0,
    grade: dbComment.grade ?? undefined,
    // Convert flat highlight fields to nested structure
    highlight: {
      startOffset: dbComment.highlightStartOffset,
      endOffset: dbComment.highlightEndOffset,
      quotedText: dbComment.highlightQuotedText,
      isValid: dbComment.highlightIsValid,
      prefix: dbComment.highlightPrefix ?? undefined,
      error: dbComment.highlightError ?? undefined,
    }
  };
}

/**
 * Convert frontend Comment to AI package Comment
 * Frontend comment already has nested highlight structure
 */
export function frontendCommentToAiComment(frontendComment: FrontendComment): AiComment {
  const highlight = frontendComment.highlight;
  return {
    ...frontendComment,
    importance: frontendComment.importance ?? 0,
    grade: frontendComment.grade ?? undefined,
    highlight: highlight ? {
      startOffset: highlight.startOffset,
      endOffset: highlight.endOffset,
      quotedText: highlight.quotedText,
      isValid: highlight.isValid,
      prefix: highlight.prefix ?? undefined,
      error: highlight.error ?? undefined,
    } : {
      startOffset: 0,
      endOffset: 0,
      quotedText: '',
      isValid: false,
    }
  };
}

/**
 * Convert AI package Comment to database Comment
 * Maps undefined -> null for database storage
 */
export function aiCommentToDbComment(aiComment: AiComment): Omit<DbComment, 'id' | 'evaluationId' | 'createdAt' | 'updatedAt' | 'agentId'> {
  return {
    description: aiComment.description,
    importance: aiComment.importance ?? null,
    grade: aiComment.grade ?? null,
    reasoning: (aiComment as any).reasoning,
    // Convert nested highlight to flat fields
    highlightStartOffset: aiComment.highlight.startOffset,
    highlightEndOffset: aiComment.highlight.endOffset,
    highlightQuotedText: aiComment.highlight.quotedText,
    highlightIsValid: aiComment.highlight.isValid ?? true,
    highlightPrefix: aiComment.highlight.prefix ?? null,
    highlightError: aiComment.highlight.error ?? null,
  } as Omit<DbComment, 'id' | 'evaluationId' | 'createdAt' | 'updatedAt' | 'agentId'>;
}

/**
 * Convert array of database Comments to AI package Comments
 */
export function dbCommentsToAiComments(dbComments: DbComment[]): AiComment[] {
  return dbComments.map(dbCommentToAiComment);
}

/**
 * Convert array of AI package Comments to database Comments
 */
export function aiCommentsToDbComments(aiComments: AiComment[]): Omit<DbComment, 'id' | 'evaluationId' | 'createdAt' | 'updatedAt' | 'agentId'>[] {
  return aiComments.map(aiCommentToDbComment);
}

/**
 * Convert database Evaluation to AI package Evaluation
 * Maps nested comments using comment adapters
 */
export function dbEvaluationToAiEvaluation(dbEvaluation: DbEvaluation): AiEvaluation {
  return {
    ...dbEvaluation,
    comments: dbCommentsToAiComments(dbEvaluation.comments)
  } as AiEvaluation;
}

/**
 * Convert array of database Evaluations to AI package Evaluations
 */
export function dbEvaluationsToAiEvaluations(dbEvaluations: DbEvaluation[]): AiEvaluation[] {
  return dbEvaluations.map(dbEvaluationToAiEvaluation);
}
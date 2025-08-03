/**
 * Type adapters between database types and AI package types
 * 
 * This bridges the impedance mismatch between:
 * - Database layer: uses `null` for missing values (SQL convention)
 * - AI layer: uses `undefined` for optional properties (TypeScript convention)
 */

import type { Comment as AiComment, Evaluation as AiEvaluation } from '@roast/ai';
import type { Comment as DbComment, Evaluation as DbEvaluation } from '@/types/databaseTypes';

/**
 * Convert database Comment to AI package Comment
 * Maps null -> undefined for optional fields
 */
export function dbCommentToAiComment(dbComment: DbComment): AiComment {
  return {
    ...dbComment,
    importance: dbComment.importance ?? 0,
    grade: dbComment.grade ?? undefined,
    highlight: dbComment.highlight ? {
      ...dbComment.highlight,
      prefix: dbComment.highlight.prefix ?? undefined,
      error: dbComment.highlight.error ?? undefined,
    } : {
      startOffset: 0,
      endOffset: 0,
      quotedText: '',
      isValid: false
    }
  };
}

/**
 * Convert AI package Comment to database Comment
 * Maps undefined -> null for database storage
 */
export function aiCommentToDbComment(aiComment: AiComment): Omit<DbComment, 'id' | 'evaluationId' | 'createdAt' | 'updatedAt' | 'agentId'> {
  return {
    ...aiComment,
    importance: aiComment.importance ?? null,
    grade: aiComment.grade ?? null,
    highlight: aiComment.highlight ? {
      ...aiComment.highlight,
      prefix: aiComment.highlight.prefix ?? null,
      error: aiComment.highlight.error ?? null,
    } : undefined
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
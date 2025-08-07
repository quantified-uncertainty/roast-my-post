/**
 * Type utilities for converting between AI package types and database types
 */

import type { Comment as AIComment } from "@roast/ai";
import type { Comment as DBComment } from "@/shared/types/databaseTypes";

/**
 * Type guard to check if an AI Comment has required fields for database storage
 */
export function isValidDBComment(comment: AIComment): comment is AIComment & {
  description: string;
  highlight: NonNullable<AIComment['highlight']>;
} {
  return !!(
    comment.description &&
    comment.highlight &&
    typeof comment.highlight.isValid === 'boolean'
  );
}

/**
 * Convert AI package Comment to database Comment with proper validation
 */
export function convertToDBComment(aiComment: AIComment, agentId?: string): DBComment {
  if (!isValidDBComment(aiComment)) {
    throw new Error(`Invalid comment structure: missing required fields (description, highlight, or highlight.isValid)`);
  }

  return {
    ...aiComment,
    description: aiComment.description,
    highlight: aiComment.highlight,
    agentId,
  } as DBComment;
}

/**
 * Convert array of AI Comments to database Comments, filtering out invalid ones
 */
export function convertToDBComments(aiComments: AIComment[], agentId?: string): DBComment[] {
  return aiComments
    .filter(isValidDBComment)
    .map(comment => convertToDBComment(comment, agentId));
}
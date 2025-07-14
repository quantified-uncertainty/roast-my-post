/**
 * Validation utilities for spelling/grammar analysis
 */

import { ValidationError } from "./errors";
import { 
  MIN_CHUNK_SIZE, 
  MAX_CHUNK_SIZE
} from "./constants";
import type { SpellingGrammarHighlight } from "./types";
import type { Comment } from "../../../types/documentSchema";

/**
 * Validate document size
 */
export function validateDocumentSize(content: string): void {
  const MAX_DOCUMENT_SIZE = 500_000; // 500KB limit
  
  if (content.length > MAX_DOCUMENT_SIZE) {
    throw new ValidationError(
      `Document too large: ${content.length} characters exceeds maximum of ${MAX_DOCUMENT_SIZE}`,
      { size: content.length, maxSize: MAX_DOCUMENT_SIZE }
    );
  }
}

/**
 * Validate chunk size
 */
export function validateChunkSize(chunkSize: number): number {
  if (chunkSize < MIN_CHUNK_SIZE) {
    throw new ValidationError(
      `Chunk size ${chunkSize} is below minimum of ${MIN_CHUNK_SIZE}`,
      { chunkSize, minSize: MIN_CHUNK_SIZE }
    );
  }
  
  if (chunkSize > MAX_CHUNK_SIZE) {
    throw new ValidationError(
      `Chunk size ${chunkSize} exceeds maximum of ${MAX_CHUNK_SIZE}`,
      { chunkSize, maxSize: MAX_CHUNK_SIZE }
    );
  }
  
  return chunkSize;
}

/**
 * Validate highlight offsets
 */
export function validateHighlightOffsets(
  highlight: SpellingGrammarHighlight,
  documentLength: number
): void {
  // Check line numbers are positive
  if (highlight.lineStart < 1 || highlight.lineEnd < 1) {
    throw new ValidationError(
      'Line numbers must be positive',
      highlight,
      { documentLength }
    );
  }
  
  // Check line start <= line end
  if (highlight.lineStart > highlight.lineEnd) {
    throw new ValidationError(
      'Line start cannot be after line end',
      highlight,
      { documentLength }
    );
  }
  
  // Check highlighted text is not empty
  if (!highlight.highlightedText || highlight.highlightedText.trim().length === 0) {
    throw new ValidationError(
      'Highlighted text cannot be empty',
      highlight
    );
  }
  
  // Check description is meaningful
  if (!highlight.description || highlight.description.length < 10) {
    throw new ValidationError(
      'Description must be at least 10 characters',
      highlight
    );
  }
}

/**
 * Validate comment before adding to results
 */
export function validateComment(comment: unknown): void {
  // Type guard
  const commentObj = comment as Comment;
  
  if (!commentObj.highlight) {
    throw new ValidationError('Comment missing highlight', comment);
  }
  
  const { startOffset, endOffset, quotedText } = commentObj.highlight;
  
  if (typeof startOffset !== 'number' || startOffset < 0) {
    throw new ValidationError(
      'Invalid start offset',
      comment,
      { startOffset }
    );
  }
  
  if (typeof endOffset !== 'number' || endOffset <= startOffset) {
    throw new ValidationError(
      'Invalid end offset',
      comment,
      { startOffset, endOffset }
    );
  }
  
  if (!quotedText || typeof quotedText !== 'string') {
    throw new ValidationError(
      'Missing or invalid quoted text',
      comment
    );
  }
}

/**
 * Validate grade is within acceptable range
 */
export function validateGrade(grade: number): number {
  if (grade < 0 || grade > 100) {
    throw new ValidationError(
      `Grade ${grade} must be between 0 and 100`,
      { grade }
    );
  }
  return grade;
}

/**
 * Validate concurrency setting
 */
export function validateConcurrency(concurrency: number): number {
  const MIN_CONCURRENCY = 1;
  const MAX_CONCURRENCY = 10;
  
  if (concurrency < MIN_CONCURRENCY || concurrency > MAX_CONCURRENCY) {
    throw new ValidationError(
      `Concurrency ${concurrency} must be between ${MIN_CONCURRENCY} and ${MAX_CONCURRENCY}`,
      { concurrency, min: MIN_CONCURRENCY, max: MAX_CONCURRENCY }
    );
  }
  
  return concurrency;
}
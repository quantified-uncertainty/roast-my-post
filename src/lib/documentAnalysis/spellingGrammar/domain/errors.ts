/**
 * Domain objects for spelling and grammar errors
 * These are immutable value objects representing core concepts
 */

import { ErrorType, ErrorSeverity } from '../../shared/errorCategorization';

/**
 * Represents a spelling or grammar error found in the document
 */
export class SpellingGrammarError {
  constructor(
    public readonly lineStart: number,
    public readonly lineEnd: number,
    public readonly highlightedText: string,
    public readonly description: string,
    public readonly errorType: ErrorType,
    public readonly severity: ErrorSeverity
  ) {
    Object.freeze(this);
  }

  /**
   * Check if this error is similar to another (for deduplication)
   */
  isSimilarTo(other: SpellingGrammarError): boolean {
    return (
      this.errorType === other.errorType &&
      this.highlightedText.toLowerCase() === other.highlightedText.toLowerCase()
    );
  }

  /**
   * Get a unique key for this error type
   */
  getGroupKey(): string {
    return `${this.errorType}:${this.highlightedText.toLowerCase().trim()}`;
  }
}

// Re-export error types and severity from shared module for backward compatibility
export { ErrorType, ErrorSeverity } from '../../shared/errorCategorization';

/**
 * A group of similar errors
 */
export class ErrorGroup {
  constructor(
    public readonly errorType: ErrorType,
    public readonly baseError: string,
    public readonly examples: SpellingGrammarError[],
    public readonly severity: ErrorSeverity
  ) {
    Object.freeze(this);
  }

  get count(): number {
    return this.examples.length;
  }

  /**
   * Add an example to this group (returns new instance)
   */
  addExample(error: SpellingGrammarError): ErrorGroup {
    return new ErrorGroup(
      this.errorType,
      this.baseError,
      [...this.examples, error],
      this.severity
    );
  }
}

/**
 * Processed results containing grouped errors
 */
export class ProcessedErrorResults {
  constructor(
    public readonly errorGroups: ErrorGroup[],
    public readonly conventionIssues?: ConventionIssue
  ) {
    Object.freeze(this);
  }

  get uniqueErrorCount(): number {
    return this.errorGroups.length;
  }

  get totalErrorCount(): number {
    return this.errorGroups.reduce((sum, group) => sum + group.count, 0);
  }
}

/**
 * Convention consistency issue
 */
export class ConventionIssue {
  constructor(
    public readonly description: string,
    public readonly examples: string[]
  ) {
    Object.freeze(this);
  }
}
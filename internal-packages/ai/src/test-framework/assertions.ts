import type { AnalysisResult } from '../analysis-plugins/types';
import type { Comment } from '../shared/types';
import type { TestExpectations } from './types';

/**
 * Unified assertion utilities for all test types
 */

export class TestAssertions {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Assert analysis result matches expectations
   */
  assertAnalysisResult(
    actual: AnalysisResult,
    expectations: TestExpectations
  ): void {
    // Comment assertions
    if (expectations.comments) {
      this.assertComments(actual.comments, expectations.comments);
    }

    // Analysis assertions
    if (expectations.analysis) {
      this.assertAnalysis(actual, expectations.analysis);
    }

    // Performance assertions
    if (expectations.performance) {
      this.assertPerformance(actual, expectations.performance);
    }
  }

  private assertComments(
    comments: Comment[],
    expectations: NonNullable<TestExpectations['comments']>
  ): void {
    // Count assertions
    if (expectations.count) {
      const count = comments.length;
      if (expectations.count.exact !== undefined && count !== expectations.count.exact) {
        this.errors.push(`Expected exactly ${expectations.count.exact} comments, got ${count}`);
      }
      if (expectations.count.min !== undefined && count < expectations.count.min) {
        this.errors.push(`Expected at least ${expectations.count.min} comments, got ${count}`);
      }
      if (expectations.count.max !== undefined && count > expectations.count.max) {
        this.errors.push(`Expected at most ${expectations.count.max} comments, got ${count}`);
      }
    }

    // Content assertions
    const allText = comments
      .map(c => `${c.description || ''} ${c.highlight?.quotedText || ''}`)
      .join(' ')
      .toLowerCase();

    if (expectations.mustFind) {
      for (const text of expectations.mustFind) {
        if (!allText.includes(text.toLowerCase())) {
          this.errors.push(`Expected to find "${text}" in comments`);
        }
      }
    }

    if (expectations.mustNotFind) {
      for (const text of expectations.mustNotFind) {
        if (allText.includes(text.toLowerCase())) {
          this.errors.push(`Expected NOT to find "${text}" in comments`);
        }
      }
    }

    // Highlight assertions
    if (expectations.highlights) {
      this.assertHighlights(comments, expectations.highlights);
    }
  }

  private assertHighlights(
    comments: Comment[],
    expectations: NonNullable<TestExpectations['comments']>['highlights']
  ): void {
    if (!expectations) return;

    if (expectations.verifyPositions) {
      for (const comment of comments) {
        if (comment.highlight) {
          if (comment.highlight.startOffset < 0) {
            this.errors.push(`Invalid highlight start position: ${comment.highlight.startOffset}`);
          }
          if (comment.highlight.endOffset <= comment.highlight.startOffset) {
            this.errors.push(`Invalid highlight range: ${comment.highlight.startOffset}-${comment.highlight.endOffset}`);
          }
        }
      }
    }

    if (expectations.verifyNoOverlaps) {
      const highlights = comments
        .filter(c => c.highlight)
        .map(c => c.highlight!)
        .sort((a, b) => a.startOffset - b.startOffset);

      for (let i = 1; i < highlights.length; i++) {
        if (highlights[i].startOffset < highlights[i - 1].endOffset) {
          this.errors.push(
            `Overlapping highlights: [${highlights[i - 1].startOffset}-${highlights[i - 1].endOffset}] and [${highlights[i].startOffset}-${highlights[i].endOffset}]`
          );
        }
      }
    }
  }

  private assertAnalysis(
    result: AnalysisResult,
    expectations: NonNullable<TestExpectations['analysis']>
  ): void {
    if (expectations.summaryContains) {
      for (const text of expectations.summaryContains) {
        if (!result.summary.toLowerCase().includes(text.toLowerCase())) {
          this.errors.push(`Expected summary to contain "${text}"`);
        }
      }
    }

    if (expectations.analysisContains) {
      for (const text of expectations.analysisContains) {
        if (!result.analysis.toLowerCase().includes(text.toLowerCase())) {
          this.errors.push(`Expected analysis to contain "${text}"`);
        }
      }
    }

    if (expectations.grade) {
      if (result.grade === undefined) {
        this.warnings.push('Expected grade but none provided');
      } else {
        if (expectations.grade.min !== undefined && result.grade < expectations.grade.min) {
          this.errors.push(`Grade ${result.grade} below minimum ${expectations.grade.min}`);
        }
        if (expectations.grade.max !== undefined && result.grade > expectations.grade.max) {
          this.errors.push(`Grade ${result.grade} above maximum ${expectations.grade.max}`);
        }
      }
    }
  }

  private assertPerformance(
    result: AnalysisResult,
    expectations: NonNullable<TestExpectations['performance']>
  ): void {
    if (expectations.maxCost !== undefined && result.cost > expectations.maxCost) {
      this.errors.push(`Cost $${result.cost.toFixed(4)} exceeds maximum $${expectations.maxCost.toFixed(4)}`);
    }
  }

  getErrors(): string[] {
    return this.errors;
  }

  getWarnings(): string[] {
    return this.warnings;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  clear(): void {
    this.errors = [];
    this.warnings = [];
  }
}

/**
 * Jest-compatible assertion helpers
 */
export function expectAnalysisResult(
  actual: AnalysisResult,
  expectations: TestExpectations
): void {
  const assertions = new TestAssertions();
  assertions.assertAnalysisResult(actual, expectations);
  
  if (assertions.hasErrors()) {
    throw new Error(assertions.getErrors().join('\n'));
  }
  
  // Log warnings but don't fail
  const warnings = assertions.getWarnings();
  if (warnings.length > 0) {
    console.warn('Test warnings:', warnings.join('\n'));
  }
}

/**
 * Helper to check if comments overlap
 */
export function hasOverlappingHighlights(comments: Comment[]): boolean {
  const highlights = comments
    .filter(c => c.highlight)
    .map(c => c.highlight!)
    .sort((a, b) => a.startOffset - b.startOffset);

  for (let i = 1; i < highlights.length; i++) {
    if (highlights[i].startOffset < highlights[i - 1].endOffset) {
      return true;
    }
  }
  return false;
}

/**
 * Helper to validate highlight positions
 */
export function validateHighlightPositions(
  comments: Comment[],
  documentLength: number
): string[] {
  const errors: string[] = [];
  
  for (const comment of comments) {
    if (comment.highlight) {
      if (comment.highlight.startOffset < 0) {
        errors.push(`Negative start position: ${comment.highlight.startOffset}`);
      }
      if (comment.highlight.endOffset > documentLength) {
        errors.push(`End position ${comment.highlight.endOffset} exceeds document length ${documentLength}`);
      }
      if (comment.highlight.endOffset <= comment.highlight.startOffset) {
        errors.push(`Invalid range: ${comment.highlight.startOffset}-${comment.highlight.endOffset}`);
      }
    }
  }
  
  return errors;
}
import type { AnalysisResult } from '../../types';
import type { Comment } from '../../../shared/types';

/**
 * Simplified test expectations interface
 * Uses plain objects instead of builder pattern
 */
export interface TestExpectations {
  comments?: {
    min?: number;
    max?: number;
    exact?: number;
    mustFind?: string[];
    mustNotFind?: string[];
    verifyHighlights?: boolean;
  };
  analysis?: {
    summaryContains?: string[];
    analysisContains?: string[];
    minGrade?: number;
    maxGrade?: number;
  };
  performance?: {
    maxCost?: number;
    maxTimeMs?: number;
  };
}

/**
 * Test case type for table-driven tests
 */
export interface PluginTestCase {
  name: string;
  document: string;
  expectations: TestExpectations;
  skip?: boolean;
  only?: boolean;
}

/**
 * Legacy test expectations for backward compatibility
 */
export interface LegacyTestExpectations {
  minComments?: number;
  maxComments?: number;
  exactComments?: number;
  mustFindTexts?: string[];
  mustNotFindTexts?: string[];
  summaryContains?: string[];
  analysisContains?: string[];
  minGrade?: number;
  maxGrade?: number;
  maxCost?: number;
  verifyHighlights?: boolean;
}

/**
 * Simple assertion function for analysis results
 * Supports both new nested structure and legacy flat structure
 */
export function assertAnalysisResult(
  result: AnalysisResult,
  expectations: TestExpectations | LegacyTestExpectations,
  testName?: string
): void {
  // Check if it's legacy format (flat structure)
  if ('minComments' in expectations || 'maxComments' in expectations || 
      'mustFindTexts' in expectations || 'summaryContains' in expectations) {
    return assertAnalysisResultLegacy(result, expectations as LegacyTestExpectations, testName);
  }
  
  // New nested structure
  return assertAnalysisResultNested(result, expectations as TestExpectations, testName);
}

/**
 * Handle legacy flat expectations structure
 */
function assertAnalysisResultLegacy(
  result: AnalysisResult,
  expectations: LegacyTestExpectations,
  testName?: string
): void {
  const context = testName ? ` [${testName}]` : '';

  // Comment count assertions
  if (expectations.exactComments !== undefined) {
    expect(result.comments.length).toBe(expectations.exactComments);
  }
  if (expectations.minComments !== undefined) {
    expect(result.comments.length).toBeGreaterThanOrEqual(expectations.minComments);
  }
  if (expectations.maxComments !== undefined) {
    expect(result.comments.length).toBeLessThanOrEqual(expectations.maxComments);
  }

  // Content assertions
  if (expectations.mustFindTexts && expectations.mustFindTexts.length > 0) {
    const allCommentText = result.comments
      .map(c => `${c.description || ''} ${c.highlight?.quotedText || ''}`)
      .join(' ')
      .toLowerCase();

    expectations.mustFindTexts.forEach(text => {
      expect(allCommentText).toContain(text.toLowerCase());
    });
  }

  if (expectations.mustNotFindTexts && expectations.mustNotFindTexts.length > 0) {
    const allCommentText = result.comments
      .map(c => `${c.description || ''} ${c.highlight?.quotedText || ''}`)
      .join(' ')
      .toLowerCase();

    expectations.mustNotFindTexts.forEach(text => {
      expect(allCommentText).not.toContain(text.toLowerCase());
    });
  }

  // Summary and analysis assertions
  if (expectations.summaryContains) {
    expectations.summaryContains.forEach(text => {
      expect(result.summary.toLowerCase()).toContain(text.toLowerCase());
    });
  }

  if (expectations.analysisContains) {
    expectations.analysisContains.forEach(text => {
      expect(result.analysis.toLowerCase()).toContain(text.toLowerCase());
    });
  }

  // Grade assertions
  if (expectations.minGrade !== undefined && result.grade !== undefined) {
    expect(result.grade).toBeGreaterThanOrEqual(expectations.minGrade);
  }
  if (expectations.maxGrade !== undefined && result.grade !== undefined) {
    expect(result.grade).toBeLessThanOrEqual(expectations.maxGrade);
  }

  // Cost assertion
  if (expectations.maxCost !== undefined) {
    expect(result.cost).toBeLessThanOrEqual(expectations.maxCost);
  }

  // Highlight validation
  if (expectations.verifyHighlights) {
    assertValidHighlights(result.comments, context);
  }
}

/**
 * Handle new nested expectations structure
 */
function assertAnalysisResultNested(
  result: AnalysisResult,
  expectations: TestExpectations,
  testName?: string
): void {
  const context = testName ? ` [${testName}]` : '';

  // Comment count assertions
  if (expectations.comments) {
    const { min, max, exact, mustFind, mustNotFind, verifyHighlights } = expectations.comments;
    const commentCount = result.comments.length;

    if (exact !== undefined) {
      expect(commentCount).toBe(exact);
    }
    if (min !== undefined) {
      expect(commentCount).toBeGreaterThanOrEqual(min);
    }
    if (max !== undefined) {
      expect(commentCount).toBeLessThanOrEqual(max);
    }

    // Content assertions
    if (mustFind && mustFind.length > 0) {
      const allCommentText = result.comments
        .map(c => `${c.description || ''} ${c.highlight?.quotedText || ''}`)
        .join(' ')
        .toLowerCase();

      mustFind.forEach(text => {
        expect(allCommentText).toContain(text.toLowerCase());
      });
    }

    if (mustNotFind && mustNotFind.length > 0) {
      const allCommentText = result.comments
        .map(c => `${c.description || ''} ${c.highlight?.quotedText || ''}`)
        .join(' ')
        .toLowerCase();

      mustNotFind.forEach(text => {
        expect(allCommentText).not.toContain(text.toLowerCase());
      });
    }

    // Highlight validation
    if (verifyHighlights) {
      assertValidHighlights(result.comments, context);
    }
  }

  // Analysis assertions
  if (expectations.analysis) {
    const { summaryContains, analysisContains, minGrade, maxGrade } = expectations.analysis;

    if (summaryContains) {
      summaryContains.forEach(text => {
        expect(result.summary.toLowerCase()).toContain(text.toLowerCase());
      });
    }

    if (analysisContains) {
      analysisContains.forEach(text => {
        expect(result.analysis.toLowerCase()).toContain(text.toLowerCase());
      });
    }

    if (minGrade !== undefined && result.grade !== undefined) {
      expect(result.grade).toBeGreaterThanOrEqual(minGrade);
    }
    if (maxGrade !== undefined && result.grade !== undefined) {
      expect(result.grade).toBeLessThanOrEqual(maxGrade);
    }
  }

  // Performance assertions
  if (expectations.performance) {
    const { maxCost } = expectations.performance;
    // Note: maxTimeMs is tracked at test level, not assertion level

    if (maxCost !== undefined) {
      expect(result.cost).toBeLessThanOrEqual(maxCost);
    }
    // Note: maxTimeMs would be checked at the test level, not here
  }
}

/**
 * Helper to validate highlight positions
 */
function assertValidHighlights(comments: Comment[], _context: string): void {
  const highlightedComments = comments.filter(c => c.highlight);
  
  highlightedComments.forEach((comment) => {
    const highlight = comment.highlight!;
    
    // Check valid positions
    expect(highlight.startOffset).toBeGreaterThanOrEqual(0);
    expect(highlight.endOffset).toBeGreaterThan(highlight.startOffset);
    
    // Check for quoted text
    if (highlight.quotedText) {
      expect(highlight.quotedText.length).toBeGreaterThan(0);
    }
  });

  // Check for overlapping highlights
  const sortedHighlights = highlightedComments
    .map(c => c.highlight!)
    .sort((a, b) => a.startOffset - b.startOffset);

  for (let i = 1; i < sortedHighlights.length; i++) {
    const prev = sortedHighlights[i - 1];
    const curr = sortedHighlights[i];
    
    // Highlights should not overlap
    expect(curr.startOffset).toBeGreaterThanOrEqual(prev.endOffset);
  }
}

/**
 * Helper to measure performance of async operations
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>
): Promise<{ result: T; timeMs: number }> {
  const startTime = Date.now();
  const result = await fn();
  const timeMs = Date.now() - startTime;
  return { result, timeMs };
}

/**
 * Helper to log test results in a consistent format
 */
export function logTestResult(
  testName: string,
  result: AnalysisResult,
  timeMs: number
): void {
  console.log(`
Test: ${testName}
  Comments: ${result.comments.length}
  Grade: ${result.grade ?? 'N/A'}
  Cost: $${result.cost.toFixed(4)}
  Time: ${timeMs}ms
  `);
}

/**
 * Skip tests when no API key is available
 */
export const describeIfApiKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '' 
  ? describe 
  : describe.skip;

/**
 * Helper to create test cases with defaults
 */
export function createTestCase(
  name: string,
  document: string,
  expectations: TestExpectations
): PluginTestCase {
  return { name, document, expectations };
}
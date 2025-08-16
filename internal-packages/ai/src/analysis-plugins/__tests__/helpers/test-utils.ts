import type { AnalysisResult } from '../../types';
import type { Comment } from '../../../shared/types';

export interface TestExpectations {
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

export function assertAnalysisResult(
  result: AnalysisResult,
  expectations: TestExpectations,
  testName: string
): void {
  // Check comment count
  if (expectations.exactComments !== undefined) {
    expect(result.comments.length).toBe(expectations.exactComments);
  } else {
    if (expectations.minComments !== undefined) {
      expect(result.comments.length).toBeGreaterThanOrEqual(expectations.minComments);
    }
    if (expectations.maxComments !== undefined) {
      expect(result.comments.length).toBeLessThanOrEqual(expectations.maxComments);
    }
  }

  // Check for required texts in comments
  if (expectations.mustFindTexts) {
    const allCommentTexts = result.comments
      .map(c => `${c.description || ''} ${c.correction || ''}`)
      .join(' ')
      .toLowerCase();
    
    for (const text of expectations.mustFindTexts) {
      expect(allCommentTexts).toContain(text.toLowerCase());
    }
  }

  // Check texts that should NOT be found
  if (expectations.mustNotFindTexts) {
    const allCommentTexts = result.comments
      .map(c => `${c.description || ''} ${c.correction || ''}`)
      .join(' ')
      .toLowerCase();
    
    for (const text of expectations.mustNotFindTexts) {
      expect(allCommentTexts).not.toContain(text.toLowerCase());
    }
  }

  // Check summary content
  if (expectations.summaryContains) {
    for (const text of expectations.summaryContains) {
      expect(result.summary.toLowerCase()).toContain(text.toLowerCase());
    }
  }

  // Check analysis content
  if (expectations.analysisContains) {
    for (const text of expectations.analysisContains) {
      expect(result.analysis.toLowerCase()).toContain(text.toLowerCase());
    }
  }

  // Check grade
  if (result.grade !== undefined) {
    if (expectations.minGrade !== undefined) {
      expect(result.grade).toBeGreaterThanOrEqual(expectations.minGrade);
    }
    if (expectations.maxGrade !== undefined) {
      expect(result.grade).toBeLessThanOrEqual(expectations.maxGrade);
    }
  }

  // Check cost
  if (expectations.maxCost !== undefined) {
    expect(result.cost).toBeLessThanOrEqual(expectations.maxCost);
  }

  // Verify highlight positions
  if (expectations.verifyHighlights) {
    for (const comment of result.comments) {
      if (comment.highlight) {
        expect(comment.highlight.start).toBeGreaterThanOrEqual(0);
        expect(comment.highlight.end).toBeGreaterThan(comment.highlight.start);
      }
    }
  }
}

export function measurePerformance<T>(
  fn: () => Promise<T>
): Promise<{ result: T; timeMs: number }> {
  const startTime = Date.now();
  return fn().then(result => ({
    result,
    timeMs: Date.now() - startTime
  }));
}

export function createTestDocument(sections: Record<string, string>): string {
  return Object.entries(sections)
    .map(([title, content]) => `## ${title}\n\n${content}`)
    .join('\n\n');
}

export function logTestResult(
  testName: string,
  result: AnalysisResult,
  timeMs: number
): void {
  console.log(`\n=== ${testName} ===`);
  console.log(`Comments: ${result.comments.length}`);
  console.log(`Grade: ${result.grade ?? 'N/A'}`);
  console.log(`Cost: $${result.cost.toFixed(4)}`);
  console.log(`Time: ${timeMs}ms`);
  console.log(`Summary: ${result.summary.substring(0, 100)}...`);
}
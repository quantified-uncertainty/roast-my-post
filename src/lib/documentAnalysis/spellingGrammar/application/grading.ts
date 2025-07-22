/**
 * Pure functions for grade calculation
 */

import { ProcessedErrorResults } from '../domain';
import { GRADE_THRESHOLDS, ERROR_DENSITY_WORD_BASE } from '../constants';

/**
 * Calculate a smart grade based on error density and severity
 */
export function calculateSmartGrade(
  results: ProcessedErrorResults,
  wordCount: number
): number {
  // Base calculation on unique errors per 100 words
  // const errorDensity = results.uniqueErrorCount / (wordCount / ERROR_DENSITY_WORD_BASE);
  
  // Count errors by severity
  const severityCounts = { high: 0, medium: 0, low: 0 };
  results.errorGroups.forEach(group => {
    severityCounts[group.severity] += 1; // Count unique errors, not total occurrences
  });
  
  // Calculate weighted score
  // High severity errors have 3x impact, medium 2x, low 1x
  const weightedErrors = 
    (severityCounts.high * 3) + 
    (severityCounts.medium * 2) + 
    (severityCounts.low * 1);
  
  const weightedDensity = weightedErrors / (wordCount / ERROR_DENSITY_WORD_BASE);
  
  // Convert to grade (0-100 scale)
  let grade: number;
  
  if (weightedDensity === 0) {
    grade = 100;
  } else if (weightedDensity < 0.5) {
    grade = 95; // Nearly perfect
  } else if (weightedDensity < 1) {
    grade = 90; // Excellent with minor issues
  } else if (weightedDensity < 2) {
    grade = 85; // Good but noticeable errors
  } else if (weightedDensity < 3) {
    grade = 75; // Needs improvement
  } else if (weightedDensity < 5) {
    grade = 65; // Significant issues
  } else if (weightedDensity < 8) {
    grade = 50; // Major problems
  } else {
    grade = 30; // Severe issues throughout
  }
  
  // Additional penalty for convention issues
  if (results.conventionIssues) {
    grade = Math.max(0, grade - 5);
  }
  
  return Math.round(grade);
}

/**
 * Get grade category based on score
 */
export function getGradeCategory(grade: number): string {
  if (grade >= GRADE_THRESHOLDS.EXCELLENT) {
    return 'Excellent';
  } else if (grade >= GRADE_THRESHOLDS.GOOD) {
    return 'Good';
  } else if (grade >= GRADE_THRESHOLDS.NEEDS_IMPROVEMENT) {
    return 'Needs Improvement';
  } else if (grade >= GRADE_THRESHOLDS.SIGNIFICANT_ISSUES) {
    return 'Significant Issues';
  } else {
    return 'Major Problems';
  }
}

/**
 * Get grade description based on score
 */
export function getGradeDescription(grade: number): string {
  if (grade >= GRADE_THRESHOLDS.EXCELLENT) {
    return '✅ Excellent! Very few errors found - professional quality writing.';
  } else if (grade >= GRADE_THRESHOLDS.GOOD) {
    return 'Good job! Minor errors that don\'t significantly impact readability.';
  } else if (grade >= GRADE_THRESHOLDS.NEEDS_IMPROVEMENT) {
    return 'Needs improvement. Several errors affect the document\'s quality.';
  } else if (grade >= GRADE_THRESHOLDS.SIGNIFICANT_ISSUES) {
    return 'Significant issues. Many errors detract from professionalism.';
  } else {
    return 'Major problems. Extensive errors severely impact readability.';
  }
}

/**
 * Calculate error statistics for logging
 */
export function calculateErrorStatistics(results: ProcessedErrorResults, wordCount: number) {
  const errorsByType: Record<string, number> = {};
  const errorsBySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
  
  results.errorGroups.forEach(group => {
    errorsByType[group.errorType] = (errorsByType[group.errorType] || 0) + group.count;
    errorsBySeverity[group.severity] += group.count;
  });
  
  const errorDensity = results.uniqueErrorCount / (wordCount / ERROR_DENSITY_WORD_BASE);
  
  return {
    uniqueErrors: results.uniqueErrorCount,
    totalOccurrences: results.totalErrorCount,
    errorDensity: errorDensity.toFixed(2),
    errorsByType,
    errorsBySeverity,
    hasConventionIssues: !!results.conventionIssues
  };
}
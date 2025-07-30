/**
 * Grading functionality for spelling/grammar analysis
 */

import type { SpellingGrammarError } from "./index";

export interface GradeResult {
  grade: number; // 0-100
  category: string;
  description: string;
  statistics: {
    totalErrors: number;
    errorDensity: number; // errors per 100 words
    errorsByType: Record<string, number>;
    errorsBySeverity: {
      critical: number; // 76-100 importance
      major: number;    // 51-75 importance
      minor: number;    // 26-50 importance
      trivial: number;  // 0-25 importance
    };
  };
}

const GRADE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 80,
  NEEDS_IMPROVEMENT: 70,
  SIGNIFICANT_ISSUES: 50,
} as const;

/**
 * Calculate a grade based on error density and severity
 */
export function calculateGrade(
  errors: SpellingGrammarError[],
  wordCount: number
): GradeResult {
  // Count errors by severity based on importance scores
  const errorsBySeverity = {
    critical: 0,
    major: 0,
    minor: 0,
    trivial: 0,
  };

  const errorsByType: Record<string, number> = {
    spelling: 0,
    grammar: 0,
  };

  for (const error of errors) {
    // Categorize by type
    errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;

    // Categorize by severity based on importance
    if (error.importance > 75) {
      errorsBySeverity.critical++;
    } else if (error.importance > 50) {
      errorsBySeverity.major++;
    } else if (error.importance > 25) {
      errorsBySeverity.minor++;
    } else {
      errorsBySeverity.trivial++;
    }
  }

  // Calculate weighted error score
  // Critical errors have 4x impact, major 3x, minor 2x, trivial 1x
  const weightedErrors =
    errorsBySeverity.critical * 4 +
    errorsBySeverity.major * 3 +
    errorsBySeverity.minor * 2 +
    errorsBySeverity.trivial * 1;

  // Calculate error density per 100 words
  const errorDensity = (weightedErrors / wordCount) * 100;

  // Convert to grade (0-100 scale)
  let grade: number;

  if (errorDensity === 0) {
    grade = 100;
  } else if (errorDensity < 0.5) {
    grade = 95; // Nearly perfect
  } else if (errorDensity < 1) {
    grade = 90; // Excellent with minor issues
  } else if (errorDensity < 2) {
    grade = 85; // Good but noticeable errors
  } else if (errorDensity < 3) {
    grade = 75; // Needs improvement
  } else if (errorDensity < 5) {
    grade = 65; // Significant issues
  } else if (errorDensity < 8) {
    grade = 50; // Major problems
  } else {
    grade = 30; // Severe issues throughout
  }

  // Get category and description
  const category = getGradeCategory(grade);
  const description = getGradeDescription(grade);

  return {
    grade: Math.round(grade),
    category,
    description,
    statistics: {
      totalErrors: errors.length,
      errorDensity: Math.round(errorDensity * 100) / 100,
      errorsByType,
      errorsBySeverity,
    },
  };
}

/**
 * Get grade category based on score
 */
function getGradeCategory(grade: number): string {
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
function getGradeDescription(grade: number): string {
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
 * Count words in text (simple implementation)
 */
export function countWords(text: string): number {
  // Remove extra whitespace and split by whitespace
  const words = text.trim().split(/\s+/);
  
  // Filter out empty strings
  const validWords = words.filter(word => word.length > 0);
  
  return validWords.length;
}

/**
 * Generate a summary of the grading result
 */
export function generateGradeSummary(gradeResult: GradeResult): string {
  const { grade, category, statistics } = gradeResult;
  
  let summary = `${category} (${grade}/100)\n\n`;
  
  if (statistics.totalErrors === 0) {
    summary += 'No spelling or grammar errors detected.';
  } else {
    summary += `Found ${statistics.totalErrors} error${statistics.totalErrors !== 1 ? 's' : ''}:\n`;
    
    // Break down by type
    const typeParts: string[] = [];
    if (statistics.errorsByType.spelling > 0) {
      typeParts.push(`${statistics.errorsByType.spelling} spelling`);
    }
    if (statistics.errorsByType.grammar > 0) {
      typeParts.push(`${statistics.errorsByType.grammar} grammar`);
    }
    summary += `• ${typeParts.join(', ')}\n`;
    
    // Break down by severity
    const severityParts: string[] = [];
    if (statistics.errorsBySeverity.critical > 0) {
      severityParts.push(`${statistics.errorsBySeverity.critical} critical`);
    }
    if (statistics.errorsBySeverity.major > 0) {
      severityParts.push(`${statistics.errorsBySeverity.major} major`);
    }
    if (statistics.errorsBySeverity.minor > 0) {
      severityParts.push(`${statistics.errorsBySeverity.minor} minor`);
    }
    if (statistics.errorsBySeverity.trivial > 0) {
      severityParts.push(`${statistics.errorsBySeverity.trivial} trivial`);
    }
    summary += `• Severity: ${severityParts.join(', ')}\n`;
    
    summary += `• Error density: ${statistics.errorDensity} per 100 words`;
  }
  
  return summary;
}
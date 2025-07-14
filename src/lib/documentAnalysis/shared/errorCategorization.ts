/**
 * Shared error categorization utilities
 */

export enum ErrorType {
  SPELLING = 'spelling',
  GRAMMAR = 'grammar',
  PUNCTUATION = 'punctuation',
  CAPITALIZATION = 'capitalization',
  WORD_CHOICE = 'word_choice',
  CONSISTENCY = 'consistency',
  OTHER = 'other'
}

export enum ErrorSeverity {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Categorize an error based on its description
 */
export function categorizeError(description: string): ErrorType {
  const desc = description.toLowerCase();
  
  if (desc.includes('spelling') || desc.includes('misspell') || desc.includes('typo')) {
    return ErrorType.SPELLING;
  } else if (desc.includes('punctuation') || desc.includes('comma') || desc.includes('period') || 
             desc.includes('semicolon') || desc.includes('colon') || desc.includes('apostrophe') ||
             desc.includes('space after') || desc.includes('missing space')) {
    return ErrorType.PUNCTUATION;
  } else if (desc.includes('capital') || desc.includes('uppercase') || desc.includes('lowercase') || 
             desc.includes('case')) {
    return ErrorType.CAPITALIZATION;
  } else if (desc.includes('grammar') || desc.includes('verb') || desc.includes('subject') ||
             desc.includes('tense') || desc.includes('syntax') || desc.includes('agreement')) {
    return ErrorType.GRAMMAR;
  } else if (desc.includes('word choice') || desc.includes('word confusion') || 
             desc.includes('wrong word') || desc.includes('confused word')) {
    return ErrorType.WORD_CHOICE;
  } else if (desc.includes('consistency') || desc.includes('inconsistent') || desc.includes('mixed') ||
             desc.includes('american') || desc.includes('british')) {
    return ErrorType.CONSISTENCY;
  }
  
  return ErrorType.OTHER;
}

/**
 * Determine error severity based on type and description
 */
export function determineSeverity(errorType: ErrorType, description: string): ErrorSeverity {
  const desc = description.toLowerCase();
  
  // Low severity: citation formatting, spacing issues, style preferences
  if (desc.includes('citation') || desc.includes('footnote') || 
      desc.includes('space after') || desc.includes('missing space') ||
      desc.includes('space before citation') || desc.includes('style') || 
      desc.includes('preference')) {
    return ErrorSeverity.LOW;
  }
  
  // High severity: actual misspellings, wrong words, significant grammar errors
  if (errorType === ErrorType.SPELLING && !desc.includes('consistency') && !desc.includes('correct')) {
    return ErrorSeverity.HIGH;
  }
  if (errorType === ErrorType.GRAMMAR && !desc.includes('style') && !desc.includes('preference')) {
    return ErrorSeverity.HIGH;
  }
  if (errorType === ErrorType.WORD_CHOICE) {
    return ErrorSeverity.HIGH;
  }
  
  // Everything else is medium
  return ErrorSeverity.MEDIUM;
}

/**
 * Map severity to importance score (for highlight ranking)
 */
export const SEVERITY_TO_IMPORTANCE: Record<ErrorSeverity, number> = {
  [ErrorSeverity.HIGH]: 8,
  [ErrorSeverity.MEDIUM]: 5,
  [ErrorSeverity.LOW]: 3
};

/**
 * Map severity to grade impact
 */
export const SEVERITY_TO_GRADE: Record<ErrorSeverity, number> = {
  [ErrorSeverity.HIGH]: 20,
  [ErrorSeverity.MEDIUM]: 40,
  [ErrorSeverity.LOW]: 60
};
/**
 * Application layer exports
 * Pure business logic functions
 */

// Analysis functions
export {
  buildConventionContext,
  buildSystemPrompt,
  buildUserPrompt,
  validateError,
  categorizeError,
  determineSeverity
} from './analysis';

// Processing functions
export {
  groupSimilarErrors,
  detectConventionIssues,
  processErrors,
  cleanErrorDescription,
  createErrorTypeBreakdown,
  formatErrorBreakdown
} from './processing';

// Grading functions
export {
  calculateSmartGrade,
  getGradeCategory,
  getGradeDescription,
  calculateErrorStatistics
} from './grading';
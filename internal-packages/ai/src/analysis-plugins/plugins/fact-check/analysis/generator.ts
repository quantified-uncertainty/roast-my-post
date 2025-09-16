import type { VerifiedFact } from '../VerifiedFact';
import { generateSummary, generateAnalysisSummary } from './markdown';

export interface AnalysisResult {
  summary: string;
  analysisSummary: string;
}

/**
 * Generate analysis summary and detailed report for fact-checking results.
 * This function coordinates the analysis generation while delegating
 * markdown formatting to pure functions.
 */
export function generateAnalysis(facts: VerifiedFact[]): AnalysisResult {
  const summary = generateSummary(facts);
  const analysisSummary = generateAnalysisSummary(facts);

  return { summary, analysisSummary };
}
/**
 * Language convention types used throughout the application
 */

export type LanguageConvention = 'US' | 'UK';
export type LanguageConventionOption = LanguageConvention | 'auto';

export interface LanguageConventionDetectionResult {
  convention: LanguageConvention;
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: LanguageConvention;
  }>;
}
/**
 * Tool metadata for testing and consistency
 * This centralizes tool configuration to avoid hardcoding in tests
 */

export const toolMetadata = {
  'check-math': {
    buttonText: 'Check',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Multiplication',
  },
  'check-math-hybrid': {
    buttonText: 'Check',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Unit Conversion',
  },
  'check-math-with-mathjs': {
    buttonText: 'Check',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Unit Math',
  },
  'check-spelling-grammar': {
    buttonText: 'Check',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Subject-Verb Agreement',
  },
  'fact-checker': {
    buttonText: 'Check',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'False Statement',
  },
  'extract-factual-claims': {
    buttonText: 'Extract',
    exampleButtonType: 'numbered' as const,
    exampleIndex: 1,
  },
  'extract-forecasting-claims': {
    buttonText: 'Extract',
    exampleButtonType: 'descriptive' as const, // Full text examples
    exampleIndex: 1,
    exampleText: 'The S&P 500 will likely reach 6,000 points by the end of 2025',
  },
  'detect-language-convention': {
    buttonText: 'Process',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'She travelled to the centre of town',
  },
  'document-chunker': {
    buttonText: 'Process',
    exampleButtonType: 'numbered' as const,
    exampleIndex: 1,
  },
  'extract-math-expressions': {
    buttonText: 'Extract',
    exampleButtonType: 'numbered' as const,
    exampleIndex: 1,
  },
  'fuzzy-text-locator': {
    buttonText: 'Process',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 0,
    exampleText: 'The quick brown fox jumps over the lazy dog',
  },
  'link-validator': {
    buttonText: 'Process',
    exampleButtonType: 'numbered' as const,
    exampleIndex: 1,
  },
  'perplexity-research': {
    buttonText: 'Process',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 2, // Use a middle example
    exampleText: 'CRISPR safety advances and regulatory updates',
  },
  'forecaster': {
    buttonText: 'Process',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Economic Prediction',
  }
} as const;

export type ToolId = keyof typeof toolMetadata;
/**
 * Tool metadata for testing and consistency
 * This centralizes tool configuration to avoid hardcoding in tests
 */

export const toolMetadata = {
  'math-validator-llm': {
    buttonText: 'Check',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Multiplication',
  },
  'math-validator-hybrid': {
    buttonText: 'Check',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Unit Conversion',
  },
  'math-validator-mathjs': {
    buttonText: 'Check',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Unit Math',
  },
  'spelling-grammar-checker': {
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
  'factual-claims-extractor': {
    buttonText: 'Extract',
    exampleButtonType: 'numbered' as const,
    exampleIndex: 1,
  },
  'binary-forecasting-claims-extractor': {
    buttonText: 'Extract',
    exampleButtonType: 'descriptive' as const, // Full text examples
    exampleIndex: 1,
    exampleText: 'The S&P 500 will likely reach 6,000 points by the end of 2025',
  },
  'language-convention-detector': {
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
  'math-expressions-extractor': {
    buttonText: 'Extract',
    exampleButtonType: 'numbered' as const,
    exampleIndex: 1,
  },
  'smart-text-searcher': {
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
  'perplexity-researcher': {
    buttonText: 'Process',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 2, // Use a middle example
    exampleText: 'CRISPR safety advances and regulatory updates',
  },
  'binary-forecaster': {
    buttonText: 'Process',
    exampleButtonType: 'descriptive' as const,
    exampleIndex: 1,
    exampleText: 'Economic Prediction',
  }
} as const;

export type ToolId = keyof typeof toolMetadata;
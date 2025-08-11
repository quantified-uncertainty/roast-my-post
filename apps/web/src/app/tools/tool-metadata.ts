/**
 * Tool metadata for testing and consistency
 * This centralizes tool configuration to avoid hardcoding in tests
 */

export const toolMetadata = {
  'check-math': {
    buttonText: 'Check Statement',
    exampleIndex: 1, // Use middle example
  },
  'check-math-hybrid': {
    buttonText: 'Check Statement',
    exampleIndex: 1,
  },
  'check-math-with-mathjs': {
    buttonText: 'Verify Statement',
    exampleIndex: 1,
  },
  'check-spelling-grammar': {
    buttonText: 'Check Text',
    exampleIndex: 1,
  },
  'fact-checker': {
    buttonText: 'Check Facts',
    exampleIndex: 1,
  },
  'extract-factual-claims': {
    buttonText: 'Extract Claims',
    exampleIndex: 1,
  },
  'extract-forecasting-claims': {
    buttonText: 'Extract Forecasts',
    exampleIndex: 1,
  },
  'detect-language-convention': {
    buttonText: 'Detect Convention',
    exampleIndex: 1,
  },
  'document-chunker': {
    buttonText: 'Chunk Document',
    exampleIndex: 1,
  },
  'extract-math-expressions': {
    buttonText: 'Extract Math Expressions',
    exampleIndex: 1,
  },
  'fuzzy-text-locator': {
    buttonText: 'Find Text',
    exampleIndex: 0, // This tool might have different example structure
  },
  'link-validator': {
    buttonText: 'Validate Links',
    exampleIndex: 1,
  },
  'perplexity-research': {
    buttonText: 'Research Query',
    exampleIndex: 2, // Use a middle example
  },
  'forecaster': {
    buttonText: 'Generate Forecast',
    exampleIndex: 1,
  }
} as const;

export type ToolId = keyof typeof toolMetadata;
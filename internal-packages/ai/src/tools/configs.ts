// Tool configurations for client-side use (no implementations)
// These can be safely imported in browser code

export const toolConfigs = {
  checkMath: {
    id: 'check-math',
    name: 'Check Math',
    path: '/tools/check-math',
    description: 'Verify mathematical statements and calculations'
  },
  checkMathWithMathJs: {
    id: 'check-math-with-mathjs',
    name: 'Check Math with MathJS',
    path: '/tools/check-math-with-mathjs',
    description: 'Verify mathematical statements using an agentic approach with Claude and MathJS'
  },
  checkMathHybrid: {
    id: 'check-math-hybrid',
    name: 'Check Math Hybrid',
    path: '/tools/check-math-hybrid',
    description: 'Hybrid math checking with multiple approaches'
  },
  factChecker: {
    id: 'fact-checker',
    name: 'Fact Checker',
    path: '/tools/fact-checker',
    description: 'Verify factual claims using various sources'
  },
  forecaster: {
    id: 'forecaster',
    name: 'Forecaster',
    path: '/tools/forecaster',
    description: 'Generate predictions and forecasts'
  },
  fuzzyTextLocator: {
    id: 'fuzzy-text-locator',
    name: 'Fuzzy Text Locator',
    path: '/tools/fuzzy-text-locator',
    description: 'Find text locations with fuzzy matching'
  },
  documentChunker: {
    id: 'document-chunker',
    name: 'Document Chunker',
    path: '/tools/document-chunker',
    description: 'Split documents into manageable chunks'
  },
  extractForecastingClaims: {
    id: 'extract-forecasting-claims',
    name: 'Extract Forecasting Claims',
    path: '/tools/extract-forecasting-claims',
    description: 'Extract forecasting claims from text'
  },
  extractFactualClaims: {
    id: 'extract-factual-claims',
    name: 'Extract Factual Claims',
    path: '/tools/extract-factual-claims',
    description: 'Extract factual claims from text'
  },
  checkSpellingGrammar: {
    id: 'check-spelling-grammar',
    name: 'Check Spelling & Grammar',
    path: '/tools/check-spelling-grammar',
    description: 'Check spelling and grammar in text'
  },
  extractMathExpressions: {
    id: 'extract-math-expressions',
    name: 'Extract Math Expressions',
    path: '/tools/extract-math-expressions',
    description: 'Extract mathematical expressions from text'
  },
  detectLanguageConvention: {
    id: 'detect-language-convention',
    name: 'Detect Language Convention',
    path: '/tools/detect-language-convention',
    description: 'Detect language conventions in text'
  },
  perplexityResearch: {
    id: 'perplexity-research',
    name: 'Perplexity Research',
    path: '/tools/perplexity-research',
    description: 'Research topics using Perplexity API'
  }
} as const;
// Tool configurations for client-side use (no implementations)
// These can be safely imported in browser code
// Structure matches original tool.config format

export const checkMathTool = {
  config: {
    id: 'check-math',
    name: 'Check Math',
    path: '/tools/check-math',
    description: 'Verify mathematical statements and calculations'
  }
};

export const checkMathWithMathJsTool = {
  config: {
    id: 'check-math-with-mathjs',
    name: 'Check Math with MathJS',
    path: '/tools/check-math-with-mathjs',
    description: 'Verify mathematical statements using an agentic approach with Claude and MathJS'
  }
};

export const checkMathHybridTool = {
  config: {
    id: 'check-math-hybrid',
    name: 'Check Math Hybrid',
    path: '/tools/check-math-hybrid',
    description: 'Hybrid math checking with multiple approaches'
  }
};

export const factCheckerTool = {
  config: {
    id: 'fact-checker',
    name: 'Fact Checker',
    path: '/tools/fact-checker',
    description: 'Verify factual claims using various sources'
  }
};

export const forecasterTool = {
  config: {
    id: 'forecaster',
    name: 'Forecaster',
    path: '/tools/forecaster',
    description: 'Generate predictions and forecasts'
  }
};

export const fuzzyTextLocatorTool = {
  config: {
    id: 'fuzzy-text-locator',
    name: 'Fuzzy Text Locator',
    path: '/tools/fuzzy-text-locator',
    description: 'Find text locations with fuzzy matching'
  }
};

export const documentChunkerTool = {
  config: {
    id: 'document-chunker',
    name: 'Document Chunker',
    path: '/tools/document-chunker',
    description: 'Split documents into manageable chunks'
  }
};

export const extractForecastingClaimsTool = {
  config: {
    id: 'extract-forecasting-claims',
    name: 'Extract Forecasting Claims',
    path: '/tools/extract-forecasting-claims',
    description: 'Extract forecasting claims from text'
  }
};

export const extractFactualClaimsTool = {
  config: {
    id: 'extract-factual-claims',
    name: 'Extract Factual Claims',
    path: '/tools/extract-factual-claims',
    description: 'Extract factual claims from text'
  }
};

export const checkSpellingGrammarTool = {
  config: {
    id: 'check-spelling-grammar',
    name: 'Check Spelling & Grammar',
    path: '/tools/check-spelling-grammar',
    description: 'Check spelling and grammar in text'
  }
};

export const extractMathExpressionsTool = {
  config: {
    id: 'extract-math-expressions',
    name: 'Extract Math Expressions',
    path: '/tools/extract-math-expressions',
    description: 'Extract mathematical expressions from text'
  }
};

export const detectLanguageConventionTool = {
  config: {
    id: 'detect-language-convention',
    name: 'Detect Language Convention',
    path: '/tools/detect-language-convention',
    description: 'Detect language conventions in text'
  }
};

export const perplexityResearchTool = {
  config: {
    id: 'perplexity-research',
    name: 'Perplexity Research',
    path: '/tools/perplexity-research',
    description: 'Research topics using Perplexity API'
  }
};

// Tool metadata for the tools page
const toolMetadata = [
  { ...checkMathTool.config, category: 'analysis', status: 'stable' },
  { ...checkMathWithMathJsTool.config, category: 'analysis', status: 'beta' },
  { ...checkMathHybridTool.config, category: 'analysis', status: 'experimental' },
  { ...factCheckerTool.config, category: 'research', status: 'beta' },
  { ...forecasterTool.config, category: 'research', status: 'beta' },
  { ...fuzzyTextLocatorTool.config, category: 'utility', status: 'stable' },
  { ...documentChunkerTool.config, category: 'utility', status: 'stable' },
  { ...extractForecastingClaimsTool.config, category: 'analysis', status: 'beta' },
  { ...extractFactualClaimsTool.config, category: 'analysis', status: 'beta' },
  { ...checkSpellingGrammarTool.config, category: 'analysis', status: 'stable' },
  { ...extractMathExpressionsTool.config, category: 'analysis', status: 'beta' },
  { ...detectLanguageConventionTool.config, category: 'analysis', status: 'beta' },
  { ...perplexityResearchTool.config, category: 'research', status: 'beta' }
];

// Tool registry for client-side use
export const toolRegistry = {
  'check-math': checkMathTool,
  'check-math-with-mathjs': checkMathWithMathJsTool,
  'check-math-hybrid': checkMathHybridTool,
  'fact-checker': factCheckerTool,
  'forecaster': forecasterTool,
  'fuzzy-text-locator': fuzzyTextLocatorTool,
  'document-chunker': documentChunkerTool,
  'extract-forecasting-claims': extractForecastingClaimsTool,
  'extract-factual-claims': extractFactualClaimsTool,
  'check-spelling-grammar': checkSpellingGrammarTool,
  'extract-math-expressions': extractMathExpressionsTool,
  'detect-language-convention': detectLanguageConventionTool,
  'perplexity-research': perplexityResearchTool,
  
  // Method to get metadata for tools page
  getMetadata: () => toolMetadata
};
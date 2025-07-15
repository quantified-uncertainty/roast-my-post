/**
 * Tool Registry
 * Central registry of all available experimental tools
 */

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'forecasting' | 'analysis' | 'extraction' | 'testing' | 'research';
  path: string;
  status: 'stable' | 'experimental' | 'beta';
}

export const tools: Tool[] = [
  {
    id: 'forecaster-simple',
    name: 'Simple Forecaster',
    description: 'Generate a probability forecast for any question using 6 independent Claude analyses',
    category: 'forecasting',
    path: '/tools/forecaster-simple',
    status: 'experimental'
  },
  {
    id: 'extract-forecastable-claims',
    name: 'Extract Forecastable Claims',
    description: 'Extract prediction-like statements from any text and identify which ones are worth detailed analysis',
    category: 'extraction',
    path: '/tools/extract-forecastable-claims',
    status: 'experimental'
  },
  {
    id: 'math-checker',
    name: 'Math Error Checker',
    description: 'Check a piece of text for mathematical errors and incorrect calculations',
    category: 'analysis',
    path: '/tools/math-checker',
    status: 'beta'
  },
  {
    id: 'fact-checker',
    name: 'Fact Checker',
    description: 'Verify factual claims in text using web search (demonstration mode)',
    category: 'analysis',
    path: '/tools/fact-checker',
    status: 'experimental'
  },
  {
    id: 'perplexity-research',
    name: 'Perplexity Research',
    description: 'Research any query using Perplexity AI to find relevant links and information',
    category: 'research',
    path: '/tools/perplexity-research',
    status: 'experimental'
  }
];

export function getToolById(id: string): Tool | undefined {
  return tools.find(tool => tool.id === id);
}

export function getToolsByCategory(category: Tool['category']): Tool[] {
  return tools.filter(tool => tool.category === category);
}
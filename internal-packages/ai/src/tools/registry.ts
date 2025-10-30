import { Tool } from './base/Tool';
import forecasterTool from './binary-forecaster';
import factCheckerTool from './fact-checker';
import checkMathTool from './math-validator-llm';
import checkMathWithMathJsTool from './math-validator-mathjs';
import checkMathHybridTool from './math-validator-hybrid';
import extractForecastingClaimsTool from './binary-forecasting-claims-extractor';
import perplexityResearchTool from './perplexity-researcher';
import extractFactualClaimsTool from './factual-claims-extractor';
import checkSpellingGrammarTool from './spelling-grammar-checker';
import extractMathExpressionsTool from './math-expressions-extractor';
import documentChunkerTool from './document-chunker';
import fuzzyTextLocatorTool from './smart-text-searcher';
import { detectLanguageConventionTool } from './language-convention-detector';
import { linkValidator } from './link-validator';
import claimEvaluatorTool from './claim-evaluator';

// Tool registry to manage all available tools
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  
  constructor() {
    // Register all available tools
    this.register(forecasterTool);
    this.register(factCheckerTool);
    this.register(checkMathTool);
    this.register(checkMathWithMathJsTool);
    this.register(checkMathHybridTool);
    this.register(extractForecastingClaimsTool);
    this.register(perplexityResearchTool);
    this.register(extractFactualClaimsTool);
    this.register(checkSpellingGrammarTool);
    this.register(extractMathExpressionsTool);
    this.register(documentChunkerTool);
    this.register(fuzzyTextLocatorTool);
    this.register(detectLanguageConventionTool);
    this.register(linkValidator);
    this.register(claimEvaluatorTool);
  }
  
  register(tool: Tool): void {
    if (this.tools.has(tool.config.id)) {
      throw new Error(`Tool with id "${tool.config.id}" is already registered`);
    }
    this.tools.set(tool.config.id, tool);
  }
  
  get(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }
  
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  getByCategory(category: 'extraction' | 'checker' | 'research' | 'utility'): Tool[] {
    return this.getAll().filter(tool => tool.config.category === category);
  }
  
  // Get tool metadata for listing/discovery
  getMetadata() {
    return this.getAll().map(tool => ({
      id: tool.config.id,
      name: tool.config.name,
      description: tool.config.description,
      version: tool.config.version,
      category: tool.config.category,
      costEstimate: tool.config.costEstimate,
      path: tool.config.path,
      status: tool.config.status
    }));
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
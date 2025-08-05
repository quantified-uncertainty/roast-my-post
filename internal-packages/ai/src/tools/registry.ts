import { Tool } from './base/Tool';
import forecasterTool from './forecaster';
import factCheckerTool from './fact-checker';
import checkMathTool from './check-math';
import checkMathWithMathJsTool from './check-math-with-mathjs';
import checkMathHybridTool from './check-math-hybrid';
import extractForecastingClaimsTool from './extract-forecasting-claims';
import perplexityResearchTool from './perplexity-research';
import extractFactualClaimsTool from './extract-factual-claims';
import checkSpellingGrammarTool from './check-spelling-grammar';
import extractMathExpressionsTool from './extract-math-expressions';
import documentChunkerTool from './document-chunker';
import fuzzyTextLocatorTool from './fuzzy-text-locator';
import { detectLanguageConventionTool } from './detect-language-convention';
import { linkValidator } from './link-validator';

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
  
  getByCategory(category: 'analysis' | 'research' | 'utility'): Tool[] {
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
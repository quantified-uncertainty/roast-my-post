import { Tool } from './base/Tool';
import ForecasterTool from './forecaster';
import FactCheckTool from './fact-check';
import CheckMathTool from './check-math';
import ExtractForecastingClaimsTool from './extract-forecasting-claims';
import PerplexityResearchTool from './perplexity-research';
import ExtractFactualClaimsTool from './extract-factual-claims';
import CheckSpellingGrammarTool from './check-spelling-grammar';

// Tool registry to manage all available tools
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  
  constructor() {
    // Register all available tools
    this.register(ForecasterTool);
    this.register(FactCheckTool);
    this.register(CheckMathTool);
    this.register(ExtractForecastingClaimsTool);
    this.register(PerplexityResearchTool);
    this.register(ExtractFactualClaimsTool);
    this.register(CheckSpellingGrammarTool);
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
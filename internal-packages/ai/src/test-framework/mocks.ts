import type { AnalysisResult, SimpleAnalysisPlugin } from '../analysis-plugins/types';
import type { RichLLMInteraction } from '../types';
import type { MockConfig } from './types';
import { AnalysisResultFactory, LLMInteractionFactory } from './factories';

/**
 * Mock utilities for testing plugins, tools, and agents
 */

export class MockPlugin implements SimpleAnalysisPlugin {
  private mockResult: AnalysisResult;
  private delay: number;
  public callCount = 0;
  public lastInput: { chunks: any; documentText: string } | null = null;

  constructor(
    private pluginName: string,
    result?: AnalysisResult,
    delay = 0
  ) {
    this.mockResult = result || AnalysisResultFactory.success();
    this.delay = delay;
  }

  name = () => this.pluginName;
  promptForWhenToUse = () => `Mock plugin ${this.pluginName}`;
  routingExamples = () => [];
  getCost = () => this.mockResult.cost || 0;
  getDebugInfo = () => ({ mock: true, plugin: this.pluginName });

  async analyze(chunks: any, documentText: string): Promise<AnalysisResult> {
    this.callCount++;
    this.lastInput = { chunks, documentText };
    
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    return this.mockResult;
  }

  setResult(result: AnalysisResult): void {
    this.mockResult = result;
  }

  reset(): void {
    this.callCount = 0;
    this.lastInput = null;
  }
}

export class MockToolExecutor {
  private responses = new Map<string, any>();
  private callHistory: Array<{ tool: string; input: any; timestamp: Date }> = [];

  setResponse(toolName: string, response: any): void {
    this.responses.set(toolName, response);
  }

  async execute(toolName: string, input: any): Promise<any> {
    this.callHistory.push({ tool: toolName, input, timestamp: new Date() });
    
    const response = this.responses.get(toolName);
    if (!response) {
      throw new Error(`No mock response configured for tool: ${toolName}`);
    }
    
    // Support function responses for dynamic mocking
    if (typeof response === 'function') {
      return response(input);
    }
    
    return response;
  }

  getCallHistory(toolName?: string): typeof this.callHistory {
    if (toolName) {
      return this.callHistory.filter(call => call.tool === toolName);
    }
    return this.callHistory;
  }

  reset(): void {
    this.callHistory = [];
  }
}

export class MockLLMClient {
  private responses: RichLLMInteraction[] = [];
  private currentIndex = 0;
  public interactions: RichLLMInteraction[] = [];

  setResponses(responses: RichLLMInteraction[]): void {
    this.responses = responses;
    this.currentIndex = 0;
  }

  addResponse(response: RichLLMInteraction): void {
    this.responses.push(response);
  }

  async call(prompt: string): Promise<{ response: string; interaction: RichLLMInteraction }> {
    if (this.currentIndex >= this.responses.length) {
      throw new Error('No more mock LLM responses available');
    }
    
    const mockInteraction = this.responses[this.currentIndex++];
    const interaction = {
      ...mockInteraction,
      prompt,
      timestamp: new Date()
    };
    
    this.interactions.push(interaction);
    
    return {
      response: interaction.response,
      interaction
    };
  }

  getTotalTokens(): number {
    return this.interactions.reduce((sum, i) => sum + i.tokensUsed.total, 0);
  }

  getTotalCost(pricePerToken = 0.00001): number {
    return this.getTotalTokens() * pricePerToken;
  }

  reset(): void {
    this.currentIndex = 0;
    this.interactions = [];
  }
}

/**
 * Central mock manager for coordinating all mocks
 */
export class MockManager {
  private plugins = new Map<string, MockPlugin>();
  private toolExecutor = new MockToolExecutor();
  private llmClient = new MockLLMClient();

  static fromConfig(config: MockConfig): MockManager {
    const manager = new MockManager();
    
    // Set up tool responses
    if (config.toolResponses) {
      for (const [tool, response] of config.toolResponses) {
        manager.toolExecutor.setResponse(tool, response);
      }
    }
    
    // Set up LLM responses
    if (config.llmResponses) {
      manager.llmClient.setResponses(config.llmResponses);
    }
    
    // Set up plugin results
    if (config.pluginResults) {
      for (const [name, result] of config.pluginResults) {
        manager.addPlugin(new MockPlugin(name, result, config.delay));
      }
    }
    
    return manager;
  }

  addPlugin(plugin: MockPlugin): void {
    this.plugins.set(plugin.name(), plugin);
  }

  getPlugin(name: string): MockPlugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): MockPlugin[] {
    return Array.from(this.plugins.values());
  }

  getTool(): MockToolExecutor {
    return this.toolExecutor;
  }

  getLLM(): MockLLMClient {
    return this.llmClient;
  }

  reset(): void {
    this.plugins.forEach(p => p.reset());
    this.toolExecutor.reset();
    this.llmClient.reset();
  }

  getMetrics() {
    return {
      pluginCalls: Array.from(this.plugins.values()).reduce((sum, p) => sum + p.callCount, 0),
      toolCalls: this.toolExecutor.getCallHistory().length,
      llmCalls: this.llmClient.interactions.length,
      totalTokens: this.llmClient.getTotalTokens(),
      totalCost: this.llmClient.getTotalCost()
    };
  }
}

/**
 * Jest mock setup helpers
 */
export function setupClaudeMock() {
  const mockCallClaude = jest.fn();
  
  jest.mock('@roast/ai', () => ({
    callClaudeWithTool: mockCallClaude,
    callClaude: mockCallClaude,
    MODEL_CONFIG: {
      analysis: 'claude-3-sonnet-test',
      routing: 'claude-3-haiku-test'
    }
  }));
  
  return {
    mockCallClaude,
    mockToolResponse: <T>(result: T) => {
      mockCallClaude.mockResolvedValueOnce({
        toolResult: result,
        interaction: LLMInteractionFactory.create(),
        response: { usage: { input_tokens: 100, output_tokens: 50 } }
      });
    },
    mockTextResponse: (text: string) => {
      mockCallClaude.mockResolvedValueOnce({
        response: text,
        interaction: LLMInteractionFactory.create({ response: text })
      });
    }
  };
}
import { PluginManager } from '../PluginManager';
import { SimpleAnalysisPlugin, AnalysisResult, type LLMInteraction } from '../types';
import { TextChunk } from '../TextChunk';

// Mock plugin that simulates delay
class DelayedPlugin implements SimpleAnalysisPlugin {
  constructor(private name_: string, private delay: number) {}
  
  name(): string {
    return this.name_;
  }
  
  promptForWhenToUse(): string {
    return `Use ${this.name_} for testing`;
  }
  
  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    const start = Date.now();
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, this.delay));
    
    const duration = Date.now() - start;
    console.log(`${this.name_} completed in ${duration}ms`);
    
    return {
      summary: `${this.name_} analysis complete`,
      analysis: `Analyzed in ${duration}ms`,
      comments: [],
      llmInteractions: [],
      cost: 0.001
    };
  }
  
  getCost(): number {
    return 0.001;
  }
  
  getLLMInteractions(): LLMInteraction[] {
    return [];
  }
}

describe('Parallel Plugin Execution', () => {
  it('should run plugins in parallel, not sequentially', async () => {
    const manager = new PluginManager();
    
    // Create plugins with different delays
    const plugins = [
      new DelayedPlugin('PLUGIN_A', 100),
      new DelayedPlugin('PLUGIN_B', 100),
      new DelayedPlugin('PLUGIN_C', 100),
      new DelayedPlugin('PLUGIN_D', 100)
    ];
    
    const mockDocument = 'Test document for parallel execution';
    
    const start = Date.now();
    const result = await manager.analyzeDocumentSimple(mockDocument, plugins);
    const totalTime = Date.now() - start;
    
    // If plugins ran sequentially, it would take ~400ms
    // If they ran in parallel, it should take ~100ms (plus overhead)
    console.log(`Total execution time: ${totalTime}ms`);
    
    // Assert parallel execution (with some overhead tolerance)
    expect(totalTime).toBeLessThan(250); // Should be much less than 400ms (sequential)
    expect(result.pluginResults.size).toBe(4);
    expect(result.statistics.totalComments).toBe(0);
    expect(result.statistics.totalCost).toBeCloseTo(0.004);
  });
  
  it('should handle plugin failures gracefully in parallel', async () => {
    const manager = new PluginManager();
    
    // Create mix of successful and failing plugins
    const failingPlugin: SimpleAnalysisPlugin = {
      name: () => 'FAILING_PLUGIN',
      promptForWhenToUse: () => 'This plugin will fail',
      analyze: async () => {
        throw new Error('Plugin intentionally failed');
      },
      getCost: () => 0,
      getLLMInteractions: () => []
    };
    
    const plugins = [
      new DelayedPlugin('PLUGIN_A', 50),
      failingPlugin,
      new DelayedPlugin('PLUGIN_B', 50)
    ];
    
    const result = await manager.analyzeDocumentSimple('Test', plugins);
    
    // Should complete successfully with 2 out of 3 plugins
    expect(result.pluginResults.size).toBe(2);
    expect(result.pluginResults.has('PLUGIN_A')).toBe(true);
    expect(result.pluginResults.has('PLUGIN_B')).toBe(true);
    expect(result.pluginResults.has('FAILING_PLUGIN')).toBe(false);
  });
});
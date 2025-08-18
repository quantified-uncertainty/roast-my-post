import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { ChunkRouter } from './ChunkRouter';
import { TextChunk } from '../TextChunk';
import { SimpleAnalysisPlugin, AnalysisResult } from '../types';

// Mock the Claude wrapper
vi.mock('../../claude/wrapper', () => ({
  callClaudeWithTool: vi.fn()
}));

import { callClaudeWithTool } from '../../claude/wrapper';
const mockCallClaudeWithTool = callClaudeWithTool as any;

// Mock plugin
class MockPlugin implements SimpleAnalysisPlugin {
  constructor(
    private pluginName: string,
    private whenToUse: string,
    private examples: Array<{ chunkText: string; shouldProcess: boolean; reason?: string }>
  ) {}
  
  name(): string {
    return this.pluginName;
  }
  
  promptForWhenToUse(): string {
    return this.whenToUse;
  }
  
  routingExamples() {
    return this.examples;
  }
  
  async analyze(chunks: TextChunk[]): Promise<AnalysisResult> {
    return {
      summary: 'Test',
      analysis: '',
      comments: [],
      cost: 0
    };
  }
  
  getCost(): number {
    return 0;
  }
}

describe('ChunkRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route chunks to appropriate plugins based on content', async () => {
    // Mock the Claude API response for routing
    mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve({
      response: {} as any,
      interaction: {} as any,
      toolResult: {
        decisions: [
          {
            chunkId: 'chunk1',
            plugins: ['MATH', 'FACT_CHECK'],
            reasoning: 'Contains mathematical calculation and historical fact'
          },
          {
            chunkId: 'chunk2',
            plugins: ['FORECAST', 'MATH'],
            reasoning: 'Contains future prediction with mathematical calculation'
          },
          {
            chunkId: 'chunk3',
            plugins: ['FACT_CHECK'],
            reasoning: 'Contains verifiable historical fact'
          }
        ]
      }
    } as any));
    // Create test plugins
    const mathPlugin = new MockPlugin(
      'MATH',
      'Call this when there is math of any kind',
      [
        { chunkText: "Revenue grew 3x from $10M to $25M", shouldProcess: true, reason: "Math calculation" },
        { chunkText: "The weather is nice today", shouldProcess: false, reason: "No math" }
      ]
    );
    
    const forecastPlugin = new MockPlugin(
      'FORECAST',
      'Call this when there are predictions about the future',
      [
        { chunkText: "Revenue will grow 50% next year", shouldProcess: true, reason: "Future prediction" },
        { chunkText: "Revenue grew 50% last year", shouldProcess: false, reason: "Historical fact" }
      ]
    );
    
    const factCheckPlugin = new MockPlugin(
      'FACT_CHECK',
      'Use this when the document makes specific factual claims',
      [
        { chunkText: "GDP was $21T in 2023", shouldProcess: true, reason: "Factual claim" },
        { chunkText: "I think the economy is good", shouldProcess: false, reason: "Opinion" }
      ]
    );
    
    const plugins = [mathPlugin, forecastPlugin, factCheckPlugin];
    const router = new ChunkRouter(plugins);
    
    // Create test chunks
    const chunks = [
      new TextChunk(
        'chunk1',
        'Revenue grew 3x from $10M to $25M in 2023.',
        { position: { start: 0, end: 42 } }
      ),
      new TextChunk(
        'chunk2',  
        'We forecast revenue will grow 50% next year to reach $37.5M.',
        { position: { start: 43, end: 103 } }
      ),
      new TextChunk(
        'chunk3',
        'The global GDP was $96T in 2023 according to World Bank.',
        { position: { start: 104, end: 160 } }
      )
    ];
    
    const result = await router.routeChunks(chunks);
    
    // Verify routing decisions
    expect(result.routingDecisions.size).toBe(3);
    
    // Chunk 1 should go to MATH (calculation error) and FACT_CHECK (historical fact)
    const chunk1Plugins = result.routingDecisions.get('chunk1');
    expect(chunk1Plugins).toContain('MATH');
    expect(chunk1Plugins).toContain('FACT_CHECK');
    expect(chunk1Plugins).not.toContain('FORECAST');
    
    // Chunk 2 should go to FORECAST (future prediction) and MATH (calculation)
    const chunk2Plugins = result.routingDecisions.get('chunk2');
    expect(chunk2Plugins).toContain('FORECAST');
    expect(chunk2Plugins).toContain('MATH'); // Contains calculation ($37.5M)
    expect(chunk2Plugins).not.toContain('FACT_CHECK'); // It's a prediction, not a fact
    
    // Chunk 3 should go to FACT_CHECK (verifiable fact)
    const chunk3Plugins = result.routingDecisions.get('chunk3');
    expect(chunk3Plugins).toContain('FACT_CHECK');
    expect(chunk3Plugins).not.toContain('MATH'); // No calculation shown
    expect(chunk3Plugins).not.toContain('FORECAST'); // Historical, not future
  });
  
  it('should handle plugins with no routing examples', async () => {
    // Mock the Claude API response
    mockCallClaudeWithTool.mockImplementationOnce(() => Promise.resolve({
      response: {} as any,
      interaction: {} as any,
      toolResult: {
        decisions: [
          {
            chunkId: 'chunk1',
            plugins: ['TEST'],
            reasoning: 'Default routing when no examples provided'
          }
        ]
      }
    } as any);

    const plugin = new MockPlugin('TEST', 'Test plugin', []);
    const router = new ChunkRouter([plugin]);
    
    const chunks = [
      new TextChunk(
        'chunk1',
        'Test content',
        { position: { start: 0, end: 12 } }
      )
    ];
    
    const result = await router.routeChunks(chunks);
    expect(result.routingDecisions.size).toBe(1);
  });
  
  it('should handle empty chunks array', async () => {
    // No mock needed - ChunkRouter should return early for empty chunks
    const plugin = new MockPlugin('TEST', 'Test plugin', []);
    const router = new ChunkRouter([plugin]);
    
    const result = await router.routeChunks([]);
    expect(result.routingDecisions.size).toBe(0);
    expect(result.totalCost).toBe(0);
  });
});
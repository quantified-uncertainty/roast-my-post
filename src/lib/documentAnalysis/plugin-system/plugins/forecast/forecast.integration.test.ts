import { ForecastPlugin } from './index';
import { MathPlugin } from '../math';
import { PluginOrchestrator } from '../../core/PluginOrchestrator';
import type { TextChunk } from '../../types';

describe('ForecastPlugin Integration', () => {
  it('should work with PluginOrchestrator', async () => {
    const orchestrator = new PluginOrchestrator([
      new ForecastPlugin(),
      new MathPlugin()
    ]);

    const mockDocumentText = `
      We expect AI capabilities to improve significantly over the next 5 years. 
      There is a 70% chance of AGI by 2030.
      If current trends continue, computing power will increase by 10x.
    `;

    // Create chunks
    const chunks: TextChunk[] = [
      {
        id: 'chunk-1',
        text: mockDocumentText,
        metadata: {
          position: { start: 0, end: mockDocumentText.length },
          lineInfo: { startLine: 1, endLine: 3, totalLines: 3 }
        },
        getContext: () => '',
        getTextBefore: () => '',
        getTextAfter: () => '',
        getLineNumber: () => 1,
        getExpandedContext: () => mockDocumentText
      } as any
    ];

    // Mock Claude API calls
    jest.spyOn(orchestrator as any, 'routeChunksToPlugins').mockResolvedValue(
      new Map([['chunk-1', ['FORECAST']]])
    );

    // Mock the analyze method to avoid actual API calls
    const forecastPlugin = orchestrator.getPlugins().find(p => p.name() === 'FORECAST') as ForecastPlugin;
    jest.spyOn(forecastPlugin, 'analyze').mockResolvedValue({
      summary: 'Found 3 predictions',
      analysis: '## Forecast Analysis\n\nPredictions found.',
      comments: [],
      llmInteractions: [],
      cost: 0.001
    });

    const result = await orchestrator.analyzeDocument({
      documentText: mockDocumentText,
      chunks
    });

    expect(result).toBeDefined();
    expect(result.pluginResults).toHaveProperty('FORECAST');
    expect(result.pluginResults.FORECAST.summary).toContain('Found 3 predictions');
  });
});
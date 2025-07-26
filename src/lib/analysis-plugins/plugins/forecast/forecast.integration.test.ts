import { ForecastPlugin } from './index';
import { MathPlugin } from '../math';
import { PluginManager } from '../../PluginManager';
import type { TextChunk } from '../../types';

describe('ForecastPlugin Integration', () => {
  it('should work with PluginManager', async () => {
    const manager = new PluginManager();
    const forecastPlugin = new ForecastPlugin();
    const mathPlugin = new MathPlugin();

    const mockDocumentText = `
      We expect AI capabilities to improve significantly over the next 5 years. 
      There is a 70% chance of AGI by 2030.
      If current trends continue, computing power will increase by 10x.
    `;

    // Mock the analyze methods to avoid actual API calls
    jest.spyOn(forecastPlugin, 'analyze').mockResolvedValue({
      summary: 'Found 3 predictions',
      analysis: '## Forecast Analysis\n\nPredictions found.',
      comments: [],
      llmInteractions: [],
      cost: 0.001
    });

    jest.spyOn(mathPlugin, 'analyze').mockResolvedValue({
      summary: 'No mathematical expressions found.',
      analysis: 'No mathematical calculations or formulas were identified in this document.',
      comments: [],
      llmInteractions: [],
      cost: 0.001
    });

    const result = await manager.analyzeDocumentSimple(
      mockDocumentText,
      [forecastPlugin, mathPlugin]
    );

    expect(result).toBeDefined();
    expect(result.pluginResults.has('FORECAST')).toBe(true);
    const forecastResult = result.pluginResults.get('FORECAST');
    expect(forecastResult?.summary).toContain('Found 3 predictions');
  }, 10000); // Increase timeout
});
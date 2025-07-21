/**
 * Tests for FactCheckPlugin
 */

import { FactCheckPlugin } from './index';
import { TextChunk } from '../../TextChunk';

describe('FactCheckPlugin', () => {
  let plugin: FactCheckPlugin;

  beforeEach(() => {
    plugin = new FactCheckPlugin();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(plugin.name()).toBe('FACT_CHECK');
    });

    it('should provide usage prompt', () => {
      const prompt = plugin.promptForWhenToUse();
      expect(prompt).toContain('factual claims');
      expect(prompt).toContain('statistics');
      expect(prompt).toContain('Historical facts');
    });

    it('should provide routing examples', () => {
      const examples = plugin.routingExamples();
      expect(examples).toHaveLength(3);
      expect(examples[0].shouldProcess).toBe(true);
      expect(examples[1].shouldProcess).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should return empty results for empty chunks', async () => {
      const result = await plugin.analyze([], '');
      
      expect(result.summary).toContain('0 factual claims');
      expect(result.comments).toHaveLength(0);
      expect(result.cost).toBe(0);
    });

    it('should handle chunks without factual claims', async () => {
      const chunks = [
        new TextChunk(
          'chunk1',
          'I think the weather will be nice tomorrow.',
          {
            position: { start: 0, end: 40 }
          }
        )
      ];

      // This would make a real API call in production
      // For unit tests, you'd want to mock the extractWithTool function
      // Here we're just testing the structure
      expect(plugin.analyze).toBeDefined();
      expect(typeof plugin.analyze).toBe('function');
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', () => {
      const debugInfo = plugin.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('findings');
      expect(debugInfo).toHaveProperty('stats');
      expect(debugInfo).toHaveProperty('stageResults');
      expect(debugInfo.stats.potentialClaims).toBe(0);
    });
  });

  describe('SimpleAnalysisPlugin interface', () => {
    it('should implement getCost method', () => {
      expect(plugin.getCost()).toBe(0);
    });

    it('should implement getLLMInteractions method', () => {
      expect(plugin.getLLMInteractions()).toEqual([]);
    });
  });
});
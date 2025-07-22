import { ForecastPlugin } from './index';

describe('ForecastPlugin', () => {
  let plugin: ForecastPlugin;

  beforeEach(() => {
    plugin = new ForecastPlugin();
  });

  describe('basic functionality', () => {
    it('should have correct name', () => {
      expect(plugin.name()).toBe('FORECAST');
    });

    it('should have routing examples', () => {
      const examples = plugin.routingExamples();
      expect(examples).toBeDefined();
      expect(examples?.length).toBeGreaterThan(0);
      
      // Check specific examples
      const shouldProcessExample = examples?.find(e => e.shouldProcess);
      expect(shouldProcessExample?.reason).toContain('prediction');
    });

    it('should have when to use prompt', () => {
      const prompt = plugin.promptForWhenToUse();
      expect(prompt).toContain('predictions');
      expect(prompt).toContain('forecasts');
      expect(prompt).toContain('future');
    });
  });

  describe('state management', () => {
    it('should clear state properly', () => {
      plugin.clearState();
      const debugInfo = plugin.getDebugInfo();
      
      expect((debugInfo.findings as any).potential).toHaveLength(0);
      expect((debugInfo.findings as any).investigated).toHaveLength(0);
      expect((debugInfo.findings as any).located).toHaveLength(0);
    });

    it('should provide debug info', () => {
      const debugInfo = plugin.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('findings');
      expect(debugInfo).toHaveProperty('stats');
      expect((debugInfo.stats as any)).toHaveProperty('potentialCount');
      expect((debugInfo.stats as any)).toHaveProperty('investigatedCount');
      expect((debugInfo.stats as any)).toHaveProperty('locatedCount');
    });
  });

  describe('cost tracking', () => {
    it('should return cost', () => {
      const cost = plugin.getCost();
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('should track total cost', () => {
      const totalCost = plugin.getCost();
      expect(totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    // Legacy methods have been removed entirely - no need to test them
  });
});
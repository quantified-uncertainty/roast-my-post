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
      
      expect(debugInfo.findings.potential).toHaveLength(0);
      expect(debugInfo.findings.investigated).toHaveLength(0);
      expect(debugInfo.findings.located).toHaveLength(0);
    });

    it('should provide debug info', () => {
      const debugInfo = plugin.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('findings');
      expect(debugInfo).toHaveProperty('stats');
      expect(debugInfo.stats).toHaveProperty('potentialCount');
      expect(debugInfo.stats).toHaveProperty('investigatedCount');
      expect(debugInfo.stats).toHaveProperty('locatedCount');
      expect(debugInfo.stats).toHaveProperty('predictions');
      expect(debugInfo.stats).toHaveProperty('disagreements');
    });
  });

  describe('cost tracking', () => {
    it('should return cost', () => {
      const cost = plugin.getCost();
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('should track total cost', () => {
      const totalCost = plugin.getTotalCost();
      expect(totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should throw error when using legacy processChunk', async () => {
      await expect(plugin.processChunk({} as any)).rejects.toThrow('Use analyze() method instead');
    });

    it('should throw error when using legacy synthesize', async () => {
      await expect(plugin.synthesize()).rejects.toThrow('Use analyze() method instead');
    });
  });
});
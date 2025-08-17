/**
 * Tests for the refactored plugin system components
 */

import { PluginRegistry, PluginRouter, PluginFactory, IsolatedPluginExecutor } from '../index';
import { PluginType } from '../../types/plugin-types';
import { MathPlugin } from '../../plugins/math';
import { SpellingPlugin } from '../../plugins/spelling';
import { createChunksWithTool } from '../../utils/createChunksWithTool';
import { PLUGIN_IDS } from '../../constants/plugin-ids';

describe('Refactored Plugin Components', () => {
  describe('PluginRegistry', () => {
    let registry: PluginRegistry;

    beforeEach(() => {
      registry = new PluginRegistry();
    });

    it('should register and retrieve plugins', () => {
      registry.register(PluginType.MATH, MathPlugin);
      
      const metadata = registry.get(PluginType.MATH);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('MATH');
      expect(metadata?.type).toBe(PluginType.MATH);
    });

    it('should get plugins by name', () => {
      registry.register(PluginType.SPELLING, SpellingPlugin);
      
      const metadata = registry.getByName('SPELLING');
      expect(metadata).toBeDefined();
      expect(metadata?.type).toBe(PluginType.SPELLING);
    });

    it('should provide statistics', () => {
      registry.register(PluginType.MATH, MathPlugin);
      registry.register(PluginType.SPELLING, SpellingPlugin);
      
      const stats = registry.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byType[PluginType.MATH]).toBe(1);
      expect(stats.byType[PluginType.SPELLING]).toBe(1);
    });
  });

  describe('PluginRouter', () => {
    let router: PluginRouter;

    beforeEach(() => {
      router = new PluginRouter();
    });

    it('should route plugins correctly', async () => {
      const plugins = [new MathPlugin(), new SpellingPlugin()];
      const chunks = await createChunksWithTool('2 + 2 = 5 and there are speling errors', {
        maxChunkSize: 1000,
      });

      const result = await router.route(plugins, chunks);
      
      expect(result.decisions.size).toBe(2);
      expect(result.routingTime).toBeGreaterThan(0);
      
      const stats = router.getRoutingStats(result);
      expect(stats.totalPlugins).toBe(2);
    });
  });

  describe('PluginFactory and IsolatedPluginExecutor', () => {
    let factory: PluginFactory;
    let executor: IsolatedPluginExecutor;

    beforeEach(() => {
      factory = new PluginFactory();
      factory.register(PLUGIN_IDS.MATH, MathPlugin);
      executor = new IsolatedPluginExecutor(factory);
    });

    it('should create isolated plugin instances', () => {
      const instance1 = factory.createInstance(PLUGIN_IDS.MATH);
      const instance2 = factory.createInstance(PLUGIN_IDS.MATH);
      
      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1).not.toBe(instance2); // Different instances
    });

    it('should execute plugins in isolation', async () => {
      const chunks = await createChunksWithTool('2 + 2 = 5', {
        maxChunkSize: 1000,
      });

      const result = await executor.execute(PLUGIN_IDS.MATH, chunks, '2 + 2 = 5');
      
      expect(result.result).toBeDefined();
      expect(result.context.executionId).toBeDefined();
      expect(result.context.startTime).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should work together for basic analysis', async () => {
      // Test the components working together
      const registry = new PluginRegistry();
      const router = new PluginRouter();
      
      registry.register(PluginType.MATH, MathPlugin);
      
      const plugins = [new MathPlugin()];
      const chunks = await createChunksWithTool('The equation 2 + 2 = 5 is wrong', {
        maxChunkSize: 1000,
      });

      const routingResult = await router.route(plugins, chunks);
      
      expect(routingResult.decisions.size).toBe(1);
      
      const mathDecision = routingResult.decisions.get(PLUGIN_IDS.MATH);
      expect(mathDecision).toBeDefined();
      expect(mathDecision?.chunks.length).toBeGreaterThan(0);
    });
  });
});
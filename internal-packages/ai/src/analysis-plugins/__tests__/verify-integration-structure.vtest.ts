import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
/**
 * Quick test to verify the integration test structure works
 */

import { LinkPlugin } from '../plugins/link-analysis';
import { PluginManager } from '../PluginManager';
import { assertAnalysisResult, measurePerformance } from './helpers/test-helpers';
import { linkDocuments } from './fixtures/link-documents';

describe('Integration Test Structure Verification', () => {
  it('should have working test utilities', () => {
    // Test that our helpers load correctly
    expect(typeof assertAnalysisResult).toBe('function');
    expect(typeof measurePerformance).toBe('function');
    expect(typeof linkDocuments).toBe('object');
    expect(linkDocuments.withoutLinks).toBeDefined();
  });

  it('should run link plugin analysis (no API key needed)', async () => {
    const plugin = new LinkPlugin();
    const manager = new PluginManager();
    
    // Test with no links document
    const { result, timeMs } = await measurePerformance(async () => {
      return await manager.analyzeDocumentSimple(
        linkDocuments.withoutLinks,
        [plugin]
      );
    });

    const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
    expect(pluginResult).toBeDefined();
    
    if (pluginResult) {
      // Test our assertion utility
      assertAnalysisResult(pluginResult, {
        maxComments: 0,
        summaryContains: ['no', 'links'],
        maxCost: 0.01
      }, 'No links document');
      
      // Verify performance tracking
      expect(timeMs).toBeGreaterThan(0);
      expect(pluginResult.cost).toBeDefined();
      expect(pluginResult.grade).toBe(100);
    }
  }, 10000);

  it('should test document fixtures are properly structured', () => {
    // Verify all our test fixtures load
    expect(linkDocuments.withValidLinks).toContain('react.dev');
    expect(linkDocuments.withBrokenLinks.toLowerCase()).toContain('broken');
    expect(linkDocuments.withMixedLinks).toContain('nodejs.org');
    expect(linkDocuments.withoutLinks).not.toContain('http');
  });

  it('should verify plugin manager can handle multiple plugins', async () => {
    const plugins = [new LinkPlugin()];
    const manager = new PluginManager();
    
    const result = await manager.analyzeDocumentSimple(
      'Test document with no links.',
      plugins
    );

    expect(result.pluginResults.size).toBe(1);
    expect(result.pluginResults.has('LINK_ANALYSIS')).toBe(true);
    expect(result.allComments).toBeDefined();
    expect(Array.isArray(result.allComments)).toBe(true);
  });
});
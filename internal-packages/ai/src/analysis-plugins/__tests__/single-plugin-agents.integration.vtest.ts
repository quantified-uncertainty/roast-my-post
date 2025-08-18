import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { SpellingPlugin } from '../plugins/spelling';
import { MathPlugin } from '../plugins/math';
import { FactCheckPlugin } from '../plugins/fact-check';
import { ForecastPlugin } from '../plugins/forecast';
import { LinkPlugin } from '../plugins/link-analysis';
import { PluginManager } from '../PluginManager';
import { TextChunk } from '../TextChunk';
import { 
  assertAnalysisResult, 
  measurePerformance, 
  logTestResult, 
  describeIfApiKey 
} from './helpers/test-helpers';
import { 
  spellingTestCases, 
  mathTestCases, 
  factTestCases, 
  forecastTestCases, 
  linkTestCases,
  TestDocuments 
} from './helpers/shared-fixtures';

describeIfApiKey('Single-Plugin Agent Integration Tests', () => {
  const TEST_TIMEOUT = 60000; // 60 seconds per test

  describe('Spelling & Grammar Agent', () => {
    let plugin: SpellingPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new SpellingPlugin();
      manager = new PluginManager();
    });

    // Table-driven tests using test cases from shared fixtures
    it.each(spellingTestCases)(
      '$name',
      async (testCase) => {
        if (testCase.skip) return;

        const { result, timeMs } = await measurePerformance(async () => {
          return await manager.analyzeDocumentSimple(
            testCase.document,
            [plugin]
          );
        });

        const pluginResult = result.pluginResults.get('SPELLING');
        expect(pluginResult).toBeDefined();

        if (pluginResult) {
          assertAnalysisResult(pluginResult, testCase.expectations, testCase.name);
          logTestResult(testCase.name, pluginResult, timeMs);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Math Checker Agent', () => {
    let plugin: MathPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new MathPlugin();
      manager = new PluginManager();
    });

    // Table-driven tests using test cases from shared fixtures
    it.each(mathTestCases)(
      '$name',
      async (testCase) => {
        if (testCase.skip) return;

        const { result, timeMs } = await measurePerformance(async () => {
          return await manager.analyzeDocumentSimple(
            testCase.document,
            [plugin]
          );
        });

        const pluginResult = result.pluginResults.get('MATH');
        expect(pluginResult).toBeDefined();

        if (pluginResult) {
          assertAnalysisResult(pluginResult, testCase.expectations, testCase.name);
          logTestResult(testCase.name, pluginResult, timeMs);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Fact Checker Agent', () => {
    let plugin: FactCheckPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new FactCheckPlugin();
      manager = new PluginManager();
    });

    // Table-driven tests using test cases from shared fixtures
    it.each(factTestCases)(
      '$name',
      async (testCase) => {
        if (testCase.skip) return;

        const { result, timeMs } = await measurePerformance(async () => {
          return await manager.analyzeDocumentSimple(
            testCase.document,
            [plugin]
          );
        });

        const pluginResult = result.pluginResults.get('FACT_CHECK');
        expect(pluginResult).toBeDefined();

        if (pluginResult) {
          assertAnalysisResult(pluginResult, testCase.expectations, testCase.name);
          logTestResult(testCase.name, pluginResult, timeMs);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Forecast Checker Agent', () => {
    let plugin: ForecastPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new ForecastPlugin();
      manager = new PluginManager();
    });

    // Table-driven tests using test cases from shared fixtures
    it.each(forecastTestCases)(
      '$name',
      async (testCase) => {
        if (testCase.skip) return;

        const { result, timeMs } = await measurePerformance(async () => {
          return await manager.analyzeDocumentSimple(
            testCase.document,
            [plugin]
          );
        });

        const pluginResult = result.pluginResults.get('FORECAST');
        expect(pluginResult).toBeDefined();

        if (pluginResult) {
          assertAnalysisResult(pluginResult, testCase.expectations, testCase.name);
          logTestResult(testCase.name, pluginResult, timeMs);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Link Verifier Agent', () => {
    let plugin: LinkPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new LinkPlugin();
      manager = new PluginManager();
    });

    // Table-driven tests using test cases from shared fixtures
    it.each(linkTestCases)(
      '$name',
      async (testCase) => {
        if (testCase.skip) return;

        const { result, timeMs } = await measurePerformance(async () => {
          return await manager.analyzeDocumentSimple(
            testCase.document,
            [plugin]
          );
        });

        const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
        expect(pluginResult).toBeDefined();

        if (pluginResult) {
          assertAnalysisResult(pluginResult, testCase.expectations, testCase.name);
          logTestResult(testCase.name, pluginResult, timeMs);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Performance and Consistency', () => {
    it('should complete all single-plugin analyses within reasonable time', async () => {
      const plugins = [
        new SpellingPlugin(),
        new MathPlugin(),
        new FactCheckPlugin(),
        new ForecastPlugin(),
        new LinkPlugin()
      ];

      const testDoc = `# Comprehensive Test Document
      
This document contains various elements for testing.

The project started in 2019 and we predict 80% growth by 2025.

Our calculations show: 100 + 200 = 300, and 50% of 1000 is 500.

For more information, visit [https://example.com](https://example.com).

There might be some spelling mistaks and grammer issues here.`;

      const startTime = Date.now();
      const manager = new PluginManager();
      
      // Test each plugin individually
      for (const plugin of plugins) {
        const result = await manager.analyzeDocumentSimple(testDoc, [plugin]);
        const pluginName = plugin.name();
        const pluginResult = result.pluginResults.get(pluginName);
        
        expect(pluginResult).toBeDefined();
        expect(pluginResult?.analysis).toBeTruthy();
        expect(pluginResult?.summary).toBeTruthy();
        expect(Array.isArray(pluginResult?.comments)).toBe(true);
      }

      const totalTime = Date.now() - startTime;
      console.log(`\nTotal time for all plugins: ${totalTime}ms`);
      expect(totalTime).toBeLessThan(120000); // Should complete within 2 minutes
    }, 150000); // 2.5 minute timeout for this comprehensive test
  });
});
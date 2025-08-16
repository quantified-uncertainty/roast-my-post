import { SpellingPlugin } from '../plugins/spelling';
import { MathPlugin } from '../plugins/math';
import { FactCheckPlugin } from '../plugins/fact-check';
import { ForecastPlugin } from '../plugins/forecast';
import { LinkPlugin } from '../plugins/link-analysis';
import { PluginManager } from '../PluginManager';
import { TextChunk } from '../TextChunk';
import { assertAnalysisResult, measurePerformance, logTestResult } from './helpers/test-utils';
import { spellingDocuments } from './fixtures/spelling-documents';
import { mathDocuments } from './fixtures/math-documents';
import { factDocuments } from './fixtures/fact-documents';
import { forecastDocuments } from './fixtures/forecast-documents';
import { linkDocuments } from './fixtures/link-documents';

// Skip these tests in CI or when no API key is available
const describeIfApiKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '' 
  ? describe 
  : describe.skip;

describeIfApiKey('Single-Plugin Agent Integration Tests', () => {
  const TEST_TIMEOUT = 60000; // 60 seconds per test

  describe('Spelling & Grammar Agent', () => {
    let plugin: SpellingPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new SpellingPlugin();
      manager = new PluginManager();
    });

    it('should detect spelling and grammar errors', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          spellingDocuments.withErrors,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('SPELLING');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          minComments: 5,
          maxComments: 20,
          mustFindTexts: ['contians', 'grammer', 'identifyed', 'dont', 'embarassing'],
          summaryContains: ['spelling', 'grammar'],
          verifyHighlights: true,
          maxCost: 0.05
        }, 'Spelling with errors');

        logTestResult('Spelling with errors', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should handle clean documents without false positives', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          spellingDocuments.clean,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('SPELLING');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          maxComments: 3, // Allow for very minor suggestions
          verifyHighlights: true,
          maxCost: 0.05
        }, 'Spelling clean document');

        logTestResult('Spelling clean document', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should handle mixed US/UK conventions appropriately', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          spellingDocuments.mixedConventions,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('SPELLING');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        // Should either accept both conventions or flag inconsistency
        assertAnalysisResult(pluginResult, {
          maxComments: 10, // Some tools might flag convention mixing
          analysisContains: ['convention', 'spelling'],
          verifyHighlights: true
        }, 'Spelling mixed conventions');

        logTestResult('Spelling mixed conventions', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);
  });

  describe('Math Checker Agent', () => {
    let plugin: MathPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new MathPlugin();
      manager = new PluginManager();
    });

    it('should detect mathematical errors', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          mathDocuments.withErrors,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('MATH');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          minComments: 3,
          mustFindTexts: ['1,700,000', '32%', '3.0M'], // Corrections for the errors
          summaryContains: ['error', 'calculation'],
          verifyHighlights: true,
          minGrade: 0,
          maxGrade: 70, // Should have low grade due to errors
          maxCost: 0.1
        }, 'Math with errors');

        logTestResult('Math with errors', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should verify correct calculations', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          mathDocuments.correct,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('MATH');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          maxComments: 2, // Should find few or no errors
          summaryContains: ['correct', 'accurate'],
          verifyHighlights: true,
          minGrade: 90, // Should have high grade for correct math
          maxCost: 0.1
        }, 'Math correct calculations');

        logTestResult('Math correct calculations', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should check unit conversions', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          mathDocuments.unitConversions,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('MATH');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          minComments: 2,
          mustFindTexts: ['304.8', '6.6', '140'], // Correct conversion values
          summaryContains: ['conversion', 'unit'],
          verifyHighlights: true,
          maxCost: 0.1
        }, 'Math unit conversions');

        logTestResult('Math unit conversions', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);
  });

  describe('Fact Checker Agent', () => {
    let plugin: FactCheckPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new FactCheckPlugin();
      manager = new PluginManager();
    });

    it('should detect factual errors', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          factDocuments.withErrors,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('FACT_CHECK');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          minComments: 4,
          mustFindTexts: ['1945', '1969', '1953'], // Some correct dates
          summaryContains: ['error', 'incorrect', 'fact'],
          verifyHighlights: true,
          minGrade: 0,
          maxGrade: 60, // Low grade due to errors
          maxCost: 0.15
        }, 'Fact checking with errors');

        logTestResult('Fact checking with errors', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should verify correct facts', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          factDocuments.correct,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('FACT_CHECK');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          maxComments: 2, // Should find few or no issues
          summaryContains: ['accurate', 'verified', 'correct'],
          verifyHighlights: true,
          minGrade: 85, // High grade for accurate facts
          maxCost: 0.15
        }, 'Fact checking correct facts');

        logTestResult('Fact checking correct facts', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should handle mixed accuracy documents', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          factDocuments.mixedAccuracy,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('FACT_CHECK');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          minComments: 2,
          maxComments: 8,
          mustFindTexts: ['2004', '2008'], // Correct years for Facebook and Bitcoin
          verifyHighlights: true,
          minGrade: 40,
          maxGrade: 80, // Medium grade for mixed accuracy
          maxCost: 0.15
        }, 'Fact checking mixed accuracy');

        logTestResult('Fact checking mixed accuracy', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);
  });

  describe('Forecast Checker Agent', () => {
    let plugin: ForecastPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new ForecastPlugin();
      manager = new PluginManager();
    });

    it('should identify clear predictions with probabilities', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          forecastDocuments.withPredictions,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('FORECAST');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          minComments: 5,
          mustFindTexts: ['70%', '85%', '2027', '2030'],
          summaryContains: ['prediction', 'forecast', 'probability'],
          verifyHighlights: true,
          maxCost: 0.1
        }, 'Forecast with predictions');

        logTestResult('Forecast with predictions', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should handle vague predictions appropriately', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          forecastDocuments.vaguePredictions,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('FORECAST');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          maxComments: 5, // Should find few concrete predictions
          summaryContains: ['vague', 'general', 'specific'],
          verifyHighlights: true,
          maxCost: 0.1
        }, 'Forecast vague predictions');

        logTestResult('Forecast vague predictions', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should extract specific timeline predictions', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          forecastDocuments.specificTimelines,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('FORECAST');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          minComments: 8,
          mustFindTexts: ['Q4 2024', 'Q1 2025', '95%', '70%'],
          summaryContains: ['timeline', 'quarterly', 'forecast'],
          verifyHighlights: true,
          maxCost: 0.1
        }, 'Forecast specific timelines');

        logTestResult('Forecast specific timelines', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);
  });

  describe('Link Verifier Agent', () => {
    let plugin: LinkPlugin;
    let manager: PluginManager;

    beforeEach(() => {
      plugin = new LinkPlugin();
      manager = new PluginManager();
    });

    it('should verify valid links', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          linkDocuments.withValidLinks,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          maxComments: 2, // Should find few or no broken links
          summaryContains: ['valid', 'accessible'],
          verifyHighlights: true,
          minGrade: 90, // High grade for valid links
          maxCost: 0.01 // Link checking is cheap (no LLM)
        }, 'Link verification valid links');

        logTestResult('Link verification valid links', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should detect broken and malformed links', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          linkDocuments.withBrokenLinks,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          minComments: 5,
          mustFindTexts: ['broken', 'invalid', 'malformed'],
          summaryContains: ['broken', 'error', 'invalid'],
          verifyHighlights: true,
          minGrade: 0,
          maxGrade: 50, // Low grade for broken links
          maxCost: 0.01
        }, 'Link verification broken links');

        logTestResult('Link verification broken links', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);

    it('should handle documents without links', async () => {
      const { result, timeMs } = await measurePerformance(async () => {
        return await manager.analyzeDocumentSimple(
          linkDocuments.withoutLinks,
          [plugin]
        );
      });

      const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
      expect(pluginResult).toBeDefined();

      if (pluginResult) {
        assertAnalysisResult(pluginResult, {
          exactComments: 0,
          summaryContains: ['no', 'links'],
          minGrade: 100, // Perfect grade when no links to check
          maxCost: 0.01
        }, 'Link verification no links');

        logTestResult('Link verification no links', pluginResult, timeMs);
      }
    }, TEST_TIMEOUT);
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
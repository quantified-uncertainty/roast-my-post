/**
 * Refactored Single-Plugin Agent Integration Tests
 * Using the new unified test framework for DRY, elegant testing
 */

import { SpellingPlugin } from '../plugins/spelling';
import { MathPlugin } from '../plugins/math';
import { FactCheckPlugin } from '../plugins/fact-check';
import { ForecastPlugin } from '../plugins/forecast';
import { LinkPlugin } from '../plugins/link-analysis';

import { suite, scenario } from '../../test-framework/builders';
import { TestDocuments, ExpectedResults } from '../../test-framework/fixtures';
import { PluginTestRunner, runTestSuite } from '../../test-framework/runners';

// Skip if no API key
const describeIfApiKey = process.env.ANTHROPIC_API_KEY ? describe : describe.skip;

describeIfApiKey('Single-Plugin Agents (Refactored)', () => {
  const TIMEOUT = 60000;

  describe('Spelling & Grammar Agent', () => {
    const testSuite = suite()
      .name('Spelling & Grammar')
      .category('plugin')
      .addScenario(b => b
        .name('Detects spelling and grammar errors')
        .document(TestDocuments.spelling.withErrors)
        .expectComments({
          count: { min: ExpectedResults.spelling.withErrors.minErrors },
          mustFind: ExpectedResults.spelling.withErrors.mustFind,
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['spelling', 'grammar'],
          maxGrade: ExpectedResults.spelling.withErrors.maxGrade
        })
        .expectPerformance({ maxCost: 0.05 })
        .timeout(TIMEOUT)
      )
      .addScenario(b => b
        .name('Handles clean documents without false positives')
        .document(TestDocuments.spelling.clean)
        .expectComments({
          count: { max: ExpectedResults.spelling.clean.maxErrors },
          verifyHighlights: true
        })
        .expectAnalysis({
          minGrade: ExpectedResults.spelling.clean.minGrade
        })
        .expectPerformance({ maxCost: 0.05 })
        .timeout(TIMEOUT)
      )
      .addScenario(b => b
        .name('Handles mixed US/UK conventions')
        .document(TestDocuments.spelling.mixedConventions)
        .expectComments({
          count: { max: 10 },
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['convention']
        })
        .timeout(TIMEOUT)
      )
      .build();

    it('should pass all spelling tests', async () => {
      const runner = new PluginTestRunner(new SpellingPlugin());
      await runTestSuite(testSuite, runner);
    }, TIMEOUT * 3);
  });

  describe('Math Checker Agent', () => {
    const testSuite = suite()
      .name('Math Checker')
      .category('plugin')
      .addScenario(b => b
        .name('Detects mathematical errors')
        .document(TestDocuments.math.withErrors)
        .expectComments({
          count: { min: ExpectedResults.math.withErrors.minErrors },
          mustFind: ExpectedResults.math.withErrors.mustFind,
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['error', 'calculation'],
          maxGrade: ExpectedResults.math.withErrors.maxGrade
        })
        .expectPerformance({ maxCost: 0.1 })
        .timeout(TIMEOUT)
      )
      .addScenario(b => b
        .name('Verifies correct calculations')
        .document(TestDocuments.math.correct)
        .expectComments({
          count: { max: ExpectedResults.math.correct.maxErrors },
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['correct', 'accurate'],
          minGrade: ExpectedResults.math.correct.minGrade
        })
        .expectPerformance({ maxCost: 0.1 })
        .timeout(TIMEOUT)
      )
      .addScenario(b => b
        .name('Checks unit conversions')
        .document(TestDocuments.math.unitConversions)
        .expectComments({
          count: { min: 0 },
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['conversion', 'unit']
        })
        .timeout(TIMEOUT)
      )
      .build();

    it('should pass all math tests', async () => {
      const runner = new PluginTestRunner(new MathPlugin());
      await runTestSuite(testSuite, runner);
    }, TIMEOUT * 3);
  });

  describe('Fact Checker Agent', () => {
    const testSuite = suite()
      .name('Fact Checker')
      .category('plugin')
      .addScenario(b => b
        .name('Detects factual errors')
        .document(TestDocuments.facts.withErrors)
        .expectComments({
          count: { min: ExpectedResults.facts.withErrors.minErrors },
          mustFind: ExpectedResults.facts.withErrors.mustFind,
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['error', 'incorrect', 'fact'],
          maxGrade: ExpectedResults.facts.withErrors.maxGrade
        })
        .expectPerformance({ maxCost: 0.15 })
        .timeout(TIMEOUT)
      )
      .addScenario(b => b
        .name('Verifies correct facts')
        .document(TestDocuments.facts.correct)
        .expectComments({
          count: { max: ExpectedResults.facts.correct.maxErrors },
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['accurate', 'verified', 'correct'],
          minGrade: ExpectedResults.facts.correct.minGrade
        })
        .expectPerformance({ maxCost: 0.15 })
        .timeout(TIMEOUT)
      )
      .addScenario(b => b
        .name('Handles mixed accuracy')
        .document(TestDocuments.facts.mixed)
        .expectComments({
          count: { min: 1, max: 3 },
          mustFind: ['2004'],
          verifyHighlights: true
        })
        .expectAnalysis({
          minGrade: 50,
          maxGrade: 80
        })
        .timeout(TIMEOUT)
      )
      .build();

    it('should pass all fact checking tests', async () => {
      const runner = new PluginTestRunner(new FactCheckPlugin());
      await runTestSuite(testSuite, runner);
    }, TIMEOUT * 3);
  });

  describe('Forecast Checker Agent', () => {
    const testSuite = suite()
      .name('Forecast Checker')
      .category('plugin')
      .addScenario(b => b
        .name('Identifies clear predictions')
        .document(TestDocuments.forecasts.clear)
        .expectComments({
          count: { min: ExpectedResults.forecasts.clear.minComments },
          mustFind: ExpectedResults.forecasts.clear.mustFind,
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['prediction', 'forecast', 'probability']
        })
        .expectPerformance({ maxCost: 0.1 })
        .timeout(TIMEOUT)
      )
      .addScenario(b => b
        .name('Handles vague predictions')
        .document(TestDocuments.forecasts.vague)
        .expectComments({
          count: { max: ExpectedResults.forecasts.vague.maxComments },
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['vague', 'general']
        })
        .timeout(TIMEOUT)
      )
      .addScenario(b => b
        .name('Extracts timeline predictions')
        .document(TestDocuments.forecasts.timeline)
        .expectComments({
          count: { min: 3 },
          mustFind: ['Q4 2024', 'Q1 2025', '95%'],
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['timeline', 'quarterly']
        })
        .timeout(TIMEOUT)
      )
      .build();

    it('should pass all forecast tests', async () => {
      const runner = new PluginTestRunner(new ForecastPlugin());
      await runTestSuite(testSuite, runner);
    }, TIMEOUT * 3);
  });

  describe('Link Verifier Agent', () => {
    const testSuite = suite()
      .name('Link Verifier')
      .category('plugin')
      .addScenario(b => b
        .name('Verifies valid links')
        .document(TestDocuments.links.valid)
        .expectComments({
          count: { max: ExpectedResults.links.valid.maxErrors },
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['valid', 'accessible'],
          minGrade: ExpectedResults.links.valid.minGrade
        })
        .expectPerformance({ maxCost: 0.01 })
        .timeout(TIMEOUT)
        .requiresApiKey(false) // Link checking doesn't need API
      )
      .addScenario(b => b
        .name('Detects broken links')
        .document(TestDocuments.links.broken)
        .expectComments({
          count: { min: ExpectedResults.links.broken.minErrors },
          mustFind: ExpectedResults.links.broken.mustFind,
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['broken', 'error', 'invalid'],
          maxGrade: ExpectedResults.links.broken.maxGrade
        })
        .expectPerformance({ maxCost: 0.01 })
        .timeout(TIMEOUT)
        .requiresApiKey(false)
      )
      .addScenario(b => b
        .name('Handles malformed URLs')
        .document(TestDocuments.links.malformed)
        .expectComments({
          count: { min: 3 },
          mustFind: ['malformed', 'protocol'],
          verifyHighlights: true
        })
        .expectAnalysis({
          summaryContains: ['malformed', 'invalid']
        })
        .timeout(TIMEOUT)
        .requiresApiKey(false)
      )
      .build();

    it('should pass all link verification tests', async () => {
      const runner = new PluginTestRunner(new LinkPlugin());
      await runTestSuite(testSuite, runner);
    }, TIMEOUT * 3);
  });

  describe('Comprehensive Performance Test', () => {
    it('should complete all plugins within time limits', async () => {
      const plugins = [
        new SpellingPlugin(),
        new MathPlugin(),
        new FactCheckPlugin(),
        new ForecastPlugin(),
        new LinkPlugin()
      ];

      const testSuite = suite()
        .name('Performance Benchmark')
        .category('integration')
        .addScenario(b => b
          .name('Comprehensive document analysis')
          .document(TestDocuments.comprehensive)
          .expectComments({
            count: { min: 5 }, // Should find various errors
            verifyHighlights: true
          })
          .expectPerformance({
            maxTimeMs: 30000, // 30 seconds per plugin
            maxCost: 0.2
          })
          .timeout(40000)
        )
        .build();

      // Test each plugin
      for (const plugin of plugins) {
        const runner = new PluginTestRunner(plugin);
        await runTestSuite(testSuite, runner);
      }
    }, 200000); // Total timeout for all plugins
  });
});
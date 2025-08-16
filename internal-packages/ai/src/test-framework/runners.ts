import type { 
  TestScenario, 
  TestResult, 
  TestSuite, 
  TestContext,
  TestRunner 
} from './types';
import type { SimpleAnalysisPlugin } from '../analysis-plugins/types';
import { PluginManager } from '../analysis-plugins/PluginManager';
import { TestAssertions } from './assertions';
import { MockManager } from './mocks';

/**
 * Test runners for different test types
 */

export class PluginTestRunner implements TestRunner {
  constructor(
    private plugin: SimpleAnalysisPlugin,
    private useMocks = false
  ) {}

  async run(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Set up mocks if needed
      let mockManager: MockManager | undefined;
      if (this.useMocks && scenario.config?.useMocks) {
        mockManager = MockManager.fromConfig(scenario.config as any);
      }

      // Run the plugin
      const manager = new PluginManager();
      const result = await manager.analyzeDocumentSimple(
        scenario.document.content,
        [this.plugin]
      );

      const pluginResult = result.pluginResults.get(this.plugin.name());
      if (!pluginResult) {
        throw new Error(`Plugin ${this.plugin.name()} did not return a result`);
      }

      // Assert expectations
      const assertions = new TestAssertions();
      assertions.assertAnalysisResult(pluginResult, scenario.expectations);
      
      errors.push(...assertions.getErrors());
      warnings.push(...assertions.getWarnings());

      const timeMs = Date.now() - startTime;

      return {
        scenario: scenario.name,
        passed: errors.length === 0,
        errors,
        warnings,
        performance: {
          timeMs,
          cost: pluginResult.cost || 0,
          llmCalls: mockManager?.getMetrics().llmCalls || 0
        },
        actualResult: pluginResult
      };
    } catch (error) {
      return {
        scenario: scenario.name,
        passed: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings,
        performance: {
          timeMs: Date.now() - startTime,
          cost: 0,
          llmCalls: 0
        }
      };
    }
  }
}

export class ToolTestRunner implements TestRunner {
  constructor(
    private toolExecutor: (input: any, context: any) => Promise<any>,
    private toolName: string
  ) {}

  async run(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Create mock context
      const context: TestContext = {
        logger: {
          info: () => {},
          error: () => {},
          warn: () => {},
          debug: () => {}
        },
        metrics: {
          startTime,
          llmCalls: 0,
          totalCost: 0
        }
      };

      // Execute tool
      const result = await this.toolExecutor(
        { text: scenario.document.content },
        context
      );

      // Convert tool result to AnalysisResult format for assertions
      const analysisResult = {
        comments: result.errors || [],
        summary: result.summary || `${this.toolName} complete`,
        analysis: result.analysis || '',
        cost: context.metrics.totalCost,
        grade: result.grade
      };

      // Assert expectations
      const assertions = new TestAssertions();
      assertions.assertAnalysisResult(analysisResult, scenario.expectations);
      
      errors.push(...assertions.getErrors());
      warnings.push(...assertions.getWarnings());

      return {
        scenario: scenario.name,
        passed: errors.length === 0,
        errors,
        warnings,
        performance: {
          timeMs: Date.now() - startTime,
          cost: context.metrics.totalCost,
          llmCalls: context.metrics.llmCalls
        },
        actualResult: analysisResult
      };
    } catch (error) {
      return {
        scenario: scenario.name,
        passed: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings,
        performance: {
          timeMs: Date.now() - startTime,
          cost: 0,
          llmCalls: 0
        }
      };
    }
  }
}

export class SuiteRunner {
  private results: TestResult[] = [];

  constructor(private runner: TestRunner) {}

  async runSuite(suite: TestSuite): Promise<{
    suite: string;
    results: TestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      passRate: number;
      totalTime: number;
      totalCost: number;
    };
  }> {
    this.results = [];

    for (const scenario of suite.scenarios) {
      // Skip if requires API key and none available
      if (scenario.config?.requiresApiKey && !process.env.ANTHROPIC_API_KEY) {
        this.results.push({
          scenario: scenario.name,
          passed: true,
          errors: [],
          warnings: ['Skipped: API key required'],
          performance: { timeMs: 0, cost: 0, llmCalls: 0 }
        });
        continue;
      }

      // Run beforeEach
      if (suite.beforeEach) {
        await suite.beforeEach();
      }

      // Run scenario with timeout
      const timeout = scenario.config?.timeout || 60000;
      const result = await this.runWithTimeout(
        () => this.runner.run(scenario),
        timeout,
        scenario.name
      );
      
      this.results.push(result);

      // Run afterEach
      if (suite.afterEach) {
        await suite.afterEach();
      }

      // Log progress
      if (scenario.config?.verbose) {
        this.logResult(result);
      }
    }

    return {
      suite: suite.name,
      results: this.results,
      summary: this.calculateSummary()
    };
  }

  private async runWithTimeout(
    fn: () => Promise<TestResult>,
    timeout: number,
    name: string
  ): Promise<TestResult> {
    return Promise.race([
      fn(),
      new Promise<TestResult>((_, reject) => 
        setTimeout(() => reject(new Error(`Test timeout: ${name}`)), timeout)
      )
    ]).catch(error => ({
      scenario: name,
      passed: false,
      errors: [error.message],
      warnings: [],
      performance: { timeMs: timeout, cost: 0, llmCalls: 0 }
    }));
  }

  private calculateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const totalTime = this.results.reduce((sum, r) => sum + r.performance.timeMs, 0);
    const totalCost = this.results.reduce((sum, r) => sum + r.performance.cost, 0);

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      totalTime,
      totalCost
    };
  }

  private logResult(result: TestResult): void {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.scenario}`);
    if (result.errors.length > 0) {
      console.log('  Errors:', result.errors.join(', '));
    }
    if (result.warnings.length > 0) {
      console.log('  Warnings:', result.warnings.join(', '));
    }
    console.log(`  Time: ${result.performance.timeMs}ms, Cost: $${result.performance.cost.toFixed(4)}`);
  }
}

/**
 * Convenience function to run a test suite
 */
export async function runTestSuite(
  suite: TestSuite,
  runner: TestRunner
): Promise<void> {
  const suiteRunner = new SuiteRunner(runner);
  const results = await suiteRunner.runSuite(suite);
  
  console.log(`\n📊 ${suite.name} Results:`);
  console.log(`Total: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed} (${results.summary.passRate.toFixed(1)}%)`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Time: ${results.summary.totalTime}ms`);
  console.log(`Cost: $${results.summary.totalCost.toFixed(4)}`);
  
  if (results.summary.failed > 0) {
    throw new Error(`${results.summary.failed} tests failed`);
  }
}
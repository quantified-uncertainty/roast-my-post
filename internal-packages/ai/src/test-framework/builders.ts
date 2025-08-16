import type { 
  TestScenario, 
  TestDocument, 
  TestExpectations, 
  TestConfig,
  TestSuite 
} from './types';

/**
 * Fluent builders for creating test scenarios and suites
 */

export class TestScenarioBuilder {
  private scenario: Partial<TestScenario> = {};

  name(name: string): this {
    this.scenario.name = name;
    return this;
  }

  description(desc: string): this {
    this.scenario.description = desc;
    return this;
  }

  document(content: string, metadata?: TestDocument['metadata']): this {
    this.scenario.document = { content, metadata };
    return this;
  }

  expectComments(config: {
    count?: { min?: number; max?: number; exact?: number };
    mustFind?: string[];
    mustNotFind?: string[];
    verifyHighlights?: boolean;
  }): this {
    if (!this.scenario.expectations) {
      this.scenario.expectations = {};
    }
    this.scenario.expectations.comments = {
      count: config.count,
      mustFind: config.mustFind,
      mustNotFind: config.mustNotFind,
      highlights: config.verifyHighlights ? {
        verifyPositions: true,
        verifyNoOverlaps: true
      } : undefined
    };
    return this;
  }

  expectAnalysis(config: {
    summaryContains?: string[];
    analysisContains?: string[];
    minGrade?: number;
    maxGrade?: number;
  }): this {
    if (!this.scenario.expectations) {
      this.scenario.expectations = {};
    }
    this.scenario.expectations.analysis = {
      summaryContains: config.summaryContains,
      analysisContains: config.analysisContains,
      grade: (config.minGrade || config.maxGrade) ? {
        min: config.minGrade,
        max: config.maxGrade
      } : undefined
    };
    return this;
  }

  expectPerformance(config: {
    maxCost?: number;
    maxTimeMs?: number;
    maxLLMCalls?: number;
  }): this {
    if (!this.scenario.expectations) {
      this.scenario.expectations = {};
    }
    this.scenario.expectations.performance = config;
    return this;
  }

  requiresApiKey(requires = true): this {
    if (!this.scenario.config) {
      this.scenario.config = {};
    }
    this.scenario.config.requiresApiKey = requires;
    return this;
  }

  timeout(ms: number): this {
    if (!this.scenario.config) {
      this.scenario.config = {};
    }
    this.scenario.config.timeout = ms;
    return this;
  }

  useMocks(use = true): this {
    if (!this.scenario.config) {
      this.scenario.config = {};
    }
    this.scenario.config.useMocks = use;
    return this;
  }

  build(): TestScenario {
    if (!this.scenario.name) {
      throw new Error('Test scenario must have a name');
    }
    if (!this.scenario.document) {
      throw new Error('Test scenario must have a document');
    }
    if (!this.scenario.expectations) {
      this.scenario.expectations = {};
    }
    return this.scenario as TestScenario;
  }
}

export class TestSuiteBuilder {
  private suite: Partial<TestSuite> = {
    scenarios: []
  };

  name(name: string): this {
    this.suite.name = name;
    return this;
  }

  category(category: TestSuite['category']): this {
    this.suite.category = category;
    return this;
  }

  addScenario(scenario: TestScenario): this;
  addScenario(builder: (b: TestScenarioBuilder) => TestScenarioBuilder): this;
  addScenario(input: TestScenario | ((b: TestScenarioBuilder) => TestScenarioBuilder)): this {
    if (typeof input === 'function') {
      const builder = new TestScenarioBuilder();
      const built = input(builder);
      this.suite.scenarios!.push(built.build());
    } else {
      this.suite.scenarios!.push(input);
    }
    return this;
  }

  beforeEach(fn: () => void | Promise<void>): this {
    this.suite.beforeEach = fn;
    return this;
  }

  afterEach(fn: () => void | Promise<void>): this {
    this.suite.afterEach = fn;
    return this;
  }

  build(): TestSuite {
    if (!this.suite.name) {
      throw new Error('Test suite must have a name');
    }
    if (!this.suite.category) {
      throw new Error('Test suite must have a category');
    }
    return this.suite as TestSuite;
  }
}

// Convenience functions
export const scenario = () => new TestScenarioBuilder();
export const suite = () => new TestSuiteBuilder();
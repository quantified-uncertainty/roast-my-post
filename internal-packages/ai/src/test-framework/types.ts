import type { AnalysisResult, SimpleAnalysisPlugin } from '../analysis-plugins/types';
import type { Comment } from '../shared/types';
import type { RichLLMInteraction } from '../types';

/**
 * Core test types used across the framework
 */

export interface TestConfig {
  /** Skip tests if no API key available */
  requiresApiKey?: boolean;
  /** Timeout for test execution */
  timeout?: number;
  /** Whether to log verbose output */
  verbose?: boolean;
  /** Mock LLM responses instead of real calls */
  useMocks?: boolean;
}

export interface TestDocument {
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    expectedErrors?: string[];
    expectedGrade?: { min: number; max: number };
  };
}

export interface TestExpectations {
  // Comment expectations
  comments?: {
    count?: { min?: number; max?: number; exact?: number };
    mustFind?: string[];
    mustNotFind?: string[];
    highlights?: {
      verifyPositions?: boolean;
      verifyNoOverlaps?: boolean;
    };
  };
  
  // Analysis expectations
  analysis?: {
    summaryContains?: string[];
    analysisContains?: string[];
    grade?: { min?: number; max?: number };
  };
  
  // Performance expectations
  performance?: {
    maxCost?: number;
    maxTimeMs?: number;
    maxLLMCalls?: number;
  };
  
  // Error expectations
  errors?: {
    shouldFail?: boolean;
    expectedError?: string;
  };
}

export interface TestScenario {
  name: string;
  description?: string;
  document: TestDocument;
  expectations: TestExpectations;
  config?: TestConfig;
}

export interface TestSuite {
  name: string;
  category: 'plugin' | 'tool' | 'agent' | 'integration';
  scenarios: TestScenario[];
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
}

export interface TestResult {
  scenario: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    timeMs: number;
    cost: number;
    llmCalls: number;
  };
  actualResult?: AnalysisResult;
}

export interface MockConfig {
  /** Mock response for tools */
  toolResponses?: Map<string, any>;
  /** Mock LLM interactions */
  llmResponses?: RichLLMInteraction[];
  /** Mock plugin results */
  pluginResults?: Map<string, AnalysisResult>;
  /** Delay to simulate processing time */
  delay?: number;
}

export interface TestRunner {
  run(scenario: TestScenario): Promise<TestResult>;
}

export interface TestContext {
  logger: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
    debug: (msg: string) => void;
  };
  mocks?: MockConfig;
  metrics: {
    startTime: number;
    llmCalls: number;
    totalCost: number;
  };
}
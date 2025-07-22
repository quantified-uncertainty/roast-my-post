/**
 * Shared test utilities to reduce test code duplication
 */

import { jest } from '@jest/globals';
import type { Anthropic } from '@anthropic-ai/sdk';
import type { RichLLMInteraction } from '@/types/llm';
import type { NextRequest } from 'next/server';

/**
 * Mock data factories for consistent test data generation
 */
// Type definitions for mock data
export interface MockDocument {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAgent {
  id: string;
  name: string;
  primaryInstructions: string;
  selfCritiqueInstructions: string;
}

export interface MockEvaluation {
  id: string;
  documentId: string;
  agentId: string;
  thinking: string;
  analysis: string;
  summary: string;
  grade: number;
  createdAt: Date;
}

export interface MockChunk {
  id: string;
  text: string;
  metadata: {
    position: { start: number; end: number };
  };
}

export interface MockFinding {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  metadata: {
    category: string;
    chunkId: string;
  };
}

export interface MockChunkResult {
  findings: MockFinding[];
  llmCalls: RichLLMInteraction[];
  metadata: {
    tokensUsed: number;
    processingTime: number;
  };
}

export interface MockSynthesisResult {
  summary: string;
  findings: MockFinding[];
  recommendations: string[];
  llmCalls: RichLLMInteraction[];
}

export class TestDataFactory {
  static createMockDocument(overrides: Partial<MockDocument> = {}): MockDocument {
    return {
      id: 'test-doc-1',
      title: 'Test Document',
      content: 'This is test content for analysis.',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createMockAgent(overrides: Partial<MockAgent> = {}): MockAgent {
    return {
      id: 'test-agent-1',
      name: 'Test Agent',
      primaryInstructions: 'Test instructions for the agent',
      selfCritiqueInstructions: 'Test self-critique instructions',
      ...overrides
    };
  }

  static createMockEvaluation(overrides: Partial<MockEvaluation> = {}): MockEvaluation {
    return {
      id: 'test-eval-1',
      documentId: 'test-doc-1',
      agentId: 'test-agent-1',
      thinking: 'Test thinking process',
      analysis: 'Test analysis content',
      summary: 'Test summary',
      grade: 85,
      createdAt: new Date(),
      ...overrides
    };
  }

  static createMockChunk(overrides: Partial<MockChunk> = {}): MockChunk {
    return {
      id: 'test-chunk-1',
      text: 'This is test chunk content.',
      metadata: {
        position: { start: 0, end: 50 }
      },
      ...overrides
    };
  }

  static createMockLLMInteraction(overrides: Partial<RichLLMInteraction> = {}): RichLLMInteraction {
    return {
      model: 'claude-3-sonnet-20240229',
      prompt: 'Test prompt',
      response: 'Test response',
      tokensUsed: {
        prompt: 100,
        completion: 150,
        total: 250
      },
      duration: 1500,
      timestamp: new Date(),
      ...overrides
    };
  }

  static createMockFinding(overrides: Partial<MockFinding> = {}): MockFinding {
    return {
      type: 'error',
      severity: 'medium' as const,
      message: 'Test finding message',
      metadata: {
        category: 'test_category',
        chunkId: 'test-chunk-1'
      },
      ...overrides
    };
  }
}

/**
 * Claude API wrapper mock utilities
 */
// Claude wrapper mock types
export interface MockClaudeResponse {
  response: {
    id: string;
    content: Array<{ type: string; text?: string; id?: string; name?: string; input?: any }>;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  interaction: RichLLMInteraction;
}

export interface MockClaudeToolResponse<T> extends MockClaudeResponse {
  toolResult: T;
}

export class ClaudeWrapperMocks {
  static createMockCallClaude(responseOverrides: Partial<MockClaudeResponse> = {}) {
    const mockResponse: MockClaudeResponse = {
      response: {
        id: 'msg_test',
        content: [{ type: 'text', text: 'Mock response' }],
        usage: {
          input_tokens: 100,
          output_tokens: 150
        },
        ...(responseOverrides.response || {})
      },
      interaction: TestDataFactory.createMockLLMInteraction(
        responseOverrides.interaction as Partial<RichLLMInteraction> || {}
      )
    };

    return jest.fn<() => Promise<MockClaudeResponse>>().mockResolvedValue(mockResponse);
  }

  static createMockCallClaudeWithTool<T = any>(toolResultOverrides: Partial<T> = {}) {
    const mockResponse: MockClaudeToolResponse<T> = {
      response: {
        id: 'msg_test',
        content: [{ type: 'tool_use', id: 'tool_test', name: 'test_tool', input: {} }],
        usage: {
          input_tokens: 100,
          output_tokens: 150
        }
      },
      toolResult: {
        items: [],
        summary: 'Mock tool result',
        ...toolResultOverrides
      } as T,
      interaction: TestDataFactory.createMockLLMInteraction()
    };

    return jest.fn<() => Promise<MockClaudeToolResponse<T>>>().mockResolvedValue(mockResponse);
  }

  static createMockWrapperModule() {
    return {
      callClaude: this.createMockCallClaude(),
      callClaudeWithTool: this.createMockCallClaudeWithTool(),
      MODEL_CONFIG: {
        analysis: 'claude-3-sonnet-20240229',
        reasoning: 'claude-3-opus-20240229'
      }
    };
  }
}

/**
 * Plugin system test utilities
 */
// Plugin system types
export interface MockPluginState {
  items: any[];
  errors: any[];
  [key: string]: any;
}

export interface MockBasePlugin {
  state: MockPluginState;
  clearState: jest.MockedFunction<() => void>;
  processChunk: jest.MockedFunction<any>;
  synthesize: jest.MockedFunction<any>;
  trackLLMCall: jest.MockedFunction<any>;
  name: jest.MockedFunction<() => string>;
  promptForWhenToUse: jest.MockedFunction<() => string>;
}

export class PluginTestUtils {
  static createMockBasePlugin(stateOverrides: Partial<MockPluginState> = {}): MockBasePlugin {
    const mockState: MockPluginState = {
      items: [],
      errors: [],
      ...stateOverrides
    };

    return {
      state: mockState,
      clearState: jest.fn(() => {
        Object.keys(mockState).forEach(key => {
          if (Array.isArray(mockState[key as keyof MockPluginState])) {
            (mockState[key as keyof MockPluginState] as any[]).length = 0;
          }
        });
      }) as jest.MockedFunction<() => void>,
      processChunk: jest.fn(),
      synthesize: jest.fn(),
      trackLLMCall: jest.fn(),
      name: jest.fn().mockReturnValue('MOCK_PLUGIN') as jest.MockedFunction<() => string>,
      promptForWhenToUse: jest.fn().mockReturnValue('Mock plugin usage prompt') as jest.MockedFunction<() => string>
    };
  }

  static createMockChunkResult(overrides: Partial<MockChunkResult> = {}): MockChunkResult {
    return {
      findings: [],
      llmCalls: [],
      metadata: {
        tokensUsed: 250,
        processingTime: 1500
      },
      ...overrides
    };
  }

  static createMockSynthesisResult(overrides: Partial<MockSynthesisResult> = {}): MockSynthesisResult {
    return {
      summary: 'Mock synthesis summary',
      findings: [],
      recommendations: [],
      llmCalls: [],
      ...overrides
    };
  }
}

/**
 * API route test utilities
 */
export class APITestUtils {
  static createMockRequest(options: {
    method?: string;
    url?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}) {
    const {
      method = 'GET',
      url = 'http://localhost:3000/test',
      body,
      headers = {},
      searchParams = {}
    } = options;

    const mockUrl = new URL(url);
    Object.entries(searchParams).forEach(([key, value]) => {
      mockUrl.searchParams.set(key, value);
    });

    const mockRequest = {
      method,
      url: mockUrl.toString(),
      headers: new Map(Object.entries(headers)),
      json: jest.fn<() => Promise<any>>().mockResolvedValue(body),
      text: jest.fn<() => Promise<string>>().mockResolvedValue(body ? JSON.stringify(body) : ''),
      ip: '127.0.0.1'
    } as any;

    // Add Headers-like methods
    (mockRequest.headers as any).get = jest.fn((key: string) => headers[key] || null);
    (mockRequest.headers as any).has = jest.fn((key: string) => key in headers);

    return mockRequest;
  }

  static createMockContext(params: Record<string, string> = {}) {
    return {
      params
    };
  }

  static expectJsonResponse(response: any, expectedStatus: number, expectedBody?: any) {
    expect(response.status).toBe(expectedStatus);
    if (expectedBody) {
      // For NextResponse objects, we need to call json() to get the body
      if (response.json && typeof response.json === 'function') {
        return response.json().then((body: any) => {
          expect(body).toEqual(expectedBody);
        });
      }
    }
  }
}

/**
 * Database test utilities
 */
// Database mock types
export interface MockPrismaTable {
  findUnique: jest.MockedFunction<any>;
  findMany: jest.MockedFunction<any>;
  create: jest.MockedFunction<any>;
  update: jest.MockedFunction<any>;
  delete: jest.MockedFunction<any>;
}

export interface MockPrismaClient {
  document: MockPrismaTable;
  agent: MockPrismaTable;
  evaluation: MockPrismaTable;
  $transaction: jest.MockedFunction<any>;
}

export class DatabaseTestUtils {
  static createMockPrismaClient(): MockPrismaClient {
    return {
      document: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      agent: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      evaluation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      $transaction: jest.fn()
    };
  }

  static mockPrismaFindUnique(client: MockPrismaClient, table: keyof MockPrismaClient, result: any): void {
    if (table === '$transaction') return;
    (client[table] as MockPrismaTable).findUnique.mockResolvedValue(result);
  }

  static mockPrismaFindMany(client: MockPrismaClient, table: keyof MockPrismaClient, results: any[]): void {
    if (table === '$transaction') return;
    (client[table] as MockPrismaTable).findMany.mockResolvedValue(results);
  }

  static mockPrismaCreate(client: MockPrismaClient, table: keyof MockPrismaClient, result: any): void {
    if (table === '$transaction') return;
    (client[table] as MockPrismaTable).create.mockResolvedValue(result);
  }
}

/**
 * Assertion helpers for common test patterns
 */
export class TestAssertions {
  static expectLLMInteraction(interaction: RichLLMInteraction, expectedModel?: string) {
    expect(interaction).toHaveProperty('id');
    expect(interaction).toHaveProperty('model');
    expect(interaction).toHaveProperty('tokensUsed');
    expect(interaction).toHaveProperty('duration');
    expect(interaction).toHaveProperty('timestamp');
    
    if (expectedModel) {
      expect(interaction.model).toBe(expectedModel);
    }
  }

  static expectFinding(finding: MockFinding, expectedType?: string, expectedSeverity?: string) {
    expect(finding).toHaveProperty('type');
    expect(finding).toHaveProperty('severity');
    expect(finding).toHaveProperty('message');
    
    if (expectedType) {
      expect(finding.type).toBe(expectedType);
    }
    if (expectedSeverity) {
      expect(finding.severity).toBe(expectedSeverity);
    }
  }

  static expectChunkResult(result: MockChunkResult) {
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('llmCalls');
    expect(result).toHaveProperty('metadata');
    expect(Array.isArray(result.findings)).toBe(true);
    expect(Array.isArray(result.llmCalls)).toBe(true);
  }

  static expectSynthesisResult(result: MockSynthesisResult) {
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('llmCalls');
    expect(Array.isArray(result.findings)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(Array.isArray(result.llmCalls)).toBe(true);
  }
}

/**
 * Test environment setup utilities
 */
export class TestEnvironment {
  static setupMockEnvironment() {
    // Mock environment variables
    // process.env.NODE_ENV = 'test'; // Skip for now - read-only in some environments
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    // Mock console methods to reduce noise in tests
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
  }

  static setupMockTimers() {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  }

  static restoreTimers() {
    jest.useRealTimers();
  }

  static setupClaudeWrapperMocks() {
    // Mock the Claude wrapper module
    jest.doMock('@/lib/claude/wrapper', () => ClaudeWrapperMocks.createMockWrapperModule());
  }
}

/**
 * Test utilities specifically for plugin system
 */
export class PluginSystemTestUtils {
  static async runPluginChunkTest(
    plugin: MockBasePlugin,
    inputText: string,
    expectedFindingCount?: number
  ) {
    const chunk = TestDataFactory.createMockChunk({ text: inputText });
    const result = await plugin.processChunk(chunk);
    
    TestAssertions.expectChunkResult(result);
    
    if (expectedFindingCount !== undefined) {
      expect(result.findings).toHaveLength(expectedFindingCount);
    }
    
    return result;
  }

  static async runPluginSynthesisTest(
    plugin: MockBasePlugin,
    expectedRecommendationCount?: number
  ) {
    const result = await plugin.synthesize();
    
    TestAssertions.expectSynthesisResult(result);
    
    if (expectedRecommendationCount !== undefined) {
      expect(result.recommendations).toHaveLength(expectedRecommendationCount);
    }
    
    return result;
  }
}


/**
 * Shared test utilities to reduce test code duplication
 */

import { jest } from '@jest/globals';

/**
 * Mock data factories for consistent test data generation
 */
export class TestDataFactory {
  static createMockDocument(overrides: Partial<any> = {}) {
    return {
      id: 'test-doc-1',
      title: 'Test Document',
      content: 'This is test content for analysis.',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createMockAgent(overrides: Partial<any> = {}) {
    return {
      id: 'test-agent-1',
      name: 'Test Agent',
      primaryInstructions: 'Test instructions for the agent',
      selfCritiqueInstructions: 'Test self-critique instructions',
      ...overrides
    };
  }

  static createMockEvaluation(overrides: Partial<any> = {}) {
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

  static createMockChunk(overrides: Partial<any> = {}) {
    return {
      id: 'test-chunk-1',
      text: 'This is test chunk content.',
      metadata: {
        position: { start: 0, end: 50 }
      },
      ...overrides
    };
  }

  static createMockLLMInteraction(overrides: Partial<any> = {}) {
    return {
      id: 'test-interaction-1',
      model: 'claude-3-sonnet-20240229',
      prompt: 'Test prompt',
      response: 'Test response',
      tokensUsed: {
        prompt: 100,
        completion: 150,
        total: 250
      },
      cost: 0.01,
      duration: 1500,
      timestamp: new Date(),
      ...overrides
    };
  }

  static createMockFinding(overrides: Partial<any> = {}) {
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
export class ClaudeWrapperMocks {
  static createMockCallClaude(responseOverrides: any = {}) {
    const mockResponse = {
      response: {
        id: 'msg_test',
        content: [{ type: 'text', text: 'Mock response' }],
        usage: {
          input_tokens: 100,
          output_tokens: 150
        },
        ...responseOverrides.response
      },
      interaction: TestDataFactory.createMockLLMInteraction(responseOverrides.interaction),
      ...responseOverrides
    };

    return jest.fn<any>().mockResolvedValue(mockResponse) as any;
  }

  static createMockCallClaudeWithTool<T = any>(toolResultOverrides: any = {}) {
    const mockResponse = {
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
      },
      interaction: TestDataFactory.createMockLLMInteraction()
    };

    return jest.fn<any>().mockResolvedValue(mockResponse) as any;
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
export class PluginTestUtils {
  static createMockBasePlugin(stateOverrides: any = {}) {
    const mockState = {
      items: [],
      errors: [],
      ...stateOverrides
    };

    return {
      state: mockState,
      clearState: jest.fn(() => {
        Object.keys(mockState).forEach(key => {
          if (Array.isArray(mockState[key])) {
            mockState[key].length = 0;
          }
        });
      }),
      processChunk: jest.fn(),
      synthesize: jest.fn(),
      trackLLMCall: jest.fn(),
      name: jest.fn().mockReturnValue('MOCK_PLUGIN'),
      promptForWhenToUse: jest.fn().mockReturnValue('Mock plugin usage prompt')
    };
  }

  static createMockChunkResult(overrides: Partial<any> = {}) {
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

  static createMockSynthesisResult(overrides: Partial<any> = {}) {
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
      json: jest.fn<any>().mockResolvedValue(body),
      text: jest.fn<any>().mockResolvedValue(body ? JSON.stringify(body) : ''),
      ip: '127.0.0.1'
    } as any;

    // Add Headers-like methods
    mockRequest.headers.get = jest.fn((key: string) => headers[key] || null);
    mockRequest.headers.has = jest.fn((key: string) => key in headers);

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
export class DatabaseTestUtils {
  static createMockPrismaClient(): any {
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
    } as any;
  }

  static mockPrismaFindUnique(client: any, table: string, result: any): void {
    (client[table].findUnique as any).mockResolvedValue(result);
  }

  static mockPrismaFindMany(client: any, table: string, results: any[]): void {
    (client[table].findMany as any).mockResolvedValue(results);
  }

  static mockPrismaCreate(client: any, table: string, result: any): void {
    (client[table].create as any).mockResolvedValue(result);
  }
}

/**
 * Assertion helpers for common test patterns
 */
export class TestAssertions {
  static expectLLMInteraction(interaction: any, expectedModel?: string) {
    expect(interaction).toHaveProperty('id');
    expect(interaction).toHaveProperty('model');
    expect(interaction).toHaveProperty('tokensUsed');
    expect(interaction).toHaveProperty('duration');
    expect(interaction).toHaveProperty('timestamp');
    
    if (expectedModel) {
      expect(interaction.model).toBe(expectedModel);
    }
  }

  static expectFinding(finding: any, expectedType?: string, expectedSeverity?: string) {
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

  static expectChunkResult(result: any) {
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('llmCalls');
    expect(result).toHaveProperty('metadata');
    expect(Array.isArray(result.findings)).toBe(true);
    expect(Array.isArray(result.llmCalls)).toBe(true);
  }

  static expectSynthesisResult(result: any) {
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
    plugin: any,
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
    plugin: any,
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


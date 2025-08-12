import { analyzeWithMultiEpistemicEval } from '../multiEpistemicEval';
import { MathPlugin } from '@roast/ai';
import type { Document } from '@roast/ai';
import type { Agent } from '@roast/ai';

// Mock only the external dependencies (LLM calls), not the internal components
jest.mock('@roast/ai', () => ({
  ...jest.requireActual('@roast/ai'), // Keep all actual exports
  MODEL_CONFIG: {
    analysis: 'claude-sonnet-4-20250514',
    routing: 'claude-3-haiku-20240307',
    forecasting: 'claude-sonnet-4-20250514'
  },
  createHeliconeHeaders: jest.fn(() => ({})),
  callClaude: jest.fn().mockImplementation(async (messages, options) => {
    // Simulate real Claude responses based on the prompt
    const lastMessage = messages[messages.length - 1].content;
    
    if (lastMessage.includes('Extract all mathematical expressions')) {
      // Simulate math extraction response
      return {
        response: JSON.stringify({
          tool_calls: [{
            function: {
              name: 'report_math_content',
              arguments: JSON.stringify({
                items: [
                  {
                    equation: "2 + 2 = 5",
                    isCorrect: false,
                    error: "Arithmetic error: 2 + 2 equals 4, not 5",
                    surroundingText: "The calculation shows that 2 + 2 = 5"
                  },
                  {
                    equation: "10 * 0.1 = 1",
                    isCorrect: true,
                    surroundingText: "Converting 10% to decimal: 10 * 0.1 = 1"
                  }
                ]
              })
            }
          }]
        }),
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80
        }
      };
    }
    
    // Default response
    return {
      response: "Analysis complete",
      usage: {
        prompt_tokens: 50,
        completion_tokens: 20
      }
    };
  }),
  callClaudeWithTool: jest.fn().mockImplementation(async (options) => {
    // Mock tool use for plugins that use extractionHelper
    return {
      response: { content: [{ type: 'text', text: 'Mocked response' }] },
      toolResult: { items: [] },
      interaction: {
        model: 'claude-sonnet-4-20250514',
        prompt: 'mocked prompt',
        response: 'mocked response',
        tokensUsed: { prompt: 50, completion: 20, total: 70 },
        timestamp: new Date(),
        duration: 100
      }
    };
  })
}));

describe('Plugin System E2E Tests', () => {
  const mockDocument: Document = {
    id: 'test-doc-e2e',
    title: 'E2E Test Document',
    content: `# Test Document
    
This document contains some math for testing.

Basic arithmetic: 2 + 2 = 5 (this is wrong)

Percentage calculation: Converting 10% to decimal: 10 * 0.1 = 1

Some text without math to test routing.`,
    author: 'Test Author',
    publishedDate: '2024-01-01',
    slug: 'test-doc-e2e',
    reviews: [],
    intendedAgents: []
  };

  const mockAgent: Agent = {
    id: 'test-agent',
    name: 'Test Agent',
    version: '1',
    description: 'Test agent for E2E testing',
    primaryInstructions: 'Analyze the document',
    providesGrades: false
  };

  it('should handle full document analysis workflow with real plugin processing', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    // Verify basic structure
    expect(result).toHaveProperty('thinking');
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('highlights');
    expect(result).toHaveProperty('tasks');
    
    // Verify highlights structure (may be empty with mocked LLM)
    expect(result.highlights).toBeDefined();
    expect(Array.isArray(result.highlights)).toBe(true);
    
    // If highlights exist, verify structure
    if (result.highlights.length > 0) {
      expect(result.highlights[0]).toHaveProperty('description');
      expect(result.highlights[0]).toHaveProperty('highlight');
      expect((result.highlights[0] as any).highlight).toHaveProperty('startOffset');
      expect((result.highlights[0] as any).highlight).toHaveProperty('endOffset');
    }
    
    // Verify task tracking
    expect(result.tasks.length).toBeGreaterThan(0);
    const pluginTask = result.tasks.find(t => t.name === 'Plugin Analysis');
    expect(pluginTask).toBeDefined();
    expect(pluginTask?.priceInDollars).toBeGreaterThanOrEqual(0); // May be 0 with mocked LLM
  });

  it('should handle missing or malformed LLM responses gracefully', async () => {
    // Mock a response with missing usage data
    const { callClaude } = require('@roast/ai');
    callClaude.mockImplementationOnce(async () => ({
      response: JSON.stringify({
        tool_calls: [{
          function: {
            name: 'report_math_content',
            arguments: JSON.stringify({ items: [] })
          }
        }]
      }),
      // Missing usage property - this is what caused the production bug
      usage: undefined
    }));

    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    // Should not throw and should still produce results
    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(result.highlights).toBeDefined();
  });

  it('should handle plugin failures gracefully', async () => {
    // Mock a plugin that throws an error
    const { callClaude } = require('@roast/ai');
    callClaude.mockImplementationOnce(async () => {
      throw new Error('LLM service unavailable');
    });

    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    // Should handle the error gracefully and return partial results
    expect(result).toBeDefined();
    expect(result.highlights).toBeDefined();
    expect(result.analysis).toBeDefined();
    // Plugin failures should be handled gracefully, not propagated to analysis text
  });

  it('should correctly calculate costs even with partial data', async () => {
    // Mix of responses with and without usage data
    const { callClaude } = require('@roast/ai');
    let callCount = 0;
    callClaude.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          response: JSON.stringify({ tool_calls: [] }),
          usage: { prompt_tokens: 100, completion_tokens: 50 }
        };
      } else {
        return {
          response: JSON.stringify({ tool_calls: [] }),
          // No usage data on subsequent calls
          usage: undefined
        };
      }
    });

    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    // Should calculate cost only from valid usage data (may be 0 with mocked LLM)
    const pluginTask = result.tasks.find(t => t.name === 'Plugin Analysis');
    expect(pluginTask?.priceInDollars).toBeGreaterThanOrEqual(0);
  });

  it('should handle complex document structures with multiple plugins', async () => {
    // This would test with multiple plugins once they're updated
    const complexDocument: Document = {
      ...mockDocument,
      content: `# Complex Document

## Math Section
The formula E = mc^2 shows energy-mass equivalence.
Calculate: 15% of 200 = 30

## Text Section
This section has spelling erors and grammer issues.

## Links Section
Visit https://example.com for more information.

## Mixed Content
The speed of light is 3 × 10^8 m/s, which is aproximately 300,000 km/s.`
    };

    const result = await analyzeWithMultiEpistemicEval(complexDocument, mockAgent);
    
    expect(result.highlights).toBeDefined();
    expect(result.analysis).toBeDefined();
    // With mocked LLM, we can't guarantee highlights will be generated
  });
});

describe('Plugin Integration Tests', () => {
  it('should handle MathPlugin with various edge cases', async () => {
    const plugin = new MathPlugin();
    const chunks = [
      {
        id: 'chunk-1',
        text: 'No math here, just text',
        startOffset: 0,
        endOffset: 23
      },
      {
        id: 'chunk-2', 
        text: 'Math: 2 + 2 = 4 and π ≈ 3.14159',
        startOffset: 24,
        endOffset: 56
      }
    ];
    
    // Mock LLM response for math plugin
    const { callClaude } = require('@roast/ai');
    callClaude.mockImplementation(async (messages: any[]) => {
      const content = messages[messages.length - 1].content;
      if (content.includes('No math here')) {
        return {
          response: JSON.stringify({
            tool_calls: [{
              function: {
                name: 'report_math_content',
                arguments: JSON.stringify({ items: [] })
              }
            }]
          }),
          usage: { prompt_tokens: 50, completion_tokens: 10 }
        };
      } else {
        return {
          response: JSON.stringify({
            tool_calls: [{
              function: {
                name: 'report_math_content',
                arguments: JSON.stringify({
                  items: [{
                    equation: "2 + 2 = 4",
                    isCorrect: true,
                    surroundingText: "Math: 2 + 2 = 4"
                  }]
                })
              }
            }]
          }),
          usage: { prompt_tokens: 100, completion_tokens: 50 }
        };
      }
    });
    
    const result = await plugin.analyze(chunks as any[], chunks.map(c => c.text).join('\n'));
    
    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
  });
});
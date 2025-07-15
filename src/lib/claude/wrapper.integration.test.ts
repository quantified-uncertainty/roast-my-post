import { callClaude, callClaudeWithTool, MODEL_CONFIG } from './wrapper';
import { PluginLLMInteraction } from '@/types/llm';
import { createMockClaudeError, expectValidLLMInteraction } from './testUtils';
import { anthropic } from '@/types/openai';

// Mock the createAnthropicClient
jest.mock('@/types/openai', () => ({
  createAnthropicClient: jest.fn(),
  anthropic: {
    Messages: {
      MessageCreateParams: {},
      MessageParam: {}
    }
  }
}));

import { createAnthropicClient } from '@/types/openai';

describe('Claude Wrapper Integration Tests', () => {
  const mockCreateAnthropicClient = createAnthropicClient as jest.MockedFunction<typeof createAnthropicClient>;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      messages: {
        create: jest.fn()
      }
    };
    
    mockCreateAnthropicClient.mockReturnValue(mockClient);
  });

  describe('callClaude', () => {
    it('should make a successful call and track interaction', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'The answer is 4' }],
        model: MODEL_CONFIG.analysis,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 25,
          output_tokens: 10
        }
      };

      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const interactions: PluginLLMInteraction[] = [];
      const result = await callClaude({
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        max_tokens: 100
      }, interactions);

      // Verify API call
      expect(mockClient.messages.create).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        max_tokens: 100,
        model: MODEL_CONFIG.analysis
      });

      // Verify response
      expect(result.response).toBe(mockResponse);
      
      // Verify interaction tracking
      expectValidLLMInteraction(result.interaction);
      expect(result.interaction.model).toBe(MODEL_CONFIG.analysis);
      expect(result.interaction.tokensUsed).toEqual({
        prompt: 25,
        completion: 10,
        total: 35
      });
      
      // Verify auto-accumulation
      expect(interactions).toHaveLength(1);
      expect(interactions[0]).toBe(result.interaction);
    });

    it('should handle errors and retry', async () => {
      const mockError = createMockClaudeError('Rate limit exceeded', 429);
      
      // First call fails, second succeeds
      mockClient.messages.create
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          id: 'msg_retry',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Success after retry' }],
          model: MODEL_CONFIG.analysis,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 20, output_tokens: 5 }
        });

      const result = await callClaude({
        messages: [{ role: 'user', content: 'Test retry' }]
      });

      expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
      const textContent = result.response.content[0] as Anthropic.TextBlock;
      expect(textContent.text).toBe('Success after retry');
    });

    it('should use custom model when specified', async () => {
      mockClient.messages.create.mockResolvedValueOnce({
        id: 'msg_custom',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Custom model response' }],
        model: MODEL_CONFIG.routing,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 15, output_tokens: 8 }
      });

      await callClaude({
        messages: [{ role: 'user', content: 'Test' }],
        model: MODEL_CONFIG.routing
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODEL_CONFIG.routing
        })
      );
    });

    it('should throw after max retries', async () => {
      const mockError = createMockClaudeError('Server error', 500);
      mockClient.messages.create.mockRejectedValue(mockError);

      await expect(callClaude({
        messages: [{ role: 'user', content: 'Test' }]
      })).rejects.toThrow('Server error');

      // Should attempt 3 times (initial + 2 retries)
      expect(mockClient.messages.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('callClaudeWithTool', () => {
    it('should successfully call with tool and parse response', async () => {
      const mockToolResult = {
        answer: 42,
        explanation: 'The answer to everything'
      };

      mockClient.messages.create.mockResolvedValueOnce({
        id: 'msg_tool',
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'tool_use',
          id: 'tool_123',
          name: 'calculate',
          input: mockToolResult
        }],
        model: MODEL_CONFIG.analysis,
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const interactions: PluginLLMInteraction[] = [];
      const result = await callClaudeWithTool<typeof mockToolResult>({
        messages: [{ role: 'user', content: 'Calculate the answer' }],
        toolName: 'calculate',
        toolDescription: 'Calculate the answer to life',
        toolSchema: {
          type: 'object',
          properties: {
            answer: { type: 'number' },
            explanation: { type: 'string' }
          },
          required: ['answer', 'explanation']
        }
      }, interactions);

      // Verify tool setup in API call
      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [{
            name: 'calculate',
            description: 'Calculate the answer to life',
            input_schema: expect.any(Object)
          }]
        })
      );

      // Verify result
      expect(result.toolResult).toEqual(mockToolResult);
      expectValidLLMInteraction(result.interaction);
      expect(interactions).toHaveLength(1);
    });

    it('should handle tool parsing errors', async () => {
      mockClient.messages.create.mockResolvedValueOnce({
        id: 'msg_bad',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'No tool use here' }],
        model: MODEL_CONFIG.analysis,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 50, output_tokens: 25 }
      });

      await expect(callClaudeWithTool({
        messages: [{ role: 'user', content: 'Test' }],
        toolName: 'test',
        toolDescription: 'Test tool',
        toolSchema: { type: 'object' }
      })).rejects.toThrow('No tool use found in response');
    });

    it('should include system message when provided', async () => {
      mockClient.messages.create.mockResolvedValueOnce({
        id: 'msg_system',
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'tool_use',
          id: 'tool_sys',
          name: 'analyze',
          input: { result: 'analyzed' }
        }],
        model: MODEL_CONFIG.analysis,
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 80, output_tokens: 40 }
      });

      await callClaudeWithTool({
        system: 'You are a helpful analyzer',
        messages: [{ role: 'user', content: 'Analyze this' }],
        toolName: 'analyze',
        toolDescription: 'Analyze content',
        toolSchema: { type: 'object' }
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful analyzer'
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle non-retryable errors immediately', async () => {
      const mockError = createMockClaudeError('Invalid API key', 401);
      mockClient.messages.create.mockRejectedValueOnce(mockError);

      await expect(callClaude({
        messages: [{ role: 'user', content: 'Test' }]
      })).rejects.toThrow('Invalid API key');

      // Should not retry for 401
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed responses gracefully', async () => {
      mockClient.messages.create.mockResolvedValueOnce({
        // Missing required fields
        content: null,
        usage: null
      });

      await expect(callClaude({
        messages: [{ role: 'user', content: 'Test' }]
      })).rejects.toThrow();
    });
  });

  describe('Token usage tracking', () => {
    it('should accurately track token usage across multiple calls', async () => {
      const responses = [
        { usage: { input_tokens: 100, output_tokens: 50 } },
        { usage: { input_tokens: 150, output_tokens: 75 } },
        { usage: { input_tokens: 200, output_tokens: 100 } }
      ];

      const interactions: PluginLLMInteraction[] = [];

      for (const [index, response] of responses.entries()) {
        mockClient.messages.create.mockResolvedValueOnce({
          id: `msg_${index}`,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: `Response ${index}` }],
          model: MODEL_CONFIG.analysis,
          stop_reason: 'end_turn',
          stop_sequence: null,
          ...response
        });

        await callClaude({
          messages: [{ role: 'user', content: `Query ${index}` }]
        }, interactions);
      }

      expect(interactions).toHaveLength(3);
      
      const totalTokens = interactions.reduce((sum, i) => sum + i.tokensUsed.total, 0);
      expect(totalTokens).toBe(575); // 150 + 225 + 300
    });
  });
});
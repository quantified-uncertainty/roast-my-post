import { vi } from 'vitest';
import { RichLLMInteraction } from '../types';
import { callClaudeWithTool } from './wrapper';

/**
 * Helper to mock Claude tool responses in tests
 */
export const setupClaudeToolMock = (
  mockFunction: any
) => {
  return {
    mockToolResponse: <T extends Record<string, any>>(
      toolResult: T,
      options: {
        tokens?: { input: number; output: number };
        model?: string;
      } = {}
    ) => {
      const tokens = options.tokens || { input: 150, output: 75 };
      const model = options.model || 'claude-sonnet-4-20250514';

      mockFunction.mockResolvedValueOnce({
        response: {
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'tool_test',
            name: 'mock_tool',
            input: toolResult
          }],
          model,
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: tokens.input,
            output_tokens: tokens.output
          }
        } as any,
        interaction: {
          model,
          prompt: JSON.stringify([{ role: 'user', content: 'test prompt' }]),
          response: JSON.stringify(toolResult),
          tokensUsed: {
            prompt: tokens.input,
            completion: tokens.output,
            total: tokens.input + tokens.output
          },
          timestamp: new Date(),
          duration: 150
        },
        toolResult
      });
    }
  };
};
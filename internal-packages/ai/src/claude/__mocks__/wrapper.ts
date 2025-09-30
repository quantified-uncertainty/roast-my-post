import { vi } from "vitest";

import { Anthropic } from "@anthropic-ai/sdk";

import { RichLLMInteraction } from "../../types";
import {
  ClaudeCallOptions,
  ClaudeCallResult,
} from "../wrapper";

// Mock implementation of callClaude
export const callClaude = vi.fn(
  async (
    params: ClaudeCallOptions,
    interactions?: RichLLMInteraction[]
  ): Promise<ClaudeCallResult> => {
    // Default mock response
    const mockResponse: Anthropic.Messages.Message = {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Mock response", citations: [] }],
      model: params.model || "claude-sonnet-4-5",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };

    const mockInteraction: RichLLMInteraction = {
      model: params.model || "claude-sonnet-4-5",
      prompt: JSON.stringify(params.messages),
      response: "Mock response",
      tokensUsed: {
        prompt: 100,
        completion: 50,
        total: 150,
      },
      timestamp: new Date(),
      duration: 100,
    };

    // Add to interactions array if provided
    if (interactions) {
      interactions.push(mockInteraction);
    }

    return {
      response: mockResponse,
      interaction: mockInteraction,
    };
  }
);

// Mock implementation of callClaudeWithTool
export const callClaudeWithTool = vi.fn(
  async <T extends Record<string, any>>(
    params: {
      system?: string;
      messages: Anthropic.Messages.MessageParam[];
      toolName: string;
      toolDescription: string;
      toolSchema: any;
      model?: string;
      max_tokens?: number;
    },
    interactions?: RichLLMInteraction[]
  ) => {
    // Default mock tool response
    const mockToolResult = {} as T;

    const mockResponse: Anthropic.Messages.Message = {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "tool_test",
          name: params.toolName,
          input: mockToolResult,
        },
      ],
      model: params.model || "claude-sonnet-4-5",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: {
        input_tokens: 150,
        output_tokens: 75,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };

    const mockInteraction: RichLLMInteraction = {
      model: params.model || "claude-sonnet-4-5",
      prompt: JSON.stringify(params.messages),
      response: JSON.stringify(mockToolResult),
      tokensUsed: {
        prompt: 150,
        completion: 75,
        total: 225,
      },
      timestamp: new Date(),
      duration: 150,
    };

    // Add to interactions array if provided
    if (interactions) {
      interactions.push(mockInteraction);
    }

    return {
      response: mockResponse,
      interaction: mockInteraction,
      toolResult: mockToolResult,
    };
  }
);

// Export model config
export const MODEL_CONFIG = {
  analysis: "claude-sonnet-4-5",
  routing: "claude-3-haiku-20240307",
};

// Helper to set up specific mock responses
export const mockClaudeResponse = (
  response: string,
  tokens = { input: 100, output: 50 }
) => {
  callClaude.mockImplementationOnce(async (params, interactions) => {
    const mockResponse: Anthropic.Messages.Message = {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: response, citations: [] }],
      model: params.model || "claude-sonnet-4-5",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: tokens.input,
        output_tokens: tokens.output,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };

    const mockInteraction: RichLLMInteraction = {
      model: params.model || "claude-sonnet-4-5",
      prompt: JSON.stringify(params.messages),
      response: response,
      tokensUsed: {
        prompt: tokens.input,
        completion: tokens.output,
        total: tokens.input + tokens.output,
      },
      timestamp: new Date(),
      duration: 100,
    };

    if (interactions) {
      interactions.push(mockInteraction);
    }

    return {
      response: mockResponse,
      interaction: mockInteraction,
    };
  });
};

// Helper to set up specific tool responses
export const mockClaudeToolResponse = <T extends Record<string, any>>(
  toolResult: T,
  tokens = { input: 150, output: 75 }
) => {
  callClaudeWithTool.mockImplementationOnce(async (params, interactions) => {
    const mockResponse: Anthropic.Messages.Message = {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "tool_test",
          name: params.toolName,
          input: toolResult,
        },
      ],
      model: params.model || "claude-sonnet-4-5",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: {
        input_tokens: tokens.input,
        output_tokens: tokens.output,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };

    const mockInteraction: RichLLMInteraction = {
      model: params.model || "claude-sonnet-4-5",
      prompt: JSON.stringify(params.messages),
      response: JSON.stringify(toolResult),
      tokensUsed: {
        prompt: tokens.input,
        completion: tokens.output,
        total: tokens.input + tokens.output,
      },
      timestamp: new Date(),
      duration: 150,
    };

    if (interactions) {
      interactions.push(mockInteraction);
    }

    return {
      response: mockResponse,
      interaction: mockInteraction,
      toolResult,
    };
  });
};

import { RichLLMInteraction } from '../types';

/**
 * Test utilities for working with Claude wrapper in tests
 */

// Helper to create a mock LLM interaction
export const createMockLLMInteraction = (overrides?: Partial<RichLLMInteraction>): RichLLMInteraction => ({
  model: 'claude-sonnet-4-20250514',
  prompt: 'Test prompt',
  response: 'Test response',
  tokensUsed: {
    prompt: 100,
    completion: 50,
    total: 150
  },
  timestamp: new Date(),
  duration: 100,
  ...overrides
});

// Helper to verify LLM interaction structure
export const expectValidLLMInteraction = (interaction: RichLLMInteraction) => {
  expect(interaction).toMatchObject({
    model: expect.any(String),
    prompt: expect.any(String),
    response: expect.any(String),
    tokensUsed: {
      prompt: expect.any(Number),
      completion: expect.any(Number),
      total: expect.any(Number)
    },
    timestamp: expect.any(Date),
    duration: expect.any(Number)
  });
};

// Helper to calculate total token usage from interactions
export const calculateTotalTokenUsage = (interactions: RichLLMInteraction[]) => {
  return interactions.reduce((acc, interaction) => ({
    prompt: acc.prompt + interaction.tokensUsed.prompt,
    completion: acc.completion + interaction.tokensUsed.completion,
    total: acc.total + interaction.tokensUsed.total
  }), { prompt: 0, completion: 0, total: 0 });
};

// Helper to create a mock error response
export const createMockClaudeError = (message: string, statusCode: number = 500) => {
  const error = new Error(message);
  (error as any).status = statusCode;
  (error as any).headers = {};
  return error;
};

// Helper to create mock tool results of any type
export const createMockToolResult = <T extends Record<string, any>>(result: T): T => result;

// Helper to create a series of mock LLM interactions for testing
export const createMockInteractionChain = (count: number): RichLLMInteraction[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockLLMInteraction({
      prompt: `Test prompt ${i + 1}`,
      response: `Test response ${i + 1}`,
      duration: 100 + i * 50
    })
  );
};
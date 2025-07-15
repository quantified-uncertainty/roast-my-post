import { PluginLLMInteraction } from '@/types/llm';

/**
 * Test utilities for working with Claude wrapper in tests
 */

// Helper to create a mock LLM interaction
export const createMockLLMInteraction = (overrides?: Partial<PluginLLMInteraction>): PluginLLMInteraction => ({
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
export const expectValidLLMInteraction = (interaction: PluginLLMInteraction) => {
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
export const calculateTotalTokenUsage = (interactions: PluginLLMInteraction[]) => {
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

// Common test data for tools
export const testData = {
  factualClaims: {
    claims: [
      {
        text: 'The Berlin Wall fell in 1989',
        topic: 'Historical events',
        importance: 'high' as const,
        specificity: 'high' as const
      },
      {
        text: 'Water boils at 100°C at sea level',
        topic: 'Science',
        importance: 'medium' as const,
        specificity: 'high' as const
      }
    ]
  },
  forecastingClaims: {
    forecasts: [
      {
        id: 'forecast-1',
        claim: 'AI will surpass human intelligence by 2050',
        probability: 0.3,
        confidence: 'medium' as const,
        timeframe: '2050',
        category: 'Technology'
      }
    ]
  },
  mathProblems: {
    problems: [
      {
        expression: '2 + 2',
        location: 'Line 1',
        context: 'Simple addition',
        result: 4,
        isCorrect: true,
        explanation: 'Correct calculation'
      }
    ]
  }
};
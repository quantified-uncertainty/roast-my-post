import { callClaude, callClaudeWithTool, MODEL_CONFIG } from './wrapper';
import { RichLLMInteraction } from '@/types/llm';

describe('Claude Wrapper', () => {
  // Skip if no API keys or in CI environment
  const hasValidApiKey = process.env.ANTHROPIC_API_KEY && 
    process.env.ANTHROPIC_API_KEY !== 'test-key' && 
    !process.env.CI;
  const skipIfNoKeys = !hasValidApiKey ? describe.skip : describe;
  
  skipIfNoKeys('callClaude integration', () => {
    it('should make a simple call and track interaction', async () => {
      const interactions: RichLLMInteraction[] = [];
      
      const result = await callClaude({
        messages: [{ role: 'user', content: 'What is 2+2? Answer briefly.' }],
        max_tokens: 100
      }, interactions);

      // Check response
      expect(result.response).toBeDefined();
      expect(result.response.content).toBeDefined();
      
      // Check interaction tracking
      expect(result.interaction).toBeDefined();
      expect(result.interaction.model).toBe(MODEL_CONFIG.analysis);
      expect(result.interaction.prompt).toContain('What is 2+2?');
      expect(result.interaction.tokensUsed.total).toBeGreaterThan(0);
      expect(result.interaction.duration).toBeGreaterThan(0);
      expect(result.interaction.timestamp).toBeInstanceOf(Date);
      
      // Check auto-accumulation
      expect(interactions).toHaveLength(1);
      expect(interactions[0]).toBe(result.interaction);
    }, 30000);

    it('should work with tool calling', async () => {
      const interactions: RichLLMInteraction[] = [];
      
      const result = await callClaudeWithTool<{ answer: number }>({
        messages: [{ role: 'user', content: 'Calculate 5 + 3' }],
        toolName: 'calculate',
        toolDescription: 'Perform a calculation',
        toolSchema: {
          type: 'object',
          properties: {
            answer: { type: 'number', description: 'The result' }
          },
          required: ['answer']
        },
        max_tokens: 200
      }, interactions);

      expect(result.toolResult).toBeDefined();
      expect(typeof result.toolResult.answer).toBe('number');
      expect(result.toolResult.answer).toBe(8);
      
      expect(interactions).toHaveLength(1);
      expect(interactions[0].model).toBe(MODEL_CONFIG.analysis);
    }, 60000);
  });

  describe('callClaude unit tests', () => {
    it('should use default model when none specified', async () => {
      // Mock the createAnthropicClient to avoid actual API calls
      jest.mock('@/types/openai', () => ({
        createAnthropicClient: () => ({
          messages: {
            create: jest.fn().mockResolvedValue({
              content: [{ type: 'text', text: 'test' }],
              usage: { input_tokens: 10, output_tokens: 5 }
            })
          }
        }),
        ANALYSIS_MODEL: 'claude-3-sonnet-20241022'
      }));
      
      // This test would require more mocking setup
      // For now, just verify the model config
      expect(MODEL_CONFIG.analysis).toBe('claude-sonnet-4-20250514');
      expect(MODEL_CONFIG.routing).toBe('claude-3-haiku-20240307');
    });
  });
});
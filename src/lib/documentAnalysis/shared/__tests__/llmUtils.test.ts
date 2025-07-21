import { countTokensFromInteractions } from '../llmUtils';
import type { LLMInteraction } from '../../../../types/llm';

describe('llmUtils', () => {
  describe('countTokensFromInteractions', () => {
    it('should count tokens correctly when all interactions have usage data', () => {
      const interactions: LLMInteraction[] = [
        {
          messages: [
            { role: 'user', content: 'test' },
            { role: 'assistant', content: 'response' }
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 20
          }
        },
        {
          messages: [
            { role: 'user', content: 'test2' },
            { role: 'assistant', content: 'response2' }
          ],
          usage: {
            input_tokens: 15,
            output_tokens: 25
          }
        }
      ];

      expect(countTokensFromInteractions(interactions, 'input_tokens')).toBe(25);
      expect(countTokensFromInteractions(interactions, 'output_tokens')).toBe(45);
    });

    it('should handle interactions with undefined usage gracefully', () => {
      const interactions: LLMInteraction[] = [
        {
          messages: [
            { role: 'user', content: 'test' },
            { role: 'assistant', content: 'response' }
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 20
          }
        },
        {
          messages: [
            { role: 'user', content: 'test2' },
            { role: 'assistant', content: 'response2' }
          ],
          // Missing usage property - this is what caused the bug
          usage: undefined as any
        },
        {
          messages: [
            { role: 'user', content: 'test3' },
            { role: 'assistant', content: 'response3' }
          ],
          usage: {
            input_tokens: 5,
            output_tokens: 15
          }
        }
      ];

      // Should not throw and should count only valid usage data
      expect(countTokensFromInteractions(interactions, 'input_tokens')).toBe(15);
      expect(countTokensFromInteractions(interactions, 'output_tokens')).toBe(35);
    });

    it('should return 0 when all interactions have undefined usage', () => {
      const interactions: LLMInteraction[] = [
        {
          messages: [
            { role: 'user', content: 'test' },
            { role: 'assistant', content: 'response' }
          ],
          usage: undefined as any
        },
        {
          messages: [
            { role: 'user', content: 'test2' },
            { role: 'assistant', content: 'response2' }
          ],
          usage: undefined as any
        }
      ];

      expect(countTokensFromInteractions(interactions, 'input_tokens')).toBe(0);
      expect(countTokensFromInteractions(interactions, 'output_tokens')).toBe(0);
    });

    it('should handle empty array', () => {
      const interactions: LLMInteraction[] = [];
      
      expect(countTokensFromInteractions(interactions, 'input_tokens')).toBe(0);
      expect(countTokensFromInteractions(interactions, 'output_tokens')).toBe(0);
    });
  });
});
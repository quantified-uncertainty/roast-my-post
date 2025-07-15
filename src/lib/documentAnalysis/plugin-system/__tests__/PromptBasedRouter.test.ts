import { PromptBasedRouter } from '../PromptBasedRouter';
import { BasePlugin } from '../BasePlugin';
import { TextChunk } from '../TextChunk';
import { ChunkResult } from '../types';
import { RichLLMInteraction } from '@/types/llm';

// Mock plugins for testing
class MathPlugin extends BasePlugin {
  name = 'MATH';

  getRoutingExamples() {
    return {
      shouldHandle: [
        '2 + 2 = 5',
        'The calculation shows 10 * 3 = 33',
      ],
      shouldNotHandle: [
        'This is just regular text',
        'No numbers or calculations here'
      ]
    };
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    return {
      chunkId: chunk.id,
      pluginName: this.name,
      processed: true,
      issues: [],
      llmInteractions: [],
      metadata: {}
    };
  }

  async synthesize(): Promise<string> {
    return 'Math analysis complete';
  }
}

class SpellingPlugin extends BasePlugin {
  name = 'SPELLING';

  getRoutingExamples() {
    return {
      shouldHandle: [
        'Ther are many mistaks in this sentance',
        'Accomodation is misspelled'
      ],
      shouldNotHandle: [
        'This text has perfect spelling',
        'Mathematical equations: 2 + 2 = 4'
      ]
    };
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    return {
      chunkId: chunk.id,
      pluginName: this.name,
      processed: true,
      issues: [],
      llmInteractions: [],
      metadata: {}
    };
  }

  async synthesize(): Promise<string> {
    return 'Spelling analysis complete';
  }
}

// Mock Claude wrapper
jest.mock('@/lib/claude/wrapper', () => ({
  callClaudeWithTool: jest.fn(),
  MODEL_CONFIG: {
    routing: 'claude-3-haiku-20240307'
  }
}));

import { callClaudeWithTool } from '@/lib/claude/wrapper';

describe('PromptBasedRouter', () => {
  let router: PromptBasedRouter;
  let mathPlugin: MathPlugin;
  let spellingPlugin: SpellingPlugin;
  let mockCallClaude: jest.MockedFunction<typeof callClaudeWithTool>;

  beforeEach(() => {
    jest.clearAllMocks();
    mathPlugin = new MathPlugin();
    spellingPlugin = new SpellingPlugin();
    router = new PromptBasedRouter([mathPlugin, spellingPlugin]);
    mockCallClaude = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
  });

  describe('initialization', () => {
    it('should register plugins correctly', () => {
      expect(router['plugins']).toHaveLength(2);
      expect(router['plugins'][0]).toBeInstanceOf(MathPlugin);
      expect(router['plugins'][1]).toBeInstanceOf(SpellingPlugin);
    });

    it('should initialize with empty cache', () => {
      expect(router['routingCache'].size).toBe(0);
    });
  });

  describe('routeChunks', () => {
    it('should route mathematical content to MATH plugin', async () => {
      const mockLLMInteraction: RichLLMInteraction = {
        model: 'claude-3-haiku-20240307',
        prompt: 'routing prompt',
        response: 'routing response',
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        timestamp: new Date(),
        duration: 500
      };

      mockCallClaude.mockResolvedValueOnce({
        response: {} as any,
        interaction: mockLLMInteraction,
        toolResult: {
          chunk_decisions: [
            { chunk_index: 0, plugin_name: 'MATH', reasoning: 'Contains mathematical calculation' }
          ]
        }
      });

      const chunks = [
        new TextChunk('chunk1', 'The equation 2 + 2 = 5 is incorrect', 0, 100, {})
      ];

      const result = await router.routeChunks(chunks);

      expect(result.routing).toHaveLength(1);
      expect(result.routing[0].pluginName).toBe('MATH');
      expect(result.routing[0].chunkId).toBe('chunk1');
      expect(result.llmInteractions).toHaveLength(1);
      expect(mockCallClaude).toHaveBeenCalledTimes(1);
    });

    it('should use cached results for repeated chunks', async () => {
      const mockLLMInteraction: RichLLMInteraction = {
        model: 'claude-3-haiku-20240307',
        prompt: 'routing prompt',
        response: 'routing response',
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        timestamp: new Date(),
        duration: 500
      };

      mockCallClaude.mockResolvedValueOnce({
        response: {} as any,
        interaction: mockLLMInteraction,
        toolResult: {
          chunk_decisions: [
            { chunk_index: 0, plugin_name: 'SPELLING', reasoning: 'Contains spelling errors' }
          ]
        }
      });

      const chunks = [
        new TextChunk('chunk1', 'Ther are mistaks here', 0, 100, {})
      ];

      // First call should use LLM
      await router.routeChunks(chunks);
      expect(mockCallClaude).toHaveBeenCalledTimes(1);

      // Second call with same content should use cache
      await router.routeChunks(chunks);
      expect(mockCallClaude).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should handle routing errors gracefully', async () => {
      mockCallClaude.mockRejectedValueOnce(new Error('LLM routing failed'));

      const chunks = [
        new TextChunk('chunk1', 'Some text content', 0, 100, {})
      ];

      const result = await router.routeChunks(chunks);

      // Should fall back to default routing (SPELLING)
      expect(result.routing).toHaveLength(1);
      expect(result.routing[0].pluginName).toBe('SPELLING');
    });

    it('should handle malformed LLM responses', async () => {
      const mockLLMInteraction: RichLLMInteraction = {
        model: 'claude-3-haiku-20240307',
        prompt: 'routing prompt',
        response: 'routing response',
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        timestamp: new Date(),
        duration: 500
      };

      mockCallClaude.mockResolvedValueOnce({
        response: {} as any,
        interaction: mockLLMInteraction,
        toolResult: {
          // Malformed response - missing chunk_decisions
          invalid_field: 'invalid'
        }
      });

      const chunks = [
        new TextChunk('chunk1', 'Some text content', 0, 100, {})
      ];

      const result = await router.routeChunks(chunks);

      // Should fall back to default routing
      expect(result.routing).toHaveLength(1);
      expect(result.routing[0].pluginName).toBe('SPELLING');
    });
  });

  describe('batch processing', () => {
    it('should process multiple chunks in batches', async () => {
      const mockLLMInteraction: RichLLMInteraction = {
        model: 'claude-3-haiku-20240307',
        prompt: 'routing prompt',
        response: 'routing response',
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        timestamp: new Date(),
        duration: 500
      };

      mockCallClaude.mockResolvedValueOnce({
        response: {} as any,
        interaction: mockLLMInteraction,
        toolResult: {
          chunk_decisions: [
            { chunk_index: 0, plugin_name: 'MATH', reasoning: 'Math content' },
            { chunk_index: 1, plugin_name: 'SPELLING', reasoning: 'Spelling content' },
            { chunk_index: 2, plugin_name: 'MATH', reasoning: 'More math content' }
          ]
        }
      });

      const chunks = [
        new TextChunk('chunk1', '2 + 2 = 5', 0, 10, {}),
        new TextChunk('chunk2', 'Ther are mistaks', 11, 30, {}),
        new TextChunk('chunk3', '10 * 3 = 33', 31, 45, {})
      ];

      const result = await router.routeChunks(chunks);

      expect(result.routing).toHaveLength(3);
      expect(result.routing[0].pluginName).toBe('MATH');
      expect(result.routing[1].pluginName).toBe('SPELLING');
      expect(result.routing[2].pluginName).toBe('MATH');
    });
  });
});
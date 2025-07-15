import { PluginManager } from '../PluginManager';
import { BasePlugin } from '../BasePlugin';
import { TextChunk } from '../TextChunk';
import { ChunkResult } from '../types';
import { RichLLMInteraction } from '@/types/llm';

// Mock plugin for testing
class MockPlugin extends BasePlugin {
  name = 'test';

  getRoutingExamples() {
    return {
      shouldHandle: [
        'This is a test case'
      ],
      shouldNotHandle: [
        'This is not a test'
      ]
    };
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const llmInteraction: RichLLMInteraction = {
      model: 'test-model',
      prompt: 'test prompt',
      response: 'test response',
      tokensUsed: {
        prompt: 10,
        completion: 10,
        total: 20
      },
      timestamp: new Date(),
      duration: 100
    };

    return {
      chunkId: chunk.id,
      pluginName: this.name,
      processed: true,
      issues: [],
      llmInteractions: [llmInteraction],
      metadata: {}
    };
  }

  async synthesize(): Promise<string> {
    return 'Test synthesis complete';
  }
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockPlugin: MockPlugin;

  beforeEach(() => {
    mockPlugin = new MockPlugin();
    pluginManager = new PluginManager([mockPlugin]);
  });

  describe('initialization', () => {
    it('should register plugins correctly', () => {
      expect(pluginManager['plugins']).toHaveLength(1);
      expect(pluginManager['plugins'][0]).toBeInstanceOf(MockPlugin);
    });
  });

  describe('processDocument', () => {
    it('should process a document and return results', async () => {
      const documentText = 'This is a test document with some content to analyze.';
      
      const result = await pluginManager.processDocument(documentText);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.chunkResults).toBeDefined();
      expect(result.llmInteractions).toBeDefined();
      expect(Array.isArray(result.chunkResults)).toBe(true);
      expect(Array.isArray(result.llmInteractions)).toBe(true);
    });

    it('should handle empty document text', async () => {
      const result = await pluginManager.processDocument('');
      
      expect(result).toBeDefined();
      expect(result.chunkResults).toHaveLength(0);
      expect(result.llmInteractions).toBeDefined();
    });

    it('should accumulate LLM interactions from plugins', async () => {
      const documentText = 'This is a test document.';
      
      const result = await pluginManager.processDocument(documentText);
      
      expect(result.llmInteractions.length).toBeGreaterThan(0);
      // Should have interactions from both routing and plugin processing
    });
  });

  describe('error handling', () => {
    it('should handle plugin processing errors gracefully', async () => {
      const errorPlugin = new (class extends BasePlugin {
        name = 'error-plugin';
        
        getRoutingExamples() {
          return {
            shouldHandle: ['error'],
            shouldNotHandle: []
          };
        }

        async processChunk(): Promise<ChunkResult> {
          throw new Error('Plugin processing failed');
        }

        async synthesize(): Promise<string> {
          return 'Error synthesis';
        }
      })();

      const errorManager = new PluginManager([errorPlugin]);
      
      // Should not throw, but handle the error gracefully
      await expect(errorManager.processDocument('error test')).resolves.toBeDefined();
    });
  });

  describe('metadata tracking', () => {
    it('should track processing metadata correctly', async () => {
      const result = await pluginManager.processDocument('Test document');
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalChunks).toBeDefined();
      expect(result.metadata.pluginsUsed).toBeDefined();
      expect(result.metadata.processingTime).toBeDefined();
    });
  });
});
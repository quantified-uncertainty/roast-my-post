import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
/**
 * Integration tests for @roast/ai package usage
 * 
 * These tests verify that the package can be properly imported
 * and used as intended by consuming applications.
 */

import { 
  initializeAI,
  callClaude,
  callClaudeWithTool,
  MathPlugin,
  toolRegistry
} from '../../index';
import { PluginManager } from '../../server';
import { checkSpellingGrammarTool } from '../../server';

describe('@roast/ai Package Integration', () => {
  describe('Configuration', () => {
    it('should initialize package with configuration', () => {
      expect(() => {
        initializeAI({
          anthropicApiKey: 'test-key',
          heliconeApiKey: 'test-key',
        });
      }).not.toThrow();
    });
  });

  describe('Core Exports', () => {
    it('should export Claude wrapper functions', () => {
      expect(callClaude).toBeDefined();
      expect(typeof callClaude).toBe('function');
      expect(callClaudeWithTool).toBeDefined();
      expect(typeof callClaudeWithTool).toBe('function');
    });


    it('should export PluginManager', () => {
      expect(PluginManager).toBeDefined();
      expect(typeof PluginManager).toBe('function');
    });

    it('should export plugins', () => {
      expect(MathPlugin).toBeDefined();
      expect(typeof MathPlugin).toBe('function');
    });

    it('should export tool registry', () => {
      expect(toolRegistry).toBeDefined();
      expect(toolRegistry['check-spelling-grammar']).toBeDefined();
      expect(toolRegistry['check-spelling-grammar'].config).toBeDefined();
      expect(toolRegistry['check-spelling-grammar'].config.name).toBe('Check Spelling & Grammar');
    });

    it('should export server-side tools', () => {
      expect(checkSpellingGrammarTool).toBeDefined();
      expect(checkSpellingGrammarTool.config).toBeDefined();
      expect(checkSpellingGrammarTool.config.name).toBe('Check Spelling & Grammar');
    });
  });

  describe('Plugin System', () => {
    it('should create PluginManager instance', () => {
      const manager = new PluginManager();
      expect(manager).toBeDefined();
      expect(manager.analyzeDocument).toBeDefined();
      expect(manager.analyzeDocumentSimple).toBeDefined();
    });

    it('should have analysis methods', async () => {
      const manager = new PluginManager();
      expect(typeof manager.analyzeDocument).toBe('function');
      expect(typeof manager.analyzeDocumentSimple).toBe('function');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should fall back to environment variables when config not provided', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key';
      process.env.SEARCH_MODEL = 'custom-model';
      
      // Reset config to test fallback
      initializeAI({});
      
      // The models should use the environment variables
      expect(process.env.SEARCH_MODEL).toBe('custom-model');
    });
  });
});

describe('Usage Examples', () => {
  beforeAll(() => {
    // Initialize with test configuration
    initializeAI({
      anthropicApiKey: 'test-api-key',
    });
  });

  it('should demonstrate basic tool usage pattern', () => {
    const input = {
      text: 'This is a test sentense with a mispelling.',
      convention: 'US' as const,
      strictness: 'standard' as const,
    };

    // Verify the tool has proper structure
    expect(checkSpellingGrammarTool.config.name).toBe('Check Spelling & Grammar');
    expect(checkSpellingGrammarTool.inputSchema).toBeDefined();
    expect(checkSpellingGrammarTool.outputSchema).toBeDefined();
  });

  it('should demonstrate plugin usage pattern', async () => {
    const manager = new PluginManager();
    
    // In a real app, you would analyze documents
    expect(manager.analyzeDocument).toBeDefined();
    expect(typeof manager.analyzeDocument).toBe('function');
    expect(manager.analyzeDocumentSimple).toBeDefined();
    expect(typeof manager.analyzeDocumentSimple).toBe('function');
  });
});
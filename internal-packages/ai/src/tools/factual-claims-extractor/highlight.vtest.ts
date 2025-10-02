import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtractFactualClaimsTool } from './index';
import { ToolContext } from '../base/Tool';

// Mock Claude wrapper
vi.mock('../../claude/wrapper', () => ({
  callClaudeWithTool: vi.fn()
}));

// Mock smart text searcher
vi.mock('../smart-text-searcher', () => ({
  default: {
    execute: vi.fn()
  }
}));

import { callClaudeWithTool } from '../../claude/wrapper';
import fuzzyTextLocatorTool from '../smart-text-searcher';

describe('ExtractFactualClaimsTool - Highlight Feature', () => {
  const tool = new ExtractFactualClaimsTool();
  const mockContext: ToolContext = {
    userId: 'test-user',
    logger: { 
      info: vi.fn(), 
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any
  };
  
  const mockCallClaudeWithTool = vi.mocked(callClaudeWithTool);
  const mockFuzzyTextLocator = vi.mocked(fuzzyTextLocatorTool.execute);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  describe('highlight functionality', () => {
    it('should add highlights to claims when locations are found', async () => {
      const testText = 'The Earth orbits the Sun. Water freezes at 0°C.';
      
      // Mock Claude response with claims
      mockCallClaudeWithTool.mockResolvedValue({
        toolResult: {
          claims: [
            {
              originalText: 'The Earth orbits the Sun',
              topic: 'astronomy',
              importanceScore: 80,
              checkabilityScore: 90,
              truthProbability: 100
            },
            {
              originalText: 'Water freezes at 0°C',
              topic: 'science',
              importanceScore: 70,
              checkabilityScore: 95,
              truthProbability: 100
            }
          ]
        },
        llmInteraction: {} as any
      });

      // Mock fuzzy text locator responses
      mockFuzzyTextLocator
        .mockResolvedValueOnce({
          searchText: 'The Earth orbits the Sun',
          found: true,
          location: {
            startOffset: 0,
            endOffset: 25,
            quotedText: 'The Earth orbits the Sun',
            strategy: 'exact',
            confidence: 1.0
          },
          processingTimeMs: 5
        })
        .mockResolvedValueOnce({
          searchText: 'Water freezes at 0°C',
          found: true,
          location: {
            startOffset: 27,
            endOffset: 47,
            quotedText: 'Water freezes at 0°C',
            strategy: 'exact',
            confidence: 1.0
          },
          processingTimeMs: 5
        });

      const result = await tool.execute({
        text: testText
      }, mockContext);

      expect(result.claims).toHaveLength(2);
      
      // Check first claim highlight
      expect(result.claims[0].highlight).toBeDefined();
      expect(result.claims[0].highlight?.isValid).toBe(true);
      expect(result.claims[0].highlight?.startOffset).toBe(0);
      expect(result.claims[0].highlight?.endOffset).toBe(25);
      expect(result.claims[0].highlight?.quotedText).toBe('The Earth orbits the Sun');
      
      // Check second claim highlight
      expect(result.claims[1].highlight).toBeDefined();
      expect(result.claims[1].highlight?.isValid).toBe(true);
      expect(result.claims[1].highlight?.startOffset).toBe(27);
      expect(result.claims[1].highlight?.endOffset).toBe(47);
      expect(result.claims[1].highlight?.quotedText).toBe('Water freezes at 0°C');
    });

    it('should handle locations not found gracefully', async () => {
      const testText = 'Some text with claims.';
      
      mockCallClaudeWithTool.mockResolvedValue({
        toolResult: {
          claims: [
            {
              originalText: 'This claim is not in the text',
              topic: 'test',
              importanceScore: 50,
              checkabilityScore: 50,
              truthProbability: 50
            }
          ]
        },
        llmInteraction: {} as any
      });

      // Mock location not found
      mockFuzzyTextLocator.mockResolvedValue({
        searchText: 'This claim is not in the text',
        found: false,
        error: 'Text not found in document',
        processingTimeMs: 10
      });

      const result = await tool.execute({
        text: testText
      }, mockContext);

      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].highlight).toBeDefined();
      expect(result.claims[0].highlight?.isValid).toBe(false);
      expect(result.claims[0].highlight?.error).toBe('Location not found in document');
    });

    it('should include location finding for claims', async () => {
      const testText = 'The Earth orbits the Sun.';
      
      mockCallClaudeWithTool.mockResolvedValue({
        toolResult: {
          claims: [
            {
              originalText: 'The Earth orbits the Sun',
              topic: 'astronomy',
              importanceScore: 80,
              checkabilityScore: 90,
              truthProbability: 100
            }
          ]
        },
        llmInteraction: {} as any
      });

      mockFuzzyTextLocator.mockResolvedValue({
        searchText: 'The Earth orbits the Sun',
        found: true,
        location: {
          startOffset: 0,
          endOffset: 25,
          quotedText: 'The Earth orbits the Sun',
          strategy: 'exact',
          confidence: 1.0
        },
        processingTimeMs: 5
      });

      const result = await tool.execute({
        text: testText
      }, mockContext);

      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].highlight).toBeDefined();
      expect(mockFuzzyTextLocator).toHaveBeenCalled();
    });

    it('should extract prefix text when location is found', async () => {
      const testText = 'This is a long text that contains the claim: The Earth orbits the Sun.';
      
      mockCallClaudeWithTool.mockResolvedValue({
        toolResult: {
          claims: [
            {
              originalText: 'The Earth orbits the Sun',
              topic: 'astronomy',
              importanceScore: 80,
              checkabilityScore: 90,
              truthProbability: 100
            }
          ]
        },
        llmInteraction: {} as any
      });

      mockFuzzyTextLocator.mockResolvedValue({
        searchText: 'The Earth orbits the Sun',
        found: true,
        location: {
          startOffset: 46,
          endOffset: 70,
          quotedText: 'The Earth orbits the Sun',
          strategy: 'exact',
          confidence: 1.0
        },
        processingTimeMs: 5
      });

      const result = await tool.execute({
        text: testText
      }, mockContext);

      expect(result.claims[0].highlight?.prefix).toBeDefined();
      expect(result.claims[0].highlight?.prefix).toContain('contains the claim:');
    });

    it('should handle markdown text correctly without partial matching', async () => {
      const testText = 'The Earth orbits the [Sun](https://en.wikipedia.org/wiki/Sun) once every 365.25 days. Water boils at 100°C at sea level.';
      
      mockCallClaudeWithTool.mockResolvedValue({
        toolResult: {
          claims: [
            {
              originalText: 'The Earth orbits the Sun once every 365.25 days',
              topic: 'astronomy',
              importanceScore: 85,
              checkabilityScore: 95,
              truthProbability: 98
            },
            {
              originalText: 'Water boils at 100°C at sea level',
              topic: 'physics',
              importanceScore: 80,
              checkabilityScore: 98,
              truthProbability: 99
            }
          ]
        },
        llmInteraction: {} as any
      });

      // Mock LLM-assisted location finding for markdown text
      mockFuzzyTextLocator
        .mockResolvedValueOnce({
          searchText: 'The Earth orbits the Sun once every 365.25 days',
          found: true,
          location: {
            startOffset: 0,
            endOffset: 86,
            quotedText: 'The Earth orbits the [Sun](https://en.wikipedia.org/wiki/Sun) once every 365.25 days',
            strategy: 'llm',
            confidence: 0.9
          },
          processingTimeMs: 50,
          llmUsed: true
        })
        .mockResolvedValueOnce({
          searchText: 'Water boils at 100°C at sea level',
          found: true,
          location: {
            startOffset: 88,
            endOffset: 121,
            quotedText: 'Water boils at 100°C at sea level',
            strategy: 'exact',
            confidence: 1.0
          },
          processingTimeMs: 5
        });

      const result = await tool.execute({
        text: testText
      }, mockContext);

      expect(result.claims).toHaveLength(2);
      
      // First claim should include the markdown link
      expect(result.claims[0].highlight?.isValid).toBe(true);
      expect(result.claims[0].highlight?.quotedText).toContain('[Sun]');
      expect(result.claims[0].highlight?.quotedText).toContain('https://en.wikipedia.org');
      
      // Second claim should be exact match
      expect(result.claims[1].highlight?.isValid).toBe(true);
      expect(result.claims[1].highlight?.quotedText).toBe('Water boils at 100°C at sea level');
    });
  });
});
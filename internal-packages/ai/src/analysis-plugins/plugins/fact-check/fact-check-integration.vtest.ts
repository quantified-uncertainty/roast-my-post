import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { FactCheckPlugin } from './index';
import { TextChunk } from '../../TextChunk';
import * as extractFactualClaimsModule from '../../../tools/extract-factual-claims';
import * as factCheckerModule from '../../../tools/fact-checker';

// Mock the tools to avoid LLM calls
vi.mock('../../../tools/extract-factual-claims');
vi.mock('../../../tools/fact-checker');

describe('FactCheckPlugin Integration', () => {
  const mockExtractTool = vi.mocked(extractFactualClaimsModule.default);
  const mockFactCheckerTool = vi.mocked(factCheckerModule.default);

  beforeAll(() => {
    // Mock the extract tool to return claims with highlights
    mockExtractTool.execute = vi.fn().mockResolvedValue({
      claims: [
        {
          exactText: 'The Earth is flat',
          claim: 'The Earth is flat',
          topic: 'Science',
          importanceScore: 80,
          checkabilityScore: 95,
          truthProbability: 5,
          highlight: {
            startOffset: 10,
            endOffset: 27,
            quotedText: 'The Earth is flat',
            isValid: true
          }
        },
        {
          exactText: 'Water boils at 100°C at sea level',
          claim: 'Water boils at 100 degrees Celsius at sea level',
          topic: 'Science',
          importanceScore: 60,
          checkabilityScore: 100,
          truthProbability: 99,
          highlight: {
            startOffset: 50,
            endOffset: 84,
            quotedText: 'Water boils at 100°C at sea level',
            isValid: true
          }
        }
      ],
      summary: {
        totalFound: 2,
        aboveThreshold: 2,
        averageQuality: 82
      }
    });

    // Mock the fact checker tool
    mockFactCheckerTool.execute = vi.fn().mockImplementation((input) => {
      if (input.claim.includes('Earth is flat')) {
        return Promise.resolve({
          result: {
            verdict: 'false',
            confidence: 'high',
            explanation: 'The Earth is approximately spherical, not flat.',
            conciseCorrection: 'The Earth is spherical'
          },
          llmInteraction: {
            prompt: 'Check fact',
            response: 'False claim',
            tokensUsed: { prompt: 100, completion: 50, total: 150 }
          }
        });
      }
      return Promise.resolve({
        result: {
          verdict: 'true',
          confidence: 'high',
          explanation: 'This is scientifically accurate.',
          conciseCorrection: undefined
        },
        llmInteraction: {
          prompt: 'Check fact',
          response: 'True claim',
          tokensUsed: { prompt: 100, completion: 50, total: 150 }
        }
      });
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Fact extraction with highlights', () => {
    it.skip('should extract facts and use highlight data for locations', async () => {
      const plugin = new FactCheckPlugin();
      
      const documentText = 'Some text. The Earth is flat. More text about how Water boils at 100°C at sea level.';
      const chunks = [
        new TextChunk(
          `chunk-${Math.random()}`,
          documentText,
          {
            position: {
              start: 0,
              end: documentText.length
            }
          }
        )
      ];

      const result = await plugin.analyze(chunks, documentText);

      // Check that extract was called with includeLocations
      expect(mockExtractTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          includeLocations: true
        }),
        expect.anything()
      );

      // Verify comments were generated
      expect(result.comments).toHaveLength(2);
      
      // Check the false claim comment
      const falseClaimComment = result.comments.find(c => c.header?.includes('False'));
      expect(falseClaimComment).toBeDefined();
      expect(falseClaimComment?.location.startOffset).toBe(10);
      expect(falseClaimComment?.location.endOffset).toBe(27);
      expect(falseClaimComment?.location.quotedText).toBe('The Earth is flat');
      expect(falseClaimComment?.level).toBe('error');

      // Check the true claim comment
      const trueClaimComment = result.comments.find(c => c.header?.includes('Verified'));
      expect(trueClaimComment).toBeDefined();
      expect(trueClaimComment?.location.startOffset).toBe(50);
      expect(trueClaimComment?.location.endOffset).toBe(84);
      expect(trueClaimComment?.location.quotedText).toBe('Water boils at 100°C at sea level');
      expect(trueClaimComment?.level).toBe('success');
    });

    it('should use claim field for fact checking, not exactText', async () => {
      const plugin = new FactCheckPlugin();
      
      const documentText = 'The Earth is flat.';
      const chunks = [
        new TextChunk(
          `chunk-${Math.random()}`,
          documentText,
          {
            position: {
              start: 0,
              end: documentText.length
            }
          }
        )
      ];

      await plugin.analyze(chunks, documentText);

      // Verify that the fact checker was called with the normalized claim text
      expect(mockFactCheckerTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          claim: 'The Earth is flat' // This should use the 'claim' field
        }),
        expect.anything()
      );
    });

    it.skip('should handle missing highlight data gracefully', async () => {
      // Mock extraction without highlights
      mockExtractTool.execute = vi.fn().mockResolvedValue({
        claims: [
          {
            exactText: 'The Moon is made of cheese',
            claim: 'The Moon is made of cheese',
            topic: 'Science',
            importanceScore: 70,
            checkabilityScore: 90,
            truthProbability: 1,
            // No highlight field - should fallback to text search
          }
        ],
        summary: {
          totalFound: 1,
          aboveThreshold: 1,
          averageQuality: 80
        }
      });

      const plugin = new FactCheckPlugin();
      
      const documentText = 'Some claim that The Moon is made of cheese.';
      const chunks = [
        new TextChunk(
          `chunk-${Math.random()}`,
          documentText,
          {
            position: {
              start: 0,
              end: documentText.length
            }
          }
        )
      ];

      const result = await plugin.analyze(chunks, documentText);

      // Should still generate comments even without highlight data
      expect(result.comments.length).toBeGreaterThan(0);
      // The comment should have attempted to find the location via fallback
      const comment = result.comments[0];
      expect(comment?.location).toBeDefined();
    });

    it('should handle invalid highlight data', async () => {
      // Mock extraction with invalid highlights
      mockExtractTool.execute = vi.fn().mockResolvedValue({
        claims: [
          {
            exactText: 'Invalid claim text',
            claim: 'Invalid claim',
            topic: 'Test',
            importanceScore: 70,
            checkabilityScore: 90,
            truthProbability: 50,
            highlight: {
              startOffset: 0,
              endOffset: 0,
              quotedText: 'Invalid claim text',
              isValid: false,
              error: 'Location not found'
            }
          }
        ],
        summary: {
          totalFound: 1,
          aboveThreshold: 1,
          averageQuality: 80
        }
      });

      const plugin = new FactCheckPlugin();
      
      const documentText = 'This document contains an Invalid claim text somewhere.';
      const chunks = [
        new TextChunk(
          `chunk-${Math.random()}`,
          documentText,
          {
            position: {
              start: 0,
              end: documentText.length
            }
          }
        )
      ];

      const result = await plugin.analyze(chunks, documentText);

      // Should still work but fall back to text search
      expect(result.comments).toBeDefined();
      // Since highlight is invalid, it should try to search for the text
    });
  });

  describe('Analysis summary generation', () => {
    it('should generate correct summary for mixed verdicts', async () => {
      mockExtractTool.execute = vi.fn().mockResolvedValue({
        claims: [
          {
            exactText: 'False claim 1',
            claim: 'False claim about something',
            topic: 'Test',
            importanceScore: 90,
            checkabilityScore: 90,
            truthProbability: 10,
            highlight: { startOffset: 0, endOffset: 13, quotedText: 'False claim 1', isValid: true }
          },
          {
            exactText: 'True claim 1',
            claim: 'True claim about something',
            topic: 'Test',
            importanceScore: 60,
            checkabilityScore: 90,
            truthProbability: 95,
            highlight: { startOffset: 20, endOffset: 32, quotedText: 'True claim 1', isValid: true }
          }
        ],
        summary: { totalFound: 2, aboveThreshold: 2, averageQuality: 82 }
      });

      mockFactCheckerTool.execute = vi.fn()
        .mockResolvedValueOnce({
          result: { verdict: 'false', confidence: 'high', explanation: 'This is false' },
          llmInteraction: { prompt: '', response: '', tokensUsed: { prompt: 100, completion: 50, total: 150 } }
        })
        .mockResolvedValueOnce({
          result: { verdict: 'true', confidence: 'high', explanation: 'This is true' },
          llmInteraction: { prompt: '', response: '', tokensUsed: { prompt: 100, completion: 50, total: 150 } }
        });

      const plugin = new FactCheckPlugin();
      const documentText = 'False claim 1. True claim 1.';
      const result = await plugin.analyze(
        [new TextChunk('chunk-test', documentText, { position: { start: 0, end: documentText.length } })],
        documentText
      );

      expect(result.summary).toContain('error');
      expect(result.analysis).toContain('False');
      expect(result.comments).toHaveLength(2);
    });
  });
});
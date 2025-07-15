import { describe, it, expect, beforeEach } from '@jest/globals';
import FactCheckTool from './index';
import { logger } from '@/lib/logger';
import { testData } from '@/lib/claude/testUtils';

// Mock Claude wrapper
jest.mock('@/lib/claude/wrapper');
import { mockClaudeToolResponse } from '@/lib/claude/__mocks__/wrapper';

describe('FactCheckTool', () => {
  const mockContext = { 
    logger,
    userId: 'test-user'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('configuration', () => {
    it('should have correct config', () => {
      expect(FactCheckTool.config.id).toBe('fact-check');
      expect(FactCheckTool.config.name).toBe('Fact Checker');
      expect(FactCheckTool.config.category).toBe('analysis');
      expect(FactCheckTool.config.version).toBe('1.0.0');
    });
  });

  describe('input validation', () => {
    it('should validate required text field', () => {
      expect(() => {
        FactCheckTool.inputSchema.parse({});
      }).toThrow();
    });

    it('should accept valid input', () => {
      const input = {
        text: "The unemployment rate was 3.7% in December 2023.",
        context: "Economic data",
        maxClaims: 10,
        verifyHighPriority: true
      };
      
      expect(() => {
        FactCheckTool.inputSchema.parse(input);
      }).not.toThrow();
    });

    it('should apply defaults for optional fields', () => {
      const input = { text: "Some factual claim here." };
      const parsed = FactCheckTool.inputSchema.parse(input);
      
      expect(parsed.maxClaims).toBe(20);
      expect(parsed.verifyHighPriority).toBe(true);
    });

    it('should reject text that is too long', () => {
      const input = { text: 'a'.repeat(50001) };
      
      expect(() => {
        FactCheckTool.inputSchema.parse(input);
      }).toThrow();
    });
  });

  describe('output schema', () => {
    it('should validate complete output structure', () => {
      const output = {
        claims: [{
          id: 'claim-1',
          text: 'Test claim',
          topic: 'economics',
          importance: 'high' as const,
          specificity: 'high' as const,
          verified: true,
          explanation: 'This is correct'
        }],
        contradictions: [{
          claim1: 'First claim',
          claim2: 'Second claim',
          explanation: 'These contradict'
        }],
        verificationResults: [{
          claim: {
            id: 'claim-1',
            text: 'Test claim',
            topic: 'economics',
            importance: 'high' as const,
            specificity: 'high' as const
          },
          verified: true,
          explanation: 'Verified as correct'
        }],
        summary: {
          totalClaims: 1,
          verifiedClaims: 1,
          falseClaims: 0,
          contradictions: 1
        },
        recommendations: ['Check sources'],
        llmInteractions: []
      };
      
      expect(() => {
        FactCheckTool.outputSchema.parse(output);
      }).not.toThrow();
    });
  });

  describe('execute with mocked wrapper', () => {
    it('should extract claims and check for contradictions', async () => {
      const tool = FactCheckTool;
      
      // Mock the extraction response
      mockClaudeToolResponse({
        claims: testData.factualClaims.claims.map((claim, index) => ({
          id: `claim-${index}`,
          ...claim
        }))
      });

      const input = {
        text: "The Berlin Wall fell in 1989. Water boils at 100°C at sea level.",
        maxClaims: 10,
        verifyHighPriority: false
      };

      const result = await tool.execute(input, mockContext);

      expect(result.claims).toHaveLength(2);
      expect(result.claims[0].text).toBe('The Berlin Wall fell in 1989');
      expect(result.summary.totalClaims).toBe(2);
      expect(result.llmInteractions).toHaveLength(1);
      expect(result.llmInteractions[0].model).toBe('claude-sonnet-4-20250514');
    });

    it('should verify high priority claims when requested', async () => {
      const tool = FactCheckTool;
      
      // Mock extraction
      mockClaudeToolResponse({
        claims: [{
          id: 'claim-1',
          text: 'Important historical fact',
          topic: 'History',
          importance: 'high',
          specificity: 'high'
        }]
      });

      // Mock verification
      mockClaudeToolResponse({
        verified: true,
        explanation: 'This fact has been verified as accurate',
        sources: ['Historical records']
      });

      const input = {
        text: "Important historical fact",
        verifyHighPriority: true
      };

      const result = await tool.execute(input, mockContext);

      expect(result.verificationResults).toHaveLength(1);
      expect(result.verificationResults[0].verified).toBe(true);
      expect(result.summary.verifiedClaims).toBe(1);
      expect(result.llmInteractions).toHaveLength(2); // extraction + verification
    });

    it('should handle empty text gracefully', async () => {
      const tool = FactCheckTool;
      
      // Mock empty claims response
      mockClaudeToolResponse({
        claims: []
      });

      const input = {
        text: "Just opinions, no facts here.",
        maxClaims: 10
      };

      const result = await tool.execute(input, mockContext);

      expect(result.claims).toHaveLength(0);
      expect(result.summary.totalClaims).toBe(0);
      expect(result.recommendations).toContain('No factual claims were found in the text.');
    });
  });
});
import { describe, it, expect, beforeEach } from '@jest/globals';
import FactCheckTool from './index';
import { logger } from '@/lib/logger';
import { createMockLLMInteraction } from '@/lib/claude/testUtils';
import { setupClaudeToolMock } from '@/lib/claude/mockHelpers';
import { mockClaims, mockVerificationResults, mockOutputStructures, mockInputs } from './__fixtures__/mockData';

// Mock Claude wrapper
jest.mock('@/lib/claude/wrapper');
import { callClaudeWithTool } from '@/lib/claude/wrapper';

// Get the mocked function and setup helper
const mockCallClaudeWithTool = callClaudeWithTool as jest.MockedFunction<typeof callClaudeWithTool>;
const { mockToolResponse } = setupClaudeToolMock(mockCallClaudeWithTool);

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
      expect(() => {
        FactCheckTool.inputSchema.parse(mockInputs.validInput);
      }).not.toThrow();
    });

    it('should apply defaults for optional fields', () => {
      const parsed = FactCheckTool.inputSchema.parse(mockInputs.minimalInput);
      
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
      expect(() => {
        FactCheckTool.outputSchema.parse(mockOutputStructures.complete);
      }).not.toThrow();
    });
  });

  describe('execute with mocked wrapper', () => {
    it('should extract claims and check for contradictions', async () => {
      const tool = FactCheckTool;
      
      // Mock the extraction response - this response should match what the extractClaims method expects
      mockToolResponse({
        claims: [mockClaims.historical, mockClaims.scientific]
      });

      const input = mockInputs.historicalAndScientific;

      const result = await tool.execute(input, mockContext);

      expect(result.claims).toHaveLength(2);
      expect(result.claims[0].text).toBe('The Berlin Wall fell in 1989');
      expect(result.summary.totalClaims).toBe(2);
      expect(result.llmInteractions).toHaveLength(1);
      expect(result.llmInteractions[0].model).toBe('claude-sonnet-4-20250514');
    });

    it('should verify high priority claims when requested', async () => {
      const tool = FactCheckTool;
      
      // Mock extraction response (first call)
      mockToolResponse({
        claims: [{
          text: 'Important historical fact',
          topic: 'History',
          importance: 'high',
          specificity: 'high'
        }]
      });

      // Mock verification response (second call)
      mockToolResponse(mockVerificationResults.highConfidence);

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
      mockToolResponse({
        claims: []
      });

      const input = mockInputs.opinionsOnly;

      const result = await tool.execute(input, mockContext);

      expect(result.claims).toHaveLength(0);
      expect(result.summary.totalClaims).toBe(0);
      expect(result.recommendations).toContain('No factual claims were found in the text.');
    });
  });
});
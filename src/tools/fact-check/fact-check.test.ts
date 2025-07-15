import { describe, it, expect, beforeEach } from '@jest/globals';
import FactCheckTool from './index';
import { logger } from '@/lib/logger';

// Mock Anthropic since we're testing the tool structure, not the LLM
jest.mock('@anthropic-ai/sdk');

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
});
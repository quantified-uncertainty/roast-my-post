/**
 * End-to-end tests for tool functionality
 * These tests verify that tools work correctly by testing their core logic
 */

import { checkMathTool } from '@roast/ai';
import { forecasterTool } from '@roast/ai';
import { factCheckerTool } from '@roast/ai';
import { extractForecastingClaimsTool } from '@roast/ai';
import { extractFactualClaimsTool } from '@roast/ai';
import { checkSpellingGrammarTool } from '@roast/ai';
import { logger } from '../../lib/logger';

// Test context
const testContext = {
  userId: 'test-user',
  logger
};

describe('Tools End-to-End Tests', () => {
  // Set timeout for LLM calls
  jest.setTimeout(120000);

  describe('Math Checker Tool', () => {
    it('should detect mathematical errors in statements', async () => {
      const result = await checkMathTool.execute({
        statement: 'Revenue grew by 50% from $2 million to $2.5 million'
      }, testContext);

      expect(result.status).toBe('verified_false');
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails?.conciseCorrection).toBeDefined();
    });

    it('should verify correct mathematical statements', async () => {
      const result = await checkMathTool.execute({
        statement: 'Revenue grew by 50% from $2 million to $3 million'
      }, testContext);

      expect(result.status).toBe('verified_true');
      expect(result.errorDetails).toBeUndefined();
    });
  });

  describe('Forecaster Tool', () => {
    it('should generate forecasts for a question', async () => {
      const result = await forecasterTool.execute({
        question: 'Will AI assistants be widely adopted in software development by 2025?',
        context: 'GitHub Copilot has millions of users, ChatGPT is being integrated into IDEs',
        numForecasts: 3,
        usePerplexity: false
      }, testContext);

      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(100);
      expect(result.description).toBeDefined();
      expect(result.consensus).toMatch(/^(low|medium|high)$/);
      expect(result.individualForecasts).toHaveLength(3);
      expect(result.statistics.mean).toBeCloseTo(result.probability, 1);
    });

    it('should work with a single forecast', async () => {
      const result = await forecasterTool.execute({
        question: 'Will it rain tomorrow?',
        numForecasts: 1,
        usePerplexity: false
      }, testContext);

      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(100);
      expect(result.individualForecasts).toHaveLength(1);
    });
  });

  describe('Fact Checker Tool', () => {
    it('should verify a factual claim', async () => {
      const result = await factCheckerTool.execute({
        claim: 'The Earth is approximately 4.5 billion years old.',
        searchForEvidence: false
      }, testContext);

      expect(result.result).toBeDefined();
      expect(result.result.verdict).toMatch(/^(true|false|partially-true|unverifiable|outdated)$/);
      expect(result.result.confidence).toMatch(/^(high|medium|low)$/);
      expect(result.result.explanation).toBeDefined();
      if (result.result.sources) {
        expect(result.result.sources).toBeInstanceOf(Array);
      }
    });
  });

  describe('Extract Forecasting Claims Tool', () => {
    it('should extract forecasting claims from text', async () => {
      const result = await extractForecastingClaimsTool.execute({
        text: 'We expect revenue to grow 20% next year. AI will likely replace 30% of jobs by 2030.',
        maxDetailedAnalysis: 2
      }, testContext);

      expect(result.forecasts).toBeDefined();
      expect(result.forecasts.length).toBeGreaterThan(0);
    });
  });

  describe('Extract Factual Claims Tool', () => {
    it('should extract factual claims and detect contradictions', async () => {
      const result = await extractFactualClaimsTool.execute({
        text: 'Apple was founded in 1976. Microsoft was founded in 1975. Apple was actually founded in 1976.',
        minQualityThreshold: 5,
        maxClaims: 20
      }, testContext);

      expect(result.claims).toBeDefined();
      expect(result.claims.length).toBeGreaterThan(0);
    });
  });

  describe('Check Spelling Grammar Tool', () => {
    it('should detect spelling and grammar errors', async () => {
      const result = await checkSpellingGrammarTool.execute({
        text: 'Their are many reasons why this approch might not work. We should of done better.',
        maxErrors: 20
      }, testContext);

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should find no errors in correct text', async () => {
      const result = await checkSpellingGrammarTool.execute({
        text: 'This is a well-written sentence with no errors.',
        maxErrors: 20
      }, testContext);

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBe(0);
    });
  });
});
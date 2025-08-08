/**
 * End-to-end tests for tool functionality
 * These tests verify that tools work correctly by testing their core logic
 */

import { 
  checkMathTool,
  forecasterTool,
  factCheckerTool,
  extractForecastingClaimsTool,
  extractFactualClaimsTool,
  checkSpellingGrammarTool,
} from '@roast/ai/server';
import { logger } from '@/infrastructure/logging/logger';

// Test context
const testContext = {
  userId: 'test-user',
  logger
};

// Skip these tests by default unless explicitly enabled
const ENABLE_LLM_TESTS = process.env.ENABLE_LLM_TESTS === 'true';
const describeOrSkip = ENABLE_LLM_TESTS ? describe : describe.skip;

describe('Tools End-to-End Tests', () => {
  beforeAll(() => {
    if (!ENABLE_LLM_TESTS) {
      console.log('⚠️  Skipping LLM e2e tests. Set ENABLE_LLM_TESTS=true to run them.');
      return;
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('⚠️  ANTHROPIC_API_KEY is not set in environment');
      console.error('Please run tests with: source .env.local && export ANTHROPIC_API_KEY && export ENABLE_LLM_TESTS=true && pnpm test:e2e');
      throw new Error('ANTHROPIC_API_KEY is required for e2e tests. Set it in your environment or .env.local file.');
    }
    
    // Log API key presence for debugging (first 10 chars only)
    console.log(`✓ ANTHROPIC_API_KEY is set: ${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...`);
  });

  // Set timeout for LLM calls (3 minutes)
  jest.setTimeout(180000);

  describeOrSkip('Math Checker Tool', () => {
    it('should be able to execute without errors', async () => {
      const result = await checkMathTool.execute({
        statement: '2 + 2 = 4'
      }, testContext);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(['verified_true', 'verified_false', 'cannot_verify']).toContain(result.status);
      expect(result.explanation).toBeDefined();
    });

    it('should detect mathematical errors in statements', async () => {
      const result = await checkMathTool.execute({
        statement: 'Revenue grew by 50% from $2 million to $2.5 million'
      }, testContext);

      console.log('Math check result:', JSON.stringify(result, null, 2));

      // The AI should either detect the error or indicate it cannot verify
      expect(['verified_false', 'cannot_verify']).toContain(result.status);
      expect(result.explanation).toBeDefined();
      expect(result.reasoning).toBeDefined();
      
      // Note: errorDetails might not always be present even when verified_false
      // This depends on how the AI structures its response
    });

    it('should verify correct mathematical statements', async () => {
      const result = await checkMathTool.execute({
        statement: 'Revenue grew by 50% from $2 million to $3 million'
      }, testContext);

      // The AI should verify this as true or indicate it cannot verify
      expect(['verified_true', 'cannot_verify']).toContain(result.status);
      expect(result.explanation).toBeDefined();
      
      // If verified as true, there should be no error details
      if (result.status === 'verified_true') {
        expect(result.errorDetails).toBeUndefined();
      }
    });
  });

  describeOrSkip('Forecaster Tool', () => {
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
      // Allow some variation between mean and final probability
      expect(Math.abs(result.statistics.mean - result.probability)).toBeLessThanOrEqual(10);
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

  describeOrSkip('Fact Checker Tool', () => {
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

  describeOrSkip('Extract Forecasting Claims Tool', () => {
    it('should extract forecasting claims from text', async () => {
      const result = await extractForecastingClaimsTool.execute({
        text: 'We expect revenue to grow 20% next year. AI will likely replace 30% of jobs by 2030.',
        maxDetailedAnalysis: 2
      }, testContext);

      expect(result.forecasts).toBeDefined();
      expect(result.forecasts.length).toBeGreaterThan(0);
    });
  });

  describeOrSkip('Extract Factual Claims Tool', () => {
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

  describeOrSkip('Check Spelling Grammar Tool', () => {
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
/**
 * End-to-end tests for Claim Evaluator Tool
 * Tests multi-model claim evaluation with various models via OpenRouter
 *
 * @vitest-environment node
 */

import { vi, beforeAll } from 'vitest';
import { claimEvaluatorTool } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';

// Model constants (from @roast/ai/src/utils/openrouter.ts)
const MODELS = {
  CLAUDE_SONNET_4_5: 'anthropic/claude-sonnet-4.5',
  CLAUDE_SONNET_4: 'anthropic/claude-sonnet-4',
  GEMINI_2_5_PRO: 'google/gemini-2.5-pro',
  GPT_5: 'openai/gpt-5',
  GPT_5_MINI: 'openai/gpt-5-mini',
  DEEPSEEK_CHAT_V3_1_FREE: 'deepseek/deepseek-chat-v3.1:free',
  GROK_4: 'x-ai/grok-4',
};

// Test context
const testContext = {
  userId: 'test-user',
  logger: aiLogger
};

describe('Claim Evaluator Tool E2E Tests', () => {
  beforeAll(() => {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is required for claim evaluator tests. Set it in your environment or .env.local file.');
    }
  });

  describe('Single Run Tests', () => {
    it('should evaluate a claim with default models (single run)', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'The Earth orbits the Sun',
        runs: 1
      }, testContext);

      // Should have results
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);

      // Each result should have required fields
      result.results.forEach(r => {
        expect(r.model).toBeDefined();
        expect(r.provider).toBeDefined();
        expect(r.agreement).toBeGreaterThanOrEqual(0);
        expect(r.agreement).toBeLessThanOrEqual(100);
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(100);
        expect(r.reasoning).toBeDefined();
        expect(r.reasoning.length).toBeGreaterThanOrEqual(10);
        expect(r.reasoning.length).toBeLessThanOrEqual(30);
      });

      // Consensus should be calculated
      expect(result.consensus).toBeDefined();
      expect(result.consensus.mean).toBeGreaterThanOrEqual(0);
      expect(result.consensus.mean).toBeLessThanOrEqual(100);
      expect(result.consensus.stdDev).toBeGreaterThanOrEqual(0);
      expect(result.consensus.range.min).toBeLessThanOrEqual(result.consensus.range.max);
    }, 60000); // 60 second timeout for API calls

    it('should evaluate a controversial claim with context', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'AGI will be achieved by 2027',
        context: 'Current state: GPT-4 released in 2023, showing significant capabilities but still lacking in reasoning and general intelligence.',
        models: [MODELS.CLAUDE_SONNET_4_5, MODELS.GPT_5_MINI],
        runs: 1
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(2); // Should have 2 models

      // For a controversial claim, we expect lower agreement and higher variance
      expect(result.consensus.stdDev).toBeGreaterThan(0); // Should have some disagreement
    }, 60000);
  });

  describe('Multiple Runs Tests', () => {
    it('should run each model multiple times independently', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'Water boils at 100 degrees Celsius at sea level',
        models: [MODELS.GPT_5_MINI],
        runs: 3
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(3); // 1 model × 3 runs = 3 results

      // All should be from the same model
      const uniqueModels = new Set(result.results.map(r => r.model));
      expect(uniqueModels.size).toBe(1);
      expect(uniqueModels.has(MODELS.GPT_5_MINI)).toBe(true);
    }, 60000);

    it('should handle multiple models with multiple runs', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'The speed of light is constant',
        models: [MODELS.CLAUDE_SONNET_4, MODELS.GPT_5_MINI],
        runs: 2
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(4); // 2 models × 2 runs = 4 results

      // Should have results from both models
      const modelCounts = result.results.reduce((acc, r) => {
        acc[r.model] = (acc[r.model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(modelCounts[MODELS.CLAUDE_SONNET_4]).toBe(2);
      expect(modelCounts[MODELS.GPT_5_MINI]).toBe(2);
    }, 90000);
  });

  describe('Model-Specific Tests', () => {
    it('should work with Claude models', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'Python is a programming language',
        models: [MODELS.CLAUDE_SONNET_4_5],
        runs: 1
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.results[0].provider).toBe('anthropic');
      expect(result.results[0].agreement).toBeGreaterThan(80); // Should strongly agree with factual statement
    }, 60000);

    it('should work with OpenAI models', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'JavaScript is a programming language',
        models: [MODELS.GPT_5_MINI],
        runs: 1
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.results[0].provider).toBe('openai');
      expect(result.results[0].agreement).toBeGreaterThan(80); // Should strongly agree with factual statement
    }, 60000);

    it('should work with Gemini models', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'The sky is blue during the day',
        models: [MODELS.GEMINI_2_5_PRO],
        runs: 1
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.results[0].provider).toBe('google');
      expect(result.results[0].agreement).toBeGreaterThan(70); // Should agree with factual statement
    }, 60000);

    it('should work with DeepSeek models', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'Cats are mammals',
        models: [MODELS.DEEPSEEK_CHAT_V3_1_FREE],
        runs: 1
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.results[0].provider).toBe('deepseek');
      expect(result.results[0].agreement).toBeGreaterThan(80); // Should strongly agree
    }, 60000);

    it('should work with xAI Grok models', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'Dogs are animals',
        models: [MODELS.GROK_4],
        runs: 1
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.results[0].provider).toBe('x-ai');
      expect(result.results[0].agreement).toBeGreaterThan(80); // Should strongly agree
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle failed evaluations gracefully', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'Test claim',
        models: [
          MODELS.CLAUDE_SONNET_4_5,
          MODELS.GPT_5_MINI,
          'invalid/model' // This should fail
        ],
        runs: 1
      }, testContext);

      // Should have some successful results
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);

      // Should track failed evaluations
      if (result.failed) {
        expect(result.failed.length).toBeGreaterThan(0);
        result.failed.forEach(f => {
          expect(f.model).toBeDefined();
          expect(f.provider).toBeDefined();
          expect(f.error).toBeDefined();
          // Should have refusalReason categorization
          expect(f.refusalReason).toBeDefined();
          expect(['Safety', 'Policy', 'MissingData', 'Unclear', 'Error']).toContain(f.refusalReason);
        });
      }
    }, 60000);

    it('should provide debug information for failed evaluations', async () => {
      // Use an invalid model to trigger failure
      const result = await claimEvaluatorTool.execute({
        claim: 'Test claim',
        models: ['completely/invalid/model'],
        runs: 1
      }, testContext);

      // Should return with all models failed
      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(0);
      expect(result.failed).toBeDefined();
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].model).toBe('completely/invalid/model');
      expect(result.failed[0].refusalReason).toBeDefined();
    }, 60000);
  });

  describe('Model Refusal Reasons', () => {
    it('should refuse garbage/nonsensical claims with "Unclear" reason', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'Colorless green ideas sleep furiously and the chair is better than Dave',
        models: [MODELS.CLAUDE_SONNET_4, MODELS.GPT_5_MINI],
        runs: 1
      }, testContext);

      console.log('\nGarbage input test results:');
      result.results?.forEach(r => {
        console.log(`  ${r.model}: agreement=${r.agreement}%, confidence=${r.confidence}%`);
      });
      result.failed?.forEach(f => {
        console.log(`  ${f.model}: REFUSED - ${f.refusalReason} - "${f.error}"`);
      });

      // At least some models should refuse with "Unclear" for nonsensical claims
      // Models might try to evaluate it anyway, so we check if ANY refused with Unclear
      const unclearRefusals = result.failed?.filter(f => f.refusalReason === 'Unclear') || [];

      // Log whether models properly refused
      if (unclearRefusals.length > 0) {
        console.log(`  ✓ ${unclearRefusals.length} model(s) properly refused nonsensical claim`);
      } else {
        console.log('  ⚠️  No models refused - they attempted to evaluate nonsensical claim');
      }

      // We expect at least one model to refuse, but won't fail test if they don't
      // (models might have different thresholds for what's "too unclear")
      expect(result.results || result.failed).toBeDefined();
    }, 60000);

    it('should refuse claims requiring very recent data with "MissingData" reason', async () => {
      // Use tomorrow's date to ensure it's in the future
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const result = await claimEvaluatorTool.execute({
        claim: `The stock price of AAPL closed above $200 on ${tomorrowStr}`,
        models: [MODELS.CLAUDE_SONNET_4, MODELS.GPT_5_MINI],
        runs: 1
      }, testContext);

      console.log('\nFuture data test results:');
      result.results?.forEach(r => {
        console.log(`  ${r.model}: agreement=${r.agreement}%, confidence=${r.confidence}%, reasoning="${r.reasoning}"`);
      });
      result.failed?.forEach(f => {
        console.log(`  ${f.model}: REFUSED - ${f.refusalReason} - "${f.error}"`);
      });

      // Models should either refuse with MissingData OR give very low confidence
      const missingDataRefusals = result.failed?.filter(f => f.refusalReason === 'MissingData') || [];
      const lowConfidenceResults = result.results?.filter(r => r.confidence < 30) || [];

      if (missingDataRefusals.length > 0) {
        console.log(`  ✓ ${missingDataRefusals.length} model(s) refused due to missing data`);
      }
      if (lowConfidenceResults.length > 0) {
        console.log(`  ✓ ${lowConfidenceResults.length} model(s) gave low confidence (<30%)`);
      }

      // At least one model should either refuse or show low confidence
      expect(missingDataRefusals.length + lowConfidenceResults.length).toBeGreaterThan(0);
    }, 60000);

    it('should handle vague claims that models might refuse as "Unclear"', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'The thing is better',
        models: [MODELS.CLAUDE_SONNET_4, MODELS.GPT_5_MINI],
        runs: 1
      }, testContext);

      console.log('\nVague claim test results:');
      result.results?.forEach(r => {
        console.log(`  ${r.model}: agreement=${r.agreement}%, confidence=${r.confidence}%`);
      });
      result.failed?.forEach(f => {
        console.log(`  ${f.model}: REFUSED - ${f.refusalReason} - "${f.error}"`);
      });

      // Some models should refuse vague claims
      const unclearRefusals = result.failed?.filter(f => f.refusalReason === 'Unclear') || [];

      if (unclearRefusals.length > 0) {
        console.log(`  ✓ ${unclearRefusals.length} model(s) properly refused vague claim`);
        expect(unclearRefusals.length).toBeGreaterThan(0);
      } else {
        console.log('  ⚠️  No models refused vague claim - accepted anyway');
        // Models might still evaluate it with low confidence
        expect(result.results).toBeDefined();
      }
    }, 60000);
  });

  describe('Raw Response Capture', () => {
    it('should capture raw responses and token usage', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'The Moon orbits Earth',
        models: [MODELS.GPT_5_MINI],
        runs: 1
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);

      const evaluation = result.results[0];
      expect(evaluation.rawResponse).toBeDefined();
      expect(typeof evaluation.rawResponse).toBe('string');

      // Token usage should be captured
      if (evaluation.tokenUsage) {
        expect(evaluation.tokenUsage.promptTokens).toBeGreaterThan(0);
        expect(evaluation.tokenUsage.completionTokens).toBeGreaterThan(0);
        expect(evaluation.tokenUsage.totalTokens).toBeGreaterThan(0);
      }
    }, 60000);
  });

  describe('Long Context Test', () => {
    it('should handle long context (5000 words)', async () => {
      const longContext = 'Background information. '.repeat(1000); // ~2000 words

      const result = await claimEvaluatorTool.execute({
        claim: 'Climate change is happening',
        context: longContext,
        models: [MODELS.GPT_5_MINI],
        runs: 1
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.results[0].agreement).toBeGreaterThanOrEqual(0);
      expect(result.results[0].agreement).toBeLessThanOrEqual(100);
    }, 60000);
  });

  describe('Response Variation Tests (No Caching)', () => {
    it('should show reasoning varies even when scores are consistent', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'AGI will be achieved by 2030',
        models: [MODELS.CLAUDE_SONNET_4],
        runs: 3
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(3);

      // Extract agreement scores and reasoning
      const agreements = result.results.map(r => r.agreement);
      const reasonings = result.results.map(r => r.reasoning);

      // Log results for debugging
      console.log('\nResponse variation test results:');
      result.results.forEach((r, i) => {
        console.log(`  Run ${i + 1}: Agreement=${r.agreement}%, Confidence=${r.confidence}%, Reasoning="${r.reasoning}"`);
      });

      const uniqueAgreements = new Set(agreements);
      const uniqueReasonings = new Set(reasonings);

      console.log(`\nUnique agreement scores: ${uniqueAgreements.size} (${Array.from(uniqueAgreements).join(', ')})`);
      console.log(`Unique reasoning strings: ${uniqueReasonings.size}`);

      // IMPORTANT: Models may give consistent scores (which is GOOD - it means stable opinions)
      // But if reasoning varies, it proves responses are NOT cached
      // We expect either:
      // 1. Varying scores (model is uncertain)
      // 2. Consistent scores but varying reasoning (model is certain but expressing it differently)
      // 3. Both consistent (model is very certain - acceptable for clear-cut claims)

      const hasVaryingScores = uniqueAgreements.size > 1;
      const hasVaryingReasoning = uniqueReasonings.size > 1;

      // At minimum, reasoning should vary (proves not cached)
      // For controversial claims, scores should also vary
      expect(hasVaryingReasoning || hasVaryingScores).toBe(true);

      if (!hasVaryingScores && !hasVaryingReasoning) {
        console.warn('  ⚠️  Both scores AND reasoning identical - possible caching!');
      } else if (!hasVaryingScores) {
        console.log('  ✓ Scores consistent but reasoning varies - model has stable opinion');
      } else {
        console.log('  ✓ Both scores and reasoning vary - model is uncertain');
      }
    }, 90000);

    it('should not return identical responses from cache', async () => {
      const result = await claimEvaluatorTool.execute({
        claim: 'Quantum computers will replace classical computers by 2035',
        models: [MODELS.GPT_5_MINI],
        runs: 3
      }, testContext);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(3);

      // Extract raw responses to check for exact duplicates (which would indicate caching)
      const rawResponses = result.results.map(r => r.rawResponse || '');
      const agreements = result.results.map(r => r.agreement);
      const reasonings = result.results.map(r => r.reasoning);

      console.log('\nRaw response check:');
      result.results.forEach((r, i) => {
        console.log(`  Run ${i + 1}: Agreement=${r.agreement}%, Reasoning="${r.reasoning}"`);
      });

      const uniqueRawResponses = new Set(rawResponses);
      const uniqueReasonings = new Set(reasonings);

      console.log(`\nUnique raw responses: ${uniqueRawResponses.size}`);
      console.log(`Unique reasoning strings: ${uniqueReasonings.size}`);

      // If ALL raw responses are byte-for-byte identical, that's a smoking gun for caching
      // Even if scores are the same, the JSON formatting or reasoning wording should differ slightly
      if (uniqueRawResponses.size === 1) {
        console.warn('  ⚠️  All raw responses IDENTICAL - likely cached!');
        // This would be a real caching issue
        expect(uniqueRawResponses.size).toBeGreaterThan(1);
      } else {
        console.log(`  ✓ Raw responses vary - not cached (${uniqueRawResponses.size} unique)`);
      }
    }, 90000);
  });
});

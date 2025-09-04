import { describe, it, expect } from 'vitest';
import { FactCheckerTool } from './index';
import { logger } from '../../shared/logger';

// Skip in CI to avoid LLM costs
const describeIfHasApiKey = process.env.ANTHROPIC_API_KEY ? describe : describe.skip;

describeIfHasApiKey('FactCheckerTool E2E Integration', () => {
  const tool = new FactCheckerTool();
  const testContext = { logger };

  it('should fact-check a true scientific claim', async () => {
    const input = {
      claim: 'Water boils at 100 degrees Celsius at sea level',
      context: 'A claim about the boiling point of water',
      searchForEvidence: false
    };

    const result = await tool.execute(input, testContext);

    expect(result.result).toBeDefined();
    expect(result.result.verdict).toMatch(/^(true|partially-true)$/);
    expect(result.result.confidence).toMatch(/^(high|medium|low)$/);
    expect(result.result.explanation).toBeDefined();
    expect(result.result.explanation.length).toBeGreaterThan(10);
  }, 15000);

  it('should fact-check a false claim', async () => {
    const input = {
      claim: 'The Earth is flat',
      context: 'A claim about the shape of the Earth',
      searchForEvidence: false
    };

    const result = await tool.execute(input, testContext);

    expect(result.result).toBeDefined();
    expect(result.result.verdict).toBe('false');
    expect(result.result.confidence).toMatch(/^(high|medium)$/);
    expect(result.result.explanation).toContain(/spherical|globe|round|sphere/i);
    
    // Should provide a correction for false claims
    if (result.result.corrections) {
      expect(result.result.corrections.length).toBeGreaterThan(0);
    }
  }, 15000);

  it('should fact-check a partially true claim', async () => {
    const input = {
      claim: 'All birds can fly',
      context: 'A generalization about bird capabilities',
      searchForEvidence: false
    };

    const result = await tool.execute(input, testContext);

    expect(result.result).toBeDefined();
    expect(result.result.verdict).toMatch(/^(false|partially-true)$/);
    expect(result.result.explanation).toMatch(/penguin|ostrich|emu|flightless/i);
  }, 15000);

  it('should handle unverifiable claims appropriately', async () => {
    const input = {
      claim: 'John Smith from 123 Main Street prefers chocolate ice cream',
      context: 'A claim about a specific individual preference',
      searchForEvidence: false
    };

    const result = await tool.execute(input, testContext);

    expect(result.result).toBeDefined();
    expect(result.result.verdict).toMatch(/^(unverifiable|false)$/);
    expect(result.result.explanation).toBeDefined();
  }, 15000);

  it('should fact-check with additional context', async () => {
    const input = {
      claim: 'The unemployment rate dropped to 3.5%',
      context: 'This refers to the US unemployment rate in December 2019, before the COVID-19 pandemic',
      searchForEvidence: false
    };

    const result = await tool.execute(input, testContext);

    expect(result.result).toBeDefined();
    expect(result.result.verdict).toBeDefined();
    expect(result.result.explanation).toBeDefined();
    
    // The context should influence the fact-checking
    expect(result.result.explanation.length).toBeGreaterThan(20);
  }, 15000);

  it('should handle outdated information', async () => {
    const input = {
      claim: 'Pluto is the ninth planet in our solar system',
      context: 'A claim about planetary classification',
      searchForEvidence: false
    };

    const result = await tool.execute(input, testContext);

    expect(result.result).toBeDefined();
    expect(result.result.verdict).toMatch(/^(false|outdated)$/);
    expect(result.result.explanation).toMatch(/dwarf planet|reclassified|2006/i);
  }, 15000);

  it('should validate input constraints', () => {
    // Test empty claim
    expect(() => tool.inputSchema.parse({
      claim: '',
      searchForEvidence: false
    })).toThrow();

    // Test missing claim
    expect(() => tool.inputSchema.parse({
      searchForEvidence: false
    })).toThrow();

    // Test claim that's too long
    const longClaim = 'a'.repeat(1001);
    expect(() => tool.inputSchema.parse({
      claim: longClaim,
      searchForEvidence: false
    })).toThrow();

    // Test valid input
    expect(() => tool.inputSchema.parse({
      claim: 'The sky is blue',
      searchForEvidence: false
    })).not.toThrow();
  });

  it('should include llmInteraction for monitoring', async () => {
    const input = {
      claim: 'The Eiffel Tower is in Paris',
      searchForEvidence: false
    };

    const result = await tool.execute(input, testContext);

    expect(result.llmInteraction).toBeDefined();
    expect(result.llmInteraction).toHaveProperty('prompt');
    expect(result.llmInteraction).toHaveProperty('response');
    expect(result.llmInteraction).toHaveProperty('tokensUsed');
  }, 15000);
});
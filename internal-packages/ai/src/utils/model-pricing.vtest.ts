import { describe, expect, it } from 'vitest';
import { calculateAnthropicCost } from './usageMetrics';
import { calculateApiCostInDollars } from './costCalculator';

// Verify tier boundaries and cache accounting, where stale flat rates undercount usage.
describe('current model cost estimates', () => {
  it('includes cached input when selecting the Haiku long-context tier', () => {
    expect(calculateAnthropicCost('claude-haiku-5-5', {
      input_tokens: 90_000, output_tokens: 1000, cache_read_input_tokens: 20_000,
    })).toBeCloseTo(0.0485);
    expect(calculateAnthropicCost('claude-haiku-5-5', {
      input_tokens: 100_000, output_tokens: 1000,
    })).toBeCloseTo(0.0105);
  });

  it('applies Luna long-context rates only above the threshold', () => {
    expect(calculateApiCostInDollars(272_000, 1000, 'openai/gpt-6-luna')).toBeCloseTo(0.0277);
    expect(calculateApiCostInDollars(272_001, 1000, 'openai/gpt-6-luna')).toBeCloseTo(0.0551502);
  });

  it('recognizes native Claude IDs and retains historical Sonnet pricing', () => {
    expect(calculateApiCostInDollars(1000, 1000, 'claude-sonnet-5-5')).toBeCloseTo(0.012);
    expect(calculateAnthropicCost('claude-sonnet-4-5-20250929', { input_tokens: 1000, output_tokens: 1000 })).toBeCloseTo(0.018);
  });
});

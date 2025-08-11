/**
 * Shared utilities for cost calculation in document analysis
 */

import { calculateCost } from '../../../utils/costCalculator';
import { logger } from '../../../utils/logger';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Calculate the cost for an LLM interaction
 * @param model The model name
 * @param usage Token usage information
 * @returns The total cost in dollars, or 0 if calculation fails
 */
export function calculateLLMCost(model: string, usage: TokenUsage | null | undefined): number {
  if (!usage) {
    return 0;
  }

  try {
    const costResult = calculateCost(
      {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0
      },
      model
    );
    return costResult;
  } catch (error) {
    logger.warn("Could not calculate LLM cost", { 
      error, 
      model,
      usage 
    });
    return 0;
  }
}
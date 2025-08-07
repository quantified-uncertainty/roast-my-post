/**
 * Shared utilities for cost calculation in document analysis
 */

import { calculateCost, mapModelToCostModel } from '@/shared/utils/costCalculator';
import { logger } from '@/infrastructure/logging/logger';

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
    const costModel = mapModelToCostModel(model);
    const costResult = calculateCost(
      costModel,
      usage.input_tokens || 0,
      usage.output_tokens || 0
    );
    return costResult.totalCost;
  } catch (error) {
    logger.warn("Could not calculate LLM cost", { 
      error, 
      model,
      usage 
    });
    return 0;
  }
}
import type { TokenUsage, Turn } from "./types";

export class BudgetTracker {
  private turns: Turn[] = [];
  private readonly budgetLimit: number;

  // Claude Sonnet 4 pricing
  private readonly SONNET_4_PRICING = {
    input: 3 / 1_000_000, // $3 per million
    output: 15 / 1_000_000, // $15 per million
  };

  constructor(budgetLimit: number) {
    this.budgetLimit = budgetLimit;
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = inputTokens * this.SONNET_4_PRICING.input;
    const outputCost = outputTokens * this.SONNET_4_PRICING.output;
    return inputCost + outputCost;
  }

  addTurn(cost: number, usage: TokenUsage): void {
    this.turns.push({
      cost,
      usage,
      timestamp: new Date(),
    });
  }

  getTotalCost(): number {
    return this.turns.reduce((sum, turn) => sum + turn.cost, 0);
  }

  getTurnCount(): number {
    return this.turns.length;
  }

  isOverBudget(): boolean {
    return this.getTotalCost() >= this.budgetLimit;
  }

  getBudgetUtilization(): number {
    return (this.getTotalCost() / this.budgetLimit) * 100;
  }

  getDetailedBreakdown() {
    return {
      turns: this.turns,
      totalCost: this.getTotalCost(),
      totalInputTokens: this.turns.reduce(
        (sum, t) => sum + t.usage.input_tokens,
        0
      ),
      totalOutputTokens: this.turns.reduce(
        (sum, t) => sum + t.usage.output_tokens,
        0
      ),
      averageCostPerTurn: this.getTurnCount() > 0 ? this.getTotalCost() / this.getTurnCount() : 0,
      budgetRemaining: Math.max(0, this.budgetLimit - this.getTotalCost()),
    };
  }
}
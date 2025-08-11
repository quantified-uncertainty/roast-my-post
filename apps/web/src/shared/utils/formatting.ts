/**
 * UI formatting utilities
 */

/**
 * Format a cost in dollars to a human-readable string
 * @param cost Cost in dollars
 * @returns Formatted string with dollar sign and 2 decimal places
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}
/**
 * Utility functions for generating cache seeds for tools
 */
import crypto from 'crypto';

/**
 * Generate a deterministic cache seed based on input parameters
 * @param prefix - Tool-specific prefix (e.g., 'fact-extract', 'math-check')
 * @param inputs - Array of input values to hash (will be concatenated)
 * @returns Cache seed string in format: `{prefix}-{hash}`
 */
export function generateCacheSeed(prefix: string, inputs: (string | number | boolean)[]): string {
  // Convert all inputs to strings and concatenate
  const inputString = inputs.map(input => String(input)).join('');
  
  // Generate hash
  const contentHash = crypto.createHash('sha256')
    .update(inputString)
    .digest('hex')
    .substring(0, 16);
    
  return `${prefix}-${contentHash}`;
}
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicApiKey } from '../types';

/**
 * Create an Anthropic client.
 */
export function createAnthropicClient(): Anthropic {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("❌ Missing Anthropic API key. Set ANTHROPIC_API_KEY in .env");
  }

  return new Anthropic({ apiKey });
}

import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicApiKey, getHeliconeApiKey, isHeliconeEnabled, getHeliconeMaxAge, getHeliconeMaxSize } from '../types';

/**
 * Create an Anthropic client with optional Helicone integration
 */
export function createAnthropicClient(additionalHeaders?: Record<string, string>): Anthropic {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("❌ Missing Anthropic API key. Set ANTHROPIC_API_KEY in .env");
  }

  const heliconeKey = getHeliconeApiKey();
  const enableHelicone = isHeliconeEnabled() && !!heliconeKey;

  if (enableHelicone) {
    // Use Helicone proxy with caching
    return new Anthropic({
      apiKey,
      baseURL: "https://anthropic.helicone.ai",
      defaultHeaders: {
        "Helicone-Auth": `Bearer ${heliconeKey}`,
        "Helicone-Cache-Enabled": "true",
        "Helicone-Cache-Max-Age": getHeliconeMaxAge(),
        "Helicone-Cache-Bucket-Max-Size": getHeliconeMaxSize(),
        ...additionalHeaders
      },
    });
  }

  // Direct Anthropic client
  return new Anthropic({ apiKey });
}
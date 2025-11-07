/**
 * Agent timeout configuration based on extended capabilities
 * Times are in milliseconds
 */

export const AGENT_TIMEOUT_CONFIG = {
  // Default timeout for most agents (4 minutes)
  DEFAULT_TIMEOUT_MS: 240000,
  
  // Timeout for agents with specific extended capabilities
  CAPABILITY_TIMEOUTS: {
    // Multi-epistemic evaluation runs multiple plugins and can take 6-15 minutes
    'multi-epistemic-eval': 900000, // 15 minutes

    // Spelling/grammar check can process large documents
    'spelling-grammar': 360000, // 6 minutes

    // Link verification might need to check many external URLs
    'simple-link-verifier': 480000, // 8 minutes

    // Epistemic critic may need time for Perplexity research on claims
    'epistemic-critic': 600000, // 10 minutes

    // Add more capabilities as needed
  } as Record<string, number>,
  
  // Maximum allowed timeout (safety limit)
  MAX_TIMEOUT_MS: 1200000, // 20 minutes
};

/**
 * Get timeout for a specific agent capability
 */
export function getAgentTimeout(extendedCapabilityId?: string | null): number {
  if (!extendedCapabilityId) {
    return AGENT_TIMEOUT_CONFIG.DEFAULT_TIMEOUT_MS;
  }
  
  const specificTimeout = AGENT_TIMEOUT_CONFIG.CAPABILITY_TIMEOUTS[extendedCapabilityId];
  if (specificTimeout) {
    return Math.min(specificTimeout, AGENT_TIMEOUT_CONFIG.MAX_TIMEOUT_MS);
  }
  
  return AGENT_TIMEOUT_CONFIG.DEFAULT_TIMEOUT_MS;
}

/**
 * Get human-readable timeout duration
 */
export function formatTimeout(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes === 0) {
    return `${seconds}s`;
  } else if (seconds === 0) {
    return `${minutes}m`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}
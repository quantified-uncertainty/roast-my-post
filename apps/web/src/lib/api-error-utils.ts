/**
 * Utility functions for handling API errors, particularly credit/billing related issues
 */

/**
 * Centralized function to detect insufficient API credits errors
 * Checks multiple patterns and status codes for robust detection
 */
export function isInsufficientCreditsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const err = error as { 
    status?: number; 
    message?: string; 
    error?: { message?: string };
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  
  // Check multiple status codes that could indicate payment/credit issues
  const creditErrorStatuses = [400, 402, 403];
  const status = err.status || err.response?.status;
  const hasRelevantStatus = status !== undefined && creditErrorStatuses.includes(status);
  
  // Check for credit-related error messages (case-insensitive)
  const creditErrorPatterns = [
    /credit\s*balance/i,
    /insufficient\s*credits?/i,
    /payment\s*required/i,
    /billing/i,
    /quota\s*exceeded/i,
    /rate\s*limit/i,
    /upgrade\s*.*\s*plan/i,
    /no\s*credits?\s*remaining/i,
    /out\s*of\s*credits?/i
  ];
  
  // Gather all possible error message sources
  const errorMessage = [
    err.message,
    err.error?.message,
    err.response?.data?.error?.message,
    typeof error === 'string' ? error : '',
    JSON.stringify(error)
  ].filter(Boolean).join(' ');
  
  const hasCreditsError = creditErrorPatterns.some(pattern => pattern.test(errorMessage));
  
  return hasRelevantStatus && hasCreditsError;
}

/**
 * Check if output text indicates API credit issues
 * Useful for checking tool outputs or error messages displayed to users
 */
export function outputIndicatesCreditsIssue(output: string): boolean {
  if (!output || typeof output !== 'string') return false;
  
  const patterns = [
    // API key issues
    /missing\s+anthropic\s+api\s+key/i,
    /anthropic_api_key/i,
    /openrouter\s+api\s+key/i,
    /openrouter_api_key/i,
    
    // Credit/billing issues
    /credit\s+balance\s+.*\s+low/i,
    /insufficient\s+credits?/i,
    /payment\s+required/i,
    /upgrade\s+.*\s+plan/i,
    /billing/i,
    /quota\s+exceeded/i,
    /no\s*credits?\s*remaining/i,
    /out\s*of\s*credits?/i,
    
    // Rate limiting (often related to plan limits)
    /rate\s+limit/i,
    /too\s+many\s+requests/i,
    /exceeded\s+.*\s+limit/i
  ];
  
  return patterns.some(pattern => pattern.test(output));
}

/**
 * Format a user-friendly message for credit/billing errors
 */
export function formatCreditErrorMessage(error: unknown): string {
  if (!isInsufficientCreditsError(error)) {
    return 'An error occurred while processing your request.';
  }
  
  // Check for specific providers
  const errorStr = JSON.stringify(error).toLowerCase();
  
  if (errorStr.includes('anthropic')) {
    return 'The Anthropic API key has insufficient credits. Please check your billing or upgrade your plan.';
  }
  
  if (errorStr.includes('openrouter')) {
    return 'The OpenRouter API key has insufficient credits. Please add credits to your account.';
  }
  
  if (errorStr.includes('openai')) {
    return 'The OpenAI API key has insufficient credits. Please check your billing.';
  }
  
  // Generic message
  return 'API credits are insufficient. Please check your API provider billing.';
}

/**
 * Check if an error is likely transient and worth retrying
 */
export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const err = error as { 
    status?: number; 
    code?: string;
    response?: { status?: number };
  };
  
  const status = err.status || err.response?.status;
  
  // Transient status codes
  const transientStatuses = [429, 502, 503, 504]; // Rate limit, bad gateway, service unavailable, timeout
  
  if (status && transientStatuses.includes(status)) {
    return true;
  }
  
  // Check for specific error codes
  const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
  if (err.code && transientCodes.includes(err.code)) {
    return true;
  }
  
  return false;
}
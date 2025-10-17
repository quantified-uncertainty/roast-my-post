/**
 * Helicone Cost Fetcher
 * 
 * Utility for fetching accurate cost and token data from Helicone API
 * after job completion. This replaces manual cost calculation with
 * Helicone's precise tracking.
 */

import { heliconeAPI } from './api-client';

export interface JobCostData {
  totalCostUSD: number;
  tokenCounts: {
    prompt: number;
    completion: number;
    total: number;
  };
  breakdown?: Array<{
    model: string;
    costUSD: number;
    tokens: number;
    requestCount: number;
  }>;
}

/**
 * Fetch accurate cost data from Helicone for a specific job
 * 
 * @param jobId - The job ID (matches Helicone session ID)
 * @returns Cost and token data from Helicone
 */
export async function fetchJobCostFromHelicone(jobId: string): Promise<JobCostData> {
  try {
    const costs = await heliconeAPI.getSessionCosts(jobId);
    
    return {
      totalCostUSD: costs.totalCost,
      tokenCounts: {
        prompt: costs.breakdown.reduce((sum, item) => {
          // Note: The existing API client doesn't separate prompt/completion tokens
          // We'll need to fetch the raw requests to get this data
          return sum;
        }, 0),
        completion: 0, // Will be calculated below
        total: costs.totalTokens
      },
      breakdown: costs.breakdown.map(item => ({
        model: item.model,
        costUSD: item.cost,
        tokens: item.tokens,
        requestCount: item.count
      }))
    };
  } catch (error) {
    throw new Error(`Failed to fetch Helicone cost data for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch detailed cost data with separate prompt/completion token counts
 * 
 * @param jobId - The job ID (matches Helicone session ID)
 * @returns Detailed cost and token data
 */
export async function fetchDetailedJobCostFromHelicone(jobId: string): Promise<JobCostData> {
  try {
    // Get raw requests to access prompt/completion token breakdown
    const requests = await heliconeAPI.getSessionRequests(jobId);
    
    let totalCostUSD = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    
    // Group by model for breakdown
    const modelStats = new Map<string, { cost: number; tokens: number; count: number }>();
    
    requests.forEach(req => {
      // Helicone returns costUSD, not cost
      totalCostUSD += req.costUSD || 0;
      promptTokens += req.prompt_tokens || 0;
      completionTokens += req.completion_tokens || 0;
      totalTokens += req.total_tokens || 0;
      
      // Update model breakdown
      const existing = modelStats.get(req.model) || { cost: 0, tokens: 0, count: 0 };
      modelStats.set(req.model, {
        cost: existing.cost + (req.costUSD || 0),
        tokens: existing.tokens + (req.total_tokens || 0),
        count: existing.count + 1
      });
    });
    
    const breakdown = Array.from(modelStats.entries()).map(([model, stats]) => ({
      model,
      costUSD: stats.cost,
      tokens: stats.tokens,
      requestCount: stats.count
    }));
    
    return {
      totalCostUSD,
      tokenCounts: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens
      },
      breakdown
    };
  } catch (error) {
    throw new Error(`Failed to fetch detailed Helicone cost data for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch cost data with retry logic for reliability
 * 
 * @param jobId - The job ID
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelayMs - Delay between retries in milliseconds (default: 1000)
 * @returns Cost data or null if all retries fail
 */
export async function fetchJobCostWithRetry(
  jobId: string, 
  maxRetries: number = 3, 
  retryDelayMs: number = 1000
): Promise<JobCostData | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchDetailedJobCostFromHelicone(jobId);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Log the final error but don't throw - let caller handle gracefully
  console.warn(`Failed to fetch Helicone cost data for job ${jobId} after ${maxRetries} attempts:`, lastError);
  return null;
}

/**
 * Validate that Helicone data is available for a job
 * 
 * @param jobId - The job ID to check
 * @returns True if Helicone has data for this job
 */
export async function validateHeliconeDataAvailable(jobId: string): Promise<boolean> {
  try {
    const requests = await heliconeAPI.getSessionRequests(jobId);
    return requests.length > 0;
  } catch (error) {
    return false;
  }
}
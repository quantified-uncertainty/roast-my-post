import { z } from "zod";

// Access error types
export const AccessErrorSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("NetworkError"),
    message: z.string(),
    retryable: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("NotFound"),
    statusCode: z.literal(404),
  }),
  z.object({
    type: z.literal("Forbidden"),
    statusCode: z.literal(403),
    authMethod: z.string().optional(),
  }),
  z.object({
    type: z.literal("Timeout"),
    duration: z.number(),
  }),
  z.object({
    type: z.literal("RateLimited"),
    resetTime: z.number().optional(),
  }),
  z.object({
    type: z.literal("ServerError"),
    statusCode: z.number(),
  }),
  z.object({
    type: z.literal("Unknown"),
    message: z.string(),
  }),
]);

export type AccessError = z.infer<typeof AccessErrorSchema>;

// Link analysis schema
export const LinkAnalysisSchema = z.object({
  url: z.string(),
  finalUrl: z.string().optional(),
  timestamp: z.date(),
  accessError: AccessErrorSchema.optional(),
  linkDetails: z.object({
    contentType: z.string(),
    statusCode: z.number(),
  }).optional(),
});

export type LinkAnalysis = z.infer<typeof LinkAnalysisSchema>;

// Input schema for URL validation
export const UrlValidationInputSchema = z.object({
  url: z.string().url(),
});

export type UrlValidationInput = z.infer<typeof UrlValidationInputSchema>;


async function checkUrlAccess(url: string): Promise<{
  accessible: boolean;
  finalUrl?: string;
  contentType?: string;
  statusCode?: number;
  error?: AccessError;
}> {
  const startTime = Date.now();
  
  // Try different strategies: HEAD first, then GET with different User-Agents
  const strategies = [
    {
      method: "HEAD" as const,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    {
      method: "GET" as const,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    {
      method: "GET" as const,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36", // Windows Chrome
    },
    {
      method: "GET" as const,
      userAgent: "curl/7.68.0", // Some servers prefer curl
    },
  ];
  
  let lastError: Error | null = null;
  
  for (const strategy of strategies) {
    try {
      const response = await fetch(url, {
        method: strategy.method,
        headers: {
          "User-Agent": strategy.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          "DNT": "1",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      const contentType = response.headers.get("content-type") || "";
      
      if (response.status === 404) {
        return {
          accessible: false,
          error: { type: "NotFound", statusCode: 404 },
        };
      }
      
      if (response.status === 403) {
        return {
          accessible: false,
          error: { type: "Forbidden", statusCode: 403 },
        };
      }
      
      if (response.status === 429) {
        const resetTime = response.headers.get("x-ratelimit-reset");
        return {
          accessible: false,
          error: { 
            type: "RateLimited", 
            resetTime: resetTime ? parseInt(resetTime) : undefined 
          },
        };
      }
      
      if (response.status >= 500) {
        return {
          accessible: false,
          error: { type: "ServerError", statusCode: response.status },
        };
      }
      
      if (!response.ok) {
        return {
          accessible: false,
          error: { 
            type: "Unknown", 
            message: `HTTP ${response.status}: ${response.statusText}` 
          },
        };
      }
      
      // Success - return immediately
      return {
        accessible: true,
        finalUrl: response.url,
        contentType,
        statusCode: response.status,
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // For certain errors, don't try other strategies (e.g., DNS resolution failure)
      if (lastError.message.includes("ENOTFOUND") || 
          lastError.message.includes("ERR_NAME_NOT_RESOLVED")) {
        break; // No point trying other strategies if domain doesn't exist
      }
      // Continue to next strategy if this one failed
      continue;
    }
  }
  
  // If we get here, all methods failed
  if (lastError) {
    const duration = Date.now() - startTime;
    
    if (lastError.name === "AbortError") {
      return {
        accessible: false,
        error: { type: "Timeout", duration },
      };
    }
    
    if (lastError.message.includes("ENOTFOUND") || 
        lastError.message.includes("ECONNREFUSED") ||
        lastError.message.includes("ERR_NAME_NOT_RESOLVED")) {
      return {
        accessible: false,
        error: { 
          type: "NetworkError", 
          message: "Domain not found or connection refused",
          retryable: false,
        },
      };
    }
    
    // Handle specific SSL/TLS issues
    if (lastError.message.includes("CERT_") || 
        lastError.message.includes("SSL") ||
        lastError.message.includes("TLS")) {
      return {
        accessible: false,
        error: { 
          type: "NetworkError", 
          message: "SSL/TLS certificate error",
          retryable: false,
        },
      };
    }
    
    return {
      accessible: false,
      error: { 
        type: "NetworkError", 
        message: lastError.message,
        retryable: true,
      },
    };
  }
  
  return {
    accessible: false,
    error: { type: "Unknown", message: "All request methods failed" },
  };
}

export async function validateUrl(
  input: UrlValidationInput
): Promise<LinkAnalysis> {
  const timestamp = new Date();
  
  // Check if the URL is accessible
  const accessCheck = await checkUrlAccess(input.url);
  
  // If not accessible, return with error
  if (!accessCheck.accessible || accessCheck.error) {
    return {
      url: input.url,
      finalUrl: accessCheck.finalUrl,
      timestamp,
      accessError: accessCheck.error,
    };
  }
  
  // URL is accessible, return success
  return {
    url: input.url,
    finalUrl: accessCheck.finalUrl,
    timestamp,
    linkDetails: {
      contentType: accessCheck.contentType!,
      statusCode: accessCheck.statusCode!,
    },
  };
}

// Convenience function for validating multiple URLs
export async function validateUrls(
  inputs: UrlValidationInput[]
): Promise<LinkAnalysis[]> {
  // Process in batches to avoid overwhelming servers
  const batchSize = 10;
  const results: LinkAnalysis[] = [];
  
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(input => validateUrl(input))
    );
    results.push(...batchResults);
    
    // Add a small delay between batches to be respectful
    if (i + batchSize < inputs.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}
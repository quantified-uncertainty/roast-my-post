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
  
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkValidator/1.0)",
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
    
    // All content types are treated equally - we only check server response
    
    return {
      accessible: true,
      finalUrl: response.url,
      contentType,
      statusCode: response.status,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          accessible: false,
          error: { type: "Timeout", duration },
        };
      }
      
      if (error.message.includes("ENOTFOUND") || 
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ERR_NAME_NOT_RESOLVED")) {
        return {
          accessible: false,
          error: { 
            type: "NetworkError", 
            message: "Domain not found or connection refused",
            retryable: false,
          },
        };
      }
      
      return {
        accessible: false,
        error: { 
          type: "NetworkError", 
          message: error.message,
          retryable: true,
        },
      };
    }
    
    return {
      accessible: false,
      error: { type: "Unknown", message: "Unknown error occurred" },
    };
  }
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
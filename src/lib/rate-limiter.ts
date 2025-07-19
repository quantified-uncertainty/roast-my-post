/**
 * Simple in-memory rate limiter for API routes
 * In production, use Redis or Upstash for distributed rate limiting
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}

class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private windowMs: number = 60 * 1000, // 1 minute
    private maxRequests: number = 60 // 60 requests per minute
  ) {}

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const resetTime = now + this.windowMs;
    
    // Clean up old entries
    this.cleanup(now);
    
    const record = this.requests.get(identifier);
    
    if (!record || now > record.resetTime) {
      // New window
      this.requests.set(identifier, { count: 1, resetTime });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: new Date(resetTime),
      };
    }
    
    // Existing window
    if (record.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: new Date(record.resetTime),
      };
    }
    
    // Increment and allow
    record.count++;
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      reset: new Date(record.resetTime),
    };
  }
  
  private cleanup(now: number) {
    // Remove expired entries to prevent memory leak
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Export singleton instances for different rate limit tiers
// In development, use very permissive limits for testing
const isDevelopment = process.env.NODE_ENV === 'development';
export const standardRateLimit = new InMemoryRateLimiter(60 * 1000, isDevelopment ? 10000 : 60); // 10k/min in dev, 60/min in prod
export const strictRateLimit = new InMemoryRateLimiter(60 * 1000, isDevelopment ? 1000 : 10); // 1k/min in dev, 10/min in prod
export const importRateLimit = new InMemoryRateLimiter(60 * 60 * 1000, isDevelopment ? 1000 : 20); // 1k/hour in dev, 20/hour in prod

// Helper function to get client identifier
export function getClientIdentifier(request: Request): string {
  // In production, use real IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  return forwardedFor?.split(',')[0] || realIp || 'anonymous';
}
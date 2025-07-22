import { NextRequest } from "next/server";
import { logger } from "./logger";

/**
 * Middleware helper for API routes to add request logging
 */

export function withLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  routeName?: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const request = args[0] as NextRequest;
    
    // Extract request details
    const method = request.method;
    const path = new URL(request.url).pathname;
    const requestId = crypto.randomUUID();
    
    // Create a logger with request context
    const requestLogger = logger.child({ requestId, route: routeName });
    
    // Log the incoming request
    requestLogger.logRequest(method, path, {
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(new URL(request.url).searchParams.entries()),
    });
    
    try {
      // Call the actual handler
      const response = await handler(...args);
      
      // Log the response
      const duration = Date.now() - startTime;
      requestLogger.logResponse(method, path, response.status, duration);
      
      // Add request ID to response headers for tracing
      const headers = new Headers(response.headers);
      headers.set("X-Request-ID", requestId);
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      // Log the error
      const duration = Date.now() - startTime;
      requestLogger.error(`${method} ${path} - Unhandled error`, error, { duration });
      
      // Re-throw to let error handling middleware deal with it
      throw error;
    }
  }) as T;
}

/**
 * Example usage:
 * 
 * export const GET = withLogging(async (request: NextRequest) => {
 *   // Your handler logic here
 *   return NextResponse.json({ data: "example" });
 * }, "getExample");
 */
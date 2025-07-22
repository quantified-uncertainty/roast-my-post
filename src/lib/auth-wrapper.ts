import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth-helpers";
import { RouteContext } from "@/lib/types/next";

/**
 * Higher-order function that wraps API route handlers with authentication.
 * This ensures consistent authentication across all API endpoints.
 * 
 * @param handler - The API route handler function
 * @param options - Configuration options
 * @returns Wrapped handler with authentication
 */
export function withAuth<T = unknown, TParams = Record<string, string>>(
  handler: (request: NextRequest, context: RouteContext<TParams>, userId: string) => Promise<NextResponse<T>>,
  options: {
    requireAuth?: boolean;
    adminOnly?: boolean;
  } = { requireAuth: true, adminOnly: false }
) {
  return async (request: NextRequest, context: RouteContext<TParams>): Promise<NextResponse<T>> => {
    try {
      const userId = await authenticateRequest(request);
      
      if (options.requireAuth && !userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        ) as NextResponse<T>;
      }

      if (options.adminOnly && userId) {
        // TODO: Add admin check when isAdmin is available
        // const isUserAdmin = await isAdmin(userId);
        // if (!isUserAdmin) {
        //   return NextResponse.json(
        //     { error: "Admin access required" },
        //     { status: 403 }
        //   ) as NextResponse<T>;
        // }
      }

      return handler(request, context, userId!);
    } catch (error) {
      logger.error('[AUTH_WRAPPER] Authentication error:', error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      ) as NextResponse<T>;
    }
  };
}

/**
 * Type-safe wrapper for GET requests
 */
export function withAuthGET<T = unknown>(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse<T>>,
  options?: { requireAuth?: boolean; adminOnly?: boolean }
) {
  return withAuth(
    async (request: NextRequest, _context: RouteContext, userId: string) => {
      return handler(request, userId);
    },
    options
  );
}

/**
 * Type-safe wrapper for POST requests
 */
export function withAuthPOST<T = unknown>(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse<T>>,
  options?: { requireAuth?: boolean; adminOnly?: boolean }
) {
  return withAuth(
    async (request: NextRequest, _context: RouteContext, userId: string) => {
      return handler(request, userId);
    },
    options
  );
}

/**
 * Wrapper for routes with dynamic parameters
 */
export function withAuthParams<T = unknown, TParams = Record<string, string>>(
  handler: (request: NextRequest, params: TParams, userId: string) => Promise<NextResponse<T>>,
  options?: { requireAuth?: boolean; adminOnly?: boolean }
) {
  return withAuth(
    async (request: NextRequest, context: RouteContext<TParams>, userId: string) => {
      return handler(request, context.params, userId);
    },
    options
  );
}
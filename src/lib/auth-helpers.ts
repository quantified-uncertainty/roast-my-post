import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateApiKey } from "@/lib/auth-api";

/**
 * Standardized authentication helper that tries API key first, then falls back to session auth.
 * This provides a consistent authentication pattern across all API routes.
 * 
 * @param request - The NextRequest object
 * @returns The authenticated user ID or undefined if not authenticated
 */
export async function authenticateRequest(request: NextRequest): Promise<string | undefined> {
  // Try API key authentication first
  const apiAuth = await authenticateApiKey(request);
  
  if (apiAuth.success) {
    return apiAuth.userId;
  }
  
  // Fall back to session authentication
  const session = await auth();
  return session?.user?.id;
}

/**
 * Alternative authentication helper that tries session first, then falls back to API key.
 * Use this for routes where session auth is preferred.
 * 
 * @param request - The NextRequest object
 * @returns The authenticated user ID or undefined if not authenticated
 */
export async function authenticateRequestSessionFirst(request: NextRequest): Promise<string | undefined> {
  // Try session auth first
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  
  // Fall back to API key authentication
  const apiAuth = await authenticateApiKey(request);
  return apiAuth.success ? apiAuth.userId : undefined;
}
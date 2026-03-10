import { NextRequest } from "next/server";
import { auth } from "@/infrastructure/auth/auth";
import { authenticateApiKey } from "@/infrastructure/auth/auth-api";
import { prisma } from "@roast/db";

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

/**
 * Passive authentication helper for public routes that should never trigger auth flows.
 * Tries API key first, then reads the session cookie directly from the request
 * and looks up the session in the database — bypasses NextAuth's auth() entirely.
 *
 * Use this for public pages where you want to optionally identify the user
 * (e.g. to show their private content) without risking auth side effects.
 */
export async function authenticateRequestPassive(request: NextRequest): Promise<string | undefined> {
  // Try API key authentication first (just reads headers, no side effects)
  const apiAuth = await authenticateApiKey(request);
  if (apiAuth.success) {
    return apiAuth.userId;
  }

  // Read session cookie directly — no NextAuth auth() call
  const sessionToken = request.cookies.get('authjs.session-token')?.value;
  if (!sessionToken) {
    return undefined;
  }

  const session = await prisma.session.findFirst({
    where: { sessionToken, expires: { gt: new Date() } },
    select: { userId: true },
  });
  return session?.userId;
}
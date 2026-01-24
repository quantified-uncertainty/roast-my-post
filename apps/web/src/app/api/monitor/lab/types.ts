/**
 * Shared types for Lab API routes
 */

/**
 * Next.js 15 dynamic route params for routes with [id] segment
 */
export interface RouteIdParams {
  params: Promise<{ id: string }>;
}

/**
 * Type definitions for Next.js API route contexts and params
 */

export interface RouteContext<T = Record<string, string>> {
  params: T;
}

export interface RouteSegment {
  params: Promise<Record<string, string>>;
}

// For dynamic route parameters
export type DynamicRouteParams = Record<string, string | string[]>;

// For parsed request body
export type ParsedRequestBody<T = unknown> = T;

// For route handler contexts
export interface APIRouteContext<TParams = DynamicRouteParams> {
  params: TParams;
}
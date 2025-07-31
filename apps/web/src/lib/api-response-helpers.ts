import { NextResponse } from "next/server";

/**
 * Standard API response helpers to ensure consistent response formats
 */

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorizedResponse(message = "Authentication required") {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = "You do not have permission to access this resource") {
  return errorResponse(message, 403);
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}

export function badRequestResponse(message: string) {
  return errorResponse(message, 400);
}

export function validationErrorResponse(errors: Record<string, string>) {
  return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
}

export function serverErrorResponse(message = "An error occurred. Please try again.") {
  return errorResponse(message, 500);
}

/**
 * Common error responses for consistency across API routes
 */
export const commonErrors = {
  unauthorized: () => unauthorizedResponse(),
  forbidden: () => forbiddenResponse(),
  notFound: (resource?: string) => notFoundResponse(resource),
  badRequest: (message: string) => badRequestResponse(message),
  serverError: (message?: string) => serverErrorResponse(message),
  validationError: (errors: Record<string, string>) => validationErrorResponse(errors),
};
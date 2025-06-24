import { z, ZodError, ZodSchema } from "zod";
import { validationErrorResponse } from "./api-response-helpers";

/**
 * Request validation helpers for consistent validation across API routes
 */

/**
 * Validates request body against a Zod schema
 * @param body - The request body to validate
 * @param schema - The Zod schema to validate against
 * @returns Object with either data or error
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: ZodSchema<T>
): { data?: T; error?: string; errors?: Record<string, string> } {
  try {
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      // Extract field-specific errors
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      
      return { 
        error: "Validation failed", 
        errors 
      };
    }
    
    return { error: "Invalid request body" };
  }
}

/**
 * Validates request body and returns a response if validation fails
 * @param body - The request body to validate
 * @param schema - The Zod schema to validate against
 * @returns Either the validated data or an error response
 */
export async function validateOrRespond<T>(
  body: unknown,
  schema: ZodSchema<T>
): Promise<T | ReturnType<typeof validationErrorResponse>> {
  const result = validateRequestBody(body, schema);
  
  if (result.error) {
    return validationErrorResponse(result.errors || { body: result.error });
  }
  
  return result.data!;
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination parameters
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),

  // ID parameter
  objectId: z.string().min(1, "ID is required"),

  // URL validation
  url: z.string().url("Invalid URL format"),

  // Email validation
  email: z.string().email("Invalid email format"),

  // Array of IDs
  idArray: z.array(z.string().min(1)),
};

/**
 * Helper to parse query parameters with validation
 */
export function parseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data?: T; error?: string } {
  // Convert URLSearchParams to object
  const params: Record<string, string | string[]> = {};
  
  searchParams.forEach((value, key) => {
    const existing = params[key];
    if (existing) {
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      params[key] = value;
    }
  });
  
  return validateRequestBody(params, schema);
}
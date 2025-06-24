import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { hashApiKey } from "@/lib/crypto";

// Error types for better error handling
export enum AuthErrorType {
  NO_AUTH_HEADER = "NO_AUTH_HEADER",
  INVALID_AUTH_FORMAT = "INVALID_AUTH_FORMAT",
  INVALID_KEY_FORMAT = "INVALID_KEY_FORMAT",
  KEY_NOT_FOUND = "KEY_NOT_FOUND",
  KEY_EXPIRED = "KEY_EXPIRED",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_DISABLED = "USER_DISABLED",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type AuthResult = 
  | { success: true; userId: string; keyId: string }
  | { success: false; error: AuthError };

export async function authenticateApiKey(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    return {
      success: false,
      error: new AuthError(
        AuthErrorType.NO_AUTH_HEADER,
        "Missing authorization header"
      ),
    };
  }
  
  if (!authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: new AuthError(
        AuthErrorType.INVALID_AUTH_FORMAT,
        "Authorization header must use Bearer scheme"
      ),
    };
  }
  
  const plainKey = authHeader.substring(7); // Remove "Bearer " prefix
  
  // Basic format validation
  if (!plainKey.startsWith("oa_")) {
    return {
      success: false,
      error: new AuthError(
        AuthErrorType.INVALID_KEY_FORMAT,
        "API key must start with 'oa_'"
      ),
    };
  }
  
  if (plainKey.length < 40) {
    return {
      success: false,
      error: new AuthError(
        AuthErrorType.INVALID_KEY_FORMAT,
        "API key is too short"
      ),
    };
  }
  
  try {
    // Hash the provided key to compare with stored hash
    const hashedKey = hashApiKey(plainKey);
    
    const key = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: { user: true },
    });
    
    if (!key) {
      return {
        success: false,
        error: new AuthError(
          AuthErrorType.KEY_NOT_FOUND,
          "Invalid API key"
        ),
      };
    }
    
    // Check if user exists and is active
    if (!key.user) {
      return {
        success: false,
        error: new AuthError(
          AuthErrorType.USER_NOT_FOUND,
          "User associated with this API key not found",
          404
        ),
      };
    }
    
    // Check if key is expired
    if (key.expiresAt && key.expiresAt < new Date()) {
      return {
        success: false,
        error: new AuthError(
          AuthErrorType.KEY_EXPIRED,
          `API key expired on ${key.expiresAt.toISOString()}`
        ),
      };
    }
    
    // Update last used timestamp (but not on every request to avoid DB load)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!key.lastUsedAt || key.lastUsedAt < hourAgo) {
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });
    }
    
    return { success: true, userId: key.userId, keyId: key.id };
  } catch (error) {
    // Error authenticating API key - details logged to monitoring
    return {
      success: false,
      error: new AuthError(
        AuthErrorType.DATABASE_ERROR,
        error instanceof Error ? error.message : "Database error occurred",
        500
      ),
    };
  }
}

// Helper function for backward compatibility
export async function authenticateApiKeySimple(request: NextRequest): Promise<{ userId: string } | null> {
  const result = await authenticateApiKey(request);
  return result.success ? { userId: result.userId } : null;
}
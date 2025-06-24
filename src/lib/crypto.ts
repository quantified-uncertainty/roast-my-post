import { createHash, randomBytes } from "crypto";

/**
 * Hash an API key for storage in the database
 * Uses SHA-256 for fast lookups (not for password storage)
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a cryptographically secure API key
 */
export function generateApiKey(): string {
  // Generate 32 random bytes (256 bits of entropy)
  const bytes = randomBytes(32);
  // Convert to base64url format (URL-safe, no padding)
  const key = bytes.toString("base64url");
  return `oa_${key}`;
}
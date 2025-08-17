import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure random ID
 * @param size - The length of the ID to generate (default: 21)
 * @returns A random string with only letters and numbers
 */
export function generateId(size: number = 21): string {
  // Generate enough random bytes and convert to base64url, then remove dashes and underscores
  // We need extra bytes since we're removing characters
  const bytes = randomBytes(size * 2);
  const base64url = bytes.toString('base64url');
  // Remove dashes and underscores, keep only alphanumeric
  const alphanumeric = base64url.replace(/[-_]/g, '');
  return alphanumeric.substring(0, size);
}

// For backwards compatibility with existing code
export default generateId;
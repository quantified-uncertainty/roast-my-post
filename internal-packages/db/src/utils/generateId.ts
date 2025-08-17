import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure random ID
 * @param size - The length of the ID to generate (default: 21)
 * @returns A random string with only letters and numbers
 */
export function generateId(size: number = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // We use rejection sampling to ensure uniform distribution.
  // Simply using modulo would create bias toward lower characters.
  // By rejecting values >= 248 (largest multiple of 62 under 256),
  // we ensure each character has equal probability while staying fast.
  while (result.length < size) {
    const byte = randomBytes(1)[0];
    if (byte < 248) {  // 248 = 4 * 62, largest multiple of 62 under 256
      result += chars[byte % 62];
    }
  }
  
  return result;
}

// For backwards compatibility with existing code
export default generateId;
import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure random ID
 * @param size - The length of the ID to generate (default: 21)
 * @returns A random string with only letters and numbers
 */
export function generateId(size: number = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(size);
  let result = '';
  
  for (let i = 0; i < size; i++) {
    // Use modulo to map each random byte to a character in our alphabet
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

// For backwards compatibility with existing code
export default generateId;
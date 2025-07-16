/**
 * Utility functions for safe array access
 */

/**
 * Safely get a random element from an array
 * @param array - The array to pick from
 * @param defaultValue - Value to return if array is empty
 * @returns A random element from the array or the default value
 */
export function getRandomElement<T>(array: T[], defaultValue: T): T {
  if (!array || array.length === 0) {
    return defaultValue;
  }
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

/**
 * Safely get an element at a specific index
 * @param array - The array to access
 * @param index - The index to access
 * @param defaultValue - Value to return if index is out of bounds
 * @returns The element at the index or the default value
 */
export function safeArrayAccess<T>(array: T[], index: number, defaultValue: T): T {
  if (!array || index < 0 || index >= array.length) {
    return defaultValue;
  }
  return array[index];
}

/**
 * Safely calculate percentile value from a sorted array
 * @param sortedArray - A sorted array of numbers
 * @param percentile - The percentile to calculate (0-1)
 * @returns The percentile value or NaN if array is empty
 */
export function getPercentile(sortedArray: number[], percentile: number): number {
  if (!sortedArray || sortedArray.length === 0) {
    return NaN;
  }
  
  if (sortedArray.length === 1) {
    return sortedArray[0];
  }
  
  // Clamp percentile to valid range
  const p = Math.max(0, Math.min(1, percentile));
  
  // Calculate index
  const index = p * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  // If exact index, return that value
  if (lower === upper) {
    return sortedArray[lower];
  }
  
  // Otherwise interpolate between the two closest values
  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}
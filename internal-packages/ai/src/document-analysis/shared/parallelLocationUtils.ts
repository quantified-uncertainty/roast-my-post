/**
 * Utility functions for parallel location finding operations
 */

/**
 * Process multiple items in parallel with a location finder function
 * @param items - Array of items to process
 * @param locationFinder - Async function that finds location for each item
 * @returns Map of key to location result
 */
export async function processLocationsInParallel<T, K, R>(
  items: T[],
  keyExtractor: (item: T) => K,
  locationFinder: (item: T) => Promise<R>
): Promise<Map<K, R>> {
  const results = new Map<K, R>();
  
  // Process all items in parallel
  const locationPromises = items.map(async (item) => {
    const result = await locationFinder(item);
    return { key: keyExtractor(item), result };
  });
  
  const locations = await Promise.all(locationPromises);
  
  // Build the results map
  for (const { key, result } of locations) {
    results.set(key, result);
  }
  
  return results;
}

/**
 * Specialized version for text-based location finding
 */
export async function processTextLocationsInParallel<R>(
  searches: Array<{ text: string; context?: string }>,
  locationFinder: (search: { text: string; context?: string }) => Promise<R>
): Promise<Map<string, R>> {
  return processLocationsInParallel(
    searches,
    (search) => search.text,
    locationFinder
  );
}
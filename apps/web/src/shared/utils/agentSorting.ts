import { orderBy } from 'lodash';

type SortableAgent = {
  isRecommended?: boolean;
  isDeprecated?: boolean;
  name?: string;
}

/**
 * Sort agents by their badge status:
 * 1. Recommended agents first
 * 2. Regular agents (neither recommended nor deprecated)
 * 3. Deprecated agents last
 * 
 * Within each group, agents are sorted alphabetically by name if available
 * 
 * This function preserves all properties of the input objects
 */
export function sortAgentsByBadgeStatus<T extends SortableAgent>(agents: T[]): T[] {
  return orderBy(
    agents,
    [
      // First sort by recommendation status (true first)
      (agent) => !agent.isRecommended,
      // Sort by deprecation status (non-deprecated agents prioritized)
      (agent) => agent.isDeprecated,
      // Finally alphabetically by name
      (agent) => agent.name?.toLowerCase() || ''
    ],
    ['asc', 'asc', 'asc']
  );
}

/**
 * Alternative implementation without lodash (if needed for bundle size)
 */
export function sortAgentsByBadgeStatusNative<T extends SortableAgent>(agents: T[]): T[] {
  return [...agents].sort((a, b) => {
    // Recommended agents come first
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    
    // Deprecated agents come last
    if (a.isDeprecated && !b.isDeprecated) return 1;
    if (!a.isDeprecated && b.isDeprecated) return -1;
    
    // Within same category, sort alphabetically by name
    const aName = a.name?.toLowerCase() || '';
    const bName = b.name?.toLowerCase() || '';
    return aName.localeCompare(bName);
  });
}
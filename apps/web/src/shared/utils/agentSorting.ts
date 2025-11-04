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

type EvaluationWithComments = {
  comments?: Array<unknown>;
  agent?: {
    name?: string;
  };
};

/**
 * Sort evaluations by comment count (descending), then by agent name (ascending)
 * Evaluations with more comments appear first
 */
export function sortEvaluationsByCommentCount<T extends EvaluationWithComments>(
  evaluations: T[]
): T[] {
  return [...evaluations].sort((a, b) => {
    // Sort by comment count (descending)
    const commentsA = a.comments?.length || 0;
    const commentsB = b.comments?.length || 0;
    if (commentsB !== commentsA) {
      return commentsB - commentsA;
    }

    // Within same comment count, sort alphabetically by name
    const aName = a.agent?.name?.toLowerCase() || '';
    const bName = b.agent?.name?.toLowerCase() || '';
    return aName.localeCompare(bName);
  });
}

type AgentReviewEntry = [string, number]; // [agentId, commentCount]

type EvaluationLookup = {
  agentId: string;
  agent: {
    name?: string;
  };
};

/**
 * Sort agent review entries by comment count (descending), then by agent name (ascending)
 * Used for sorting Object.entries() results
 */
export function sortAgentReviewsByCommentCount(
  entries: AgentReviewEntry[],
  evaluations: EvaluationLookup[]
): AgentReviewEntry[] {
  return [...entries].sort((a, b) => {
    // Sort by comment count (descending)
    const commentCountA = a[1];
    const commentCountB = b[1];
    if (commentCountB !== commentCountA) {
      return commentCountB - commentCountA;
    }

    // Within same comment count, sort alphabetically by agent name
    const evalA = evaluations.find((r) => r.agentId === a[0]);
    const evalB = evaluations.find((r) => r.agentId === b[0]);
    const nameA = evalA?.agent.name?.toLowerCase() || '';
    const nameB = evalB?.agent.name?.toLowerCase() || '';
    return nameA.localeCompare(nameB);
  });
}
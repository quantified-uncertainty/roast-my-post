/**
 * Reusable Prisma include objects for evaluation queries
 * These ensure consistent data fetching across all pages
 */

// Basic includes for agent data
export const agentWithLatestVersion = {
  versions: {
    orderBy: { version: 'desc' as const },
    take: 1,
  },
} as const;

// Include for evaluations that need grade display
export const evaluationWithGrade = {
  agent: {
    include: agentWithLatestVersion,
  },
  versions: {
    orderBy: { version: 'desc' as const },
    take: 1,
  },
} as const;

// Include for document with all evaluations (for sidebar)
export const documentWithEvaluations = {
  versions: {
    orderBy: { version: 'desc' as const },
    take: 1,
  },
  evaluations: {
    include: evaluationWithGrade,
    orderBy: {
      createdAt: 'desc' as const,
    },
  },
} as const;

// Full evaluation include for detail pages
export const fullEvaluationInclude = {
  agent: {
    include: agentWithLatestVersion,
  },
  document: {
    include: documentWithEvaluations,
  },
  versions: {
    orderBy: { version: 'desc' as const },
    include: {
      job: true,
    },
  },
} as const;

// Include for evaluation with current job and tasks
export const evaluationWithCurrentJob = {
  ...fullEvaluationInclude,
  versions: {
    orderBy: { version: 'desc' as const },
    take: 1,
    include: {
      job: {
        include: {
          tasks: {
            orderBy: { createdAt: 'asc' as const },
          },
        },
      },
    },
  },
} as const;

// Include for version-specific pages
export const evaluationWithAllVersions = {
  ...fullEvaluationInclude,
  versions: {
    orderBy: { version: 'desc' as const },
    include: {
      job: {
        include: {
          tasks: {
            orderBy: { createdAt: 'asc' as const },
          },
        },
      },
    },
  },
} as const;
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
    include: {
      job: true,
    },
  },
  // Include ALL jobs to get the latest job status (including pending ones without versions)
  jobs: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      status: true,
      createdAt: true,
    },
  },
} as const;

// Include for document with all evaluations (for sidebar)
export const documentWithEvaluations = {
  submittedById: true, // Include owner info for permission checks
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
      documentVersion: {
        select: {
          version: true,
        },
      },
      comments: {
        select: {
          id: true,
          description: true,
          evaluationVersionId: true,
          grade: true,
          importance: true,
          highlightId: true,
          header: true,
          level: true,
          source: true,
          metadata: true,
          highlight: {
            select: {
              id: true,
              startOffset: true,
              endOffset: true,
              prefix: true,
              quotedText: true,
              isValid: true,
              error: true,
            },
          },
        },
      },
    },
  },
  // Include ALL jobs to get the latest job status (including pending ones without versions)
  jobs: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      status: true,
      createdAt: true,
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
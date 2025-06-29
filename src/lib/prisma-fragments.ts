// Reusable Prisma query fragments to ensure consistency across queries

export const evaluationWithGradeInclude = {
  agent: {
    include: {
      versions: {
        orderBy: { version: 'desc' as const },
        take: 1,
      },
    },
  },
  versions: {
    orderBy: { version: 'desc' as const },
    take: 1,
  },
} as const;

export const documentWithEvaluationsInclude = {
  versions: {
    orderBy: { version: 'desc' as const },
    take: 1,
  },
  evaluations: {
    include: evaluationWithGradeInclude,
  },
} as const;

export const fullEvaluationInclude = {
  agent: {
    include: {
      versions: {
        orderBy: { version: 'desc' as const },
        take: 1,
      },
    },
  },
  document: {
    include: documentWithEvaluationsInclude,
  },
  versions: {
    orderBy: { version: 'desc' as const },
    include: {
      job: true,
    },
  },
} as const;
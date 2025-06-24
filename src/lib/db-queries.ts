import { prisma } from "./prisma";

/**
 * Common database query patterns extracted for reuse
 */

/**
 * Get the latest version of an agent
 */
export async function getLatestAgentVersion(agentId: string) {
  return prisma.agentVersion.findFirst({
    where: { agentId },
    orderBy: { version: "desc" },
  });
}

/**
 * Get the latest version of a document
 */
export async function getLatestDocumentVersion(documentId: string) {
  return prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { version: "desc" },
  });
}

/**
 * Get agent with latest version included
 */
export async function getAgentWithLatestVersion(agentId: string) {
  return prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      submittedBy: true,
    },
  });
}

/**
 * Get document with latest version included
 */
export async function getDocumentWithLatestVersion(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      submittedBy: true,
    },
  });
}

/**
 * Check if user owns an agent
 */
export async function isAgentOwner(agentId: string, userId: string): Promise<boolean> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { submittedById: true },
  });
  
  return agent?.submittedById === userId;
}

/**
 * Check if user owns a document
 */
export async function isDocumentOwner(documentId: string, userId: string): Promise<boolean> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { submittedById: true },
  });
  
  return document?.submittedById === userId;
}

/**
 * Get active agents (non-archived)
 */
export async function getActiveAgents(limit = 10) {
  return prisma.agent.findMany({
    where: { archived: false },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      _count: {
        select: { evaluations: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get recent evaluations for an agent
 */
export async function getRecentAgentEvaluations(agentId: string, limit = 20) {
  return prisma.evaluationVersion.findMany({
    where: { agentId },
    include: {
      job: true,
      documentVersion: {
        include: {
          document: {
            select: {
              id: true,
              slug: true,
            },
          },
        },
      },
      agentVersion: {
        select: {
          version: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
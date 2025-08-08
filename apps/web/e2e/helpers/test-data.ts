/**
 * Test data helpers for Playwright E2E tests
 * 
 * These helpers create and clean up test data in the database
 * for E2E testing of pages.
 */

import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';

export interface TestData {
  userId: string;
  docId: string;
  docVersionId: string;
  agentId: string;
  agentVersionId: string;
  evaluationId: string;
  jobId: string;
  evalVersionId: string;
}

/**
 * Creates a complete test scenario with user, document, agent, evaluation, job, and version
 * This is specifically for testing the versions page with decimal serialization
 */
export async function createVersionsPageTestData(): Promise<TestData> {
  const userId = `e2e_user_${nanoid(8)}`;
  const docId = `e2e_doc_${nanoid(8)}`;
  const agentId = `e2e_agent_${nanoid(8)}`;
  const evaluationId = `e2e_eval_${nanoid(8)}`;
  const jobId = `e2e_job_${nanoid(8)}`;

  // Create user
  await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@e2e-test.com`,
    },
  });

  // Create document with version
  const doc = await prisma.document.create({
    data: {
      id: docId,
      publishedDate: new Date(),
      submittedById: userId,
      versions: {
        create: {
          version: 1,
          title: 'E2E Test Document for Versions Page',
          content: 'This document tests decimal serialization in the versions page.',
          authors: ['E2E Test Author'],
        },
      },
    },
    include: { versions: true },
  });
  const docVersionId = doc.versions[0].id;

  // Create agent with version
  const agent = await prisma.agent.create({
    data: {
      id: agentId,
      submittedById: userId,
      versions: {
        create: {
          version: 1,
          name: 'E2E Test Agent',
          description: 'Agent for E2E testing of versions page',
          primaryInstructions: 'Test the decimal serialization',
        },
      },
    },
    include: { versions: true },
  });
  const agentVersionId = agent.versions[0].id;

  // Create evaluation
  await prisma.evaluation.create({
    data: {
      id: evaluationId,
      documentId: docId,
      agentId: agentId,
    },
  });

  // Create job with specific decimal values that previously caused issues
  await prisma.job.create({
    data: {
      id: jobId,
      status: 'COMPLETED',
      evaluationId: evaluationId,
      priceInDollars: 12.456789,  // This decimal value caused the bug
      durationInSeconds: 180,      // 3 minutes
      llmThinking: 'E2E test thinking process',
    },
  });

  // Create evaluation version (without comments for simplicity)
  const evalVersion = await prisma.evaluationVersion.create({
    data: {
      evaluationId: evaluationId,
      version: 1,
      agentId: agentId,
      agentVersionId: agentVersionId,
      documentVersionId: docVersionId,
      job: {
        connect: { id: jobId }
      },
      summary: 'E2E Test Evaluation Summary',
      analysis: '## E2E Test Analysis\n\nThis evaluation tests decimal field handling.',
      selfCritique: 'E2E self-critique for testing',
      grade: 85,
      // Comments would require creating Highlight records first, skipping for now
    },
  });

  // Create additional versions to test version navigation
  const job2Id = `e2e_job2_${nanoid(8)}`;
  await prisma.job.create({
    data: {
      id: job2Id,
      status: 'COMPLETED',
      evaluationId: evaluationId,
      priceInDollars: 8.99,
      durationInSeconds: 45,
    },
  });

  await prisma.evaluationVersion.create({
    data: {
      evaluationId: evaluationId,
      version: 2,
      agentId: agentId,
      agentVersionId: agentVersionId,
      documentVersionId: docVersionId,
      job: {
        connect: { id: job2Id }
      },
      summary: 'Second version for E2E testing',
      analysis: 'Second version analysis',
    },
  });

  return {
    userId,
    docId,
    docVersionId,
    agentId,
    agentVersionId,
    evaluationId,
    jobId,
    evalVersionId: evalVersion.id,
  };
}

/**
 * Cleans up all test data created by createVersionsPageTestData
 */
export async function cleanupVersionsPageTestData(data: TestData): Promise<void> {
  // Clean up in reverse order of dependencies
  try {
    // Delete all comments for this evaluation's versions
    await prisma.evaluationComment.deleteMany({
      where: { 
        evaluationVersion: {
          evaluationId: data.evaluationId
        }
      },
    });

    // Delete all evaluation versions for this evaluation
    await prisma.evaluationVersion.deleteMany({
      where: { evaluationId: data.evaluationId },
    });

    // Delete all jobs for this evaluation
    await prisma.job.deleteMany({
      where: { evaluationId: data.evaluationId },
    });

    // Delete evaluation
    await prisma.evaluation.deleteMany({
      where: { id: data.evaluationId },
    });

    // Delete agent versions and agent
    await prisma.agentVersion.deleteMany({
      where: { agentId: data.agentId },
    });
    await prisma.agent.deleteMany({
      where: { id: data.agentId },
    });

    // Delete document versions and document
    await prisma.documentVersion.deleteMany({
      where: { documentId: data.docId },
    });
    await prisma.document.deleteMany({
      where: { id: data.docId },
    });

    // Delete user
    await prisma.user.deleteMany({
      where: { id: data.userId },
    });
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}
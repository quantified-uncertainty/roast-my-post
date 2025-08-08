/**
 * Shared utilities for page integration testing
 * 
 * These utilities help create consistent integration tests for Next.js pages
 * that need to fetch data from the database and render without errors.
 */

import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
import ReactDOMServer from 'react-dom/server';

export interface TestData {
  userId: string;
  docId: string;
  docVersionId?: string;
  agentId: string;
  agentVersionId?: string;
  evaluationId: string;
  jobId: string;
  versionNumber: number;
  trackingId?: string;
  batchId?: string;
}

/**
 * Creates a complete test scenario with user, document, agent, evaluation, and job
 * This provides all the data needed for most page tests
 */
export async function createCompleteTestData(): Promise<TestData> {
  const userId = `test_user_${nanoid(8)}`;
  const docId = `test_doc_${nanoid(8)}`;
  const agentId = `test_agent_${nanoid(8)}`;
  const evaluationId = `test_eval_${nanoid(8)}`;
  const jobId = `test_job_${nanoid(8)}`;
  const trackingId = `test_exp_${nanoid(8)}`;
  const batchId = `test_batch_${nanoid(8)}`;

  // Create user
  await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@test.com`,
    },
  });

  // Create document with version
  const document = await prisma.document.create({
    data: {
      id: docId,
      publishedDate: new Date(),
      submittedById: userId,
      versions: {
        create: {
          version: 1,
          title: 'Test Document',
          content: 'Test content for integration testing. '.repeat(10),
          authors: ['Test Author'],
        },
      },
    },
    include: {
      versions: true,
    },
  });
  const docVersionId = document.versions[0].id;

  // Create agent with version
  const agent = await prisma.agent.create({
    data: {
      id: agentId,
      submittedById: userId,
      versions: {
        create: {
          version: 1,
          name: 'Test Agent',
          description: 'Test agent for integration testing',
          primaryInstructions: 'Test instructions for the agent',
        },
      },
    },
    include: {
      versions: true,
    },
  });
  const agentVersionId = agent.versions[0].id;

  // Create batch for experiments
  await prisma.agentEvalBatch.create({
    data: {
      id: batchId,
      agentId: agentId,
      userId: userId,
      trackingId: trackingId,
      description: 'Test batch',
      isEphemeral: false,
    },
  });

  // Create evaluation
  await prisma.evaluation.create({
    data: {
      id: evaluationId,
      documentId: docId,
      agentId: agentId,
    },
  });

  // Create job with Decimal fields
  await prisma.job.create({
    data: {
      id: jobId,
      status: 'COMPLETED',
      evaluationId: evaluationId,
      priceInDollars: 15.123456,  // Decimal field
      durationInSeconds: 120,      // Int field
      llmThinking: 'Test LLM thinking process',
      logs: 'Test job logs',
    },
  });

  // Create evaluation version
  await prisma.evaluationVersion.create({
    data: {
      evaluationId: evaluationId,
      version: 1,
      agentId: agentId,
      agentVersionId: agentVersionId,
      documentVersionId: docVersionId,
      job: {
        connect: { id: jobId }
      },
      summary: 'Test evaluation summary',
      analysis: '## Test Analysis\n\nThis is test analysis content.',
      selfCritique: 'Test self-critique content',
      grade: 85,
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
    versionNumber: 1,
    trackingId,
    batchId,
  };
}

/**
 * Cleans up all test data created by createCompleteTestData
 */
export async function cleanupTestData(data: TestData): Promise<void> {
  // Delete in reverse order of dependencies
  try {
    await prisma.evaluationVersion.deleteMany({
      where: { evaluationId: data.evaluationId },
    });
  } catch {}

  try {
    await prisma.job.deleteMany({
      where: { evaluationId: data.evaluationId },
    });
  } catch {}

  try {
    await prisma.evaluation.deleteMany({
      where: { id: data.evaluationId },
    });
  } catch {}

  try {
    await prisma.agentEvalBatch.deleteMany({
      where: { id: data.batchId },
    });
  } catch {}

  try {
    await prisma.agentVersion.deleteMany({
      where: { agentId: data.agentId },
    });
  } catch {}

  try {
    await prisma.agent.deleteMany({
      where: { id: data.agentId },
    });
  } catch {}

  try {
    await prisma.documentVersion.deleteMany({
      where: { documentId: data.docId },
    });
  } catch {}

  try {
    await prisma.document.deleteMany({
      where: { id: data.docId },
    });
  } catch {}

  try {
    await prisma.user.deleteMany({
      where: { id: data.userId },
    });
  } catch {}
}

/**
 * Tests a page component with the given parameters
 */
export async function testPageRenders(
  PageComponent: any,
  params: any,
  checks?: (html: string) => void
): Promise<void> {
  // Call the page component
  const pageResult = await PageComponent({
    params: Promise.resolve(params),
  });

  // Should return valid JSX
  expect(pageResult).toBeDefined();
  expect(pageResult.type).toBeDefined();

  // Should render to HTML without throwing
  const html = ReactDOMServer.renderToString(pageResult);
  expect(html).toBeTruthy();
  expect(html.length).toBeGreaterThan(100);

  // Common checks for all pages
  expect(html).not.toContain('[object Object]'); // No unserialized objects
  expect(html).not.toContain('NaN');              // No NaN values
  expect(html).not.toContain('undefined');        // No undefined values shown

  // Run custom checks if provided
  if (checks) {
    checks(html);
  }
}

/**
 * Creates additional test data for specific scenarios
 */
export async function createAdditionalJobs(
  evaluationId: string,
  count: number = 3
): Promise<string[]> {
  const jobIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const jobId = `test_job_${nanoid(8)}`;
    await prisma.job.create({
      data: {
        id: jobId,
        status: i === 0 ? 'PENDING' : i === 1 ? 'RUNNING' : 'COMPLETED',
        evaluationId: evaluationId,
        priceInDollars: Math.random() * 20,
        durationInSeconds: Math.floor(Math.random() * 300),
      },
    });
    jobIds.push(jobId);
  }

  return jobIds;
}

/**
 * Creates additional evaluations for a document
 */
export async function createAdditionalEvaluations(
  docId: string,
  agentId: string,
  count: number = 2,
  docVersionId?: string,
  agentVersionId?: string
): Promise<string[]> {
  const evalIds: string[] = [];

  // Get version IDs if not provided
  if (!docVersionId) {
    const docVersion = await prisma.documentVersion.findFirst({
      where: { documentId: docId },
      orderBy: { version: 'desc' },
    });
    docVersionId = docVersion?.id;
  }
  
  if (!agentVersionId) {
    const agentVersion = await prisma.agentVersion.findFirst({
      where: { agentId: agentId },
      orderBy: { version: 'desc' },
    });
    agentVersionId = agentVersion?.id;
  }

  if (!docVersionId || !agentVersionId) {
    throw new Error('Could not find document or agent version');
  }

  for (let i = 0; i < count; i++) {
    const evalId = `test_eval_${nanoid(8)}`;
    const jobId = `test_job_${nanoid(8)}`;

    await prisma.evaluation.create({
      data: {
        id: evalId,
        documentId: docId,
        agentId: agentId,
      },
    });

    await prisma.job.create({
      data: {
        id: jobId,
        status: 'COMPLETED',
        evaluationId: evalId,
        priceInDollars: 10 + i * 5,
        durationInSeconds: 60 + i * 30,
      },
    });

    await prisma.evaluationVersion.create({
      data: {
        evaluationId: evalId,
        version: 1,
        agentId: agentId,
        agentVersionId: agentVersionId,
        documentVersionId: docVersionId,
        job: {
          connect: { id: jobId }
        },
        summary: `Additional evaluation ${i + 1}`,
        analysis: `Analysis for evaluation ${i + 1}`,
        grade: 70 + i * 10,
      },
    });

    evalIds.push(evalId);
  }

  return evalIds;
}

/**
 * Skip test in CI unless database is available
 */
export const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;
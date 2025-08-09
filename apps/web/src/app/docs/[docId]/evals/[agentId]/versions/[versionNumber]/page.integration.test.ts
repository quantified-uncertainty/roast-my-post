/**
 * Integration tests for EvaluationVersionPage
 * 
 * These tests ensure that the page properly handles data from the database,
 * especially Decimal fields that need serialization.
 */

import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
import EvaluationVersionPage from './page';
import ReactDOMServer from 'react-dom/server';

// Skip in CI unless database is available
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('EvaluationVersionPage Integration', () => {
  let testUserId: string;
  let testUser: any;
  let testDocId: string;
  let testDocVersionId: string;
  let testAgentId: string;
  let testAgentVersionId: string;
  let testEvaluationId: string;

  beforeAll(async () => {
    // Create test user
    testUserId = `test_user_${nanoid(8)}`;
    testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@test.com`,
      },
    });

    // Create test document
    testDocId = `test_doc_${nanoid(8)}`;
    const testDoc = await prisma.document.create({
      data: {
        id: testDocId,
        publishedDate: new Date(),
        submittedById: testUserId,
      },
    });

    const docVersion = await prisma.documentVersion.create({
      data: {
        documentId: testDocId,
        version: 1,
        title: 'Test Document for Version Page',
        content: 'This is test content for the version page integration test.',
        authors: ['Test Author'],
      },
    });
    testDocVersionId = docVersion.id;

    // Create test agent
    testAgentId = `test_agent_${nanoid(8)}`;
    const testAgent = await prisma.agent.create({
      data: {
        id: testAgentId,
        submittedById: testUserId,
      },
    });

    const agentVersion = await prisma.agentVersion.create({
      data: {
        agentId: testAgentId,
        version: 1,
        name: 'Test Agent',
        description: 'Test agent for integration testing',
        primaryInstructions: 'Test instructions',
      },
    });
    testAgentVersionId = agentVersion.id;

    // Create evaluation
    testEvaluationId = `test_eval_${nanoid(8)}`;
    const testEvaluation = await prisma.evaluation.create({
      data: {
        id: testEvaluationId,
        documentId: testDocId,
        agentId: testAgentId,
      },
    });

    // Create job with Decimal fields (this is where the bug was)
    const testJobId = `test_job_${nanoid(8)}`;
    const testJob = await prisma.job.create({
      data: {
        id: testJobId,
        status: 'COMPLETED',
        evaluationId: testEvaluationId,
        // These Decimal fields caused the serialization issue
        priceInDollars: 12.456789,  // Will be stored as Decimal(10,6)
        durationInSeconds: 180,      // Int field
        llmThinking: 'Test thinking process',
      },
    });

    // Create evaluation version
    await prisma.evaluationVersion.create({
      data: {
        evaluationId: testEvaluationId,
        version: 1,
        agentId: testAgentId,
        agentVersionId: testAgentVersionId,
        documentVersionId: testDocVersionId,
        job: {
          connect: { id: testJobId }
        },
        summary: 'Test evaluation summary',
        analysis: '## Test Analysis\n\nThis is a test analysis.',
        selfCritique: 'Test self-critique',
        grade: 85,
      },
    });

    // Create additional versions to test version navigation
    const testJob2Id = `test_job2_${nanoid(8)}`;
    await prisma.job.create({
      data: {
        id: testJob2Id,
        status: 'COMPLETED',
        evaluationId: testEvaluationId,
        priceInDollars: 8.99,
        durationInSeconds: 45,
      },
    });

    await prisma.evaluationVersion.create({
      data: {
        evaluationId: testEvaluationId,
        version: 2,
        agentId: testAgentId,
        agentVersionId: testAgentVersionId,
        documentVersionId: testDocVersionId,
        job: {
          connect: { id: testJob2Id }
        },
        summary: 'Second version summary',
        analysis: 'Second version analysis',
      },
    });
  });

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    await prisma.evaluationVersion.deleteMany({
      where: { evaluationId: testEvaluationId },
    });
    await prisma.job.deleteMany({
      where: { evaluationId: testEvaluationId },
    });
    await prisma.evaluation.delete({
      where: { id: testEvaluationId },
    });
    await prisma.agentVersion.deleteMany({
      where: { agentId: testAgentId },
    });
    await prisma.agent.delete({
      where: { id: testAgentId },
    });
    await prisma.documentVersion.deleteMany({
      where: { documentId: testDocId },
    });
    await prisma.document.delete({
      where: { id: testDocId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  it('should render version 1 without errors', async () => {
    const params = {
      docId: testDocId,
      agentId: testAgentId,
      versionNumber: '1',
    };

    // Call the actual page component - it will fetch its own data
    const pageResult = await EvaluationVersionPage({ 
      params: Promise.resolve(params) 
    });

    // Should return valid JSX
    expect(pageResult).toBeDefined();
    expect(pageResult.type).toBeDefined();

    // Should render to HTML without throwing
    const html = ReactDOMServer.renderToString(pageResult);
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(100);
  });

  it('should properly handle Decimal fields in job data', async () => {
    const params = {
      docId: testDocId,
      agentId: testAgentId,
      versionNumber: '1',
    };

    const pageResult = await EvaluationVersionPage({ 
      params: Promise.resolve(params) 
    });

    // Render to HTML
    const html = ReactDOMServer.renderToString(pageResult);

    // Check that Decimal fields are properly serialized
    // Should NOT contain [object Object] which would indicate unserialized Decimal
    expect(html).not.toContain('[object Object]');
    
    // Should contain the cost formatted correctly ($12.457)
    expect(html).toContain('$12.457');
    
    // Should contain duration (180s = 3m 0s)
    expect(html).toMatch(/3m\s+0s|180s/);
    
    // Should not have NaN anywhere
    expect(html).not.toContain('NaN');
  });

  it('should render version 2 without errors', async () => {
    const params = {
      docId: testDocId,
      agentId: testAgentId,
      versionNumber: '2',
    };

    const pageResult = await EvaluationVersionPage({ 
      params: Promise.resolve(params) 
    });

    const html = ReactDOMServer.renderToString(pageResult);
    expect(html).toBeTruthy();
    expect(html).toContain('Second version summary');
  });

  it('should handle version with zero duration correctly', async () => {
    // Create a job with 0 duration
    const zeroJobId = `test_job_zero_${nanoid(8)}`;
    await prisma.job.create({
      data: {
        id: zeroJobId,
        status: 'COMPLETED',
        evaluationId: testEvaluationId,
        priceInDollars: 5.00,
        durationInSeconds: 0,  // Edge case: zero duration
      },
    });

    await prisma.evaluationVersion.create({
      data: {
        evaluationId: testEvaluationId,
        version: 3,
        agentId: testAgentId,
        agentVersionId: testAgentVersionId,
        documentVersionId: testDocVersionId,
        job: {
          connect: { id: zeroJobId }
        },
        summary: 'Zero duration test',
        analysis: 'Testing zero duration',
      },
    });

    const params = {
      docId: testDocId,
      agentId: testAgentId,
      versionNumber: '3',
    };

    const pageResult = await EvaluationVersionPage({ 
      params: Promise.resolve(params) 
    });

    const html = ReactDOMServer.renderToString(pageResult);
    expect(html).toBeTruthy();
    expect(html).toContain('0s');  // Should show "0s" for zero duration
    expect(html).not.toContain('NaN');

    // Cleanup
    await prisma.evaluationVersion.delete({
      where: {
        evaluationId_version: {
          evaluationId: testEvaluationId,
          version: 3,
        },
      },
    });
    await prisma.job.delete({
      where: { id: zeroJobId },
    });
  });

  it('should return 404 for non-existent version', async () => {
    const params = {
      docId: testDocId,
      agentId: testAgentId,
      versionNumber: '999',  // Non-existent version
    };

    // This should call notFound() internally
    await expect(async () => {
      await EvaluationVersionPage({ 
        params: Promise.resolve(params) 
      });
    }).rejects.toThrow();  // notFound() throws an error in test environment
  });

  it('should handle missing job data gracefully', async () => {
    // Create version without job
    await prisma.evaluationVersion.create({
      data: {
        evaluationId: testEvaluationId,
        version: 4,
        agentId: testAgentId,
        agentVersionId: testAgentVersionId,
        documentVersionId: testDocVersionId,
        // No job associated
        summary: 'No job test',
        analysis: 'Testing without job data',
      },
    });

    const params = {
      docId: testDocId,
      agentId: testAgentId,
      versionNumber: '4',
    };

    const pageResult = await EvaluationVersionPage({ 
      params: Promise.resolve(params) 
    });

    const html = ReactDOMServer.renderToString(pageResult);
    expect(html).toBeTruthy();
    expect(html).toContain('No job test');
    // Should not show cost or duration sections
    expect(html).not.toContain('Run Statistics');

    // Cleanup
    await prisma.evaluationVersion.delete({
      where: {
        evaluationId_version: {
          evaluationId: testEvaluationId,
          version: 4,
        },
      },
    });
  });
});
/**
 * Integration test for agent detail page
 */

import AgentPage from './page';
import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
import {
  createCompleteTestData,
  cleanupTestData,
  testPageRenders,
  describeIfDb,
  TestData,
} from '@/__tests__/pages/page-test-utils';

describeIfDb('AgentPage (/agents/[agentId]) Integration', () => {
  let testData: TestData;
  let additionalDocIds: string[] = [];

  beforeAll(async () => {
    testData = await createCompleteTestData();
    
    // Create additional documents with evaluations for this agent
    for (let i = 0; i < 2; i++) {
      const docId = `test_doc_${nanoid(8)}`;
      const evalId = `test_eval_${nanoid(8)}`;
      const jobId = `test_job_${nanoid(8)}`;
      
      const doc = await prisma.document.create({
        data: {
          id: docId,
          publishedDate: new Date(),
          submittedById: testData.userId,
          versions: {
            create: {
              version: 1,
              title: `Additional Document ${i + 1}`,
              content: 'Additional content for testing',
              authors: ['Test Author'],
            },
          },
        },
        include: { versions: true },
      });
      const docVersionId = doc.versions[0].id;
      
      await prisma.evaluation.create({
        data: {
          id: evalId,
          documentId: docId,
          agentId: testData.agentId,
        },
      });
      
      await prisma.job.create({
        data: {
          id: jobId,
          status: 'COMPLETED',
          evaluationId: evalId,
          priceInDollars: 8.50 + i * 2,
          durationInSeconds: 90 + i * 30,
        },
      });
      
      await prisma.evaluationVersion.create({
        data: {
          evaluationId: evalId,
          version: 1,
          agentId: testData.agentId,
          agentVersionId: testData.agentVersionId!,
          documentVersionId: docVersionId,
          job: {
            connect: { id: jobId }
          },
          summary: `Evaluation for doc ${i + 1}`,
          analysis: 'Test analysis',
          grade: 75 + i * 5,
        },
      });
      
      additionalDocIds.push(docId);
    }
  });

  afterAll(async () => {
    // Clean up additional documents and their evaluations
    for (const docId of additionalDocIds) {
      const evals = await prisma.evaluation.findMany({
        where: { documentId: docId },
      });
      for (const evaluation of evals) {
        await prisma.evaluationVersion.deleteMany({
          where: { evaluationId: evaluation.id },
        });
        await prisma.job.deleteMany({
          where: { evaluationId: evaluation.id },
        });
        await prisma.evaluation.delete({
          where: { id: evaluation.id },
        });
      }
      await prisma.documentVersion.deleteMany({
        where: { documentId: docId },
      });
      await prisma.document.delete({
        where: { id: docId },
      });
    }
    await cleanupTestData(testData);
  });

  it('should render agent page with evaluation statistics', async () => {
    const params = {
      agentId: testData.agentId,
    };

    await testPageRenders(AgentPage, params, (html) => {
      // Check agent info
      expect(html).toContain('Test Agent');
      expect(html).toContain('Test agent for integration testing');
      
      // Should show multiple evaluated documents
      expect(html).toContain('Test Document');
      expect(html).toContain('Additional Document 1');
      expect(html).toContain('Additional Document 2');
      
      // Check for aggregated stats (3 evaluations total)
      expect(html).toMatch(/3/); // Total evaluations count
    });
  });

  it('should handle non-existent agent', async () => {
    const params = {
      agentId: 'non-existent-agent',
    };

    await expect(async () => {
      await AgentPage({ params: Promise.resolve(params) });
    }).rejects.toThrow();
  });
});
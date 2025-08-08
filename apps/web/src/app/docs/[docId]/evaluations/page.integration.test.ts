/**
 * Integration test for document evaluations list page
 */

import DocumentEvaluationsPage from './page';
import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
import {
  createCompleteTestData,
  cleanupTestData,
  testPageRenders,
  describeIfDb,
  TestData,
} from '@/__tests__/pages/page-test-utils';

describeIfDb('DocumentEvaluationsPage (/docs/[docId]/evaluations) Integration', () => {
  let testData: TestData;
  let additionalAgentIds: string[] = [];
  let additionalEvalIds: string[] = [];

  beforeAll(async () => {
    testData = await createCompleteTestData();
    
    // Create additional agents with evaluations for this document
    for (let i = 0; i < 2; i++) {
      const agentId = `eval_agent_${nanoid(8)}`;
      const evalId = `doc_eval_${nanoid(8)}`;
      const jobId = `doc_job_${nanoid(8)}`;
      
      await prisma.agent.create({
        data: {
          id: agentId,
          submittedById: testData.userId,
          versions: {
            create: {
              version: 1,
              name: `Evaluation Agent ${i + 1}`,
              description: `Agent ${i + 1} for document evaluations`,
              primaryInstructions: 'Test instructions',
            },
          },
        },
      });
      
      await prisma.evaluation.create({
        data: {
          id: evalId,
          documentId: testData.docId,
          agentId: agentId,
        },
      });
      
      await prisma.job.create({
        data: {
          id: jobId,
          status: 'COMPLETED',
          evaluationId: evalId,
          priceInDollars: 12.75 + i * 5.25,
          durationInSeconds: 180 + i * 60,
        },
      });
      
      // Get agent version
      const agentVersion = await prisma.agentVersion.findFirst({
        where: { agentId: agentId },
        orderBy: { version: 'desc' },
      });
      
      await prisma.evaluationVersion.create({
        data: {
          evaluationId: evalId,
          version: 1,
          agentId: agentId,
          agentVersionId: agentVersion!.id,
          documentVersionId: testData.docVersionId!,
          job: {
            connect: { id: jobId }
          },
          summary: `Evaluation by agent ${i + 1}`,
          analysis: `Analysis from agent ${i + 1}`,
          grade: 70 + i * 10,
        },
      });
      
      additionalAgentIds.push(agentId);
      additionalEvalIds.push(evalId);
    }
  });

  afterAll(async () => {
    // Clean up additional evaluations and agents
    for (const evalId of additionalEvalIds) {
      await prisma.evaluationVersion.deleteMany({
        where: { evaluationId: evalId },
      });
      await prisma.job.deleteMany({
        where: { evaluationId: evalId },
      });
      await prisma.evaluation.delete({
        where: { id: evalId },
      });
    }
    for (const agentId of additionalAgentIds) {
      await prisma.agentVersion.deleteMany({
        where: { agentId: agentId },
      });
      await prisma.agent.delete({
        where: { id: agentId },
      });
    }
    await cleanupTestData(testData);
  });

  it('should render all evaluations for a document', async () => {
    const params = {
      docId: testData.docId,
    };

    await testPageRenders(DocumentEvaluationsPage, params, (html) => {
      // Check document title
      expect(html).toContain('Test Document');
      
      // Check all agents are listed
      expect(html).toContain('Test Agent');
      expect(html).toContain('Evaluation Agent 1');
      expect(html).toContain('Evaluation Agent 2');
      
      // Check evaluation summaries
      expect(html).toContain('Test evaluation summary');
      expect(html).toContain('Evaluation by agent 1');
      expect(html).toContain('Evaluation by agent 2');
      
      // Check grades
      expect(html).toContain('70');
      expect(html).toContain('80');
      expect(html).toContain('85');
      
      // Check costs are properly formatted
      expect(html).toMatch(/\$12\.75/);
      expect(html).toMatch(/\$18\.00/);
    });
  });

  it('should handle document with no evaluations', async () => {
    // Create a document without evaluations
    const emptyDocId = `empty_doc_${nanoid(8)}`;
    await prisma.document.create({
      data: {
        id: emptyDocId,
        publishedDate: new Date(),
        submittedById: testData.userId,
        versions: {
          create: {
            version: 1,
            title: 'Document Without Evaluations',
            content: 'This document has no evaluations',
            authors: ['Test Author'],
          },
        },
      },
    });

    const params = {
      docId: emptyDocId,
    };

    await testPageRenders(DocumentEvaluationsPage, params, (html) => {
      expect(html).toContain('Document Without Evaluations');
      // Should indicate no evaluations
      expect(html).toMatch(/no evaluations|not.*evaluated/i);
    });

    // Cleanup
    await prisma.documentVersion.deleteMany({
      where: { documentId: emptyDocId },
    });
    await prisma.document.delete({
      where: { id: emptyDocId },
    });
  });
});
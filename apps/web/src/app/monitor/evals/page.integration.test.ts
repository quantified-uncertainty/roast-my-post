/**
 * Integration test for monitor evaluations page
 */

import MonitorEvalsPage from './page';
import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
import {
  createCompleteTestData,
  cleanupTestData,
  testPageRenders,
  describeIfDb,
  TestData,
} from '@/__tests__/pages/page-test-utils';

describeIfDb('MonitorEvalsPage (/monitor/evals) Integration', () => {
  let testData: TestData;
  let additionalEvalIds: string[] = [];

  beforeAll(async () => {
    testData = await createCompleteTestData();
    
    // Create additional evaluations with different grades and costs
    for (let i = 0; i < 3; i++) {
      const evalId = `monitor_eval_${nanoid(8)}`;
      const jobId = `monitor_job_${nanoid(8)}`;
      
      await prisma.evaluation.create({
        data: {
          id: evalId,
          documentId: testData.docId,
          agentId: testData.agentId,
        },
      });
      
      await prisma.job.create({
        data: {
          id: jobId,
          status: 'COMPLETED',
          evaluationId: evalId,
          priceInDollars: 25.99 + i * 10.5, // Various decimal amounts
          durationInSeconds: 300 + i * 60,
        },
      });
      
      await prisma.evaluationVersion.create({
        data: {
          evaluationId: evalId,
          version: 1,
          agentId: testData.agentId,
          agentVersionId: testData.agentVersionId!,
          documentVersionId: testData.docVersionId!,
          job: {
            connect: { id: jobId }
          },
          summary: `Monitor evaluation ${i + 1}`,
          analysis: 'Test analysis for monitoring',
          grade: 60 + i * 15, // Various grades
        },
      });
      
      additionalEvalIds.push(evalId);
    }
  });

  afterAll(async () => {
    // Clean up additional evaluations
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
    await cleanupTestData(testData);
  });

  it('should render evaluations monitor page with statistics', async () => {
    await testPageRenders(MonitorEvalsPage, {}, (html) => {
      // Check for evaluation summaries
      expect(html).toContain('Test evaluation summary');
      expect(html).toContain('Monitor evaluation 1');
      expect(html).toContain('Monitor evaluation 2');
      expect(html).toContain('Monitor evaluation 3');
      
      // Check for grades
      expect(html).toContain('60');
      expect(html).toContain('75');
      expect(html).toContain('85');
      expect(html).toContain('90');
      
      // Check for costs (decimal handling)
      expect(html).toMatch(/\$25\.99/);
      expect(html).toMatch(/\$36\.49/);
      expect(html).toMatch(/\$46\.99/);
      
      // Check for agent names
      expect(html).toContain('Test Agent');
      
      // Check for document titles
      expect(html).toContain('Test Document');
    });
  });
});
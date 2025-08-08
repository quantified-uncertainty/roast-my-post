/**
 * Integration test for monitor jobs page
 */

import MonitorJobsPage from './page';
import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
import {
  createCompleteTestData,
  cleanupTestData,
  testPageRenders,
  createAdditionalJobs,
  describeIfDb,
  TestData,
} from '@/__tests__/pages/page-test-utils';

describeIfDb('MonitorJobsPage (/monitor/jobs) Integration', () => {
  let testData: TestData;
  let additionalJobIds: string[] = [];

  beforeAll(async () => {
    testData = await createCompleteTestData();
    
    // Create additional jobs with various statuses
    additionalJobIds = await createAdditionalJobs(testData.evaluationId, 5);
    
    // Create some failed jobs
    for (let i = 0; i < 2; i++) {
      const jobId = `failed_job_${nanoid(8)}`;
      await prisma.job.create({
        data: {
          id: jobId,
          status: 'FAILED',
          evaluationId: testData.evaluationId,
          priceInDollars: 2.50,
          durationInSeconds: 30,
          error: `Test error ${i + 1}`,
        },
      });
      additionalJobIds.push(jobId);
    }
  });

  afterAll(async () => {
    // Clean up additional jobs
    for (const jobId of additionalJobIds) {
      await prisma.job.delete({
        where: { id: jobId },
      });
    }
    await cleanupTestData(testData);
  });

  it('should render jobs monitor page with various job statuses', async () => {
    await testPageRenders(MonitorJobsPage, {}, (html) => {
      // Check for job statuses
      expect(html).toContain('COMPLETED');
      expect(html).toContain('PENDING');
      expect(html).toContain('RUNNING');
      expect(html).toContain('FAILED');
      
      // Check for error messages
      expect(html).toContain('Test error');
      
      // Check for costs (decimal handling)
      expect(html).toMatch(/\$\d+\.\d+/);
      
      // Check for error messages
      expect(html).toContain('Test error');
    });
  });
});
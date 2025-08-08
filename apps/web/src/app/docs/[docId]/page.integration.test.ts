/**
 * Integration test for document detail page
 */

import DocumentPage from './page';
import { prisma } from '@roast/db';
import {
  createCompleteTestData,
  cleanupTestData,
  testPageRenders,
  createAdditionalEvaluations,
  describeIfDb,
  TestData,
} from '@/__tests__/pages/page-test-utils';

describeIfDb('DocumentPage (/docs/[docId]) Integration', () => {
  let testData: TestData;
  let additionalEvalIds: string[] = [];

  beforeAll(async () => {
    testData = await createCompleteTestData();
    // Create multiple evaluations to test aggregation
    additionalEvalIds = await createAdditionalEvaluations(
      testData.docId,
      testData.agentId,
      2
    );
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

  it('should render document with multiple evaluations', async () => {
    const params = {
      docId: testData.docId,
    };

    await testPageRenders(DocumentPage, params, (html) => {
      // Check document content
      expect(html).toContain('Test Document');
      expect(html).toContain('Test Author');
      
      // Should show multiple evaluations
      expect(html).toContain('Test Agent');
      expect(html).toContain('Test evaluation summary');
      
      // Check for additional evaluations
      expect(html).toContain('Additional evaluation 1');
      expect(html).toContain('Additional evaluation 2');
    });
  });

  it('should handle document not found', async () => {
    const params = {
      docId: 'non-existent-doc',
    };

    await expect(async () => {
      await DocumentPage({ params: Promise.resolve(params) });
    }).rejects.toThrow();
  });
});
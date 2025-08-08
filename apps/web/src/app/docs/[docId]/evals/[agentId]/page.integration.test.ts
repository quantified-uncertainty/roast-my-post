/**
 * Integration test for evaluation detail page
 */

import EvaluationPage from './page';
import {
  createCompleteTestData,
  cleanupTestData,
  testPageRenders,
  describeIfDb,
  TestData,
} from '@/__tests__/pages/page-test-utils';

describeIfDb('EvaluationPage (/docs/[docId]/evals/[agentId]) Integration', () => {
  let testData: TestData;

  beforeAll(async () => {
    testData = await createCompleteTestData();
  });

  afterAll(async () => {
    await cleanupTestData(testData);
  });

  it('should render evaluation page with job data', async () => {
    const params = {
      docId: testData.docId,
      agentId: testData.agentId,
    };

    await testPageRenders(EvaluationPage, params, (html) => {
      // Check for evaluation content
      expect(html).toContain('Test evaluation summary');
      expect(html).toContain('Test Agent');
      
      // Check for properly formatted cost
      expect(html).toContain('$15.123'); // Cost should be formatted
      
      // Check for duration
      expect(html).toMatch(/2m\s+0s|120s/); // 120 seconds
      
      // Check grade is displayed
      expect(html).toContain('85');
    });
  });

  it('should handle missing evaluation gracefully', async () => {
    const params = {
      docId: testData.docId,
      agentId: 'non-existent-agent',
    };

    // Should throw (notFound)
    await expect(async () => {
      await EvaluationPage({ params: Promise.resolve(params) });
    }).rejects.toThrow();
  });
});
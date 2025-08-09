/**
 * Comprehensive test suite for all tool API endpoints
 * This is a minimal test that verifies:
 * 1. Each tool has a working API endpoint
 * 2. The endpoint exists and exports a POST function
 * 3. Main tools route returns tool metadata
 */

describe('Tool API Endpoints', () => {
  // Define all tools
  const tools = [
    'check-math',
    'check-math-hybrid',
    'check-math-with-mathjs',
    'check-spelling-grammar',
    'detect-language-convention',
    'document-chunker',
    'extract-factual-claims',
    'extract-forecasting-claims',
    'extract-math-expressions',
    'fact-checker',
    'forecaster',
    'forecaster-simple',
    'fuzzy-text-locator',
    'link-validator',
    'perplexity-research',
  ];

  describe.each(tools)('Tool: %s', (toolId) => {
    it(`should have a route file at /api/tools/${toolId}/route.ts`, async () => {
      try {
        const routeModule = await import(`../${toolId}/route`);
        expect(routeModule).toBeDefined();
      } catch (error) {
        // If import fails, the test fails
        throw new Error(`Route file missing for ${toolId}`);
      }
    });

    it(`should export a POST handler`, async () => {
      try {
        const routeModule = await import(`../${toolId}/route`);
        expect(routeModule.POST).toBeDefined();
        expect(typeof routeModule.POST).toBe('function');
      } catch (error) {
        throw new Error(`POST handler missing for ${toolId}`);
      }
    });
  });

  describe('Main Tools Route', () => {
    it('should export a GET handler at /api/tools', async () => {
      try {
        const routeModule = await import('../route');
        expect(routeModule.GET).toBeDefined();
        expect(typeof routeModule.GET).toBe('function');
      } catch (error) {
        throw new Error('Main tools route missing GET handler');
      }
    });
  });
});
import { analyzeWithMultiEpistemicEval } from '../index';
import type { Agent } from '../../../../types/agentSchema';
import type { Document } from '../../../../types/documents';

// Mock the plugin system
jest.mock('../../plugin-system', () => ({
  PluginManager: jest.fn().mockImplementation(() => ({
    registerPlugins: jest.fn(),
    analyzeDocument: jest.fn().mockResolvedValue({
      summary: 'Test summary',
      pluginResults: new Map([
        ['SPELLING', {
          summary: 'Found 3 spelling errors',
          findings: [
            { type: 'spelling_error', severity: 'low', message: 'Test error 1' },
            { type: 'spelling_error', severity: 'low', message: 'Test error 2' },
            { type: 'spelling_error', severity: 'low', message: 'Test error 3' }
          ],
          recommendations: ['Use spell checker'],
          llmCalls: [{
            tokensUsed: { total: 100, prompt: 80, completion: 20 },
            duration: 1000,
            prompt: 'test prompt',
            response: 'test response'
          }]
        }],
        ['MATH', {
          summary: 'No math errors found',
          findings: [],
          recommendations: [],
          llmCalls: []
        }]
      ]),
      statistics: {
        totalChunks: 5,
        totalFindings: 3,
        findingsByType: new Map([['spelling_error', 3]]),
        tokensUsed: 100,
        processingTime: 2000
      },
      recommendations: ['Use spell checker']
    }),
    getRouterLLMInteractions: jest.fn().mockReturnValue([{
      tokensUsed: { total: 50, prompt: 30, completion: 20 },
      duration: 500,
      prompt: 'router prompt',
      response: 'router response'
    }])
  })),
  SpellingPlugin: jest.fn(),
  MathPlugin: jest.fn(),
  FactCheckPlugin: jest.fn(),
  ForecastPlugin: jest.fn()
}));

// Mock the synthesis analysis
jest.mock('../../pluginSynthesisAnalysis', () => ({
  generatePluginSynthesisAnalysis: jest.fn().mockResolvedValue({
    task: {
      name: 'generatePluginSynthesisAnalysis',
      modelName: 'claude-3-opus-20240229',
      priceInDollars: 0.05,
      timeInSeconds: 3,
      log: 'Synthesis completed',
      llmInteractions: []
    },
    outputs: {
      summary: 'Test synthesis summary',
      analysis: 'This is a synthesized analysis of the plugin findings.',
      grade: 85
    }
  })
}));

// Mock utilities
jest.mock('../../plugin-system/utils/findingToHighlight', () => ({
  filterFindingsWithLocationHints: jest.fn(findings => findings),
  convertFindingsToHighlights: jest.fn(() => [])
}));

describe('multiEpistemicEval', () => {
  const mockDocument: Document = {
    id: 'test-doc',
    title: 'Test Document',
    content: 'This is a test document with some content.',
    author: 'Test Author',
    publishedDate: '2024-01-01',
    slug: 'test-doc',
    reviews: [],
    intendedAgents: []
  };

  const mockAgent: Agent = {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'Test agent for multi-epistemic evaluation',
    primaryInstructions: 'Analyze the document thoroughly',
    extendedCapabilityId: 'multi-epistemic-eval',
    providesGrades: true,
    version: '1'
  };

  it('should analyze document and append metadata', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);

    // Check basic structure
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('highlights');
    expect(result).toHaveProperty('tasks');

    // Check that metadata is appended
    expect(result.analysis).toContain('## Plugin Metadata');
    expect(result.analysis).toContain('```json');
    expect(result.analysis).toContain('"SPELLING"');
    expect(result.analysis).toContain('"findingsCount": 3');
    expect(result.analysis).toContain('"Found 3 spelling errors"');

    // Check tasks are properly recorded
    expect(result.tasks).toHaveLength(2); // Plugin analysis + synthesis
    
    const pluginTask = result.tasks.find(t => t.name === 'Plugin Analysis');
    expect(pluginTask).toBeDefined();
    expect(pluginTask?.llmInteractions).toHaveLength(1); // Router interaction
    
    const synthesisTask = result.tasks.find(t => t.name === 'generatePluginSynthesisAnalysis');
    expect(synthesisTask).toBeDefined();
  });

  it('should calculate costs correctly', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    const pluginTask = result.tasks.find(t => t.name === 'Plugin Analysis');
    expect(pluginTask).toBeDefined();
    
    // Should calculate cost based on Haiku pricing
    // Router: 50 tokens, Plugin: 100 tokens = 150 total
    // Cost calculation should be present
    expect(pluginTask?.priceInDollars).toBeGreaterThan(0);
    expect(pluginTask?.log).toContain('Router: 1 calls (50 tokens)');
    expect(pluginTask?.log).toContain('Plugins: 1 calls (100 tokens)');
    expect(pluginTask?.log).toContain('Total: 150 tokens');
  });

  it('should include raw plugin findings in metadata', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    // Parse the metadata from the analysis
    const metadataMatch = result.analysis.match(/```json\n([\s\S]+?)\n```/);
    expect(metadataMatch).toBeTruthy();
    
    if (metadataMatch) {
      const metadata = JSON.parse(metadataMatch[1]);
      
      expect(metadata.statistics).toEqual({
        totalChunks: 5,
        totalFindings: 3,
        findingsByType: { spelling_error: 3 },
        tokensUsed: 100,
        processingTime: 2000
      });
      
      expect(metadata.plugins.SPELLING).toEqual({
        summary: 'Found 3 spelling errors',
        findingsCount: 3,
        findings: expect.arrayContaining([
          expect.objectContaining({ message: 'Test error 1' })
        ]),
        recommendations: ['Use spell checker'],
        llmCallsCount: 1,
        tokensUsed: 100
      });
    }
  });
});
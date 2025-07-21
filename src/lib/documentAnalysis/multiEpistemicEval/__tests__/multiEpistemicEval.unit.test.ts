import { analyzeWithMultiEpistemicEval } from '../index';
import type { Agent } from '../../../../types/agentSchema';
import type { Document } from '../../../../types/documents';

// Mock the plugin system
jest.mock('../../plugin-system', () => ({
  PluginManager: jest.fn().mockImplementation(() => ({
    analyzeDocumentSimple: jest.fn().mockResolvedValue({
      summary: 'Analyzed 5 sections with 2 plugins. Found 3 total issues.',
      analysis: '**Document Analysis Summary**\n\nThis document was analyzed by 2 specialized plugins that examined 5 sections.\n\n**SPELLING**: Found 3 spelling errors\n**MATH**: No math errors found',
      pluginResults: new Map([
        ['SPELLING', {
          summary: 'Found 3 spelling errors',
          analysis: 'Three spelling errors were detected in the document.',
          comments: [
            { 
              description: 'Test error 1',
              importance: 3,
              highlight: { 
                startOffset: 0, 
                endOffset: 10, 
                quotedText: 'Test error',
                startLine: 1,
                endLine: 1,
                isValid: true
              },
              isValid: true
            },
            { 
              description: 'Test error 2',
              importance: 3,
              highlight: { 
                startOffset: 11, 
                endOffset: 21, 
              quotedText: 'Test error',
              startLine: 1,
              endLine: 1,
              isValid: true
            },
            isValid: true
          },
          { 
            description: 'Test error 3',
            importance: 3,
            highlight: { 
              startOffset: 22, 
              endOffset: 32, 
              quotedText: 'Test error 2',
              startLine: 1,
              endLine: 1,
              isValid: true
            },
            isValid: true
          },
          { 
            description: 'Test error 3',
            importance: 3,
            highlight: { 
              startOffset: 22, 
              endOffset: 32, 
              quotedText: 'Test error 3',
              startLine: 2,
              endLine: 2,
              isValid: true
            },
            isValid: true
          }
        ],
        llmInteractions: [{
          messages: [
            { role: 'system', content: 'test system' },
            { role: 'user', content: 'test user' },
            { role: 'assistant', content: 'test response' }
          ],
          usage: { input_tokens: 80, output_tokens: 20 }
        }],
        cost: 0.0001
      }],
      ['MATH', {
        summary: 'No math errors found',
        analysis: '',
        comments: [],
        llmInteractions: [],
        cost: 0
      }]
    ]),
    allComments: [
      { 
        description: 'Test error 1',
        importance: 3,
        highlight: { 
          startOffset: 0, 
          endOffset: 10, 
          quotedText: 'Test error',
          startLine: 1,
          endLine: 1,
          isValid: true
        },
        isValid: true
      },
      { 
        description: 'Test error 2',
        importance: 3,
        highlight: { 
          startOffset: 11, 
          endOffset: 21, 
          quotedText: 'Test error 2',
          startLine: 1,
          endLine: 1,
          isValid: true
        },
        isValid: true
      },
      { 
        description: 'Test error 3',
        importance: 3,
        highlight: { 
          startOffset: 22, 
          endOffset: 32, 
          quotedText: 'Test error 3',
          startLine: 2,
          endLine: 2,
          isValid: true
        },
        isValid: true
      }
    ],
    statistics: {
      totalChunks: 5,
      totalComments: 3,
      commentsByPlugin: new Map([['SPELLING', 3], ['MATH', 0]]),
      totalCost: 0.0001,
      processingTime: 2000
    }
  })
  })),
  SpellingPlugin: jest.fn(),
  MathPlugin: jest.fn(),
  FactCheckPlugin: jest.fn(),
  ForecastPlugin: jest.fn(),
  SimpleAnalysisPlugin: {}
}));


// Mock document content helpers
jest.mock('../../../../utils/documentContentHelpers', () => ({
  getDocumentFullContent: jest.fn(doc => ({
    content: doc.content,
    prependLineCount: 0
  }))
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

  it('should analyze document with plugin system', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);

    // Check basic structure
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('highlights');
    expect(result).toHaveProperty('tasks');

    // Check analysis contains plugin summaries
    expect(result.analysis).toContain('Document Analysis Summary');
    expect(result.analysis).toContain('**SPELLING**');
    expect(result.analysis).toContain('Found 3 spelling errors');
    expect(result.analysis).toContain('**MATH**');
    expect(result.analysis).toContain('No math errors found');

    // Check highlights were collected from plugins
    expect(result.highlights).toHaveLength(3);
    expect(result.highlights[0].description).toBe('Test error 1');
    
    // Check tasks are properly recorded
    expect(result.tasks).toHaveLength(1); // Just Plugin analysis now
    
    const pluginTask = result.tasks.find(t => t.name === 'Plugin Analysis');
    expect(pluginTask).toBeDefined();
    expect(pluginTask?.llmInteractions).toHaveLength(1); // Router interaction
  });

  it('should calculate costs correctly', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    const pluginTask = result.tasks.find(t => t.name === 'Plugin Analysis');
    expect(pluginTask).toBeDefined();
    
    // Should calculate cost based on token usage
    expect(pluginTask?.priceInDollars).toBeGreaterThan(0);
    expect(pluginTask?.log).toContain('Analyzed 5 chunks');
    expect(pluginTask?.log).toContain('generated 3 comments');
    expect(pluginTask?.log).toContain('Router used 50 tokens in 1 routing calls');
  });

  it('should generate summary from plugin results', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    // Check summary includes plugin statistics
    expect(result.summary).toContain('3 issues across 5 sections');
    
    // Check analysis is properly structured
    expect(result.analysis).toContain('Document Analysis Summary');
    expect(result.analysis).toContain('2 specialized plugins');
    expect(result.analysis).toContain('SPELLING Analysis');
  });
});
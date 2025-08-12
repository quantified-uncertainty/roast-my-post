import { analyzeWithMultiEpistemicEval } from '../index';
import type { Agent } from '@roast/ai';
import type { Document } from '@roast/ai';

// Mock the plugin system
jest.mock('@roast/ai/server', () => ({
  PluginManager: jest.fn().mockImplementation(() => ({
    analyzeDocumentSimple: jest.fn().mockResolvedValue({
      summary: 'Analyzed 5 sections with 4 plugins. Found 3 total issues.',
      analysis: '**Document Analysis Summary**\n\nThis document was analyzed by 4 specialized plugins that examined 5 sections.\n\n**SPELLING**: Found 3 spelling errors\n**MATH**: No math errors found',
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
      totalChunks: 1,
      totalComments: 0,
      commentsByPlugin: new Map([['MATH', 0], ['FACT_CHECK', 0], ['FORECAST', 0]]),
      totalCost: 0.0001,
      processingTime: 2000
    }
  }),
  analyzeDocument: jest.fn().mockResolvedValue({
      thinking: "",
      analysis: '**Document Analysis Summary**\n\nThis document was analyzed by 3 specialized plugins that examined 1 sections.\n\n**MATH**: No relevant content found for this plugin\n**FACT_CHECK**: No relevant content found for this plugin\n**FORECAST**: No relevant content found for this plugin',
      summary: 'Analyzed 1 sections with 3 plugins. Found 0 total issues.',
      grade: undefined,
      highlights: [
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
      tasks: [{
        name: "Plugin Analysis",
        modelName: "claude-3-5-sonnet-20241022",
        priceInDollars: 0.0001,
        timeInSeconds: 2,
        log: "Analyzed 1 chunks, generated 0 comments using 3 plugins.",
        llmInteractions: [{
          messages: [
            { role: 'user', content: 'test prompt' },
            { role: 'assistant', content: 'test response' }
          ],
          usage: { input_tokens: 50, output_tokens: 20 }
        }]
      }]
    })
  })),
  SpellingPlugin: jest.fn(),
  MathPlugin: jest.fn(),
  FactCheckPlugin: jest.fn(),
  ForecastPlugin: jest.fn(),
  SimpleAnalysisPlugin: {}
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
    expect(result.analysis).toContain('**MATH**');
    expect(result.analysis).toContain('**FACT_CHECK**');
    expect(result.analysis).toContain('**FORECAST**');
    // Note: SPELLING plugin is excluded from multi-epistemic eval

    // Check highlights were collected from plugins
    // Since we're mocking analyzeDocument to return 3 highlights, expect 3
    expect(result.highlights).toHaveLength(3);
    expect((result.highlights[0] as any).description).toBe('Test error 1');
    
    // Check tasks are properly recorded
    expect(result.tasks).toHaveLength(1); // Just Plugin analysis now
    
    const pluginTask = result.tasks.find(t => t.name === 'Plugin Analysis');
    expect(pluginTask).toBeDefined();
  });

  it('should calculate costs correctly', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    const pluginTask = result.tasks.find(t => t.name === 'Plugin Analysis');
    expect(pluginTask).toBeDefined();
    
    // Should calculate cost based on token usage
    // The mock returns a task with priceInDollars
    expect(pluginTask?.priceInDollars).toBeDefined();
    expect(pluginTask?.priceInDollars).toBeGreaterThanOrEqual(0);
    expect(pluginTask?.log).toContain('Analyzed 1 chunks');
    expect(pluginTask?.log).toContain('generated 0 comments');
    expect(pluginTask?.log).toContain('using 3 plugins'); // SPELLING excluded
  });

  it('should generate summary from plugin results', async () => {
    const result = await analyzeWithMultiEpistemicEval(mockDocument, mockAgent);
    
    // Check summary includes plugin statistics
    // The summary format depends on actual plugin results
    expect(result.summary).toContain('Analyzed');
    expect(result.summary).toContain('sections');
    expect(result.summary).toContain('plugins');
    
    // Check analysis is properly structured
    expect(result.analysis).toContain('Document Analysis Summary');
    expect(result.analysis).toContain('3 specialized plugins');
    // SPELLING plugin is excluded from multi-epistemic eval
  });
});
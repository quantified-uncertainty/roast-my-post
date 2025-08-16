import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import type { Agent, Document } from '@roast/ai';
import { PluginType } from '../../../analysis-plugins/types/plugin-types';
import { analyzeDocument } from '../analyzeDocument';

// Mock the actual tool implementations to avoid API calls
jest.mock('../../../tools/check-spelling-grammar', () => ({
  checkSpellingGrammarTool: {
    execute: jest.fn().mockImplementation(async () => {
      return {
        errors: [
          {
            text: 'documnet',
            correction: 'document',
            type: 'spelling',
            importance: 85,
            confidence: 95,
            context: 'This documnet has varios',
            description: 'Misspelling of "document"'
          },
          {
            text: 'varios',
            correction: 'various',
            type: 'spelling',
            importance: 75,
            confidence: 90,
            context: 'documnet has varios speling',
            description: 'Misspelling of "various"'
          },
          {
            text: 'speling',
            correction: 'spelling',
            type: 'spelling',
            importance: 80,
            confidence: 95,
            context: 'varios speling errors',
            description: 'Misspelling of "spelling"'
          },
          {
            text: 'shoud',
            correction: 'should',
            type: 'spelling',
            importance: 85,
            confidence: 95,
            context: 'that shoud be catched',
            description: 'Misspelling of "should"'
          },
          {
            text: 'catched',
            correction: 'caught',
            type: 'grammar',
            importance: 70,
            confidence: 85,
            context: 'shoud be catched',
            description: 'Incorrect past participle - should be "caught"'
          },
          {
            text: 'Their',
            correction: 'There',
            type: 'grammar',
            importance: 75,
            confidence: 90,
            context: 'Their are also',
            description: 'Incorrect usage - should be "There"'
          },
          {
            text: 'doesnt',
            correction: "doesn't",
            type: 'spelling',
            importance: 60,
            confidence: 95,
            context: 'friend doesnt know',
            description: 'Missing apostrophe in contraction'
          },
          {
            text: 'Its',
            correction: "It's",
            type: 'grammar',
            importance: 65,
            confidence: 90,
            context: 'Its important too',
            description: 'Should be "It\'s" (contraction)'
          },
          {
            text: 'too',
            correction: 'to',
            type: 'grammar',
            importance: 70,
            confidence: 85,
            context: 'important too note',
            description: 'Should be "to" not "too"'
          },
          {
            text: 'heres',
            correction: "here's",
            type: 'spelling',
            importance: 60,
            confidence: 95,
            context: 'wrong heres an',
            description: 'Missing apostrophe in contraction'
          }
        ]
      };
    })
  }
}));

// Mock the other check-spelling-grammar exports
jest.mock('../../../tools/check-spelling-grammar/commentGeneration', () => ({
  generateDocumentSummary: jest.fn().mockReturnValue('Summary of spelling errors'),
  generateSpellingComment: jest.fn().mockImplementation((error) => `${error.text} → ${error.correction}`),
  SpellingErrorWithLocation: jest.fn()
}));

jest.mock('../../../tools/check-spelling-grammar/grading', () => ({
  calculateGrade: jest.fn().mockReturnValue({
    grade: 75,
    category: 'Fair',
    statistics: {
      errorsByType: { spelling: 7, grammar: 3 },
      errorsBySeverity: { critical: 0, major: 5, minor: 5 }
    }
  }),
  countWords: jest.fn().mockReturnValue(50)
}));

// Mock language convention detector
jest.mock('../../../tools/detect-language-convention/conventionDetector', () => ({
  detectLanguageConvention: jest.fn().mockReturnValue({
    convention: 'US',
    confidence: 0.9,
    consistency: 0.95
  }),
  getConventionExamples: jest.fn().mockReturnValue(['color', 'center'])
}));

// Mock the fuzzy text locator
jest.mock('../../../tools/fuzzy-text-locator/core', () => ({
  findTextLocation: jest.fn().mockImplementation((text, searchText) => {
    const index = text.indexOf(searchText);
    if (index === -1) return null;
    return {
      startOffset: index,
      endOffset: index + searchText.length,
      quotedText: searchText,
      confidence: 1.0
    };
  })
}));

describe('Spelling Plugin Mock Test', () => {
  const originalEnv = process.env;
  
  beforeAll(() => {
    // Set a dummy API key to bypass the check
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });
  
  afterAll(() => {
    // Restore environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });
  
  test('should detect spelling errors using mocked plugin workflow', async () => {
    
    const document: Document = {
      id: 'test-doc-1',
      slug: 'test-doc-1',
      title: 'Test Document',
      content: `# Test Document with Errors

This documnet has varios speling errors that shoud be catched.

Their are also grammer issues here. Me and my friend doesnt know proper english.

Its important too note that punctuation is also wrong heres an example.`,
      author: 'Test Author',
      publishedDate: new Date().toISOString(),
      url: '',
      platforms: [],
      reviews: [],
      intendedAgents: []
    };
    
    const agent: Agent = {
      id: 'test-agent-1',
      name: 'Spelling Test Agent',
      version: '1',
      description: 'Agent using spelling plugin',
      providesGrades: false,
      pluginIds: [PluginType.SPELLING]
    };
    
    const result = await analyzeDocument(
      document,
      agent,
      500,
      10,
      'test-job-1'
    );
    
    // Basic structure checks
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('highlights');
    expect(result).toHaveProperty('tasks');
    
    // Should use plugin workflow
    expect(result.thinking).toBe('');
    
    // Should have detected errors
    expect(result.highlights).toBeDefined();
    expect(result.highlights.length).toBeGreaterThan(0);
    
    console.log(`Found ${result.highlights.length} spelling/grammar errors`);
    
    // Check that specific errors were detected
    const errorTexts = result.highlights
      .filter(h => h.highlight?.quotedText)
      .map(h => h.highlight!.quotedText);
    
    // Should find these specific errors from our mock
    expect(errorTexts).toContain('documnet');
    expect(errorTexts).toContain('varios');
    expect(errorTexts).toContain('speling');
    expect(errorTexts).toContain('shoud');
    expect(errorTexts).toContain('doesnt');
    
    // Verify highlight structure
    result.highlights.forEach(highlight => {
      expect(highlight).toHaveProperty('description');
      expect(highlight).toHaveProperty('highlight');
      
      if (highlight.highlight) {
        expect(highlight.highlight.startOffset).toBeGreaterThanOrEqual(0);
        expect(highlight.highlight.endOffset).toBeGreaterThan(highlight.highlight.startOffset!);
        expect(highlight.highlight.quotedText).toBeTruthy();
        
        // Verify the quoted text exists in the document
        expect(document.content).toContain(highlight.highlight.quotedText);
      }
    });
    
    // Should have task tracking
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks[0].name).toBe('Plugin Analysis');
    
    // Analysis should mention spelling
    expect(result.analysis.toLowerCase()).toContain('spelling');
  });
  
  test('should handle empty document gracefully', async () => {
    
    const document: Document = {
      id: 'test-doc-2',
      slug: 'test-doc-2',
      title: 'Empty Document',
      content: 'This document has no spelling errors.',
      author: 'Test Author',
      publishedDate: new Date().toISOString(),
      url: '',
      platforms: [],
      reviews: [],
      intendedAgents: []
    };
    
    const agent: Agent = {
      id: 'test-agent-2',
      name: 'Spelling Test Agent',
      version: '1',
      description: 'Agent using spelling plugin',
      providesGrades: false,
      pluginIds: [PluginType.SPELLING]
    };
    
    // Mock empty response for clean text
    const mockFn = jest.requireMock('../../../tools/check-spelling-grammar').checkSpellingGrammarTool.execute;
    mockFn.mockImplementationOnce(async () => {
      return { errors: [] };
    });
    
    const result = await analyzeDocument(
      document,
      agent,
      500,
      10,
      'test-job-2'
    );
    
    // Should complete successfully with no errors
    expect(result.highlights).toBeDefined();
    expect(result.highlights.length).toBe(0);
    expect(result.analysis).toContain('0');
  });
});
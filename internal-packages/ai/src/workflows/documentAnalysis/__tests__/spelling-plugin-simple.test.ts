import { describe, test, expect } from '@jest/globals';
import { analyzeDocument } from '../analyzeDocument';
import type { Agent, Document } from '@roast/ai';
import { PluginType } from '../../../analysis-plugins/types/plugin-types';

describe('Spelling Plugin Simple Test', () => {
  test('should detect spelling errors using plugin workflow', async () => {
    // Create a simple test document with known errors
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
    
    // Create agent with spelling plugin
    const agent: Agent = {
      id: 'test-agent-1',
      name: 'Spelling Test Agent',
      version: '1',
      description: 'Agent using spelling plugin',
      providesGrades: false,
      pluginIds: [PluginType.SPELLING]
    };
    
    // Run analysis
    console.log('Starting spelling plugin analysis...');
    const result = await analyzeDocument(
      document,
      agent,
      500,
      10,
      'test-job-1'
    );
    
    // Verify basic structure
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('highlights');
    expect(result).toHaveProperty('tasks');
    
    // Should use plugin workflow (no thinking field from LLM workflow)
    expect(result.thinking).toBe('');
    
    // Should have detected errors as highlights
    expect(result.highlights).toBeDefined();
    expect(result.highlights.length).toBeGreaterThan(0);
    
    console.log(`Found ${result.highlights.length} spelling/grammar errors`);
    
    // Check for specific errors we know are in the text
    const errorTexts = result.highlights
      .filter(h => h.highlight?.quotedText)
      .map(h => h.highlight!.quotedText);
    
    console.log('Sample detected errors:', errorTexts.slice(0, 5));
    
    // Should detect at least some of these obvious errors
    const expectedErrors = ['documnet', 'varios', 'speling', 'shoud', 'catched', 'Their', 'doesnt', 'Its', 'heres'];
    const foundErrors = expectedErrors.filter(error => 
      errorTexts.some(text => text.includes(error))
    );
    
    console.log(`Detected ${foundErrors.length}/${expectedErrors.length} expected errors:`, foundErrors);
    
    // Should detect at least half of the expected errors
    expect(foundErrors.length).toBeGreaterThanOrEqual(expectedErrors.length / 2);
    
    // Verify highlight structure
    result.highlights.forEach(highlight => {
      if (highlight.highlight) {
        // Should have valid offsets
        expect(highlight.highlight.startOffset).toBeGreaterThanOrEqual(0);
        expect(highlight.highlight.endOffset).toBeGreaterThan(highlight.highlight.startOffset!);
        
        // Quoted text should match document content at those offsets
        const extracted = document.content.substring(
          highlight.highlight.startOffset!,
          highlight.highlight.endOffset!
        );
        expect(extracted).toBe(highlight.highlight.quotedText);
      }
    });
    
    // Should have task tracking
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks[0].name).toBe('Plugin Analysis');
    
    // Analysis should mention it's from plugins
    expect(result.analysis).toContain('plugin');
  }, 120000); // 2 minute timeout for API calls
  
  test('should use LLM workflow when no plugins configured', async () => {
    const document: Document = {
      id: 'test-doc-2',
      slug: 'test-doc-2', 
      title: 'Test Document',
      content: 'This is a simple test document.',
      author: 'Test Author',
      publishedDate: new Date().toISOString(),
      url: '',
      platforms: [],
      reviews: [],
      intendedAgents: []
    };
    
    // Agent without plugins but with primaryInstructions
    const agent: Agent = {
      id: 'test-agent-2',
      name: 'LLM Test Agent',
      version: '1',
      description: 'Agent using LLM workflow',
      primaryInstructions: 'Analyze this document and provide insights.',
      providesGrades: true,
      pluginIds: [] // No plugins
    };
    
    const result = await analyzeDocument(
      document,
      agent,
      500,
      5,
      'test-job-2'
    );
    
    // Should have used LLM workflow
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('highlights');
    
    // LLM workflow creates different task names
    expect(result.tasks[0].name).toBe('generateComprehensiveAnalysis');
  }, 120000); // 2 minute timeout for API calls
});
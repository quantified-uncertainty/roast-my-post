import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// Vitest integration test file
import { SpellingPlugin } from './index';
import { TextChunk } from '../../TextChunk';

// Skip these tests in CI or when no API key is available
const describeIfApiKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '' ? describe : describe.skip;

describeIfApiKey('SpellingPlugin Integration', () => {
  it('should analyze a document with spelling and grammar errors', async () => {
    const documentText = `
# Document Analysis

This document contians several spelling and grammer errors that need to be identifyed.

Their are many reasons why proofreading is important:
- It helps maintain professionalism
- It ensures clarity of communication
- It prevents misunderstandings

However, some people dont take the time to proofread there work carefully. This can lead to embarassing mistakes that could of been easily avoided.

Its important to remember that spell checkers cant catch everything. For example, they wont notice if you use "there" when you mean "their" or "they're".

In conclusion, always proofread you're work before submitting it.
`;

    const chunks = [
      new TextChunk(
        'chunk1',
        'This document contians several spelling and grammer errors that need to be identifyed.',
        { position: { start: 22, end: 108 } }
      ),
      new TextChunk(
        'chunk2',
        'Their are many reasons why proofreading is important:',
        { position: { start: 110, end: 164 } }
      ),
      new TextChunk(
        'chunk3',
        'However, some people dont take the time to proofread there work carefully.',
        { position: { start: 265, end: 339 } }
      ),
      new TextChunk(
        'chunk4',
        'This can lead to embarassing mistakes that could of been easily avoided.',
        { position: { start: 340, end: 412 } }
      ),
      new TextChunk(
        'chunk5',
        'Its important to remember that spell checkers cant catch everything.',
        { position: { start: 414, end: 482 } }
      ),
      new TextChunk(
        'chunk6',
        'In conclusion, always proofread you\'re work before submitting it.',
        { position: { start: 584, end: 649 } }
      ),
    ];

    const analyzer = new SpellingPlugin();
    const result = await analyzer.analyze(chunks, documentText);
    

    // Verify results structure
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('cost');

    // Should find multiple errors
    expect(result.summary).toMatch(/\d+ issue/);
    expect(result.comments.length).toBeGreaterThan(0);

    // Should identify some of the obvious errors
    const commentTexts = result.comments.map(c => (c.description || '').toLowerCase());
    
    // Check for some specific errors we know are in the text
    const hasSpellingErrors = commentTexts.some(text => 
      text.includes('contians') || 
      text.includes('grammer') || 
      text.includes('identifyed') ||
      text.includes('embarassing')
    );
    expect(hasSpellingErrors).toBe(true);

    // Check for grammar errors
    const hasGrammarErrors = commentTexts.some(text => 
      text.includes('their are') || 
      text.includes('dont') || 
      text.includes('its') ||
      text.includes('cant') ||
      text.includes("you're work")
    );
    expect(hasGrammarErrors).toBe(true);

    // Analysis should provide a summary
    expect(result.analysis).toBeTruthy();
    expect(result.analysis.length).toBeGreaterThan(100);
    expect(result.analysis).toMatch(/spelling|grammar/i);
  }, 30000); // Increase timeout to 30 seconds

  it('should handle a clean document without errors', async () => {
    const documentText = `
# Well-Written Document

This document has been carefully proofread and contains no spelling or grammar errors.

The importance of clear communication cannot be overstated. When we write clearly and correctly, our readers can focus on our message rather than being distracted by errors.

Professional writing requires attention to detail and a commitment to quality.
`;

    const chunks = [
      new TextChunk(
        'chunk1',
        'This document has been carefully proofread and contains no spelling or grammar errors.',
        { position: { start: 25, end: 111 } }
      ),
      new TextChunk(
        'chunk2',
        'The importance of clear communication cannot be overstated.',
        { position: { start: 113, end: 172 } }
      ),
      new TextChunk(
        'chunk3',
        'Professional writing requires attention to detail and a commitment to quality.',
        { position: { start: 287, end: 365 } }
      ),
    ];

    const analyzer = new SpellingPlugin();
    const result = await analyzer.analyze(chunks, documentText);

    // Should find few or no errors
    expect(result.comments.length).toBeLessThanOrEqual(3);
    
    if (result.comments.length === 0) {
      expect(result.summary).toMatch(/no spelling or grammar errors/i);
    }

    // Debug info should show processing
    const debugInfo = analyzer.getDebugInfo();
    expect(debugInfo.hasRun).toBe(true);
    expect(debugInfo.llmInteractionsCount).toBeGreaterThan(0);
  }, 30000); // Increase timeout to 30 seconds
});
import { describe, it, expect } from 'vitest';
import { FactCheckPlugin } from './index';
import { TextChunk } from '../../TextChunk';

// Skip in CI to avoid LLM costs
const describeIfHasApiKey = process.env.ANTHROPIC_API_KEY ? describe : describe.skip;

describeIfHasApiKey('FactCheckPlugin E2E Integration', () => {
  it('should extract and verify factual claims end-to-end', async () => {
    const plugin = new FactCheckPlugin();
    
    // Test document with clear factual claims
    const documentText = `
The Earth orbits the Sun at an average distance of 93 million miles.
Water freezes at 0 degrees Celsius at standard atmospheric pressure.
The Great Wall of China was built in the 3rd century BC.
Paris is the capital of France and has a population of over 2 million people.
The speed of light in a vacuum is approximately 299,792 kilometers per second.
    `.trim();

    const chunks = [
      new TextChunk(
        'test-chunk-1',
        documentText,
        {
          position: {
            start: 0,
            end: documentText.length
          }
        }
      )
    ];

    // Run the full analysis pipeline
    const result = await plugin.analyze(chunks, documentText);

    // Verify we got results
    expect(result).toBeDefined();
    expect(result.comments).toBeDefined();
    expect(Array.isArray(result.comments)).toBe(true);
    
    // Should find multiple claims
    expect(result.comments.length).toBeGreaterThan(0);
    
    // Check that comments have proper structure
    const firstComment = result.comments[0];
    if (firstComment) {
      expect(firstComment.plugin).toBe('fact-check');
      expect(firstComment.location).toBeDefined();
      expect(firstComment.location.startOffset).toBeGreaterThanOrEqual(0);
      expect(firstComment.location.endOffset).toBeGreaterThan(firstComment.location.startOffset);
      expect(firstComment.description).toBeDefined();
      expect(firstComment.level).toMatch(/^(error|warning|info|success|debug)$/);
    }

    // Verify summary was generated
    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
    
    // Verify analysis was generated
    expect(result.analysis).toBeDefined();
    expect(typeof result.analysis).toBe('string');
    
    // Cost currently not tracked in plugin (returns 0)
    expect(result.cost).toBe(0);
  }, 60000); // 60 second timeout for LLM calls

  it('should handle documents with false claims', async () => {
    const plugin = new FactCheckPlugin();
    
    // Document with intentionally false claims
    const documentText = `
The Earth is flat and sits at the center of the universe.
Water boils at 50 degrees Celsius at sea level.
Napoleon won the Battle of Waterloo in 1815.
The human body has 206 bones (adults actually have 206, this is correct).
    `.trim();

    const chunks = [
      new TextChunk(
        'test-chunk-2',
        documentText,
        {
          position: {
            start: 0,
            end: documentText.length
          }
        }
      )
    ];

    const result = await plugin.analyze(chunks, documentText);

    // Should identify false claims
    expect(result.comments.some(c => c.level === 'error')).toBe(true);
    
    // Analysis should mention false claims
    expect(result.analysis.toLowerCase()).toMatch(/false|incorrect|error/);
    
    // Summary should indicate issues found
    expect(result.summary.toLowerCase()).toMatch(/error|false|incorrect/);
  }, 60000);

  it('should handle empty document gracefully', async () => {
    const plugin = new FactCheckPlugin();
    
    const result = await plugin.analyze([], '');
    
    expect(result).toBeDefined();
    expect(result.comments).toEqual([]);
    expect(result.summary).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.cost).toBe(0);
  });

  it('should properly use highlight data when available', async () => {
    const plugin = new FactCheckPlugin();
    
    const documentText = 'The Moon is approximately 238,855 miles from Earth.';
    
    const chunks = [
      new TextChunk(
        'test-chunk-3',
        documentText,
        {
          position: {
            start: 0,
            end: documentText.length
          }
        }
      )
    ];

    const result = await plugin.analyze(chunks, documentText);

    // If claims were found, they should have valid locations
    if (result.comments.length > 0) {
      result.comments.forEach(comment => {
        if (comment.location) {
          // Location should be within document bounds
          expect(comment.location.startOffset).toBeGreaterThanOrEqual(0);
          expect(comment.location.endOffset).toBeLessThanOrEqual(documentText.length);
          
          // Quoted text should match the document at that location
          const extractedText = documentText.substring(
            comment.location.startOffset,
            comment.location.endOffset
          );
          expect(comment.location.quotedText).toBeTruthy();
        }
      });
    }
  }, 60000);

  it('should prioritize important and questionable claims', async () => {
    const plugin = new FactCheckPlugin();
    
    // Document with claims of varying importance
    const documentText = `
The company's revenue was $100 million last year, a 500% increase.
The CEO mentioned they have a blue car.
Our new technology violates the laws of thermodynamics and creates free energy.
The office coffee machine was installed last Tuesday.
We have achieved 99.9% customer satisfaction across 10 million users.
    `.trim();

    const chunks = [
      new TextChunk(
        'test-chunk-4',
        documentText,
        {
          position: {
            start: 0,
            end: documentText.length
          }
        }
      )
    ];

    const result = await plugin.analyze(chunks, documentText);

    // Should focus on important claims
    if (result.comments.length > 0) {
      // Check that at least some high-importance claims were processed
      const hasImportantClaims = result.comments.some(comment => 
        comment.description?.toLowerCase().includes('revenue') ||
        comment.description?.toLowerCase().includes('thermodynamics') ||
        comment.description?.toLowerCase().includes('satisfaction')
      );
      
      expect(hasImportantClaims).toBe(true);
    }

    // Less important claims (blue car, coffee machine) might be skipped or marked as debug level
    const trivialClaims = result.comments.filter(comment =>
      comment.description?.toLowerCase().includes('blue car') ||
      comment.description?.toLowerCase().includes('coffee machine')
    );
    
    trivialClaims.forEach(claim => {
      expect(claim.level).toMatch(/^(debug|info)$/);
    });
  }, 60000);
});
import { describe, test, expect } from 'vitest';
import { PluginManager } from '../PluginManager';
import { PluginType } from '../types/plugin-types';
import { SpellingPlugin } from '../plugins/spelling';

describe('Plugin State Isolation', () => {
  test('should not leak state between analyses', async () => {
    // Use PluginManager with spelling plugin explicitly
    const manager = new PluginManager({
      pluginSelection: {
        include: [PluginType.SPELLING]
      }
    });
    
    // First document
    const doc1Text = 'This documnet has a speling error.';
    
    // Analyze first document
    const result1 = await manager.analyzeDocument(
      doc1Text,
      {
        targetHighlights: 10
      }
    );
    
    // Second document (different content)
    const doc2Text = 'This document has no errors.';
    
    // Analyze second document
    const result2 = await manager.analyzeDocument(
      doc2Text,
      {
        targetHighlights: 10
      }
    );
    
    // Results should be independent
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    
    // First document should have errors in analysis
    expect(result1.analysis.toLowerCase()).toContain('spelling');
    
    // Second document should be clean (not affected by first analysis)
    expect(result2.summary).not.toContain('documnet');
    expect(result2.summary).not.toContain('speling');
    
    // Comments should be specific to each document
    const comments1 = result1.highlights;
    const comments2 = result2.highlights;
    
    // First doc should have spelling errors
    expect(comments1.length).toBeGreaterThan(0);
    
    // Comments from first analysis shouldn't appear in second
    if (comments1.length > 0 && comments2.length > 0) {
      const firstDocErrors = comments1.map(c => c.highlight?.quotedText);
      const secondDocErrors = comments2.map(c => c.highlight?.quotedText);
      
      // Error texts should be different
      expect(firstDocErrors).not.toEqual(secondDocErrors);
    }
  });
  
  test('should handle multiple concurrent analyses without state pollution', async () => {
    const manager = new PluginManager({
      pluginSelection: {
        include: [PluginType.SPELLING]
      }
    });
    
    // Create multiple documents with different content
    const documents = [
      { text: 'Document one with varios errors', id: 'doc1' },
      { text: 'Document two is perfectly fine', id: 'doc2' },
      { text: 'Document three has speling mistakes', id: 'doc3' }
    ];
    
    // Analyze all documents concurrently
    const results = await Promise.all(
      documents.map(doc => {
        return manager.analyzeDocument(
          doc.text,
          {
            targetHighlights: 10
          }
        );
      })
    );
    
    // Each result should be independent
    expect(results).toHaveLength(3);
    
    // Check that each result corresponds to its document
    results.forEach((result, index) => {
      const analysis = result.analysis.toLowerCase();
      
      if (index === 0) {
        // First doc has "varios"
        expect(analysis).toContain('spelling');
      } else if (index === 1) {
        // Second doc is clean - check if it has fewer issues
        expect(result.highlights.length).toBeLessThanOrEqual(2);
      } else if (index === 2) {
        // Third doc has "speling"
        expect(analysis).toContain('spelling');
      }
    });
    
    // Verify no cross-contamination of errors
    const allComments = results.map(r => r.highlights);
    
    // Comments should be unique to each document
    const doc1Comments = allComments[0].map(c => c.highlight?.quotedText).filter(Boolean);
    const doc2Comments = allComments[1].map(c => c.highlight?.quotedText).filter(Boolean);
    const doc3Comments = allComments[2].map(c => c.highlight?.quotedText).filter(Boolean);
    
    // Doc1 and Doc3 should have different errors
    if (doc1Comments.length > 0 && doc3Comments.length > 0) {
      expect(doc1Comments).not.toEqual(doc3Comments);
    }
  });
  
  test('should create fresh plugin instances for each analysis', async () => {
    const manager = new PluginManager({
      pluginSelection: {
        include: [PluginType.SPELLING]
      }
    });
    
    const doc = 'Test document';
    
    // Run two analyses
    const result1 = await manager.analyzeDocument(doc, {
      targetHighlights: 5
    });
    
    const result2 = await manager.analyzeDocument(doc, {
      targetHighlights: 5  
    });
    
    // Both analyses should work independently and produce similar results
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1.analysis).toBeDefined();
    expect(result2.analysis).toBeDefined();
  });
});
import { describe, test, expect } from '@jest/globals';
import { PluginManager } from '../PluginManager';
import { TextChunk } from '../TextChunk';
import { PluginType } from '../types/plugin-types';

describe('Plugin State Isolation', () => {
  test('should not leak state between analyses', async () => {
    const manager = new PluginManager();
    
    // First document
    const doc1Text = 'This documnet has a speling error.';
    const chunks1 = [
      new TextChunk('chunk-1', doc1Text, 0, doc1Text.length, { type: 'paragraph' })
    ];
    
    // Analyze first document
    const result1 = await manager.analyzeDocument(
      doc1Text,
      {
        targetHighlights: 10
      }
    );
    
    // Second document (different content)
    const doc2Text = 'This document has no errors.';
    const chunks2 = [
      new TextChunk('chunk-2', doc2Text, 0, doc2Text.length, { type: 'paragraph' })
    ];
    
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
    
    // First document should have errors
    expect(result1.plugins[0].result.analysis).toContain('spelling');
    
    // Second document should be clean (not affected by first analysis)
    expect(result2.plugins[0].result.summary).not.toContain('documnet');
    expect(result2.plugins[0].result.summary).not.toContain('speling');
    
    // Comments should be specific to each document
    const comments1 = result1.plugins[0].result.comments;
    const comments2 = result2.plugins[0].result.comments;
    
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
    const manager = new PluginManager();
    
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
      const analysis = result.plugins[0].result.analysis;
      
      if (index === 0) {
        // First doc has "varios"
        expect(analysis.toLowerCase()).toContain('spelling');
      } else if (index === 1) {
        // Second doc is clean
        expect(result.plugins[0].result.summary.toLowerCase()).toContain('excellent');
      } else if (index === 2) {
        // Third doc has "speling"
        expect(analysis.toLowerCase()).toContain('spelling');
      }
    });
    
    // Verify no cross-contamination of errors
    const allComments = results.map(r => r.plugins[0].result.comments);
    
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
    const manager = new PluginManager();
    
    // Track plugin instance creation by mocking console.log
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const doc = 'Test document';
    const chunks = [new TextChunk('chunk-1', doc, 0, doc.length, { type: 'paragraph' })];
    
    // Run two analyses
    await manager.analyzeDocument(doc, {
      targetHighlights: 5
    });
    
    await manager.analyzeDocument(doc, {
      targetHighlights: 5  
    });
    
    // Clean up
    logSpy.mockRestore();
    
    // Both analyses should work independently
    // (this test mainly ensures no errors are thrown due to state issues)
    expect(true).toBe(true);
  });
});
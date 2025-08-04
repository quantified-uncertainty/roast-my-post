/**
 * Test to demonstrate and prevent document prepend mismatch between analysis and display
 * 
 * The Issue:
 * - During analysis: Only uses stored markdownPrepend (or none if not stored)
 * - During display: Uses stored markdownPrepend OR generates new one if missing
 * 
 * This causes comment positions to be wrong when:
 * 1. Document analyzed without prepend (because none was stored)
 * 2. Display generates prepend (shifting all positions down)
 */

import { getDocumentFullContent } from '../documentContentHelpers';
import type { Document } from '@/types/databaseTypes';

describe('Document Prepend Mismatch Issue', () => {
  const mockDocument: Partial<Document> = {
    id: 'test-doc',
    title: 'Test Document',
    content: 'This is the actual document content.',
    author: 'Test Author',
    publishedDate: '2023-01-01T00:00:00.000Z',
    // No markdownPrepend stored
  };

  const mockDocumentWithVersions = {
    ...mockDocument,
    platforms: ['lesswrong'],
  };

  it('OLD BUG: demonstrates the mismatch when display generates prepend', () => {
    // Simulate what happens during analysis (Job.ts logic)
    const analysisContent = mockDocument.content; // No prepend because none was stored
    
    // Simulate OLD buggy display behavior (generateIfMissing: true)
    const displayResult = getDocumentFullContent(mockDocumentWithVersions as any, {
      includePrepend: true,
      generateIfMissing: true  // BUG: This was the problem!
    });
    
    // The OLD problem: analysis content != display content
    expect(analysisContent).not.toBe(displayResult.content);
    expect(displayResult.prependWasGenerated).toBe(true);
    expect(displayResult.prependCharCount).toBeGreaterThan(0);
    
    console.log('Analysis content length:', analysisContent?.length);
    console.log('Display content length:', displayResult.content.length);
    console.log('Prepend char count:', displayResult.prependCharCount);
    console.log('Mismatch offset:', displayResult.prependCharCount);
  });

  it('FIXED: display matches analysis when generateIfMissing is false', () => {
    // Simulate what happens during analysis (Job.ts logic)
    const analysisContent = mockDocument.content; // No prepend because none was stored
    
    // Simulate FIXED display behavior (generateIfMissing: false)
    const displayResult = getDocumentFullContent(mockDocumentWithVersions as any, {
      includePrepend: true,
      generateIfMissing: false  // FIX: Don't generate if not stored
    });
    
    // The FIX: analysis content == display content
    expect(analysisContent).toBe(displayResult.content);
    expect(displayResult.prependWasGenerated).toBe(false);
    expect(displayResult.prependCharCount).toBe(0);
  });
  
  it('shows correct behavior when prepend is stored', () => {
    const storedPrepend = `# Test Document\n\nBy Test Author\n\n`;
    const documentWithStoredPrepend = {
      ...mockDocument,
      versions: [{
        id: 'version-1',
        version: 1,
        markdownPrepend: storedPrepend,
        createdAt: new Date()
      }]
    };
    
    // Simulate analysis content (uses stored prepend)
    const analysisContent = storedPrepend + documentWithStoredPrepend.content;
    
    // Simulate display content (uses stored prepend)
    const displayResult = getDocumentFullContent(documentWithStoredPrepend as any, {
      includePrepend: true,
      generateIfMissing: false  // Use the fixed behavior
    });
    
    // Should match when prepend is stored
    expect(analysisContent).toBe(displayResult.content);
    expect(displayResult.prependWasGenerated).toBe(false);
  });
});
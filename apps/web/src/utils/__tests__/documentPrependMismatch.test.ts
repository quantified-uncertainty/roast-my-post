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
    publishedDate: new Date('2023-01-01'),
    // No markdownPrepend stored
  };

  const mockDocumentWithVersions = {
    ...mockDocument,
    platforms: ['lesswrong'],
  };

  it('demonstrates the mismatch: display generates prepend when none stored', () => {
    // Simulate what happens during analysis (Job.ts logic)
    const analysisContent = mockDocument.content; // No prepend because none was stored
    
    // Simulate what happens during display (getDocumentFullContent)
    const displayResult = getDocumentFullContent(mockDocumentWithVersions as any, {
      includePrepend: true,
      generateIfMissing: true
    });
    
    // The problem: analysis content != display content
    expect(analysisContent).not.toBe(displayResult.content);
    expect(displayResult.prependWasGenerated).toBe(true);
    expect(displayResult.prependCharCount).toBeGreaterThan(0);
    
    console.log('Analysis content length:', analysisContent.length);
    console.log('Display content length:', displayResult.content.length);
    console.log('Prepend char count:', displayResult.prependCharCount);
    console.log('Mismatch offset:', displayResult.prependCharCount);
  });
  
  it('shows correct behavior when prepend is stored', () => {
    const storedPrepend = `# Test Document\n\nBy Test Author\n\n`;
    const documentWithStoredPrepend = {
      ...mockDocument,
      markdownPrepend: storedPrepend
    };
    
    // Simulate analysis content (uses stored prepend)
    const analysisContent = storedPrepend + documentWithStoredPrepend.content;
    
    // Simulate display content (uses stored prepend)
    const displayResult = getDocumentFullContent(documentWithStoredPrepend as any, {
      includePrepend: true,
      generateIfMissing: true
    });
    
    // Should match when prepend is stored
    expect(analysisContent).toBe(displayResult.content);
    expect(displayResult.prependWasGenerated).toBe(false);
  });
  
  it('shows the fix: analysis and display both use the same logic', () => {
    // TODO: Implement this test once we fix the issue
    // Both analysis and display should use getDocumentFullContent()
  });
});
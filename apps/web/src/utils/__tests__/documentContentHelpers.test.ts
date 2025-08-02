import { getDocumentFullContent } from '../documentContentHelpers';
import type { Document } from '@roast/ai';
import type { DocumentWithVersions } from '../../types/documentWithVersions';

describe('documentContentHelpers', () => {
  const baseDocument: Document = {
    id: 'test-123',
    slug: 'test-doc',
    title: 'Test Document',
    content: 'This is the main content.',
    author: 'Test Author',
    publishedDate: '2024-01-15',
    reviews: [],
    intendedAgents: []
  };

  describe('getDocumentFullContent', () => {
    it('returns just content when includePrepend is false', () => {
      const result = getDocumentFullContent(baseDocument, { includePrepend: false });
      
      expect(result.content).toBe('This is the main content.');
      expect(result.prepend).toBeNull();
      expect(result.prependLineCount).toBe(0);
      expect(result.prependCharCount).toBe(0);
      expect(result.prependWasGenerated).toBe(false);
    });

    it('generates prepend when document has no versions', () => {
      const result = getDocumentFullContent(baseDocument);
      
      expect(result.prepend).toBeTruthy();
      expect(result.content).toContain('# Test Document');
      expect(result.content).toContain('This is the main content.');
      expect(result.prependLineCount).toBe(10); // Standard prepend has 10 lines
      expect(result.prependWasGenerated).toBe(true);
    });

    it('uses stored prepend when available', () => {
      const docWithPrepend: DocumentWithVersions = {
        ...baseDocument,
        versions: [{
          id: 'v1',
          version: 1,
          markdownPrepend: '# Stored Title\n\nStored prepend content\n\n',
          createdAt: new Date()
        }]
      };

      const result = getDocumentFullContent(docWithPrepend);
      
      expect(result.prepend).toBe('# Stored Title\n\nStored prepend content\n\n');
      expect(result.content).toContain('# Stored Title');
      expect(result.prependWasGenerated).toBe(false);
    });

    it('handles empty string prepend', () => {
      const docWithEmptyPrepend: DocumentWithVersions = {
        ...baseDocument,
        versions: [{
          id: 'v1',
          version: 1,
          markdownPrepend: '',
          createdAt: new Date()
        }]
      };

      const result = getDocumentFullContent(docWithEmptyPrepend);
      
      // Empty string is falsy, so it should generate
      expect(result.prepend).toBeTruthy();
      expect(result.prependWasGenerated).toBe(true);
    });

    it('handles null prepend by generating', () => {
      const docWithNullPrepend: DocumentWithVersions = {
        ...baseDocument,
        versions: [{
          id: 'v1',
          version: 1,
          markdownPrepend: undefined,
          createdAt: new Date()
        }]
      };

      const result = getDocumentFullContent(docWithNullPrepend);
      
      expect(result.prepend).toBeTruthy();
      expect(result.prependWasGenerated).toBe(true);
    });

    it('does not generate prepend when generateIfMissing is false', () => {
      const result = getDocumentFullContent(baseDocument, { generateIfMissing: false });
      
      expect(result.content).toBe('This is the main content.');
      expect(result.prepend).toBeNull();
      expect(result.prependWasGenerated).toBe(false);
    });

    it('handles documents with missing fields gracefully', () => {
      const minimalDoc: Document = {
        ...baseDocument,
        author: null as any,
        publishedDate: null as any
      };

      const result = getDocumentFullContent(minimalDoc);
      
      expect(result.prepend).toContain('**Author:** Unknown');
      expect(result.prepend).toContain('**Date Published:** Unknown');
    });

    it('handles very long titles and fields', () => {
      const longDoc: Document = {
        ...baseDocument,
        title: 'A'.repeat(200),
        author: 'B'.repeat(100)
      };

      const result = getDocumentFullContent(longDoc);
      
      expect(result.prepend).toContain('A'.repeat(200));
      expect(result.prepend).toContain('B'.repeat(100));
      expect(result.prependCharCount).toBeGreaterThan(300);
    });

    it('handles special characters in fields', () => {
      const specialDoc: Document = {
        ...baseDocument,
        title: 'Test & <Special> "Characters"',
        author: 'Author\nWith\nNewlines'
      };

      const result = getDocumentFullContent(specialDoc);
      
      expect(result.prepend).toContain('Test & <Special> "Characters"');
      expect(result.prepend).toContain('Author\nWith\nNewlines');
    });

    it('calculates line and character counts correctly', () => {
      const result = getDocumentFullContent(baseDocument);
      
      const lines = result.prepend!.split('\n');
      expect(result.prependLineCount).toBe(lines.length - 1); // -1 for trailing newline
      expect(result.prependCharCount).toBe(result.prepend!.length);
    });
  });

  describe('edge cases for highlight spanning prepend boundary', () => {
    it('handles content that starts immediately after prepend', () => {
      const result = getDocumentFullContent(baseDocument);
      
      // The prepend ends with "---\n\n" and content starts with "This"
      const boundaryIndex = result.prepend!.length;
      expect(result.content.charAt(boundaryIndex)).toBe('T');
      expect(result.content.substring(boundaryIndex, boundaryIndex + 4)).toBe('This');
    });

    it('preserves exact character positions', () => {
      const docWithSpecificContent: Document = {
        ...baseDocument,
        content: 'First line.\nSecond line.\nThird line.'
      };

      const result = getDocumentFullContent(docWithSpecificContent);
      const prependLength = result.prependCharCount;
      
      // Find "Second" in the full content
      const secondIndex = result.content.indexOf('Second');
      expect(secondIndex).toBe(prependLength + 'First line.\n'.length);
    });
  });

  describe('error handling', () => {
    it('returns content without prepend if generation throws', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create a document that would cause generateMarkdownPrepend to throw
      // In real scenario this might happen with invalid date formats etc
      const problematicDoc: Document = {
        ...baseDocument,
        publishedDate: 'invalid-date' // This might cause issues in date formatting
      };

      const result = getDocumentFullContent(problematicDoc);
      
      // Should still return the content
      expect(result.content).toContain('This is the main content.');
      
      consoleSpy.mockRestore();
    });
  });

  describe('performance considerations', () => {
    it('handles very large content efficiently', () => {
      const largeContent = 'x'.repeat(100000); // 100KB of content
      const largeDoc: Document = {
        ...baseDocument,
        content: largeContent
      };

      const startTime = Date.now();
      const result = getDocumentFullContent(largeDoc);
      const endTime = Date.now();
      
      expect(result.content.length).toBeGreaterThan(100000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});
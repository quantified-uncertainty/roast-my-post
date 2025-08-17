import { generateMarkdownPrepend, countPrependLines, getPrependLength } from '@roast/domain';

describe('documentMetadata utilities', () => {
  describe('generateMarkdownPrepend', () => {
    it('should generate prepend with all fields', () => {
      const doc = {
        title: 'Test Document',
        author: 'John Doe',
        platforms: ['EA Forum', 'LessWrong'],
        publishedDate: new Date('2024-01-15T00:00:00Z') // Use UTC to avoid timezone issues
      };

      const prepend = generateMarkdownPrepend(doc);
      
      expect(prepend).toContain('# Test Document');
      expect(prepend).toContain('**Author:** John Doe');
      expect(prepend).toContain('**Publication:** EA Forum, LessWrong');
      expect(prepend).toContain('**Date Published:**'); // Just check it has a date
      expect(prepend).toMatch(/January 1[45], 2024/); // Allow for timezone differences
      expect(prepend).toContain('---');
    });

    it('should handle missing fields with defaults', () => {
      const doc = {
        title: 'Minimal Document'
      };

      const prepend = generateMarkdownPrepend(doc);
      
      expect(prepend).toContain('# Minimal Document');
      expect(prepend).toContain('**Author:** Unknown');
      expect(prepend).toContain('**Publication:** N/A');
      expect(prepend).toContain('**Date Published:** Unknown');
    });

    it('should handle null values', () => {
      const doc = {
        title: 'Document with Nulls',
        author: null,
        platforms: null,
        publishedDate: null
      };

      const prepend = generateMarkdownPrepend(doc);
      
      expect(prepend).toContain('**Author:** Unknown');
      expect(prepend).toContain('**Publication:** N/A');
      expect(prepend).toContain('**Date Published:** Unknown');
    });

    it('should format date string correctly', () => {
      const doc = {
        title: 'Date Test',
        publishedDate: '2024-06-30T00:00:00Z'
      };

      const prepend = generateMarkdownPrepend(doc);
      
      expect(prepend).toContain('**Date Published:**');
      expect(prepend).toMatch(/June (29|30), 2024/); // Allow for timezone differences
    });

    it('should join multiple platforms', () => {
      const doc = {
        title: 'Multi Platform',
        platforms: ['Twitter', 'Blog', 'Medium']
      };

      const prepend = generateMarkdownPrepend(doc);
      
      expect(prepend).toContain('**Publication:** Twitter, Blog, Medium');
    });
  });

  describe('countPrependLines', () => {
    it('should count lines correctly', () => {
      const prepend = `# Title

**Author:** Test

**Publication:** Test

**Date Published:** Test

---

`;
      
      expect(countPrependLines(prepend)).toBe(10); // 10 lines including empty ones
    });
  });

  describe('getPrependLength', () => {
    it('should return character length', () => {
      const prepend = 'Test prepend content';
      
      expect(getPrependLength(prepend)).toBe(20);
    });
  });
});
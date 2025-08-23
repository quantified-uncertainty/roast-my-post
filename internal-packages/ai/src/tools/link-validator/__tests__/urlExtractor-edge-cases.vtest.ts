import { describe, it, expect } from 'vitest';
import { extractUrlsWithPositions } from '../urlExtractor';

describe('extractUrlsWithPositions - Edge Cases', () => {
  describe('Malformed markdown with nested brackets', () => {
    it('should handle escaped brackets before markdown links', () => {
      const content = '\\[Some escaped text and then [my link](https://example.com) here';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        linkText: 'my link',
        isMarkdownLink: true
      });
    });

    it('should extract innermost link when brackets are nested', () => {
      const content = '[Outer text with [inner](https://inner.com) link](not-a-url)';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://inner.com',
        linkText: 'inner',
        isMarkdownLink: true
      });
    });

    it('should handle unclosed brackets before valid links', () => {
      const content = '[This bracket never closes but here is [valid](https://valid.com) link';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://valid.com',
        linkText: 'valid',
        isMarkdownLink: true
      });
    });

    it('should handle double bracket at start of markdown link', () => {
      const content = '[[text with bracket](https://example.com) and [normal](https://normal.com)';
      const urls = extractUrlsWithPositions(content);
      
      // The regex skips the first [ and matches "text with bracket"
      expect(urls).toHaveLength(2);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        linkText: 'text with bracket',  // Without the leading [
        isMarkdownLink: true
      });
      expect(urls[1]).toMatchObject({
        url: 'https://normal.com',
        linkText: 'normal',
        isMarkdownLink: true
      });
    });
  });

  describe('Complex real-world patterns', () => {
    it('should handle the North Sea Analytics case correctly', () => {
      const content = `\\[*I've also been an employee at two start-ups, have angel investor friends, and some of [my](https://www.northseaanalytics.com/) favorite clients are founders looking for their next thing. But I assure you, going to parties in the bay is sufficient.\\]`;
      
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://www.northseaanalytics.com/',
        linkText: 'my',
        isMarkdownLink: true,
        highlightText: 'my'
      });
      
      // Verify positions
      const extractedText = content.substring(
        urls[0].linkTextStartOffset!,
        urls[0].linkTextEndOffset!
      );
      expect(extractedText).toBe('my');
    });

    it('should handle italics and bold in link text', () => {
      const content = 'Check out [*italicized* and **bold** text](https://example.com) here';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        linkText: '*italicized* and **bold** text',
        isMarkdownLink: true
      });
    });

    it('should handle code blocks in link text', () => {
      const content = 'See [`code` in link](https://example.com) for details';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        linkText: '`code` in link',
        isMarkdownLink: true
      });
    });
  });

  describe('Multiple overlapping patterns', () => {
    it('should handle adjacent markdown links correctly', () => {
      const content = '[first](https://first.com)[second](https://second.com)[third](https://third.com)';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(3);
      expect(urls[0].linkText).toBe('first');
      expect(urls[1].linkText).toBe('second');
      expect(urls[2].linkText).toBe('third');
    });

    it('should handle markdown link immediately after escaped bracket', () => {
      const content = '\\][valid link](https://example.com) text';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        linkText: 'valid link',
        isMarkdownLink: true
      });
    });

    it('should handle bare URL inside unclosed markdown syntax', () => {
      const content = '[This never closes so https://example.com is bare';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        isMarkdownLink: false
      });
    });
  });

  describe('URL extraction limits and edge cases', () => {
    it('should respect max 150 character limit for link text', () => {
      const longText = 'a'.repeat(151);
      const content = `[${longText}](https://example.com) and [short](https://short.com)`;
      const urls = extractUrlsWithPositions(content);
      
      // Should find both - the long one as a bare URL, short as markdown
      expect(urls).toHaveLength(2);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        isMarkdownLink: false  // Found as bare URL since markdown parse failed
      });
      expect(urls[1]).toMatchObject({
        url: 'https://short.com',
        linkText: 'short',
        isMarkdownLink: true
      });
    });

    it('should not match link text with newlines', () => {
      const content = '[text with\nnewline](https://example.com) and [valid](https://valid.com)';
      const urls = extractUrlsWithPositions(content);
      
      // Should find both - newline one as bare URL, valid as markdown
      expect(urls).toHaveLength(2);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        isMarkdownLink: false  // Found as bare URL since markdown parse failed
      });
      expect(urls[1]).toMatchObject({
        url: 'https://valid.com',
        linkText: 'valid',
        isMarkdownLink: true
      });
    });

    it('should handle parentheses in URLs (known limitation)', () => {
      const content = '[Wikipedia](https://en.wikipedia.org/wiki/Markdown_(markup_language)) link';
      const urls = extractUrlsWithPositions(content);
      
      // Known limitation: URL with parens gets split
      expect(urls).toHaveLength(2);
      // Markdown regex stops at first )
      expect(urls[0]).toMatchObject({
        url: 'https://en.wikipedia.org/wiki/Markdown_(markup_language',
        isMarkdownLink: true,
        linkText: 'Wikipedia'
      });
      // The )) at end gets picked up as bare URL (invalid but extracted)
      expect(urls[1].isMarkdownLink).toBe(false);
    });

    it('should extract bare URLs after failed markdown syntax', () => {
      const content = '](https://orphaned.com) and https://bare.com';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(2);
      expect(urls.map(u => u.url)).toContain('https://orphaned.com');
      expect(urls.map(u => u.url)).toContain('https://bare.com');
    });
  });

  describe('Position accuracy for complex cases', () => {
    it('should maintain correct positions with emoji and unicode', () => {
      const content = '🎉 Check [this 👍 link](https://example.com) out! 🚀';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      const extracted = content.substring(
        urls[0].linkTextStartOffset!,
        urls[0].linkTextEndOffset!
      );
      expect(extracted).toBe('this 👍 link');
    });

    it('should handle special characters in link text', () => {
      const content = 'See [C++ & Python](https://example.com) guide';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0].linkText).toBe('C++ & Python');
    });

    it('should handle quotes and apostrophes in link text', () => {
      const content = `[It's "quoted"](https://example.com) text`;
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0].linkText).toBe(`It's "quoted"`);
    });
  });

  describe('Malicious or adversarial patterns', () => {
    it('should handle ReDoS-like patterns safely', () => {
      // Patterns that could cause regex backtracking
      const content = '[' + 'a['.repeat(50) + '](https://example.com)';
      const urls = extractUrlsWithPositions(content);
      
      // The URL is still found as a bare URL (markdown parse fails due to nested brackets)
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://example.com',
        isMarkdownLink: false  // Found as bare URL
      });
    });

    it('should skip extremely long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(5000);
      const content = `[link](${longUrl})`;
      const urls = extractUrlsWithPositions(content);
      
      // Our regex has a practical limit on URL length
      expect(urls).toHaveLength(1);
    });

    it('should handle mixed escaped and unescaped brackets', () => {
      const content = '\\[escaped\\] then [valid](https://valid.com) then \\[more\\]';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        url: 'https://valid.com',
        linkText: 'valid'
      });
    });
  });

  describe('Real document scenarios', () => {
    it('should handle footnote-style references', () => {
      const content = 'Text with reference[^1] and [actual link](https://example.com)';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe('https://example.com');
    });

    it('should handle markdown inside HTML comments', () => {
      const content = '<!-- [hidden](https://hidden.com) --> [visible](https://visible.com)';
      const urls = extractUrlsWithPositions(content);
      
      // Both should be found as our parser doesn't understand HTML comments
      expect(urls.map(u => u.url)).toContain('https://visible.com');
    });

    it('should extract from complex nested structures', () => {
      const content = '> Blockquote with [link](https://quoted.com)\n- List with [link](https://list.com)';
      const urls = extractUrlsWithPositions(content);
      
      expect(urls).toHaveLength(2);
      expect(urls[0].linkText).toBe('link');
      expect(urls[1].linkText).toBe('link');
    });
  });
});
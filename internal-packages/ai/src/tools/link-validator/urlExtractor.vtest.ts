import { describe, it, expect } from 'vitest';
import { extractUrls } from './urlExtractor';

describe('extractUrls', () => {
  describe('markdown link extraction', () => {
    it('should extract basic markdown links', () => {
      const content = 'Check out [this article](https://example.com) for more info';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });

    it('should handle nested brackets in link text', () => {
      const content = '[Article about [nested] brackets](https://example.com)';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });

    it('should exclude image links', () => {
      const content = '![alt text](https://example.com/image.png)';
      const urls = extractUrls(content);
      expect(urls).toEqual([]);
    });

    it('should extract both markdown and standalone URLs', () => {
      const content = 'See [link](https://example1.com) and also https://example2.com';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example1.com', 'https://example2.com']);
    });
  });

  describe('math expression handling', () => {
    it('should not detect math expressions with brackets as links', () => {
      const mathExpr = '(= E_X[P[\\Gamma = C](lnP[\\Gamma = C|X] - lnP[\\Gamma=C|X_i]) + \\sum_\\lambda P[\\Gamma = \\lambda|X] (ln P[\\Gamma = \\lambda|X] - ln P[\\Gamma = \\lambda|X_i])])';
      const urls = extractUrls(mathExpr);
      expect(urls).toEqual([]);
    });

    it('should not detect delta notation as links', () => {
      const deltaNotation = `Our small quantity is \\(\\delta[X] := \\sqrt{P[X]} - \\sqrt{Q[X]}\\). Then
\\(D_{KL}(P||Q) = \\sum_X P[X](ln P[X] - 2 ln \\sqrt{Q[X]})\\)
\\(= \\sum_X P[X](ln P[X] - 2 ln (\\sqrt{P[X]} - \\delta[X]))\\)`;
      const urls = extractUrls(deltaNotation);
      expect(urls).toEqual([]);
    });

    it('should handle mixed content with math and real links', () => {
      const mixed = 'The equation $E[X] = \\sum P[X=x]$ is explained in [this paper](https://arxiv.org/paper)';
      const urls = extractUrls(mixed);
      expect(urls).toEqual(['https://arxiv.org/paper']);
    });

    it('should not detect array indexing as links', () => {
      const code = 'const value = array[index](param); let result = P[X](value);';
      const urls = extractUrls(code);
      expect(urls).toEqual([]);
    });
  });

  describe('URL extraction patterns', () => {
    it('should extract standalone URLs', () => {
      const content = 'Visit https://example.com for more information';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });

    it('should extract URLs from HTML links', () => {
      const content = '<a href="https://example.com">Link</a>';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });

    it('should handle URLs with parentheses correctly', () => {
      const content = 'See https://en.wikipedia.org/wiki/Example_(disambiguation) for details';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://en.wikipedia.org/wiki/Example_(disambiguation)']);
    });

    it('should respect maxUrls parameter', () => {
      const content = '[link1](https://example1.com) [link2](https://example2.com) [link3](https://example3.com)';
      const urls = extractUrls(content, 2);
      expect(urls).toHaveLength(2);
      expect(urls).toEqual(['https://example1.com', 'https://example2.com']);
    });

    it('should maintain document order', () => {
      const content = `
        First [link1](https://example1.com)
        Then a standalone https://example2.com
        Finally [link3](https://example3.com)
      `;
      const urls = extractUrls(content);
      expect(urls).toEqual([
        'https://example1.com',
        'https://example2.com', 
        'https://example3.com'
      ]);
    });

    it('should deduplicate URLs', () => {
      const content = '[link](https://example.com) and again [another](https://example.com)';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });

    it('should filter out email addresses', () => {
      const content = 'Contact us at user@example.com or visit https://example.com';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });

    it('should filter out non-http protocols', () => {
      const content = 'FTP at ftp://files.com, call tel:123456, visit https://example.com';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      expect(extractUrls('')).toEqual([]);
    });

    it('should handle content with no URLs', () => {
      const content = 'This is just plain text with no links';
      expect(extractUrls(content)).toEqual([]);
    });

    it('should skip hash-only links', () => {
      const content = '[section](#introduction) and [site](https://example.com)';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });

    it('should skip very short URLs', () => {
      const content = '[x](http://x) and [valid](https://example.com)';
      const urls = extractUrls(content);
      expect(urls).toEqual(['https://example.com']);
    });
  });
});
/**
 * Dedicated tests for markdownAwareFuzzySearch functionality
 * 
 * This module handles complex markdown-aware text searching where LLMs conceptualize
 * markdown links as plain text but we need to map back to original positions.
 */

import { markdownAwareFuzzySearch } from './markdownAwareFuzzySearch';

describe('markdownAwareFuzzySearch', () => {
  describe('basic functionality', () => {
    it('should return null for documents without markdown links', () => {
      const doc = "This is a simple document with no markdown links.";
      const query = "simple document";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeNull();
    });

    it('should return null if text is found by regular fuzzy search', () => {
      const doc = "Some text [link](url) and more text.";
      const query = "more text"; // This should be found by regular fuzzy search
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeNull();
    });

    it('should return null for very short search queries', () => {
      const doc = "See [AI](url) research.";
      const query = "AI"; // Too short (< 3 chars)
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeNull();
    });
  });

  describe('markdown link handling', () => {
    it('should find text inside markdown links', () => {
      const doc = "Read [this important study](https://example.com) for details.";
      const query = "this important study";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('this important study');
      expect(result?.strategy).toBe('markdown-aware-fuzzy');
    });

    it('should handle multiple markdown links in a document', () => {
      const doc = "First [study](url1) and second [research](url2) are important.";
      const query = "second research";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('second research');
    });

    it('should handle nested parentheses in URLs', () => {
      const doc = "See [this article](https://example.com/path?param=(value)) for details.";
      const query = "this article";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('this article');
    });

    it('should handle escaped markdown brackets', () => {
      const doc = "This is \\[not a link\\] but [this is](url).";
      const query = "this is";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('this is');
    });
  });

  describe('text spanning markdown boundaries', () => {
    it('should preserve full markdown syntax when text spans boundaries', () => {
      const doc = "Research shows [important findings](url) are crucial for understanding.";
      const query = "important findings are crucial";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('[important findings](url) are crucial');
    });

    it('should handle text that starts before and ends after a markdown link', () => {
      const doc = "The [comprehensive study](url) demonstrates clear results.";
      const query = "comprehensive study demonstrates";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('[comprehensive study](url) demonstrates');
    });

    it('should handle text spanning multiple markdown links', () => {
      const doc = "Both [study A](url1) and [study B](url2) show similar patterns.";
      const query = "study A and study B";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('[study A](url1) and [study B](url2)');
    });

    it('should handle partial overlap with beginning of markdown link', () => {
      const doc = "Evidence from [recent research](url) supports this theory.";
      const query = "from recent research";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('from [recent research](url)');
    });

    it('should handle partial overlap with end of markdown link', () => {
      const doc = "The [groundbreaking study](url) revealed new insights.";
      const query = "groundbreaking study revealed";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('[groundbreaking study](url) revealed');
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle markdown links with complex URLs', () => {
      const doc = "See [paper](https://doi.org/10.1000/182?query=test&format=json#section) here.";
      const query = "paper";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('paper');
    });

    it('should handle markdown links with spaces in link text', () => {
      const doc = "The [Nature Machine Intelligence paper](url) discusses AI ethics.";
      const query = "Nature Machine Intelligence paper";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('Nature Machine Intelligence paper');
    });

    it('should handle malformed markdown (missing closing parenthesis)', () => {
      const doc = "See [broken link](url and more text here.";
      const query = "broken link";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('broken link');
    });

    it('should handle empty link text', () => {
      const doc = "Check out [](https://example.com) this link.";
      const query = "this link";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('this link');
    });

    it('should handle very long documents efficiently', () => {
      const longDoc = "A".repeat(5000) + " [target text](url) " + "B".repeat(5000);
      const query = "target text";
      
      const start = Date.now();
      const result = markdownAwareFuzzySearch(query, longDoc);
      const duration = Date.now() - start;
      
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('target text');
      expect(duration).toBeLessThan(50); // Should be fast
    });
  });

  describe('confidence and strategy reporting', () => {
    it('should return appropriate confidence scores', () => {
      const doc = "The [key finding](url) is significant.";
      const query = "key finding";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.confidence).toBeGreaterThan(0.6);
      expect(result?.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should report correct strategy', () => {
      const doc = "See [this study](url) for details.";
      const query = "this study";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.strategy).toBe('markdown-aware-fuzzy');
    });

    it('should provide accurate offset positions', () => {
      const doc = "Introduction [key study](url) conclusion.";
      const query = "key study";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      
      const extractedText = doc.slice(result!.startOffset, result!.endOffset);
      expect(extractedText).toBe('key study');
      expect(result!.startOffset).toBe(13); // Position of 'k' in 'key'
      expect(result!.endOffset).toBe(22); // Position after 'y' in 'study'
    });
  });

  describe('real-world problematic cases', () => {
    it('should handle the exact case from the investigation', () => {
      const doc = `Some earlier content...
[This 2016 study](https://example.com/bitstreams/6a4499f3-93b2-4eb6-967b-ebf318afec64/content) found that vegan diets could have significant benefits.
More content follows...`;
      const query = "This 2016 study";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('This 2016 study');
    });

    it('should handle academic citation patterns', () => {
      const doc = "According to [Smith et al. (2023)](https://doi.org/example) the results indicate...";
      const query = "Smith et al. (2023)";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('Smith et al. (2023)');
    });

    it('should handle URLs with fragment identifiers', () => {
      const doc = "See [section 3.2](https://paper.org/doc#section3.2) for methodology.";
      const query = "section 3.2";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('section 3.2');
    });

    it('should handle markdown in mixed content', () => {
      const doc = `The research landscape shows:
      
1. [First study](url1) demonstrates X
2. Regular text without links  
3. [Second study](url2) proves Y

Overall conclusions...`;
      const query = "Second study";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('Second study');
    });
  });

  describe('fuzzy matching capabilities', () => {
    it('should handle typos in search text', () => {
      const doc = "The [important research](url) shows clear evidence.";
      const query = "importnt research"; // Missing 'a'
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('important research');
    });

    it('should handle case mismatches', () => {
      const doc = "See [Machine Learning Applications](url) for details.";
      const query = "machine learning applications";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('Machine Learning Applications');
    });

    it('should handle extra whitespace', () => {
      const doc = "The [comprehensive  analysis](url) revealed insights.";
      const query = "comprehensive analysis";
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('comprehensive  analysis');
    });
  });
});
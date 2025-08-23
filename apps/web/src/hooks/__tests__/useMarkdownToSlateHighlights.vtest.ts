import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMarkdownToSlateHighlights } from '../useMarkdownToSlateHighlights';

describe('useMarkdownToSlateHighlights', () => {
  describe('basic text mapping', () => {
    it('should map highlights from markdown to slate positions for simple text', () => {
      const markdown = 'This is a test document with some highlighted text.';
      const slateText = 'This is a test document with some highlighted text.';
      const highlights = [
        {
          startOffset: 10,
          endOffset: 14,
          quotedText: 'test',
          tag: 'highlight-1',
        },
      ];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights)
      );

      expect(result.current.mappedHighlights).toHaveLength(1);
      expect(result.current.mappedHighlights[0]).toMatchObject({
        startOffset: 10,
        endOffset: 14,
        quotedText: 'test',
        tag: 'highlight-1',
        mappedFrom: 'markdown',
      });
      expect(result.current.failures).toHaveLength(0);
    });

    it('should handle empty highlights array', () => {
      const markdown = 'Test document';
      const slateText = 'Test document';
      const highlights: any[] = [];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights)
      );

      expect(result.current.mappedHighlights).toHaveLength(0);
      expect(result.current.failures).toHaveLength(0);
    });
  });

  describe('markdown link syntax', () => {
    it('should correctly map highlights within markdown links', () => {
      const markdown = 'Check out [this link](https://example.com) for more info.';
      const slateText = 'Check out this link for more info.';
      const highlights = [
        {
          startOffset: 11, // Position of "this link" in markdown
          endOffset: 20,
          quotedText: 'this link',
          tag: 'link-highlight',
        },
      ];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights)
      );

      expect(result.current.mappedHighlights).toHaveLength(1);
      expect(result.current.mappedHighlights[0]).toMatchObject({
        startOffset: 10, // Position in slate text (without brackets)
        endOffset: 19,
        quotedText: 'this link',
        tag: 'link-highlight',
        mappedFrom: 'markdown',
      });
    });

    it('should extract link text from markdown link syntax', () => {
      const markdown = 'Read [the article](https://example.com/article) carefully.';
      const slateText = 'Read the article carefully.';
      
      // Highlight encompasses the entire markdown link - the hook expects the quotedText to be what we're looking for
      const highlights = [
        {
          startOffset: 5, // Start of [the article](...)
          endOffset: 48, // End of (...article)
          quotedText: 'the article', // What we're actually looking for in the slate text
          tag: 'full-link',
        },
      ];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights)
      );

      expect(result.current.mappedHighlights).toHaveLength(1);
      // Should find "the article" in the slate text
      expect(result.current.mappedHighlights[0]).toMatchObject({
        startOffset: 5,
        endOffset: 16,
        quotedText: 'the article',
        tag: 'full-link',
        mappedFrom: 'markdown',
      });
    });
  });

  describe('context-based matching', () => {
    it('should use context to disambiguate multiple occurrences', () => {
      const markdown = 'The test is good. Another test is better.';
      const slateText = 'The test is good. Another test is better.';
      
      // Highlight the second "test"
      const highlights = [
        {
          startOffset: 26, // Position of second "test"
          endOffset: 30,
          quotedText: 'test',
          tag: 'second-test',
        },
      ];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights, 10)
      );

      expect(result.current.mappedHighlights).toHaveLength(1);
      expect(result.current.mappedHighlights[0]).toMatchObject({
        startOffset: 26,
        endOffset: 30,
        quotedText: 'test',
        tag: 'second-test',
      });
    });

    it('should handle context with similar but not identical text', () => {
      const markdown = 'The quick brown fox jumps.';
      const slateText = 'The  quick  brown  fox  jumps.'; // Extra spaces
      
      const highlights = [
        {
          startOffset: 4, // "quick" in markdown
          endOffset: 9,
          quotedText: 'quick',
          tag: 'quick-highlight',
        },
      ];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights)
      );

      // Should still find "quick" despite spacing differences
      expect(result.current.mappedHighlights).toHaveLength(1);
      expect(result.current.mappedHighlights[0].quotedText).toBe('quick');
    });
  });

  describe('duplicate position handling', () => {
    it('should map both highlights when there are multiple occurrences', () => {
      const markdown = 'Test text here. More text follows.';
      const slateText = 'Test text here. More text follows.';
      
      // Two highlights for the word "text" at different positions
      const highlights = [
        {
          startOffset: 5,  // First "text"
          endOffset: 9,
          quotedText: 'text',
          tag: 'first',
        },
        {
          startOffset: 21, // Second "text"
          endOffset: 25,
          quotedText: 'text',
          tag: 'second',
        },
      ];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights)
      );

      // Both should succeed as they're at different positions
      expect(result.current.mappedHighlights).toHaveLength(2);
      expect(result.current.mappedHighlights[0].tag).toBe('first');
      expect(result.current.mappedHighlights[1].tag).toBe('second');
      
      expect(result.current.failures).toHaveLength(0);
    });
  });

  describe('failure cases', () => {
    it('should report failure when text cannot be found', () => {
      const markdown = 'Original text here.';
      const slateText = 'Completely different text.';
      
      const highlights = [
        {
          startOffset: 0,
          endOffset: 8,
          quotedText: 'Original',
          tag: 'missing',
        },
      ];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights)
      );

      expect(result.current.mappedHighlights).toHaveLength(0);
      expect(result.current.failures).toHaveLength(1);
      expect(result.current.failures[0]).toMatchObject({
        tag: 'missing',
        quotedText: 'Original',
        reason: 'Could not find in Slate text',
      });
    });

    it('should handle empty slate text gracefully', () => {
      const markdown = 'Some content';
      const slateText = '';
      
      const highlights = [
        {
          startOffset: 0,
          endOffset: 4,
          quotedText: 'Some',
          tag: 'test',
        },
      ];

      const { result } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights)
      );

      expect(result.current.mappedHighlights).toHaveLength(0);
      expect(result.current.failures).toHaveLength(1);
    });
  });

  describe('context window parameter', () => {
    it('should respect custom context window size', () => {
      const markdown = 'A very long prefix that provides context. The target text. And a suffix.';
      const slateText = 'A very long prefix that provides context. The target text. And a suffix.';
      
      const highlights = [
        {
          startOffset: 43,
          endOffset: 58,
          quotedText: 'The target text',
          tag: 'target',
        },
      ];

      // Test with small context window
      const { result: smallWindow } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights, 5)
      );

      // Test with large context window
      const { result: largeWindow } = renderHook(() =>
        useMarkdownToSlateHighlights(markdown, slateText, highlights, 50)
      );

      // Both should find the text, but might use different matching strategies
      expect(smallWindow.current.mappedHighlights).toHaveLength(1);
      expect(largeWindow.current.mappedHighlights).toHaveLength(1);
      
      // Both should find the text successfully
      expect(smallWindow.current.mappedHighlights[0].quotedText).toBe('The target text');
      expect(largeWindow.current.mappedHighlights[0].quotedText).toBe('The target text');
    });
  });
});
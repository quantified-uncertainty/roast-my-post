import { describe, it, expect } from 'vitest';
import { extractUrlsWithPositions } from '../urlExtractor';

describe('URL Extractor - Off-by-one error', () => {
  it('should extract full link text including closing parenthesis', () => {
    const content = `Check out [Inside a CATHOLIC Megachurch (Protestant Perspective)](https://example.com) for details.`;
    
    const extracted = extractUrlsWithPositions(content);
    
    expect(extracted).toHaveLength(1);
    const item = extracted[0];
    
    // The link text should be complete
    expect(item.linkText).toBe('Inside a CATHOLIC Megachurch (Protestant Perspective)');
    
    // Verify the positions are correct
    if (item.linkTextStartOffset !== undefined && item.linkTextEndOffset !== undefined) {
      const actualText = content.substring(item.linkTextStartOffset, item.linkTextEndOffset);
      expect(actualText).toBe('Inside a CATHOLIC Megachurch (Protestant Perspective)');
    }
  });

  it('should extract full link text for multiple complex titles', () => {
    const content = `Some podcasts to check out:

[The Rise and Fall of Mars Hill Church](https://example1.com) (all episodes)

[Everything I Did Wrong as a Church Planter: A Million Part Series](https://example2.com) (all episodes, as of 2025-06-22)

[The Lutheran Church Planter](https://example3.com) (all episodes, as of 2025-06-22)`;
    
    const extracted = extractUrlsWithPositions(content);
    
    expect(extracted).toHaveLength(3);
    
    // Check each link text is complete
    expect(extracted[0].linkText).toBe('The Rise and Fall of Mars Hill Church');
    expect(extracted[1].linkText).toBe('Everything I Did Wrong as a Church Planter: A Million Part Series');
    expect(extracted[2].linkText).toBe('The Lutheran Church Planter');
    
    // Verify positions for each
    for (const item of extracted) {
      if (item.linkTextStartOffset !== undefined && item.linkTextEndOffset !== undefined) {
        const actualText = content.substring(item.linkTextStartOffset, item.linkTextEndOffset);
        expect(actualText).toBe(item.linkText);
      }
    }
  });

  it('should handle link text with special characters at the end', () => {
    const testCases = [
      {
        content: `Visit [Terminal: The Dying Church Planter!](https://example.com) today`,
        expectedText: 'Terminal: The Dying Church Planter!'
      },
      {
        content: `See [Ministry Wives?](https://example.com) for more`,
        expectedText: 'Ministry Wives?'
      },
      {
        content: `Check [Pastors Wives Tell All...](https://example.com) here`,
        expectedText: 'Pastors Wives Tell All...'
      }
    ];
    
    for (const testCase of testCases) {
      const extracted = extractUrlsWithPositions(testCase.content);
      
      expect(extracted).toHaveLength(1);
      expect(extracted[0].linkText).toBe(testCase.expectedText);
      
      // Verify position is correct
      if (extracted[0].linkTextStartOffset !== undefined && extracted[0].linkTextEndOffset !== undefined) {
        const actualText = testCase.content.substring(
          extracted[0].linkTextStartOffset,
          extracted[0].linkTextEndOffset
        );
        expect(actualText).toBe(testCase.expectedText);
      }
    }
  });

  it('should correctly highlight text positions for all extracted URLs', () => {
    const content = `# Podcasts

Here are some recommended podcasts:

1. [Inside a CATHOLIC Megachurch (Protestant Perspective)](https://www.youtube.com/watch?v=v1TDwOpfGCs)
2. [The Rise and Fall of Mars Hill Church](https://podcasts.apple.com/us/podcast/the-rise-and-fall-of-mars-hill) (all episodes)
3. [Everything I Did Wrong as a Church Planter: A Million Part Series](https://podcasts.apple.com/us/podcast/everything) (all episodes, as of 2025-06-22)`;

    const extracted = extractUrlsWithPositions(content);
    
    expect(extracted).toHaveLength(3);
    
    // For each extracted URL, verify the highlight positions match the link text
    for (const item of extracted) {
      expect(item.highlightText).toBe(item.linkText);
      
      const highlightedText = content.substring(item.highlightStartOffset, item.highlightEndOffset);
      expect(highlightedText).toBe(item.highlightText);
      
      // Ensure no off-by-one error
      expect(highlightedText).toBe(item.linkText);
      expect(highlightedText.endsWith(item.linkText![item.linkText!.length - 1])).toBe(true);
    }
  });
});
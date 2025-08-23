import { describe, it, expect, beforeEach } from 'vitest';
import { LinkPlugin } from './index';
import { PluginManager } from '../../PluginManager';
import type { Comment } from '../../../shared/types';

describe('Link Analysis Plugin - Position Validation', () => {
  let plugin: LinkPlugin;
  let manager: PluginManager;

  beforeEach(() => {
    plugin = new LinkPlugin();
    manager = new PluginManager();
  });

  it('should generate highlights with correct positions for markdown links', async () => {
    const documentText = `# Test Document

Here is some text before the link.

Check out [React documentation](https://react.dev/learn) for more information.

Some text in between.

Visit [Next.js](https://nextjs.org) to learn about the framework.

And here's a bare URL: https://example.com/test

Final paragraph.`;

    const result = await manager.analyzeDocumentSimple(documentText, [plugin]);
    const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
    
    expect(pluginResult).toBeDefined();
    expect(pluginResult?.comments).toBeDefined();
    
    const comments = pluginResult?.comments || [];
    
    // Should have highlights for all 3 URLs
    expect(comments.length).toBeGreaterThan(0);
    
    // Validate each highlight position
    for (const comment of comments) {
      const { startOffset, endOffset, quotedText } = comment.highlight;
      
      // Extract the actual text from the document at these positions
      const actualText = documentText.substring(startOffset, endOffset);
      
      // The extracted text should match the quoted text
      expect(actualText).toBe(quotedText);
      
      // Log for debugging
      console.log(`Highlight: "${quotedText}" at ${startOffset}-${endOffset}`);
      console.log(`Actual text: "${actualText}"`);
      console.log(`Match: ${actualText === quotedText}`);
    }
  });

  it('should handle complex markdown with prepended content', async () => {
    // Simulate a document with prepended content (like metadata)
    const prependContent = `---
title: Test Document
author: Test Author
date: 2024-01-01
---

`;
    
    const mainContent = `# Main Content

First paragraph with a [broken link](https://nonexistent.example.com/404).

Second paragraph with a [working link](https://github.com).

Third paragraph with multiple links:
- [Link 1](https://google.com)
- [Link 2](https://stackoverflow.com)
- Plain URL: https://raw.example.com/data.json

Last paragraph.`;

    const fullDocument = prependContent + mainContent;
    
    const result = await manager.analyzeDocumentSimple(fullDocument, [plugin]);
    const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
    
    const comments = pluginResult?.comments || [];
    
    // Validate all highlight positions
    for (const comment of comments) {
      const { startOffset, endOffset, quotedText } = comment.highlight;
      const actualText = fullDocument.substring(startOffset, endOffset);
      
      expect(actualText).toBe(quotedText);
      
      // Additional validation: quoted text should be meaningful
      expect(quotedText.length).toBeGreaterThan(0);
      expect(quotedText.length).toBeLessThan(200); // Reasonable limit
    }
  });

  it('should handle edge cases in URL positioning', async () => {
    const documentText = `# Edge Cases

1. URL at the very beginning: https://start.com is here
2. URL at the end of line: check https://endline.com
3. URL with parentheses: [Wikipedia article](https://en.wikipedia.org/wiki/AI_(disambiguation))
4. Duplicate URLs: [First](https://duplicate.com) and [Second](https://duplicate.com)
5. URL in parentheses: (see https://parentheses.com for details)
6. URL with query params: https://example.com/search?q=test&lang=en
7. URL with fragment: https://docs.com/page#section
8. Very long URL: https://example.com/very/long/path/that/goes/on/and/on/and/contains/many/segments`;

    const result = await manager.analyzeDocumentSimple(documentText, [plugin]);
    const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
    
    const comments = pluginResult?.comments || [];
    
    // All highlights should have valid positions
    for (const comment of comments) {
      const { startOffset, endOffset, quotedText } = comment.highlight;
      
      // Positions should be within document bounds
      expect(startOffset).toBeGreaterThanOrEqual(0);
      expect(endOffset).toBeLessThanOrEqual(documentText.length);
      expect(startOffset).toBeLessThan(endOffset);
      
      // Extracted text should match
      const actualText = documentText.substring(startOffset, endOffset);
      expect(actualText).toBe(quotedText);
    }
  });

  it('should exclude image URLs but include regular links', async () => {
    const documentText = `# Images and Links

Here's an image: ![Alt text](https://example.com/image.png)

But this is a regular link to an image: [View image](https://example.com/image.png)

Another image: ![](https://example.com/another.jpg)

And a regular link: [Click here](https://example.com/page)`;

    const result = await manager.analyzeDocumentSimple(documentText, [plugin]);
    const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
    
    const comments = pluginResult?.comments || [];
    
    // Should have comments for the regular links but not the image markdown
    const quotedTexts = comments.map(c => c.highlight.quotedText);
    
    // Should include these
    expect(quotedTexts.some(text => text === 'View image')).toBe(true);
    expect(quotedTexts.some(text => text === 'Click here')).toBe(true);
    
    // Should not include image alt texts as highlights
    expect(quotedTexts.some(text => text === 'Alt text')).toBe(false);
    
    // All positions should still be valid
    for (const comment of comments) {
      const { startOffset, endOffset, quotedText } = comment.highlight;
      const actualText = documentText.substring(startOffset, endOffset);
      expect(actualText).toBe(quotedText);
    }
  });

  it('should handle real-world document structure', async () => {
    // Simulate a real document structure like the one causing issues
    const documentText = `---
title: The Modern Church Planting Movement
author: Jane Doe
date: 2024-01-15
platform: Substack
---

# The Modern Church Planting Movement

## Introduction

The church planting movement has gained significant momentum in recent years. According to [my research](https://example.com/research), approximately 40% of new churches succeed within their first five years.

## Key Statistics

Recent data from [this survey by Dan Steel](https://survey.example.com/2024) shows interesting trends:

- Growth rate: 15% annually
- Success rate: varies by region
- Average congregation size: 150 members

## Podcasts and Resources

For those interested in learning more, I recommend:

1. [New Churches Podcast](https://podcast.example.com/new-churches) - Weekly discussions
2. [Church Planting Network](https://cpn.example.org) - Comprehensive resources
3. The book "Modern Ministry" (no link available)

## Conclusion

The movement continues to evolve. For updates, visit https://churchplanting.com or follow our newsletter.

Additional resources can be found at [our resource page](https://example.com/resources).`;

    const result = await manager.analyzeDocumentSimple(documentText, [plugin]);
    const pluginResult = result.pluginResults.get('LINK_ANALYSIS');
    
    expect(pluginResult).toBeDefined();
    
    const comments = pluginResult?.comments || [];
    
    // Log all highlights for debugging
    console.log('\n=== Real-world document highlights ===');
    for (const comment of comments) {
      const { startOffset, endOffset, quotedText } = comment.highlight;
      const actualText = documentText.substring(startOffset, endOffset);
      
      console.log(`Expected: "${quotedText}" at ${startOffset}-${endOffset}`);
      console.log(`Actual:   "${actualText}"`);
      console.log(`Match: ${actualText === quotedText}\n`);
      
      // Critical assertion: positions must be correct
      expect(actualText).toBe(quotedText);
    }
    
    // Verify specific expected highlights
    const quotedTexts = comments.map(c => c.highlight.quotedText);
    
    // These should definitely be found
    expect(quotedTexts).toContain('my research');
    expect(quotedTexts).toContain('this survey by Dan Steel');
    expect(quotedTexts).toContain('New Churches Podcast');
    expect(quotedTexts).toContain('Church Planting Network');
    expect(quotedTexts).toContain('https://churchplanting.com');
    expect(quotedTexts).toContain('our resource page');
  });
});
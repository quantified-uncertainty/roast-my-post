/**
 * Markdown-aware fuzzy search that handles text matching when LLM conceptualizes
 * markdown links as plain text (e.g., "[text](url)" becomes "text")
 */

import { logger } from "@/lib/logger";
import { TextLocation } from './types';
import { uFuzzySearch, UFuzzyOptions } from './uFuzzySearch';

export interface MarkdownAwareFuzzyOptions extends UFuzzyOptions {
  // Inherits all uFuzzy options
}

/**
 * Check if the search failure might be due to markdown links
 */
function isLikelyMarkdownMismatch(searchText: string, documentText: string): boolean {
  // Only activate if document contains markdown links (not escaped)
  const markdownLinkPattern = /(?<!\\)\]\(/;
  if (!markdownLinkPattern.test(documentText)) {
    return false;
  }
  
  // And if the search text is substantial enough to warrant processing
  return searchText.length >= 3;
}

/**
 * Create a position map from markdown to plain text
 */
function createPositionMap(markdown: string): {
  plainText: string;
  markdownToPlain: Map<number, number>;
  plainToMarkdown: Map<number, number>;
} {
  const markdownToPlain = new Map<number, number>();
  const plainToMarkdown = new Map<number, number>();
  let plainText = '';
  let plainPos = 0;
  let i = 0;
  
  while (i < markdown.length) {
    // Check for markdown link pattern [text](url) - but skip if escaped
    if (markdown[i] === '[' && (i === 0 || markdown[i - 1] !== '\\')) {
      const linkStart = i;
      let j = i + 1;
      
      // Find the closing ] (not escaped)
      while (j < markdown.length) {
        if (markdown[j] === ']' && markdown[j - 1] !== '\\') {
          break;
        }
        j++;
      }
      
      if (j < markdown.length && j + 1 < markdown.length && markdown[j + 1] === '(') {
        // This is a link! Find the closing )
        let k = j + 2;
        let parenCount = 1;
        while (k < markdown.length && parenCount > 0) {
          if (markdown[k] === '(') parenCount++;
          else if (markdown[k] === ')') parenCount--;
          k++;
        }
        
        if (parenCount === 0) {
          // Valid link found
          const linkText = markdown.slice(i + 1, j);
          
          // Add mapping for each character of link text
          for (let li = 0; li < linkText.length; li++) {
            const markdownPos = linkStart + 1 + li;
            markdownToPlain.set(markdownPos, plainPos);
            plainToMarkdown.set(plainPos, markdownPos);
            plainPos++;
          }
          plainText += linkText;
          
          // Skip to end of link
          i = k;
          continue;
        }
      }
    }
    
    // Regular character - map it directly
    markdownToPlain.set(i, plainPos);
    plainToMarkdown.set(plainPos, i);
    plainText += markdown[i];
    plainPos++;
    i++;
  }
  
  return { plainText, markdownToPlain, plainToMarkdown };
}

/**
 * Map a TextLocation result from plain text back to markdown positions
 */
function mapResultToMarkdown(
  plainResult: TextLocation,
  plainToMarkdown: Map<number, number>,
  documentText: string
): TextLocation | null {
  let markdownStart = plainToMarkdown.get(plainResult.startOffset);
  let markdownEnd = plainToMarkdown.get(plainResult.endOffset - 1);
  
  if (markdownStart === undefined || markdownEnd === undefined) {
    logger.warn('Failed to map plain text result back to markdown positions');
    return null;
  }
  
  // Check if we need to expand boundaries to include full markdown syntax
  // Look for markdown link patterns that might be partially included
  
  // Expand start boundary to include opening bracket if we're inside a link
  let expandedStart = markdownStart;
  for (let i = markdownStart - 1; i >= Math.max(0, markdownStart - 50); i--) {
    if (documentText[i] === '[' && (i === 0 || documentText[i - 1] !== '\\')) {
      // Check if this is the start of a markdown link
      let j = i + 1;
      while (j < documentText.length && documentText[j] !== ']') {
        j++;
      }
      
      if (j < documentText.length && j + 1 < documentText.length && documentText[j + 1] === '(' &&
          j >= markdownStart) { // The closing ] should be at or after our start position
        expandedStart = i;
        break;
      }
    } else if (documentText[i] === ' ' || documentText[i] === '\n') {
      // Stop expanding at word boundaries
      break;
    }
  }
  
  // Expand end boundary to include closing parenthesis if we're inside a link
  let expandedEnd = markdownEnd + 1;
  for (let i = markdownEnd + 1; i < Math.min(documentText.length, markdownEnd + 50); i++) {
    if (documentText[i] === ')') {
      // Check if this closes a markdown link that we're spanning
      let openParenPos = -1;
      let bracketClosePos = -1;
      
      // Look backwards for ]( pattern
      for (let j = i - 1; j >= expandedStart; j--) {
        if (documentText[j] === '(' && j > 0 && documentText[j - 1] === ']') {
          openParenPos = j;
          bracketClosePos = j - 1;
          break;
        }
      }
      
      if (openParenPos > 0 && bracketClosePos <= markdownEnd) {
        expandedEnd = i + 1;
        break;
      }
    } else if (documentText[i] === ' ' || documentText[i] === '\n') {
      // Stop expanding at word boundaries unless we found a closing paren
      break;
    }
  }
  
  return {
    startOffset: expandedStart,
    endOffset: expandedEnd,
    quotedText: plainResult.quotedText, // Keep the original quoted text
    strategy: 'markdown-aware-fuzzy',
    confidence: Math.max(0.6, plainResult.confidence * 0.95), // Slightly lower confidence due to mapping
  };
}

/**
 * Markdown-aware fuzzy search that strips markdown links before searching,
 * then maps results back to original positions
 */
export function markdownAwareFuzzySearch(
  searchText: string,
  documentText: string,
  options: MarkdownAwareFuzzyOptions = {}
): TextLocation | null {
  logger.debug(`Markdown-aware fuzzy search for: "${searchText.slice(0, 50)}..."`);
  
  // Quick check - only proceed if this looks like a markdown mismatch
  if (!isLikelyMarkdownMismatch(searchText, documentText)) {
    return null;
  }
  
  // Create position map and plain text version
  const { plainText, plainToMarkdown } = createPositionMap(documentText);
  
  // If plain text is same as original, no point in trying
  if (plainText === documentText) {
    return null;
  }
  
  logger.debug(`Stripped markdown: "${plainText.slice(0, 100)}..."`);
  
  // Run uFuzzy search on the plain text
  const plainResult = uFuzzySearch(searchText, plainText, options);
  if (!plainResult) {
    return null;
  }
  
  // Map the result back to markdown positions
  const mappedResult = mapResultToMarkdown(plainResult, plainToMarkdown, documentText);
  if (!mappedResult) {
    return null;
  }
  
  // Verify the mapping worked by extracting the actual text
  const actualText = documentText.slice(mappedResult.startOffset, mappedResult.endOffset);
  
  // If the actual text contains markdown syntax that would be invisible to the LLM,
  // we should preserve the full markdown text including brackets and URL
  const hasMarkdownSyntax = /(?<!\\)\]\(/.test(actualText);
  const plainTextHasMarkdown = /(?<!\\)\]\(/.test(plainResult.quotedText);
  
  if (hasMarkdownSyntax && !plainTextHasMarkdown) {
    // The mapped result spans markdown boundaries - preserve the full markdown text
    mappedResult.quotedText = actualText;
  } else {
    // Use exact match or verify it starts with expected text
    const searchTextLower = searchText.toLowerCase();
    const actualTextLower = actualText.toLowerCase();
    
    if (actualTextLower === searchTextLower || actualTextLower.startsWith(searchTextLower)) {
      mappedResult.quotedText = actualText;
    } else {
      // Fallback to plain text version for better accuracy
      mappedResult.quotedText = plainResult.quotedText;
    }
  }
  
  logger.debug(`Markdown-aware match: "${actualText}" at [${mappedResult.startOffset}, ${mappedResult.endOffset}]`);
  
  return mappedResult;
}
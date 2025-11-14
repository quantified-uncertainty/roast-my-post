/**
 * URL extraction with position tracking for accurate highlighting
 */

export interface ExtractedUrl {
  url: string;
  // Position of the URL itself in the content
  urlStartOffset: number;
  urlEndOffset: number;
  // If it's a markdown link, position of the link text
  isMarkdownLink: boolean;
  linkText?: string;
  linkTextStartOffset?: number;
  linkTextEndOffset?: number;
  // What to highlight (either link text or URL)
  highlightStartOffset: number;
  highlightEndOffset: number;
  highlightText: string;
}

/**
 * Extracts URLs from document content with their positions
 * Handles both markdown links and bare URLs
 */
export function extractUrlsWithPositions(content: string, maxUrls: number = 50): ExtractedUrl[] {
  const extractedUrls: ExtractedUrl[] = [];
  const processedPositions = new Set<string>(); // Track position ranges to avoid duplicates at same location
  const MAX_URL_LENGTH = 2048; // Reasonable limit for URL length to prevent malformed links from consuming entire document
  
  // First pass: Find all markdown links [text](url), excluding images ![text](url)
  // We need to find these first to know which URLs are part of markdown
  // More restrictive regex: no brackets or newlines in link text, max 150 chars
  // Updated to handle URLs with parentheses and optional title attributes:
  // [text](url) or [text](url "title") or [text](url 'title')
  const markdownLinkRegex = /(!?)\[([^\[\]\n]{1,150})\]\(/g;
  let match;
  
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const isImage = match[1] === '!';
    const linkText = match[2];
    const fullMatchStart = match.index;
    const urlStartPos = match.index + match[0].length; // Position after ']('
    
    // Check if the bracket is escaped (preceded by backslash)
    if (fullMatchStart > 0 && content[fullMatchStart - 1] === '\\') {
      // This is an escaped bracket, not a real markdown link
      continue;
    }
    
    // Skip images
    if (isImage) {
      continue;
    }
    
    // Manually parse the URL part to handle parentheses correctly
    // The URL can contain parentheses, and may be followed by a title attribute
    let url = '';
    let parenDepth = 0;
    let _title: string | undefined; // Title attribute (extracted but not currently used)
    
    for (let i = urlStartPos; i < content.length && url.length < MAX_URL_LENGTH; i++) {
      const char = content[i];
      
      if (char === '(') {
        parenDepth++;
        url += char;
      } else if (char === ')') {
        if (parenDepth === 0) {
          // This is the closing paren of the markdown link
          break;
        } else {
          parenDepth--;
          url += char;
        }
      } else if (char === ' ' && parenDepth === 0) {
        // Found a space after the URL - might be a title attribute
        // Check if next character is a quote
        if (i + 1 < content.length && (content[i + 1] === '"' || content[i + 1] === "'")) {
          const quoteChar = content[i + 1];
          // Extract title (for future use)
          const titleStart = i + 2;
          const titleEnd = content.indexOf(quoteChar, titleStart);
          if (titleEnd !== -1) {
            _title = content.substring(titleStart, titleEnd);
          }
          break;
        } else {
          // Space but no quote - check if next char is closing paren
          if (i + 1 < content.length && content[i + 1] === ')') {
            break;
          }
          // Otherwise, include the space in URL (might be a URL with spaces, though rare)
          url += char;
        }
      } else {
        url += char;
      }
    }
    
    url = url.trim();
    
    // Skip very short URLs
    if (url.length <= 10) {
      continue;
    }
    
    // Skip URLs that hit the length limit (likely malformed - missing closing paren)
    if (url.length >= MAX_URL_LENGTH) {
      continue;
    }
    
    // Calculate positions
    const linkTextStart = fullMatchStart + 1; // After '['
    const linkTextEnd = linkTextStart + linkText.length;
    const urlStart = urlStartPos;
    const urlEnd = urlStart + url.length;
    
    // Create a unique key for this position to avoid exact duplicates
    const positionKey = `${urlStart}-${urlEnd}`;
    if (processedPositions.has(positionKey)) {
      continue;
    }
    
    extractedUrls.push({
      url,
      urlStartOffset: urlStart,
      urlEndOffset: urlEnd,
      isMarkdownLink: true,
      linkText,
      linkTextStartOffset: linkTextStart,
      linkTextEndOffset: linkTextEnd,
      // For markdown links, we highlight the link text
      highlightStartOffset: linkTextStart,
      highlightEndOffset: linkTextEnd,
      highlightText: linkText
    });
    
    processedPositions.add(positionKey);
  }
  
  // Second pass: Find bare URLs (not in markdown links)
  // More inclusive regex that captures URLs with parentheses
  const bareUrlRegex = /https?:\/\/[^\s<>'"]+/g;
  
  while ((match = bareUrlRegex.exec(content)) !== null) {
    let url = match[0];
    const urlStart = match.index;
    
    // Trim the URL if it contains markdown syntax at the end
    // Look for ]( which indicates this might be part of a markdown link
    const mdLinkEndIndex = url.indexOf('](');
    if (mdLinkEndIndex !== -1) {
      url = url.substring(0, mdLinkEndIndex);
    }
    
    // Also trim trailing ) if not balanced
    let parenCount = 0;
    for (let i = 0; i < url.length; i++) {
      if (url[i] === '(') parenCount++;
      else if (url[i] === ')') parenCount--;
    }
    // If we have unbalanced closing parens at the end, trim them
    while (parenCount < 0 && url.endsWith(')')) {
      url = url.slice(0, -1);
      parenCount++;
    }
    
    // Check if this URL is already part of a markdown link
    // This includes both the URL part and the link text part
    const isPartOfMarkdownLink = extractedUrls.some(extracted => {
      // Check if it's in the URL part
      if (extracted.urlStartOffset <= urlStart && extracted.urlEndOffset >= urlStart + url.length) {
        return true;
      }
      // Check if it's in the link text part
      if (extracted.linkTextStartOffset !== undefined && extracted.linkTextEndOffset !== undefined) {
        if (extracted.linkTextStartOffset <= urlStart && extracted.linkTextEndOffset >= urlStart + url.length) {
          return true;
        }
      }
      return false;
    });
    
    if (isPartOfMarkdownLink) {
      continue;
    }
    
    // Check if it's part of an image markdown
    // Images look like ![text](url), so check if there's a ! before the most recent [
    const beforeUrl = content.substring(Math.max(0, urlStart - 2), urlStart);
    let isPartOfImage = false;
    
    if (beforeUrl.endsWith('](')) {
      // Find the matching opening bracket for this link
      const closeBracketPos = urlStart - 2;
      let openBracketPos = -1;
      let bracketDepth = 1;
      
      // Search backwards for the matching opening bracket
      for (let i = closeBracketPos - 1; i >= 0; i--) {
        if (content[i] === ']') bracketDepth++;
        else if (content[i] === '[') {
          bracketDepth--;
          if (bracketDepth === 0) {
            openBracketPos = i;
            break;
          }
        }
      }
      
      // Check if there's a ! before the opening bracket
      isPartOfImage = openBracketPos > 0 && content[openBracketPos - 1] === '!';
    }
    
    if (!isPartOfImage) {
      // Clean up trailing punctuation
      let cleanedUrl = url.replace(/[.,;:!?]+$/, '');
      
      // Handle brackets - remove trailing brackets if unbalanced
      const openBrackets = (cleanedUrl.match(/\[/g) || []).length;
      const closeBrackets = (cleanedUrl.match(/\]/g) || []).length;
      if (closeBrackets > openBrackets) {
        cleanedUrl = cleanedUrl.replace(/\]+$/, '');
      }
      
      // Handle parentheses - preserve balanced parentheses (e.g., Wikipedia URLs)
      // Count parentheses and only remove trailing ones if unbalanced
      let parenBalance = 0;
      let lastBalancedIndex = cleanedUrl.length;
      
      for (let i = 0; i < cleanedUrl.length; i++) {
        if (cleanedUrl[i] === '(') parenBalance++;
        else if (cleanedUrl[i] === ')') parenBalance--;
        
        if (parenBalance === 0) {
          lastBalancedIndex = i + 1;
        }
      }
      
      // If we have unbalanced closing parens at the end, trim to last balanced position
      if (parenBalance < 0) {
        cleanedUrl = cleanedUrl.substring(0, lastBalancedIndex);
      }
      
      // Skip very short URLs
      if (cleanedUrl.length <= 10) {
        continue;
      }
      
      const cleanedUrlEnd = urlStart + cleanedUrl.length;
      
      // Check if we've already processed this exact position
      const positionKey = `${urlStart}-${cleanedUrlEnd}`;
      if (processedPositions.has(positionKey)) {
        continue;
      }
      
      extractedUrls.push({
        url: cleanedUrl,
        urlStartOffset: urlStart,
        urlEndOffset: cleanedUrlEnd,
        isMarkdownLink: false,
        // For bare URLs, we highlight the URL itself
        highlightStartOffset: urlStart,
        highlightEndOffset: cleanedUrlEnd,
        highlightText: cleanedUrl
      });
      
      processedPositions.add(positionKey);
    }
  }
  
  // Sort by position in document
  extractedUrls.sort((a, b) => a.highlightStartOffset - b.highlightStartOffset);
  
  // Limit to maxUrls
  return extractedUrls.slice(0, maxUrls);
}

/**
 * Legacy function for backward compatibility
 * Extracts just the URLs as strings (deduplicated)
 */
export function extractUrls(content: string, maxUrls: number = 20): string[] {
  const extracted = extractUrlsWithPositions(content, maxUrls);
  // Deduplicate URLs for backward compatibility
  const uniqueUrls = Array.from(new Set(extracted.map(item => item.url)));
  return uniqueUrls.slice(0, maxUrls);
}
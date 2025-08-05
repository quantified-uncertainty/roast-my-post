/**
 * Extracts URLs from document content using regex patterns
 * Filters out images and email addresses
 */
export function extractUrls(content: string, maxUrls: number = 20): string[] {
  // Use an array to collect URLs with their positions to maintain document order
  const urlsWithPositions: { url: string; position: number }[] = [];
  const seenUrls = new Set<string>();
  
  // First, extract from markdown links [text](url) - but exclude images ![alt](url)
  // Use negative lookbehind to exclude ![alt](url) patterns
  const markdownMatches = [...content.matchAll(/(?<!!)(\[([^\]]*)\]\(([^)]+)\))/gi)];
  markdownMatches.forEach(match => {
    const url = match[3]; // Because of the capture group structure
    if (url && !url.startsWith('#') && url.length > 10 && !seenUrls.has(url)) {
      urlsWithPositions.push({ url, position: match.index || 0 });
      seenUrls.add(url);
    }
  });

  // Create a modified content string that excludes all markdown links (both images and regular links)
  // This prevents us from double-extracting URLs that are already in markdown format
  let remainingContent = content;
  
  // Remove markdown images: ![alt](url)
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/gi;
  remainingContent = remainingContent.replace(imagePattern, '![REMOVED_IMAGE]');
  
  // Remove markdown links: [text](url) - replace with placeholder to avoid extracting the URL again
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/gi;
  remainingContent = remainingContent.replace(linkPattern, '[REMOVED_LINK]');
  
  // Now extract standalone URLs from the remaining content
  // More permissive regex that allows brackets and parentheses in URLs
  // Stops at whitespace, quotes, or sentence-ending punctuation
  const standardUrlRegex = /https?:\/\/[^\s"'>]+/gi;
  let match;
  while ((match = standardUrlRegex.exec(remainingContent)) !== null) {
    const url = match[0];
    // Clean up trailing punctuation that might be captured
    // Be more careful about parentheses - only remove if unbalanced
    let cleaned = url.replace(/[.,;:!?\]}>]*$/, '');
    
    // Handle parentheses more intelligently - only remove trailing ) if unbalanced
    const openParens = (cleaned.match(/\(/g) || []).length;
    const closeParens = (cleaned.match(/\)/g) || []).length;
    if (closeParens > openParens) {
      // Remove extra trailing closing parentheses
      const extraClosing = closeParens - openParens;
      cleaned = cleaned.replace(new RegExp('\\)'.repeat(extraClosing) + '$'), '');
    }
    if (cleaned.length > 10 && !seenUrls.has(cleaned)) {
      // Find position in original content
      const originalPosition = content.indexOf(cleaned);
      if (originalPosition !== -1) {
        urlsWithPositions.push({ url: cleaned, position: originalPosition });
        seenUrls.add(cleaned);
      }
    }
  }

  // Extract from HTML links <a href="url">
  const htmlMatches = [...content.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)];
  htmlMatches.forEach(match => {
    const url = match[1];
    if (url && !url.startsWith('#') && !url.startsWith('mailto:') && url.length > 10 && !seenUrls.has(url)) {
      urlsWithPositions.push({ url, position: match.index || 0 });
      seenUrls.add(url);
    }
  });

  // Sort by position in document to maintain top-to-bottom order
  urlsWithPositions.sort((a, b) => a.position - b.position);

  // Filter out images, email addresses, and other non-link URLs
  const filteredUrls = urlsWithPositions
    .map(item => item.url)
    .filter(url => isValidLinkUrl(url));
  
  // Limit to maxUrls
  return filteredUrls.slice(0, maxUrls);
}

/**
 * Checks if a URL should be considered a valid link for validation
 * Focuses on protocol and basic format rather than file extensions
 * since we filter by usage context (links vs images) during extraction
 */
function isValidLinkUrl(url: string): boolean {
  // Check for email addresses (mailto: already filtered out above, but catch plain emails)
  if (url.includes('@') && !url.includes('://')) {
    return false;
  }
  
  // Check for other protocols we don't want to validate
  const excludedProtocols = ['ftp:', 'ftps:', 'tel:', 'sms:', 'file:'];
  for (const protocol of excludedProtocols) {
    if (url.toLowerCase().startsWith(protocol)) {
      return false;
    }
  }
  
  // We include all http/https URLs regardless of what they point to
  // The key distinction is made at extraction time (links vs images)
  return true;
}
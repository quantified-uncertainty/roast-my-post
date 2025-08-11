/**
 * Generates markdown prepend content for documents
 * This content is added to the beginning of documents for display and analysis
 */

export interface DocumentMetadata {
  title: string;
  author?: string | null;
  platforms?: string[] | null;
  publishedDate?: Date | string | null;
}

/**
 * Generates consistent markdown prepend content for a document
 * This ensures evaluation agents see the same metadata as displayed to users
 */
export function generateMarkdownPrepend(doc: DocumentMetadata): string {
  const dateStr = doc.publishedDate 
    ? new Date(doc.publishedDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Unknown';
    
  return `# ${doc.title}

**Author:** ${doc.author || 'Unknown'}

**Publication:** ${doc.platforms?.join(', ') || 'N/A'}

**Date Published:** ${dateStr}

---

`;
}

/**
 * Counts the number of lines in the markdown prepend
 * Useful for adjusting line number references in tests
 */
export function countPrependLines(prepend: string): number {
  return prepend.split('\n').length - 1; // Subtract 1 because split includes empty string after last newline
}

/**
 * Gets the character length of the markdown prepend
 * Useful for adjusting character offsets
 */
export function getPrependLength(prepend: string): number {
  return prepend.length;
}
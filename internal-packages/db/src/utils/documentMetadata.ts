/**
 * Generate markdown prepend for document metadata
 */
export function generateMarkdownPrepend(metadata: {
  title?: string;
  author?: string;
  platforms?: string[];
  publishedDate?: string;
}): string {
  const lines: string[] = [];
  
  if (metadata.title) {
    lines.push(`# ${metadata.title}`);
    lines.push(''); // Empty line after title
  }
  
  if (metadata.author) {
    lines.push(`**Author:** ${metadata.author}`);
  }
  
  if (metadata.platforms && metadata.platforms.length > 0) {
    lines.push(`**Publication:** ${metadata.platforms.join(', ')}`);
  }
  
  if (metadata.publishedDate) {
    // Format date if it's an ISO string
    let formattedDate = metadata.publishedDate;
    try {
      const date = new Date(metadata.publishedDate);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
    } catch {
      // Use original string if parsing fails
    }
    lines.push(`**Date Published:** ${formattedDate}`);
  }
  
  if (lines.length > 0) {
    lines.push(''); // Empty line before separator
    lines.push('---');
    lines.push(''); // Empty line after separator
  }
  
  return lines.join('\n');
}
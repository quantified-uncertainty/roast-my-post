// Function to extract headings from markdown
export function extractHeadings(markdown: string, minLevel: number = 1): { id: string; label: string; level: number }[] {
  const headings: { id: string; label: string; level: number }[] = [];
  const lines = markdown.split('\n');
  
  lines.forEach((line) => {
    // Match markdown headings (# and ##)
    const match = line.match(/^(#{1,2})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      // Create a slug from the heading text
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      if (level >= minLevel && level <= 2) { // Only include headings at minLevel or higher
        headings.push({
          id,
          label: text,
          level
        });
      }
    }
  });
  
  return headings;
}
/**
 * Extracts a title from a markdown description by using the first line
 * or the first part up to a period, whichever is shorter.
 * Falls back to truncating the description if no good break point is found.
 */
export function extractTitleFromDescription(description: string): {
  title: string;
  remainingDescription: string;
} {
  if (!description) {
    return { title: "", remainingDescription: "" };
  }

  // Remove leading/trailing whitespace
  const trimmed = description.trim();
  
  // Check if the description starts with a markdown header
  const headerMatch = trimmed.match(/^#{1,6}\s+(.+?)(\n|$)/);
  if (headerMatch) {
    const title = headerMatch[1].trim();
    const remainingDescription = trimmed.substring(headerMatch[0].length).trim();
    return { title, remainingDescription };
  }

  // Find the first line break or period, whichever comes first
  const firstNewline = trimmed.indexOf('\n');
  const firstPeriod = trimmed.indexOf('. ');
  
  let titleEnd = -1;
  
  // If we have both, use whichever comes first
  if (firstNewline !== -1 && firstPeriod !== -1) {
    titleEnd = Math.min(firstNewline, firstPeriod + 1);
  } else if (firstNewline !== -1) {
    titleEnd = firstNewline;
  } else if (firstPeriod !== -1) {
    titleEnd = firstPeriod + 1;
  }
  
  // If we found a good break point and it's not too long
  if (titleEnd !== -1 && titleEnd <= 150) {
    const title = trimmed.substring(0, titleEnd).trim();
    const remainingDescription = trimmed.substring(titleEnd).trim();
    return { title, remainingDescription };
  }
  
  // If the whole description is short, use it as the title
  if (trimmed.length <= 100) {
    return { title: trimmed, remainingDescription: "" };
  }
  
  // Otherwise, truncate at a reasonable length
  const truncateAt = 80;
  const lastSpace = trimmed.lastIndexOf(' ', truncateAt);
  const cutPoint = lastSpace > 40 ? lastSpace : truncateAt;
  
  return {
    title: trimmed.substring(0, cutPoint) + "...",
    remainingDescription: trimmed.substring(cutPoint).trim()
  };
}
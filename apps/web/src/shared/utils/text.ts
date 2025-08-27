/**
 * Text utility functions for consistent text processing across the application
 */

export const TEXT_TRUNCATION = {
  SUMMARY: 300,
  TASK: 200,
  DESCRIPTION: 500,
} as const;

/**
 * Truncates text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: "...")
 * @returns The truncated text with suffix if needed
 */
export function truncateText(
  text: string, 
  maxLength: number = TEXT_TRUNCATION.SUMMARY, 
  suffix: string = "..."
): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  
  // Try to break at a word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  
  // If we found a space in the last 20% of the string, break there
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + suffix;
  }
  
  return truncated + suffix;
}

/**
 * Truncates text for summaries (300 chars by default)
 */
export function truncateSummary(text: string): string {
  return truncateText(text, TEXT_TRUNCATION.SUMMARY);
}

/**
 * Truncates text for task descriptions (200 chars by default)
 */
export function truncateTaskDescription(text: string): string {
  return truncateText(text, TEXT_TRUNCATION.TASK);
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Converts a string to title case
 */
export function toTitleCase(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .map(word => capitalize(word))
    .join(" ");
}

/**
 * Sanitizes text for display by removing extra whitespace
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ");
}
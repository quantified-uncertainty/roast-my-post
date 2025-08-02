/**
 * Text manipulation helper functions
 */

/**
 * Get line number at a character position
 */
export function getLineNumberAtPosition(text: string, position: number): number {
  const lines = text.substring(0, position).split('\n');
  return lines.length;
}

/**
 * Get the line text at a character position
 */
export function getLineAtPosition(text: string, position: number): string {
  const lines = text.split('\n');
  const lineNumber = getLineNumberAtPosition(text, position) - 1;
  return lines[lineNumber] || '';
}
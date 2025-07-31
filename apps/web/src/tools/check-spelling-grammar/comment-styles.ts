/**
 * Styling utilities for spelling/grammar tool comments
 * Extracted from analysis-plugins for use in the tool
 */

export enum CommentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
  GOOD = 'good'
}

export const SEVERITY_STYLES = {
  [CommentSeverity.CRITICAL]: { emoji: '🚨', color: '#dc2626' }, // Red
  [CommentSeverity.HIGH]: { emoji: '⚠️', color: '#ea580c' }, // Orange
  [CommentSeverity.MEDIUM]: { emoji: '📝', color: '#ca8a04' }, // Yellow
  [CommentSeverity.LOW]: { emoji: '💡', color: '#2563eb' }, // Blue
  [CommentSeverity.INFO]: { emoji: 'ℹ️', color: '#6b7280' }, // Gray
  [CommentSeverity.GOOD]: { emoji: '✅', color: '#16a34a' } // Green
};

/**
 * Helper to wrap text with color and emoji
 */
export function styleHeader(
  text: string,
  severity: CommentSeverity,
  customEmoji?: string
): string {
  const style = SEVERITY_STYLES[severity];
  const emoji = customEmoji || style.emoji;
  return `<span style="color: ${style.color}">${emoji} ${text}</span>`;
}

/**
 * Format a diff showing removed (red, strikethrough) and added (green) content
 */
export function formatDiff(oldValue: string, newValue: string, separator: string = ' → '): string {
  const removed = `<span style="color: #dc2626; text-decoration: line-through">${oldValue}</span>`;
  const added = `<span style="color: #16a34a">${newValue}</span>`;
  return `${removed}${separator}${added}`;
}

/**
 * Format a concise correction string, handling arrow format if present
 * Used by plugins to format corrections like "teh → the" or "is → are"
 */
export function formatConciseCorrection(correction: string): string {
  // Check if correction already has arrow format
  if (correction.includes('→')) {
    // Split and apply formatting
    const parts = correction.split('→').map(s => s.trim());
    if (parts.length === 2) {
      return formatDiff(parts[0], parts[1]);
    }
  }
  // Return as-is if no arrow format
  return correction;
}

/**
 * Convert importance score (0-100) to severity
 */
export function importanceToSeverity(importance: number): CommentSeverity {
  if (importance >= 76) return CommentSeverity.HIGH;
  if (importance >= 51) return CommentSeverity.MEDIUM;
  if (importance >= 26) return CommentSeverity.LOW;
  return CommentSeverity.INFO;
}
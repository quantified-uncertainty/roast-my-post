/**
 * Shared styling utilities for plugin comments
 * Each plugin maintains its own comment generation logic but can use these helpers
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
 * Convert importance score (0-10) to severity
 */
export function importanceToSeverity(importance: number): CommentSeverity {
  if (importance >= 9) return CommentSeverity.CRITICAL;
  if (importance >= 7) return CommentSeverity.HIGH;
  if (importance >= 5) return CommentSeverity.MEDIUM;
  if (importance >= 3) return CommentSeverity.LOW;
  return CommentSeverity.INFO;
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
 * Format a smart diff that only colors the changed parts
 * Best for similar strings where only a small part changes
 */
export function formatSmartDiff(oldValue: string, newValue: string, separator: string = ' → '): string {
  // For very different strings, just use regular diff
  if (oldValue.length < 5 || newValue.length < 5) {
    return formatDiff(oldValue, newValue, separator);
  }
  
  // Calculate similarity ratio
  const longerLength = Math.max(oldValue.length, newValue.length);
  const shorterLength = Math.min(oldValue.length, newValue.length);
  
  // If strings are very different in length, use regular diff
  if (shorterLength / longerLength < 0.5) {
    return formatDiff(oldValue, newValue, separator);
  }
  
  // Try to find common prefix and suffix
  let commonPrefix = '';
  let commonSuffix = '';
  
  // Find common prefix
  for (let i = 0; i < Math.min(oldValue.length, newValue.length); i++) {
    if (oldValue[i] === newValue[i]) {
      commonPrefix += oldValue[i];
    } else {
      break;
    }
  }
  
  // Find common suffix (but not overlapping with prefix)
  const oldRemainder = oldValue.slice(commonPrefix.length);
  const newRemainder = newValue.slice(commonPrefix.length);
  
  for (let i = 0; i < Math.min(oldRemainder.length, newRemainder.length); i++) {
    const oldIdx = oldRemainder.length - 1 - i;
    const newIdx = newRemainder.length - 1 - i;
    if (oldRemainder[oldIdx] === newRemainder[newIdx]) {
      commonSuffix = oldRemainder[oldIdx] + commonSuffix;
    } else {
      break;
    }
  }
  
  // Extract the actual different parts
  const oldDiff = oldValue.slice(commonPrefix.length, oldValue.length - commonSuffix.length);
  const newDiff = newValue.slice(commonPrefix.length, newValue.length - commonSuffix.length);
  
  // If we don't have much in common, use regular diff
  const commonRatio = (commonPrefix.length + commonSuffix.length) / longerLength;
  if (commonRatio < 0.3) {
    return formatDiff(oldValue, newValue, separator);
  }
  
  // Build the formatted output
  let result = '';
  
  if (commonPrefix) {
    result += commonPrefix;
  }
  
  result += `<span style="color: #dc2626; text-decoration: line-through">${oldDiff}</span>`;
  result += separator;
  
  if (commonPrefix) {
    result += commonPrefix;
  }
  
  result += `<span style="color: #16a34a">${newDiff}</span>`;
  
  if (commonSuffix) {
    result += commonSuffix;
  }
  
  return result;
}

/**
 * Format an inline diff (no separator, for spelling corrections)
 */
export function formatInlineDiff(oldValue: string, newValue: string): string {
  const removed = `<span style="color: #dc2626; text-decoration: line-through">${oldValue}</span>`;
  const added = `<span style="color: #16a34a">${newValue}</span>`;
  return `${removed}${added}`;
}
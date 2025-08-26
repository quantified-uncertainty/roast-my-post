/**
 * Shared status color configuration for consistency across the application
 * Used for job statuses, evaluation statuses, and status badges
 */

export const STATUS_COLORS = {
  pending: {
    bg: "bg-amber-100",
    text: "text-amber-600",
    border: "border-amber-200",
  },
  running: {
    bg: "bg-blue-100",
    text: "text-blue-600",
    border: "border-blue-200",
  },
  completed: {
    bg: "bg-green-100",
    text: "text-green-600",
    border: "border-green-200",
  },
  failed: {
    bg: "bg-red-100",
    text: "text-red-600",
    border: "border-red-200",
  },
  not_started: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
  },
} as const;

/**
 * Get text color class for a status
 */
export function getStatusTextColor(status: keyof typeof STATUS_COLORS): string {
  return STATUS_COLORS[status]?.text || STATUS_COLORS.not_started.text;
}

/**
 * Get background color class for a status
 */
export function getStatusBgColor(status: keyof typeof STATUS_COLORS): string {
  return STATUS_COLORS[status]?.bg || STATUS_COLORS.not_started.bg;
}

/**
 * Get border color class for a status
 */
export function getStatusBorderColor(status: keyof typeof STATUS_COLORS): string {
  return STATUS_COLORS[status]?.border || STATUS_COLORS.not_started.border;
}
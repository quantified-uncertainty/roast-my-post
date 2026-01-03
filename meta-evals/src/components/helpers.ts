/**
 * Shared helper functions for CLI components
 */

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatStatus(status: string): string {
  switch (status) {
    case "COMPLETED": return "Done";
    case "RUNNING": return "Running";
    case "FAILED": return "Failed";
    case "PENDING": return "Pending";
    default: return status;
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case "COMPLETED": return "\u2713";
    case "RUNNING": return "\u23F3";
    case "FAILED": return "\u2717";
    case "PENDING": return "\u23F8";
    default: return "?";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED": return "green";
    case "RUNNING": return "yellow";
    case "FAILED": return "red";
    case "PENDING": return "gray";
    default: return "white";
  }
}

/**
 * Shared helper functions for CLI components
 */

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
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

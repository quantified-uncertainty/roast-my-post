// Display formatting utilities

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function truncate(str: string, maxLen: number): string {
  const clean = str.replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + "...";
}

export function formatStatus(status: string): string {
  switch (status) {
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "unchanged":
      return "Unchanged";
    case "changed":
      return "Changed";
    default:
      return status;
  }
}

export function formatFilterStage(stage: string): string {
  switch (stage) {
    case "supported-elsewhere-filter":
      return "Filter";
    case "review":
      return "Review";
    default:
      return stage;
  }
}

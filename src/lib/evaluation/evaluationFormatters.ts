// Evaluation formatting utilities

export function formatDuration(durationInSeconds: number): string {
  if (durationInSeconds < 60) {
    return `${Math.round(durationInSeconds)}s`;
  }
  return `${Math.floor(durationInSeconds / 60)}m ${Math.round(durationInSeconds % 60)}s`;
}

export function formatCost(costInCents: number): string {
  return `$${(costInCents / 100).toFixed(3)}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
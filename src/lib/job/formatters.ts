/**
 * Shared formatting utilities for job display
 */

export function formatCost(costInCents?: number | null): string {
  if (!costInCents) return "—";
  return `$${(costInCents / 100).toFixed(4)}`;
}

export function formatCostFromDollars(priceInDollars?: number | null | string): string {
  if (!priceInDollars) return "—";
  const price = typeof priceInDollars === 'string' ? parseFloat(priceInDollars) : priceInDollars;
  return `$${price.toFixed(4)}`;
}

export function formatDuration(durationInSeconds?: number | null): string {
  if (!durationInSeconds) return "—";
  
  if (durationInSeconds < 60) {
    return `${durationInSeconds}s`;
  }
  
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays}d ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours}h ago`;
  } else {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMinutes}m ago`;
  }
}

export function formatTaskPrice(priceInDollars: number): string {
  return `$${priceInDollars.toFixed(6)}`;
}
export function nextReset(now: Date, interval: 'hour' | 'month'): Date {
  const next = new Date(now);
  if (interval === 'hour') next.setHours(next.getHours() + 1, 0, 0, 0);
  else if (interval === 'month') {
    next.setMonth(next.getMonth() + 1, 1);
    next.setHours(0, 0, 0, 0);
  }
  return next;
}

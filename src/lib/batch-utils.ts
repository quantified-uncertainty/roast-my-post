/**
 * Utility functions for batch operations
 */

export interface JobStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
}

export interface JobWithStatus {
  status: string;
}

/**
 * Calculate job statistics from an array of jobs
 * @param jobs Array of jobs with at least a status property
 * @returns JobStats object with counts for each status
 */
export function calculateJobStats(jobs: JobWithStatus[]): JobStats {
  const stats: JobStats = {
    total: jobs.length,
    completed: 0,
    failed: 0,
    running: 0,
    pending: 0,
  };

  for (const job of jobs) {
    switch (job.status) {
      case 'COMPLETED':
        stats.completed++;
        break;
      case 'FAILED':
        stats.failed++;
        break;
      case 'RUNNING':
        stats.running++;
        break;
      case 'PENDING':
        stats.pending++;
        break;
      // Ignore unknown statuses
    }
  }

  return stats;
}

/**
 * Calculate success rate from job statistics
 * @param stats JobStats object
 * @returns Success rate as a percentage (0-100)
 */
export function calculateSuccessRate(stats: JobStats): number {
  const totalCompleted = stats.completed + stats.failed;
  if (totalCompleted === 0) return 0;
  return (stats.completed / totalCompleted) * 100;
}
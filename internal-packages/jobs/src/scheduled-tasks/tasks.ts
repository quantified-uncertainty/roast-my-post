import { updateJobCostsFromHelicone } from './helicone-poller';
import { logger } from '../utils/logger';

/**
 * Runs a scheduled task in a loop at the specified interval.
 * @param task The scheduled task to run
 * @param isShuttingDown A function that returns true if the process is shutting down
 */
export async function runScheduledTask(task: ScheduledTask, isShuttingDown: () => boolean) {
  try {
    logger.info(`Starting scheduler for task: "${task.name}" (runs every ${task.intervalMs/1000}s)`);

    while (!isShuttingDown()) {
      // Wait for the interval first, so it doesn't run on immediate startup
      await new Promise(resolve => setTimeout(resolve, task.intervalMs));
      if (isShuttingDown()) break;

      try {
        await task.execute();
      } catch (error) {
        logger.error(`Error in scheduled task "${task.name}":`, error);
      }
    }
    logger.info(`Scheduler for task "${task.name}" stopped.`);
  } catch (error) {
    logger.error(`Unhandled exception in scheduler for "${task.name}":`, error);
  }
}

/**
 * Starts all scheduled tasks.
 * @param isShuttingDown A function that returns true if the process is shutting down
 */
export async function startScheduledTasks(isShuttingDown: () => boolean) {
  tasks.forEach(task => {
    runScheduledTask(task, isShuttingDown);
  });
}


// --- Task Definitions ---

export interface ScheduledTask {
  name: string;
  intervalMs: number;
  execute: () => Promise<void>;
}

export const tasks: ScheduledTask[] = [
  {
    name: 'Helicone Job Cost Updater',
    intervalMs: 30000, // Poll every 30 seconds
    execute: updateJobCostsFromHelicone,
  },
  // You can add more tasks here in the future
];

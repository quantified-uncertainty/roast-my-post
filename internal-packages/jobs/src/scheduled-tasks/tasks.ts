/**
 * The logic for a single scheduled task.
 * This is where you'd query your external service.
 */
async function queryExternalService() {
  console.log('\n  -> [External Service Query] Running...');
  // Simulating async work
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('  <- [External Service Query] Finished.');
}

/**
 * Runs a scheduled task in a loop at the specified interval.
 * @param task The scheduled task to run
 * @param isShuttingDown A function that returns true if the process is shutting down
 */
export async function runScheduledTask(task: ScheduledTask, isShuttingDown: () => boolean) {
  try {
    console.log(`\n✨ Starting scheduler for task: "${task.name}" (runs every ${task.intervalMs/1000}s)`);

    while (!isShuttingDown()) {
      // Wait for the interval first, so it doesn't run on immediate startup
      await new Promise(resolve => setTimeout(resolve, task.intervalMs));
      if (isShuttingDown()) break;

      try {
        await task.execute();
      } catch (error) {
        console.error(`❌ Error in scheduled task "${task.name}":`, error);
      }
    }
    console.log(`🛑 Scheduler for task "${task.name}" stopped.`);
  } catch (error) {
    console.error(`❌ Unhandled exception in scheduler for "${task.name}":`, error);
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
    name: 'External Service Query',
    intervalMs: 30000,
    execute: queryExternalService,
  },
  // You can add more tasks here in the future
];

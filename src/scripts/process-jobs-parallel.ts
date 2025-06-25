#!/usr/bin/env tsx

import { spawn, ChildProcess } from "child_process";
import { logger } from "@/lib/logger";

// Configuration
const DEFAULT_WORKERS = 5;
const WORKER_TIMEOUT_MS = 120000; // 2 minutes
const LOOP_DELAY_MS = 1000; // 1 second between checks
const KILL_GRACE_PERIOD_MS = 5000; // 5 seconds before SIGKILL

interface WorkerInfo {
  id: number;
  process: ChildProcess | null;
  isProcessing: boolean;
  jobsProcessed: number;
  lastActivity: Date;
}

class ParallelJobProcessor {
  private workers: Map<number, WorkerInfo> = new Map();
  private workerCount: number;
  private isShuttingDown = false;
  private consecutiveEmptyRuns = 0;
  private totalJobsProcessed = 0;

  constructor(workerCount: number = DEFAULT_WORKERS) {
    this.workerCount = workerCount;
    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      logger.info('\n🛑 Shutting down workers...');
      
      // Kill all worker processes
      for (const [id, worker] of this.workers) {
        if (worker.process) {
          console.log(`  Terminating worker ${id}...`);
          worker.process.kill('SIGTERM');
        }
      }
      
      // Give them time to exit gracefully
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force kill any remaining processes
      for (const [id, worker] of this.workers) {
        if (worker.process && !worker.process.killed) {
          console.log(`  Force killing worker ${id}...`);
          worker.process.kill('SIGKILL');
        }
      }
      
      logger.info('👋 All workers shut down. Exiting...');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private async spawnWorker(workerId: number): Promise<{ success: boolean; hadWork: boolean }> {
    return new Promise((resolve, reject) => {
      const worker = this.workers.get(workerId) || {
        id: workerId,
        process: null,
        isProcessing: false,
        jobsProcessed: 0,
        lastActivity: new Date(),
      };

      // Track that this worker is processing
      worker.isProcessing = true;
      worker.lastActivity = new Date();
      this.workers.set(workerId, worker);

      const childProcess = spawn("npm", ["run", "process-jobs"], {
        stdio: this.consecutiveEmptyRuns > 0 ? "pipe" : "inherit",
        shell: true,
      });

      worker.process = childProcess;

      let isResolved = false;
      let stdout = "";
      let stderr = "";

      // Capture output when in silent mode
      if (this.consecutiveEmptyRuns > 0) {
        childProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        childProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      // Set timeout for hanging processes
      const timeout = setTimeout(() => {
        if (!isResolved && !this.isShuttingDown) {
          console.log(`\n⏰ Worker ${workerId} timeout - terminating...`);
          childProcess.kill('SIGTERM');
          setTimeout(() => {
            if (!isResolved && childProcess.pid && !childProcess.killed) {
              console.log(`💀 Force killing worker ${workerId}...`);
              childProcess.kill('SIGKILL');
            }
          }, KILL_GRACE_PERIOD_MS);
        }
      }, WORKER_TIMEOUT_MS);

      childProcess.on("error", (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          worker.isProcessing = false;
          worker.process = null;
          console.error(`❌ Worker ${workerId} error:`, error);
          reject(error);
        }
      });

      childProcess.on("exit", (code, signal) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          worker.isProcessing = false;
          worker.process = null;

          // Check if any work was done by looking at output or execution time
          const hadWork = stdout.includes("Processing job") || 
                         stderr.includes("Processing job") ||
                         !stdout.includes("No pending jobs");

          if (hadWork) {
            worker.jobsProcessed++;
            this.totalJobsProcessed++;
          }

          if (code === 0 || code === null) {
            resolve({ success: true, hadWork });
          } else {
            reject(new Error(`Worker ${workerId} exited with code ${code}`));
          }
        }
      });
    });
  }

  private async runWorkerPool() {
    const activeWorkers: Promise<void>[] = [];

    // Start workers
    for (let i = 1; i <= this.workerCount; i++) {
      const workerPromise = this.spawnWorker(i)
        .then(({ hadWork }) => {
          if (hadWork) {
            this.consecutiveEmptyRuns = 0;
            const worker = this.workers.get(i);
            if (worker) {
              console.log(`✅ Worker ${i} completed job (total: ${worker.jobsProcessed})`);
            }
          }
        })
        .catch((error) => {
          console.error(`❌ Worker ${i} failed:`, error.message);
        });

      activeWorkers.push(workerPromise);
    }

    // Wait for all workers to complete
    const results = await Promise.allSettled(activeWorkers);
    
    // Check if any worker found work
    const anyWorkDone = results.some((result) => 
      result.status === 'fulfilled'
    );

    return anyWorkDone;
  }

  async start() {
    console.log(`🚀 Starting parallel job processor with ${this.workerCount} workers...`);
    logger.info('Press Ctrl+C to stop\n');

    let iteration = 0;

    while (!this.isShuttingDown) {
      try {
        iteration++;
        const startTime = Date.now();

        // Show status for non-empty runs
        if (this.consecutiveEmptyRuns === 0) {
          console.log(`\n🔄 Iteration ${iteration} - Spawning ${this.workerCount} workers...`);
        }

        const anyWorkDone = await this.runWorkerPool();
        
        const duration = Math.round((Date.now() - startTime) / 1000);

        if (!anyWorkDone) {
          this.consecutiveEmptyRuns++;
          if (this.consecutiveEmptyRuns === 1) {
            console.log(`💤 No jobs found (will show dots for subsequent empty runs)`);
          } else {
            process.stdout.write('.');
          }
        } else {
          if (this.consecutiveEmptyRuns > 0) {
            console.log(`\n🎯 Found jobs after ${this.consecutiveEmptyRuns} empty runs`);
          }
          this.consecutiveEmptyRuns = 0;
          console.log(`✨ Iteration ${iteration} completed in ${duration}s`);
          console.log(`📊 Total jobs processed: ${this.totalJobsProcessed}`);
        }

        // Brief pause before next iteration
        await new Promise(resolve => setTimeout(resolve, LOOP_DELAY_MS));

      } catch (error) {
        console.error(`\n❌ Error in iteration ${iteration}:`, error);
        this.consecutiveEmptyRuns = 0;
        await new Promise(resolve => setTimeout(resolve, LOOP_DELAY_MS));
      }
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let workerCount = DEFAULT_WORKERS;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-n' || args[i] === '--workers') {
    const count = parseInt(args[i + 1], 10);
    if (!isNaN(count) && count > 0 && count <= 20) {
      workerCount = count;
    } else {
      console.error(`Invalid worker count: ${args[i + 1]}. Must be between 1 and 20.`);
      process.exit(1);
    }
  }
  if (args[i] === '-h' || args[i] === '--help') {
    console.log(`
Usage: npm run process-jobs-parallel [options]

Options:
  -n, --workers <count>  Number of parallel workers (default: ${DEFAULT_WORKERS}, max: 20)
  -h, --help            Show this help message

Example:
  npm run process-jobs-parallel -n 10
`);
    process.exit(0);
  }
}

// Start the processor
const processor = new ParallelJobProcessor(workerCount);
processor.start().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
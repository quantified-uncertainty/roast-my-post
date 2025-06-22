#!/usr/bin/env tsx

import { spawn, ChildProcess } from "child_process";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

// Configuration
const DEFAULT_MAX_WORKERS = 5;
const POLL_INTERVAL_MS = 1000; // Check for jobs every second
const WORKER_TIMEOUT_MS = 120000; // 2 minutes
const KILL_GRACE_PERIOD_MS = 5000; // 5 seconds before SIGKILL

interface WorkerInfo {
  id: number;
  process: ChildProcess;
  startTime: Date;
}

class AdaptiveJobProcessor {
  private activeWorkers: Map<number, WorkerInfo> = new Map();
  private maxWorkers: number;
  private isShuttingDown = false;
  private consecutiveEmptyChecks = 0;
  private totalJobsProcessed = 0;
  private nextWorkerId = 1;
  private lastState: 'idle' | 'working' | 'waiting' = 'idle';

  constructor(maxWorkers: number = DEFAULT_MAX_WORKERS) {
    this.maxWorkers = maxWorkers;
    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      if (this.activeWorkers.size > 0) {
        console.log("\n🛑 Shutting down workers...");
        
        // Kill all worker processes
        for (const [id, worker] of this.activeWorkers) {
          console.log(`  Terminating worker ${id}...`);
          worker.process.kill('SIGTERM');
        }
        
        // Give them time to exit gracefully
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force kill any remaining processes
        for (const [id, worker] of this.activeWorkers) {
          if (!worker.process.killed) {
            console.log(`  Force killing worker ${id}...`);
            worker.process.kill('SIGKILL');
          }
        }
      }
      
      console.log("\n👋 Shutting down. Goodbye!");
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private async checkPendingJobs(): Promise<number> {
    const count = await prisma.job.count({
      where: { status: JobStatus.PENDING }
    });
    return count;
  }

  private async spawnWorker(): Promise<void> {
    const workerId = this.nextWorkerId++;
    
    return new Promise((resolve, reject) => {
      console.log(`🚀 Spawning worker ${workerId}...`);

      const childProcess = spawn("npm", ["run", "process-jobs"], {
        stdio: "pipe", // Always pipe to capture output
        shell: true,
      });

      const worker: WorkerInfo = {
        id: workerId,
        process: childProcess,
        startTime: new Date(),
      };

      this.activeWorkers.set(workerId, worker);

      let stdout = "";
      let stderr = "";
      let isResolved = false;

      // Capture output
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout for hanging processes
      const timeout = setTimeout(() => {
        if (!isResolved && !this.isShuttingDown) {
          console.log(`⏰ Worker ${workerId} timeout - terminating...`);
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
          this.activeWorkers.delete(workerId);
          console.error(`❌ Worker ${workerId} error:`, error);
          reject(error);
        }
      });

      childProcess.on("exit", (code, signal) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          this.activeWorkers.delete(workerId);

          // Check if any work was done
          const hadWork = stdout.includes("Processing job") || 
                         stderr.includes("Processing job") ||
                         !stdout.includes("No pending jobs");

          if (hadWork) {
            this.totalJobsProcessed++;
            const duration = Math.round((Date.now() - worker.startTime.getTime()) / 1000);
            console.log(`✅ Worker ${workerId} completed job in ${duration}s (Total processed: ${this.totalJobsProcessed})`);
          } else {
            console.log(`💤 Worker ${workerId} found no jobs`);
          }

          if (code === 0 || code === null) {
            resolve();
          } else {
            reject(new Error(`Worker ${workerId} exited with code ${code}`));
          }
        }
      });
    });
  }

  async start() {
    console.log(`🚀 Starting adaptive job processor (max workers: ${this.maxWorkers})`);
    console.log("Press Ctrl+C to stop\n");

    while (!this.isShuttingDown) {
      try {
        // Check for pending jobs
        const pendingCount = await this.checkPendingJobs();
        const currentWorkers = this.activeWorkers.size;
        
        if (pendingCount > 0) {
          // We have pending jobs
          if (this.lastState === 'idle') {
            // Transitioning from idle to working
            if (this.consecutiveEmptyChecks > 0) {
              console.log(''); // New line after dots
            }
            console.log(`\n🎯 Found ${pendingCount} pending job${pendingCount > 1 ? 's' : ''}!`);
            this.consecutiveEmptyChecks = 0;
          }
          
          // Calculate how many workers to spawn
          const workersToSpawn = Math.min(
            pendingCount - currentWorkers,
            this.maxWorkers - currentWorkers
          );
          
          if (workersToSpawn > 0) {
            this.lastState = 'working';
            console.log(`🔧 Active workers: ${currentWorkers}, spawning ${workersToSpawn} more...`);
            
            // Spawn workers in parallel
            const workerPromises: Promise<void>[] = [];
            for (let i = 0; i < workersToSpawn; i++) {
              workerPromises.push(
                this.spawnWorker().catch(error => {
                  console.error(`Failed to spawn worker:`, error.message);
                })
              );
            }
            
            // Don't wait for workers to complete, just spawn them
            Promise.all(workerPromises).then(() => {
              // Workers completed, loop will check again
            });
          } else if (currentWorkers > 0) {
            // We have workers but don't need more
            if (this.lastState !== 'waiting') {
              console.log(`⏳ ${currentWorkers} worker${currentWorkers > 1 ? 's' : ''} processing ${pendingCount} job${pendingCount > 1 ? 's' : ''}...`);
              this.lastState = 'waiting';
            }
            // Otherwise stay quiet while workers are processing
          }
        } else {
          // No pending jobs
          if (currentWorkers === 0) {
            // No workers and no jobs - we're idle
            if (this.lastState !== 'idle') {
              console.log(`\n💤 No pending jobs found`);
              this.lastState = 'idle';
            }
            this.consecutiveEmptyChecks++;
            
            if (this.consecutiveEmptyChecks > 1) {
              if (this.consecutiveEmptyChecks % 60 === 0) {
                // Print newline every minute to show we're still alive
                process.stdout.write('\n💤 Still waiting for jobs...\n');
              } else {
                process.stdout.write('.');
              }
            }
          } else {
            // Workers still running but no new jobs
            if (this.lastState !== 'waiting') {
              console.log(`⏳ ${currentWorkers} worker${currentWorkers > 1 ? 's' : ''} finishing up...`);
              this.lastState = 'waiting';
            }
          }
        }
        
        // Brief pause before next check
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        
      } catch (error) {
        console.error(`\n❌ Error in main loop:`, error);
        this.consecutiveEmptyChecks = 0;
        this.lastState = 'idle';
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let maxWorkers = DEFAULT_MAX_WORKERS;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-n' || args[i] === '--max-workers') {
    const count = parseInt(args[i + 1], 10);
    if (!isNaN(count) && count > 0 && count <= 20) {
      maxWorkers = count;
    } else {
      console.error(`Invalid worker count: ${args[i + 1]}. Must be between 1 and 20.`);
      process.exit(1);
    }
  }
  if (args[i] === '-h' || args[i] === '--help') {
    console.log(`
Usage: npm run process-jobs-adaptive [options]

Options:
  -n, --max-workers <count>  Maximum parallel workers (default: ${DEFAULT_MAX_WORKERS}, max: 20)
  -h, --help                Show this help message

Example:
  npm run process-jobs-adaptive -n 10

This adaptive processor:
- Starts with no workers (quiet when idle)
- Spawns workers only when jobs are detected
- Each worker processes one job then exits
- Shows dots during idle periods
- Limits concurrent workers to the specified maximum
`);
    process.exit(0);
  }
}

// Suppress the punycode deprecation warning
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return;
  }
  console.warn(warning);
});

// Start the processor
const processor = new AdaptiveJobProcessor(maxWorkers);
processor.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
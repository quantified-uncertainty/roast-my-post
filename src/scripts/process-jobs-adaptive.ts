#!/usr/bin/env tsx
import {
  ChildProcess,
  spawn,
} from "child_process";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

// Configuration with environment variable support
const DEFAULT_MAX_WORKERS = parseInt(process.env.ADAPTIVE_MAX_WORKERS || '5', 10);
const POLL_INTERVAL_MS = parseInt(process.env.ADAPTIVE_POLL_INTERVAL_MS || '1000', 10);
const WORKER_TIMEOUT_MS = parseInt(process.env.ADAPTIVE_WORKER_TIMEOUT_MS || '240000', 10); // 4 minutes default
const KILL_GRACE_PERIOD_MS = parseInt(process.env.ADAPTIVE_KILL_GRACE_PERIOD_MS || '5000', 10);
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.ADAPTIVE_SHUTDOWN_TIMEOUT_MS || '30000', 10); // 30s to finish jobs
const STALE_JOB_CHECK_INTERVAL_MS = parseInt(process.env.ADAPTIVE_STALE_CHECK_INTERVAL_MS || '300000', 10); // 5 minutes
const STALE_JOB_TIMEOUT_MS = parseInt(process.env.ADAPTIVE_STALE_JOB_TIMEOUT_MS || '1800000', 10); // 30 minutes

interface WorkerInfo {
  id: number;
  process: ChildProcess;
  startTime: Date;
  jobId?: string; // Track which job this worker is processing
  isDraining?: boolean; // Mark worker as draining during shutdown
}

class AdaptiveJobProcessor {
  private activeWorkers: Map<number, WorkerInfo> = new Map();
  private maxWorkers: number;
  private isShuttingDown = false;
  private consecutiveEmptyChecks = 0;
  private totalJobsProcessed = 0;
  private totalErrors = 0;
  private nextWorkerId = 1;
  private lastState: "idle" | "working" | "waiting" = "idle";
  private startTime = new Date();
  private lastStaleCheckTime = new Date();
  private jobWorkerMap = new Map<string, number>(); // Track which worker is processing which job

  constructor(maxWorkers: number = DEFAULT_MAX_WORKERS) {
    this.maxWorkers = maxWorkers;
    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      if (this.activeWorkers.size > 0) {
        logger.info("\n🛑 Initiating graceful shutdown...");
        console.log(`⏳ Allowing up to ${SHUTDOWN_TIMEOUT_MS/1000}s for workers to finish current jobs\n`);

        // Mark all workers as draining (no new jobs)
        for (const [id, worker] of this.activeWorkers) {
          worker.isDraining = true;
          console.log(`  🚫 Worker ${id}: No new jobs (draining)`);
        }

        // Wait for workers to finish current jobs with timeout
        const shutdownStart = Date.now();
        while (this.activeWorkers.size > 0 && (Date.now() - shutdownStart) < SHUTDOWN_TIMEOUT_MS) {
          const workingCount = Array.from(this.activeWorkers.values())
            .filter(w => w.jobId).length;
          
          if (workingCount > 0) {
            console.log(`  ⏳ Waiting for ${workingCount} worker(s) to finish current jobs...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            break;
          }
        }

        // Gracefully terminate idle workers
        for (const [id, worker] of this.activeWorkers) {
          if (!worker.jobId) {
            console.log(`  ✅ Worker ${id}: Idle, terminating gracefully`);
            worker.process.kill("SIGTERM");
          }
        }

        // Give them time to exit gracefully
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Force kill any remaining processes
        for (const [id, worker] of this.activeWorkers) {
          if (!worker.process.killed) {
            console.log(`  💀 Worker ${id}: Force killing (was processing job)`);
            worker.process.kill("SIGKILL");
          }
        }
      }

      // Show final statistics
      const runtime = Math.round(
        (Date.now() - this.startTime.getTime()) / 1000
      );
      console.log(`\n📊 Final stats:`);
      console.log(`   Total jobs processed: ${this.totalJobsProcessed}`);
      console.log(`   Total errors: ${this.totalErrors}`);
      console.log(`   Runtime: ${runtime}s`);
      
      logger.info("\n👋 Shutting down. Goodbye!");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  private async checkPendingJobs(): Promise<number> {
    const count = await prisma.job.count({
      where: { status: JobStatus.PENDING },
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

      // Capture output and track job processing
      childProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        
        // Track when worker starts processing a job
        const jobMatch = output.match(/Processing job ([a-zA-Z0-9-]+)/i);
        if (jobMatch) {
          worker.jobId = jobMatch[1];
          this.jobWorkerMap.set(worker.jobId, workerId);
          console.log(`  🔄 Worker ${workerId} started processing job ${worker.jobId}`);
        }
      });

      childProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Set timeout for hanging processes
      const timeout = setTimeout(() => {
        if (!isResolved && !this.isShuttingDown) {
          console.error(`\n⏰ Worker ${workerId} timeout after ${WORKER_TIMEOUT_MS/1000}s - terminating...`);
          
          // Mark job as failed if worker was processing one
          if (worker.jobId) {
            console.error(`   🔥 Job ${worker.jobId} needs recovery (worker timeout)`);
            this.markJobAsFailed(worker.jobId, `Worker ${workerId} timed out after ${WORKER_TIMEOUT_MS/1000}s`);
          }
          
          // Show what the worker was doing
          if (stdout.trim()) {
            const lastLines = stdout.trim().split('\n').slice(-3);
            console.error(`   Last output:`);
            lastLines.forEach(line => {
              console.error(`     ${line}`);
            });
          }
          
          childProcess.kill("SIGTERM");
          setTimeout(() => {
            if (!isResolved && childProcess.pid && !childProcess.killed) {
              console.error(`💀 Force killing worker ${workerId}...`);
              childProcess.kill("SIGKILL");
            }
          }, KILL_GRACE_PERIOD_MS);
        }
      }, WORKER_TIMEOUT_MS);

      childProcess.on("error", (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          this.activeWorkers.delete(workerId);
          this.totalErrors++;
          console.error(`\n❌ Worker ${workerId} spawn error:`, error.message);
          reject(error);
        }
      });

      childProcess.on("exit", (code, signal) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          this.activeWorkers.delete(workerId);
          
          // Clean up job tracking
          if (worker.jobId) {
            this.jobWorkerMap.delete(worker.jobId);
          }

          // Check if any work was done
          const hadWork =
            stdout.includes("Processing job") ||
            stderr.includes("Processing job") ||
            !stdout.includes("No pending jobs");

          if (hadWork) {
            this.totalJobsProcessed++;
            const duration = Math.round(
              (Date.now() - worker.startTime.getTime()) / 1000
            );
            const jobInfo = worker.jobId ? ` (job ${worker.jobId})` : '';
            console.log(
              `✅ Worker ${workerId} completed job${jobInfo} in ${duration}s (Total processed: ${this.totalJobsProcessed})`
            );
            // Worker successfully processed a job, resolve even if exit code is non-zero
            resolve();
          } else if (code === 0 || stdout.includes("No pending jobs") || worker.isDraining) {
            // Worker found no jobs, exited cleanly, or was draining
            if (!worker.isDraining) {
              console.log(`💤 Worker ${workerId} found no jobs`);
            }
            resolve();
          } else {
            // Worker failed
            this.totalErrors++;
            console.error(`\n❌ Worker ${workerId} failed with exit code ${code}`);
            
            // If worker was processing a job, mark it as failed
            if (worker.jobId) {
              console.error(`   🔥 Job ${worker.jobId} needs recovery (worker died)`);
              this.markJobAsFailed(worker.jobId, `Worker ${workerId} crashed with exit code ${code}`);
            }
            
            // Show the actual error output
            if (stderr.trim()) {
              console.error(`   Error output:`);
              stderr.trim().split('\n').forEach(line => {
                console.error(`     ${line}`);
              });
            }
            
            // Also check stdout for error messages
            if (stdout.includes('Error:') || stdout.includes('error:')) {
              const errorLines = stdout.split('\n').filter(line => 
                line.toLowerCase().includes('error') || 
                line.includes('❌') ||
                line.includes('Failed')
              );
              if (errorLines.length > 0) {
                console.error(`   Output errors:`);
                errorLines.forEach(line => {
                  console.error(`     ${line.trim()}`);
                });
              }
            }
            
            reject(new Error(`Worker ${workerId} exited with code ${code}`));
          }
        }
      });
    });
  }

  private async markJobAsFailed(jobId: string, errorMessage: string) {
    try {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          error: errorMessage,
          completedAt: new Date()
        }
      });
      console.log(`   ✅ Marked job ${jobId} as FAILED`);
    } catch (error) {
      console.error(`   ❌ Failed to update job ${jobId} status:`, error);
    }
  }

  private async cleanupStaleJobs() {
    const cutoffTime = new Date();
    cutoffTime.setTime(cutoffTime.getTime() - STALE_JOB_TIMEOUT_MS);
    
    try {
      const staleJobs = await prisma.job.findMany({
        where: {
          status: JobStatus.RUNNING,
          startedAt: {
            lt: cutoffTime
          }
        },
        select: {
          id: true,
          startedAt: true
        }
      });
      
      if (staleJobs.length > 0) {
        console.log(`\n🧹 Found ${staleJobs.length} stale job(s) to clean up`);
        
        for (const job of staleJobs) {
          const runningTime = job.startedAt ? 
            Math.round((Date.now() - job.startedAt.getTime()) / 1000 / 60) : 
            'unknown';
          
          // Check if we're tracking this job
          const workerId = this.jobWorkerMap.get(job.id);
          if (workerId && this.activeWorkers.has(workerId)) {
            // Worker is still active, skip
            continue;
          }
          
          const errorMessage = `Job terminated: Running for ${runningTime} minutes (exceeded ${STALE_JOB_TIMEOUT_MS/1000/60} minute timeout). Process likely crashed.`;
          
          await prisma.job.update({
            where: { id: job.id },
            data: {
              status: JobStatus.FAILED,
              error: errorMessage,
              completedAt: new Date()
            }
          });
          
          console.log(`   ❌ Marked stale job ${job.id} as FAILED (ran for ${runningTime}m)`);
        }
      }
    } catch (error) {
      console.error(`❌ Error cleaning up stale jobs:`, error);
    }
  }

  async start() {
    console.log(
      `🚀 Starting adaptive job processor (max workers: ${this.maxWorkers})`
    );
    console.log(`⏱️  Worker timeout: ${WORKER_TIMEOUT_MS/1000}s`);
    console.log(`🔄 Poll interval: ${POLL_INTERVAL_MS/1000}s`);
    console.log(`🧹 Stale job cleanup: every ${STALE_JOB_CHECK_INTERVAL_MS/1000/60}m`);
    logger.info("Press Ctrl+C to stop\n");

    while (!this.isShuttingDown) {
      try {
        // Check for pending jobs
        const pendingCount = await this.checkPendingJobs();
        const currentWorkers = this.activeWorkers.size;

        if (pendingCount > 0) {
          // We have pending jobs
          if (this.lastState === "idle") {
            // Transitioning from idle to working
            if (this.consecutiveEmptyChecks > 0) {
              console.log(""); // New line after dots
            }
            console.log(
              `\n🎯 Found ${pendingCount} pending job${pendingCount > 1 ? "s" : ""}!`
            );
            this.consecutiveEmptyChecks = 0;
          }

          // Calculate how many workers to spawn
          const workersToSpawn = Math.min(
            pendingCount - currentWorkers,
            this.maxWorkers - currentWorkers
          );

          if (workersToSpawn > 0 && !this.isShuttingDown) {
            this.lastState = "working";
            console.log(
              `🔧 Active workers: ${currentWorkers}, spawning ${workersToSpawn} more...`
            );

            // Spawn workers in parallel
            const workerPromises: Promise<void>[] = [];
            for (let i = 0; i < workersToSpawn; i++) {
              workerPromises.push(
                this.spawnWorker().catch((error) => {
                  // Error already logged in spawnWorker
                })
              );
            }

            // Don't wait for workers to complete, just spawn them
            // Fire and forget - workers will process independently
            workerPromises.forEach(p => p.catch(() => {
              // Error already logged in spawnWorker
            }));
          } else if (currentWorkers > 0) {
            // We have workers but don't need more
            if (this.lastState !== "waiting") {
              console.log(
                `⏳ ${currentWorkers} worker${currentWorkers > 1 ? "s" : ""} processing ${pendingCount} job${pendingCount > 1 ? "s" : ""}...`
              );
              this.lastState = "waiting";
            }
            // Otherwise stay quiet while workers are processing
          }
        } else {
          // No pending jobs
          if (currentWorkers === 0) {
            // No workers and no jobs - we're idle
            if (this.lastState !== "idle") {
              console.log(`\n💤 No pending jobs found`);
              this.lastState = "idle";
            }
            this.consecutiveEmptyChecks++;

            if (this.consecutiveEmptyChecks > 1) {
              if (this.consecutiveEmptyChecks % 60 === 0) {
                // Print stats every minute
                const runtime = Math.round(
                  (Date.now() - this.startTime.getTime()) / 1000 / 60
                );
                process.stdout.write(
                  `\n📊 Status: ${this.totalJobsProcessed} jobs processed, ` +
                  `${this.totalErrors} errors, running for ${runtime}m\n`
                );
              } else {
                process.stdout.write(".");
              }
            }
          } else {
            // Workers still running but no new jobs
            if (this.lastState !== "waiting") {
              console.log(
                `⏳ ${currentWorkers} worker${currentWorkers > 1 ? "s" : ""} finishing up...`
              );
              this.lastState = "waiting";
            }
          }
        }

        // Check for stale jobs periodically
        if (Date.now() - this.lastStaleCheckTime.getTime() > STALE_JOB_CHECK_INTERVAL_MS) {
          await this.cleanupStaleJobs();
          this.lastStaleCheckTime = new Date();
        }
        
        // Brief pause before next check
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      } catch (error) {
        console.error(`\n❌ Error in main loop:`, error);
        this.consecutiveEmptyChecks = 0;
        this.lastState = "idle";
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let maxWorkers = DEFAULT_MAX_WORKERS;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-n" || args[i] === "--max-workers") {
    const count = parseInt(args[i + 1], 10);
    if (!isNaN(count) && count > 0 && count <= 20) {
      maxWorkers = count;
    } else {
      console.error(
        `Invalid worker count: ${args[i + 1]}. Must be between 1 and 20.`
      );
      process.exit(1);
    }
  }
  if (args[i] === "-h" || args[i] === "--help") {
    console.log(`
Usage: npm run process-jobs-adaptive [options]

Options:
  -n, --max-workers <count>  Maximum parallel workers (default: ${DEFAULT_MAX_WORKERS}, max: 20)
  -h, --help                Show this help message

Environment Variables:
  ADAPTIVE_MAX_WORKERS=${DEFAULT_MAX_WORKERS}         Max parallel workers
  ADAPTIVE_POLL_INTERVAL_MS=${POLL_INTERVAL_MS}    Poll interval in ms
  ADAPTIVE_WORKER_TIMEOUT_MS=${WORKER_TIMEOUT_MS}  Worker timeout in ms
  ADAPTIVE_KILL_GRACE_PERIOD_MS=${KILL_GRACE_PERIOD_MS} Grace period before SIGKILL
  ADAPTIVE_SHUTDOWN_TIMEOUT_MS=${SHUTDOWN_TIMEOUT_MS}  Time to wait for jobs to finish on shutdown
  ADAPTIVE_STALE_CHECK_INTERVAL_MS=${STALE_JOB_CHECK_INTERVAL_MS} Stale job check interval
  ADAPTIVE_STALE_JOB_TIMEOUT_MS=${STALE_JOB_TIMEOUT_MS}  Time before job considered stale

Examples:
  npm run process-jobs-adaptive -n 10
  ADAPTIVE_MAX_WORKERS=10 ADAPTIVE_WORKER_TIMEOUT_MS=300000 npm run process-jobs-adaptive

This adaptive processor:
- Starts with no workers (quiet when idle)
- Spawns workers only when jobs are detected
- Each worker processes one job then exits
- Graceful shutdown: lets workers finish current jobs
- Shows dots during idle periods
- Limits concurrent workers to the specified maximum
`);
    process.exit(0);
  }
}

// Suppress the punycode deprecation warning
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (
    warning.name === "DeprecationWarning" &&
    warning.message.includes("punycode")
  ) {
    return;
  }
  console.warn(warning);
});

// Start the processor
const processor = new AdaptiveJobProcessor(maxWorkers);
processor.start().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

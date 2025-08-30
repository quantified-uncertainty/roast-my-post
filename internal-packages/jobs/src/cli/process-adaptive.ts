#!/usr/bin/env tsx

import { findWorkspaceRoot, loadWebAppEnvironment } from '../utils/workspace';

// Find workspace root and load environment variables BEFORE importing anything else
const workspaceRoot = findWorkspaceRoot(__dirname);
loadWebAppEnvironment(workspaceRoot);

import {
  ChildProcess,
  spawn,
} from "child_process";

import { cliPrisma as prisma, JobStatus } from "@roast/db/cli";
import { getAgentTimeout, formatTimeout } from "../config/agentTimeouts";
import { config } from '@roast/domain';
import { JobRepository } from '@roast/db/cli';
import { JobService } from '../core/JobService';
import { logger } from '../utils/logger';

// Configuration from centralized config system
const DEFAULT_MAX_WORKERS = config.jobs.adaptiveWorkers.maxWorkers;
const POLL_INTERVAL_MS = config.jobs.adaptiveWorkers.pollIntervalMs;
const WORKER_TIMEOUT_MS = config.jobs.adaptiveWorkers.workerTimeoutMs;
const KILL_GRACE_PERIOD_MS = config.jobs.adaptiveWorkers.killGracePeriodMs;
const SHUTDOWN_TIMEOUT_MS = config.jobs.adaptiveWorkers.shutdownTimeoutMs;
const STALE_JOB_CHECK_INTERVAL_MS = config.jobs.adaptiveWorkers.staleJobCheckIntervalMs;
const STALE_JOB_TIMEOUT_MS = config.jobs.adaptiveWorkers.staleJobTimeoutMs;

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
  private jobService: JobService;
  
  // Cache for timeout calculation to avoid repeated complex queries
  private timeoutCache: { 
    value: number; 
    expiry: number; 
    lastJobId?: string;
  } = { value: WORKER_TIMEOUT_MS, expiry: 0 };

  constructor(maxWorkers: number = DEFAULT_MAX_WORKERS) {
    this.maxWorkers = maxWorkers;
    const jobRepository = new JobRepository();
    this.jobService = new JobService(jobRepository, logger);
    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      if (this.activeWorkers.size > 0) {
        console.log("\n🛑 Initiating graceful shutdown...");
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
      
      console.log("\n👋 Shutting down. Goodbye!");
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

  /**
   * Get the timeout requirement for the next pending job (with caching)
   */
  private async getNextJobTimeout(): Promise<number> {
    const now = Date.now();
    const CACHE_TTL_MS = 5000; // Cache for 5 seconds to avoid excessive queries

    // Check if cache is still valid
    if (now < this.timeoutCache.expiry) {
      return this.timeoutCache.value;
    }

    // Get just the job ID first to check if we need to do the full query
    const nextJobIdOnly = await prisma.job.findFirst({
      where: { status: JobStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });

    if (!nextJobIdOnly) {
      // No pending jobs, cache default timeout
      this.timeoutCache = {
        value: WORKER_TIMEOUT_MS,
        expiry: now + CACHE_TTL_MS
      };
      return WORKER_TIMEOUT_MS;
    }

    // If it's the same job as last time and cache isn't too old, reuse result
    if (nextJobIdOnly.id === this.timeoutCache.lastJobId && now < this.timeoutCache.expiry + 10000) {
      return this.timeoutCache.value;
    }

    // Only do the expensive query if we need to
    const nextJob = await prisma.job.findFirst({
      where: { id: nextJobIdOnly.id },
      include: {
        evaluation: {
          include: {
            agent: {
              include: {
                versions: {
                  orderBy: { version: 'desc' },
                  take: 1,
                  select: {
                    extendedCapabilityId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!nextJob) {
      // Race condition - job was processed between queries
      this.timeoutCache = {
        value: WORKER_TIMEOUT_MS,
        expiry: now + CACHE_TTL_MS
      };
      return WORKER_TIMEOUT_MS;
    }

    const capability = nextJob.evaluation.agent.versions[0]?.extendedCapabilityId;
    const timeout = getAgentTimeout(capability);
    
    // Cache the result
    this.timeoutCache = {
      value: timeout,
      expiry: now + CACHE_TTL_MS,
      lastJobId: nextJobIdOnly.id
    };
    
    // Log if using non-default timeout
    if (timeout !== WORKER_TIMEOUT_MS) {
      console.log(`📊 Next job requires ${formatTimeout(timeout)} timeout (capability: ${capability})`);
    }
    
    return timeout;
  }

  private async spawnWorker(): Promise<void> {
    const workerId = this.nextWorkerId++;
    
    // Get timeout for the next job
    const workerTimeout = await this.getNextJobTimeout();

    return new Promise((resolve, reject) => {
      console.log(`🚀 Spawning worker ${workerId} with ${formatTimeout(workerTimeout)} timeout...`);

      // Use the @roast/jobs process-job command
      const childProcess = spawn("pnpm", ["--filter", "@roast/jobs", "run", "process-job"], {
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
        if (jobMatch && jobMatch[1]) {
          worker.jobId = jobMatch[1];
          this.jobWorkerMap.set(jobMatch[1], workerId);
          console.log(`  🔄 Worker ${workerId} started processing job ${worker.jobId}`);
        }
      });

      childProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Set timeout for hanging processes
      const timeout = setTimeout(async () => {
        if (!isResolved && !this.isShuttingDown) {
          console.error(`\n⏰ Worker ${workerId} timeout after ${workerTimeout/1000}s - terminating...`);
          
          // Mark job as failed if worker was processing one
          if (worker.jobId) {
            console.error(`   🔥 Job ${worker.jobId} needs recovery (worker timeout)`);
            await this.markJobAsFailed(worker.jobId, `Worker ${workerId} timed out after ${workerTimeout/1000}s`);
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
      }, workerTimeout);

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

      childProcess.on("exit", async (code, signal) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          this.activeWorkers.delete(workerId);
          
          // Clean up job tracking
          if (worker.jobId) {
            this.jobWorkerMap.delete(worker.jobId);
          }

          // Log exit details for debugging
          const exitInfo = signal ? `signal ${signal}` : `code ${code}`;
          console.log(`🔍 Worker ${workerId} exited with ${exitInfo}`);

          // Check if any work was done
          const hadWork =
            stdout.includes("Processing job") ||
            stderr.includes("Processing job") ||
            !stdout.includes("No pending jobs");

          if (code === 0) {
            // Exit code 0 means success
            // We trust the process to exit with 0 only when it completes successfully
            // This handles both cases: jobs processed successfully or no jobs found
            if (hadWork) {
              this.totalJobsProcessed++;
              const duration = Math.round(
                (Date.now() - worker.startTime.getTime()) / 1000
              );
              const jobInfo = worker.jobId ? ` (job ${worker.jobId})` : '';
              console.log(
                `✅ Worker ${workerId} completed job${jobInfo} in ${duration}s (Total processed: ${this.totalJobsProcessed})`
              );
            } else {
              console.log(`💤 Worker ${workerId} found no jobs`);
            }
            resolve();
          } else if (worker.isDraining && !worker.jobId) {
            // Worker was draining and had no active job
            console.log(`👋 Worker ${workerId} shut down gracefully (draining)`);
            resolve();
          } else {
            // Worker failed
            this.totalErrors++;
            console.error(`\n❌ Worker ${workerId} failed with exit ${exitInfo}`);
            
            // Log diagnostic info
            console.error(`   📊 Debug info:`);
            console.error(`      - Exit code: ${code}`);
            console.error(`      - Signal: ${signal || 'none'}`);
            console.error(`      - Had work: ${hadWork}`);
            console.error(`      - Job ID: ${worker.jobId || 'none'}`);
            console.error(`      - Stdout length: ${stdout.length} chars`);
            console.error(`      - Stderr length: ${stderr.length} chars`);
            
            // If worker was processing a job, mark it as failed
            if (worker.jobId) {
              console.error(`   🔥 Job ${worker.jobId} needs recovery (worker died)`);
              await this.markJobAsFailed(worker.jobId, `Worker ${workerId} crashed with ${exitInfo}`);
            }
            
            // Show the last few lines of stdout for context
            if (stdout.trim()) {
              const lastLines = stdout.trim().split('\n').slice(-5);
              console.error(`   📜 Last stdout lines:`);
              lastLines.forEach(line => {
                console.error(`      ${line}`);
              });
            }
            
            // Show the actual error output
            if (stderr.trim()) {
              const errorLines = stderr.trim().split('\n').slice(-5);
              console.error(`   ❌ Last stderr lines:`);
              errorLines.forEach(line => {
                console.error(`      ${line}`);
              });
            }
            
            // Also check stdout for error messages
            if (stdout.includes('Error:') || stdout.includes('error:')) {
              const errorLines = stdout.split('\n').filter(line => 
                line.toLowerCase().includes('error') || 
                line.includes('❌') ||
                line.includes('Failed')
              ).slice(-3);
              if (errorLines.length > 0) {
                console.error(`   ⚠️  Error indicators in output:`);
                errorLines.forEach(line => {
                  console.error(`      ${line.trim()}`);
                });
              }
            }
            
            reject(new Error(`Worker ${workerId} exited with ${exitInfo}`));
          }
        }
      });
    });
  }

  private async markJobAsFailed(jobId: string, errorMessage: string) {
    try {
      await this.jobService.markAsFailed(jobId, new Error(errorMessage));
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
          
          // Use JobService for consistent failure handling including retry logic
          await this.jobService.markAsFailed(job.id, new Error(errorMessage));
          
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
    console.log("Press Ctrl+C to stop\n");

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
Usage: pnpm --filter @roast/jobs run process-adaptive [options]

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
  pnpm --filter @roast/jobs run process-adaptive -n 10
  ADAPTIVE_MAX_WORKERS=10 ADAPTIVE_WORKER_TIMEOUT_MS=300000 pnpm --filter @roast/jobs run process-adaptive

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
  console.error("Fatal error:", error);
  process.exit(1);
});
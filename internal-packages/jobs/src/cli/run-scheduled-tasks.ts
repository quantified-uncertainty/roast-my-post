#!/usr/bin/env tsx

import { findWorkspaceRoot, loadWebAppEnvironment } from '../utils/workspace';

// Find workspace root and load environment variables BEFORE importing anything else
const workspaceRoot = findWorkspaceRoot(__dirname);
loadWebAppEnvironment(workspaceRoot);

import { startScheduledTasks } from '../scheduled-tasks/tasks';
import { logger } from '../utils/logger';

class ScheduledTaskRunner {
  private isShuttingDown = false;

  constructor() {
    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      logger.info("Initiating graceful shutdown of scheduled tasks...");
      
      // The tasks themselves check isShuttingDown(), so they will stop looping.
      // This timeout is just to allow a currently running task to finish gracefully.
      setTimeout(() => {
        logger.info("Shutting down. Goodbye!");
        process.exit(0);
      }, 2000); // 2s grace period
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  async start() {
    logger.info("🚀 Starting scheduled task runner...");
    logger.info("Press Ctrl+C to stop");

    startScheduledTasks(() => this.isShuttingDown);

    // Keep the process alive indefinitely until a shutdown signal is received
     while (!this.isShuttingDown) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
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
  logger.warn('Process warning:', warning);
});

// Start the runner
const runner = new ScheduledTaskRunner();
runner.start().catch((error) => {
  logger.error("Fatal error in scheduled task runner:", error);
  process.exit(1);
});

#!/usr/bin/env tsx

import { findWorkspaceRoot, loadWebAppEnvironment } from '../utils/workspace';

// Find workspace root and load environment variables BEFORE importing anything else
const workspaceRoot = findWorkspaceRoot(__dirname);
loadWebAppEnvironment(workspaceRoot);

import { startScheduledTasks } from '../scheduled-tasks/tasks';

class ScheduledTaskRunner {
  private isShuttingDown = false;

  constructor() {
    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      console.log("\n🛑 Initiating graceful shutdown of scheduled tasks...");
      
      // The tasks themselves check isShuttingDown(), so they will stop looping.
      // This timeout is just to allow a currently running task to finish gracefully.
      setTimeout(() => {
        console.log("\n👋 Shutting down. Goodbye!");
        process.exit(0);
      }, 2000); // 2s grace period
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  async start() {
    console.log("🚀 Starting scheduled task runner...");
    console.log("Press Ctrl+C to stop\n");

    startScheduledTasks(() => this.isShuttingDown);

    // Keep the process alive indefinitely until a shutdown signal is received
    await new Promise(() => {});
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

// Start the runner
const runner = new ScheduledTaskRunner();
runner.start().catch((error) => {
  console.error("Fatal error in scheduled task runner:", error);
  process.exit(1);
});

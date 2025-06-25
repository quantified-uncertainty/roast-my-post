import { spawn } from "child_process";
import { logger } from "@/lib/logger";

async function runProcessJobs(silentMode = false) {
  if (!silentMode) {
    logger.info('🔄 Running process-jobs...');
  }
  
  const childProcess = spawn("npm", ["run", "process-jobs"], {
    stdio: silentMode ? "pipe" : "inherit",
    shell: true,
  });

  return new Promise((resolve, reject) => {
    let isResolved = false;
    
    // Set a timeout to force-kill hanging processes
    const timeout = setTimeout(() => {
      if (!isResolved) {
        logger.info('⏰ Child process timeout - force killing...');
        childProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!isResolved) {
            logger.info('💀 Force killing with SIGKILL...');
            childProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    }, 120000); // 2 minute timeout

    childProcess.on("error", (error) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        logger.error('❌ Child process error:', error);
        reject(error);
      }
    });

    childProcess.on("exit", (code, signal) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        if (!silentMode) {
          console.log(`✅ Child process exited with code: ${code}, signal: ${signal}`);
        }
        if (code === 0 || code === null) {
          resolve({ success: true, code });
        } else {
          reject(new Error(`Child process exited with code ${code}`));
        }
      }
    });

    childProcess.on("close", (code, signal) => {
      if (!silentMode) {
        console.log(`🔒 Child process closed with code: ${code}, signal: ${signal}`);
      }
    });
  });
}

async function loop() {
  let iteration = 0;
  let consecutiveEmptyRuns = 0;
  
  while (true) {
    try {
      iteration++;
      
      const startTime = Date.now();
      const useSilentMode = consecutiveEmptyRuns > 0; // Silent after first empty run
      const result = await runProcessJobs(useSilentMode);
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      // Check if this was an empty run (no jobs processed)
      if (duration <= 1) {
        consecutiveEmptyRuns++;
        if (consecutiveEmptyRuns === 1) {
          console.log(`💤 No jobs found (will show dots for subsequent empty runs)`);
        } else {
          process.stdout.write('.');
        }
      } else {
        // Reset counter and show full info for actual job processing
        if (consecutiveEmptyRuns > 1) {
          console.log(`\n🔄 Found job after ${consecutiveEmptyRuns} empty runs`);
        } else if (consecutiveEmptyRuns === 1) {
          console.log(`\n🔄 Found job after 1 empty run`);
        }
        consecutiveEmptyRuns = 0;
        console.log(`✅ Iteration ${iteration} completed in ${duration}s`);
      }
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`\n❌ Error in iteration ${iteration}:`, error);
      consecutiveEmptyRuns = 0;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Start the loop
logger.info('Starting process-jobs loop...');
loop().catch((error) => {
  logger.error('Fatal error in loop:', error);
  process.exit(1);
});

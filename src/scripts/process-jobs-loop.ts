import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runProcessJobs() {
  try {
    console.log("Running process-jobs...");
    const { stdout, stderr } = await execAsync("npm run process-jobs");
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error("Error running process-jobs:", error);
  }
}

async function loop() {
  while (true) {
    await runProcessJobs();
    console.log("Waiting 1 second before next run...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Start the loop
loop().catch((error) => {
  console.error("Fatal error in loop:", error);
  process.exit(1);
});

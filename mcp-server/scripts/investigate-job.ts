import { prisma } from '../../src/lib/prisma';

async function investigateJob() {
  const jobId = "4b29caea-e27a-46a9-9072-cebb137c98bb";
  
  console.log(`Investigating job: ${jobId}\n`);
  
  // Get the job details
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      evaluation: {
        include: {
          agent: true,
          document: true
        }
      }
    }
  });
  
  if (!job) {
    console.log("Job not found!");
    return;
  }
  
  console.log("=== JOB DETAILS ===");
  console.log(`ID: ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Type: ${job.type}`);
  console.log(`Created: ${job.createdAt}`);
  console.log(`Updated: ${job.updatedAt}`);
  console.log(`Started: ${job.startedAt}`);
  console.log(`Completed: ${job.completedAt}`);
  console.log(`Error: ${job.error}`);
  console.log(`Retry Count: ${job.retryCount}`);
  console.log(`Max Retries: ${job.maxRetries}`);
  
  if (job.evaluation) {
    console.log("\n=== EVALUATION DETAILS ===");
    console.log(`Evaluation ID: ${job.evaluation.id}`);
    console.log(`Agent: ${job.evaluation.agent?.name} (v${job.evaluation.agentVersionId})`);
    console.log(`Document: ${job.evaluation.document?.title}`);
    console.log(`Status: ${job.evaluation.status}`);
  }
  
  // Get all tasks for this job
  const tasks = await prisma.task.findMany({
    where: { jobId: jobId },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`\n=== TASKS (${tasks.length} total) ===`);
  
  for (const task of tasks) {
    console.log(`\n--- Task ${task.id} ---`);
    console.log(`Type: ${task.type}`);
    console.log(`Status: ${task.status}`);
    console.log(`Created: ${task.createdAt}`);
    console.log(`Started: ${task.startedAt}`);
    console.log(`Completed: ${task.completedAt}`);
    console.log(`Retry Count: ${task.retryCount}`);
    console.log(`Max Retries: ${task.maxRetries}`);
    
    if (task.error) {
      console.log(`Error: ${task.error}`);
    }
    
    if (task.logs && task.logs.length > 0) {
      console.log("Logs:");
      task.logs.forEach((log: any, index: number) => {
        console.log(`  ${index + 1}. [${log.timestamp}] ${log.level}: ${log.message}`);
        if (log.details) {
          console.log(`     Details: ${JSON.stringify(log.details, null, 2)}`);
        }
      });
    }
    
    if (task.result) {
      console.log(`Result: ${JSON.stringify(task.result, null, 2)}`);
    }
  }
  
  // Look for any tasks with "No tool use in response" in logs
  const problemTasks = tasks.filter(task => 
    task.logs && 
    task.logs.some((log: any) => 
      log.message && log.message.includes("No tool use in response")
    )
  );
  
  if (problemTasks.length > 0) {
    console.log(`\n=== TASKS WITH "No tool use in response" ERROR ===`);
    problemTasks.forEach(task => {
      console.log(`Task ${task.id} (${task.type})`);
      const errorLogs = task.logs.filter((log: any) => 
        log.message && log.message.includes("No tool use in response")
      );
      errorLogs.forEach((log: any) => {
        console.log(`  [${log.timestamp}] ${log.level}: ${log.message}`);
        if (log.details) {
          console.log(`  Details: ${JSON.stringify(log.details, null, 2)}`);
        }
      });
    });
  }
}

investigateJob()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
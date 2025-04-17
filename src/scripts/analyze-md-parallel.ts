#!/usr/bin/env tsx

import { spawn } from "child_process";
import { Command } from "commander";
import { readFile } from "fs/promises";
import path from "path";

const program = new Command();

program
  .name("analyze-md-parallel")
  .description("Run multiple instances of analyze-md.ts in parallel")
  .option(
    "-n, --num-instances <number>",
    "Number of parallel instances to run",
    "3"
  )
  .option(
    "-d, --dir <path>",
    "Path to directory containing JSON files to process"
  )
  .option("-a, --agent <id>", "ID of the agent performing the analysis")
  .option(
    "--all-agents",
    "Run analysis for all agents specified in the document's intendedAgents field"
  )
  .option(
    "--only-missing",
    "When using --all-agents, only analyze for agents that haven't reviewed this document yet"
  )
  .parse(process.argv);

const options = program.opts();

// Validate required options
if (!options.dir) {
  console.error("❌ Error: --dir must be specified");
  process.exit(1);
}

if (!options.agent && !options.allAgents) {
  console.error("❌ Error: Either --agent or --all-agents must be specified");
  process.exit(1);
}

const numInstances = parseInt(options.numInstances, 10);
if (isNaN(numInstances) || numInstances < 1) {
  console.error("❌ Error: --num-instances must be a positive number");
  process.exit(1);
}

interface Review {
  agentId: string;
}

interface Document {
  intendedAgents: string[];
  reviews?: Review[];
}

// Function to check if a document needs analysis
async function checkDocumentNeedsAnalysis(filePath: string): Promise<boolean> {
  try {
    const content = await readFile(filePath, "utf-8");
    const doc = JSON.parse(content) as Document;

    if (!doc.intendedAgents || doc.intendedAgents.length === 0) {
      console.log(`\n📄 ${path.basename(filePath)}:`);
      console.log("  ❌ No intended agents specified in document");
      return false;
    }

    if (options.agent) {
      // Single agent mode
      if (!doc.intendedAgents.includes(options.agent)) {
        console.log(`\n📄 ${path.basename(filePath)}:`);
        console.log(`  ❌ Agent ${options.agent} not in intendedAgents list`);
        console.log(`  📋 Intended agents: ${doc.intendedAgents.join(", ")}`);
        return false;
      }

      if (
        options.onlyMissing &&
        doc.reviews?.some((r: Review) => r.agentId === options.agent)
      ) {
        console.log(`\n📄 ${path.basename(filePath)}:`);
        console.log(
          `  ❌ Agent ${options.agent} has already reviewed this document`
        );
        return false;
      }
      return true;
    } else {
      // All agents mode
      const reviewedAgents = new Set(
        doc.reviews?.map((r: Review) => r.agentId) || []
      );
      const missingAgents = doc.intendedAgents.filter(
        (agent: string) => !reviewedAgents.has(agent)
      );

      console.log(`\n📄 ${path.basename(filePath)}:`);
      console.log(`  📋 Intended agents: ${doc.intendedAgents.join(", ")}`);
      console.log(
        `  ✅ Reviewed by: ${Array.from(reviewedAgents).join(", ") || "none"}`
      );

      if (options.onlyMissing) {
        if (missingAgents.length === 0) {
          console.log(
            "  ❌ All intended agents have already reviewed this document"
          );
          return false;
        }
        console.log(
          `  🔍 Still needs review from: ${missingAgents.join(", ")}`
        );
        return true;
      }
      return true;
    }
  } catch (error) {
    console.error(`Error checking document ${filePath}:`, error);
    return false;
  }
}

// Function to run a single instance of analyze-md.ts
async function runAnalyzeMdInstance(instanceId: number) {
  const args = [path.join(__dirname, "analyze-md.ts"), "--dir", options.dir];

  if (options.agent) {
    args.push("--agent", options.agent);
  } else if (options.allAgents) {
    args.push("--all-agents");
    if (options.onlyMissing) {
      args.push("--only-missing");
    }
  }

  // Add the check function to the child process
  const child = spawn("npx", ["tsx", ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      CHECK_DOCUMENT: "true", // Signal to the child process to use the check function
    },
  });

  child.on("close", (code) => {
    console.log(`Instance ${instanceId} exited with code ${code}`);
    if (code === 0) {
      // Restart the instance if it completed successfully
      console.log(`Restarting instance ${instanceId}...`);
      runAnalyzeMdInstance(instanceId);
    } else {
      console.error(`Instance ${instanceId} failed with code ${code}`);
      // Wait 5 seconds before restarting on failure
      setTimeout(() => {
        console.log(`Restarting failed instance ${instanceId}...`);
        runAnalyzeMdInstance(instanceId);
      }, 5000);
    }
  });

  // Handle process termination
  process.on("SIGINT", () => {
    console.log(`Terminating instance ${instanceId}...`);
    child.kill("SIGINT");
  });
}

// Start all instances
console.log(`Starting ${numInstances} parallel instances...`);
for (let i = 0; i < numInstances; i++) {
  runAnalyzeMdInstance(i + 1);
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("Received SIGINT. Terminating all instances...");
  process.exit(0);
});

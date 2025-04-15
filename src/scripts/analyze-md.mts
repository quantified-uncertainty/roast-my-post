#!/usr/bin/env tsx

import { Command } from "commander";
import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { DocumentReview } from "../types/documentReview";
import { analyzeDocument, writeLogFile } from "../utils/documentAnalysis";

const program = new Command();

program
  .name("analyze-md")
  .description("Add a new analysis to a JSON file")
  .option(
    "-f, --file <path>",
    "Path to the JSON file to update (required if --dir is not used)"
  )
  .option(
    "-d, --dir <path>",
    "Path to directory containing JSON files to update (required if --file is not used)"
  )
  .option(
    "-a, --agent <id>",
    "ID of the agent performing the analysis (required if --all-agents is not used)"
  )
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

// Validate that either file or dir is provided
if (!options.file && !options.dir) {
  console.error("❌ Error: Either --file or --dir must be specified");
  process.exit(1);
}

// Validate that either agent-id or all-agents is provided
if (!options.agent && !options.allAgents) {
  console.error("❌ Error: Either --agent or --all-agents must be specified");
  process.exit(1);
}

async function analyzeWithAgent(filePath: string, agentId: string) {
  // Read existing JSON file
  const jsonContent = await readFile(filePath, "utf-8");
  const data = JSON.parse(jsonContent);

  // Analyze the document
  const {
    review: documentReview,
    usage,
    llmResponse,
    finalPrompt,
    agentContext,
  } = await analyzeDocument(data.content, agentId);

  // Remove any existing review by the same agent
  if (data.reviews) {
    const initialLength = data.reviews.length;
    data.reviews = data.reviews.filter(
      (review: DocumentReview) => review.agentId !== agentId
    );
    if (initialLength !== data.reviews.length) {
      console.log(
        `🗑️ Removed ${
          initialLength - data.reviews.length
        } existing review(s) by agent ${agentId}`
      );
    }
  } else {
    data.reviews = [];
  }

  // Add new review to existing reviews array

  // --- Sort comments by startOffset before saving ---
  if (documentReview.comments) {
    documentReview.comments.sort((a, b) => {
      return (a.highlight.startOffset || 0) - (b.highlight.startOffset || 0);
    });
    console.log(`ℹ️ Sorted comments by startOffset for agent ${agentId}`);
  }
  // --- End sorting ---

  data.reviews.push(documentReview);

  // Write back to the same file
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ Updated ${filePath} with new analysis from agent ${agentId}`);

  // Create log file with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFilename = `${timestamp}-llm-response-${agentId}.md`;

  const logContent = `# LLM Response ${new Date().toISOString()}

## Agent
${agentId}

## Agent Context
\`\`\`
${agentContext}
\`\`\`

## Run Details
- Model: ${
    documentReview.runDetails
      ? JSON.parse(documentReview.runDetails).model
      : "Unknown"
  }
- Temperature: ${
    documentReview.runDetails
      ? JSON.parse(documentReview.runDetails).temperature
      : "Unknown"
  }
- Runtime: ${
    documentReview.runDetails
      ? JSON.parse(documentReview.runDetails).runtimeMs
      : "Unknown"
  }ms
- Cost: $${(documentReview.costInCents / 100).toFixed(2)}

### Token Usage
\`\`\`json
${JSON.stringify(usage, null, 2)}
\`\`\`

## Prompt
\`\`\`
${finalPrompt}
\`\`\`

## Response
\`\`\`json
${llmResponse}
\`\`\`

## Final Review
\`\`\`json
${JSON.stringify(documentReview, null, 2)}
\`\`\`
`;

  await writeLogFile(logContent, logFilename);
}

async function processDirectory(dirPath: string) {
  const files = await readdir(dirPath);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  if (jsonFiles.length === 0) {
    console.log(`ℹ️ No JSON files found in directory ${dirPath}`);
    return;
  }

  console.log(`📁 Processing ${jsonFiles.length} JSON files in ${dirPath}`);

  for (const file of jsonFiles) {
    const filePath = path.join(dirPath, file);
    console.log(`\n📄 Processing ${file}`);

    if (options.allAgents) {
      // Read the file to get intendedAgents
      const jsonContent = await readFile(filePath, "utf-8");
      const data = JSON.parse(jsonContent);

      if (
        !data.intendedAgents ||
        !Array.isArray(data.intendedAgents) ||
        data.intendedAgents.length === 0
      ) {
        console.log(`⚠️ Skipping ${file}: No intendedAgents specified`);
        continue;
      }

      // Get list of agents that have already reviewed this document
      const reviewedAgentIds = new Set(
        (data.reviews || []).map((review: DocumentReview) => review.agentId)
      );

      // Filter agents based on --only-missing option
      const agentsToAnalyze = options.onlyMissing
        ? data.intendedAgents.filter(
            (agentId: string) => !reviewedAgentIds.has(agentId)
          )
        : data.intendedAgents;

      if (agentsToAnalyze.length === 0) {
        console.log(`ℹ️ Skipping ${file}: No agents to analyze`);
        continue;
      }

      // Run analysis for each intended agent
      for (const agentId of agentsToAnalyze) {
        await analyzeWithAgent(filePath, agentId);
      }
    } else {
      // Run analysis for single agent
      await analyzeWithAgent(filePath, options.agent);
    }
  }
}

async function main() {
  try {
    if (options.dir) {
      await processDirectory(options.dir);
    } else {
      if (options.allAgents) {
        // Read the file to get intendedAgents
        const jsonContent = await readFile(options.file, "utf-8");
        const data = JSON.parse(jsonContent);

        if (
          !data.intendedAgents ||
          !Array.isArray(data.intendedAgents) ||
          data.intendedAgents.length === 0
        ) {
          console.error(
            "❌ Error: No intendedAgents specified in the document"
          );
          process.exit(1);
        }

        // Get list of agents that have already reviewed this document
        const reviewedAgentIds = new Set(
          (data.reviews || []).map((review: DocumentReview) => review.agentId)
        );

        // Filter agents based on --only-missing option
        const agentsToAnalyze = options.onlyMissing
          ? data.intendedAgents.filter(
              (agentId: string) => !reviewedAgentIds.has(agentId)
            )
          : data.intendedAgents;

        if (agentsToAnalyze.length === 0) {
          console.log(
            "ℹ️ No agents to analyze (all agents have already reviewed this document)"
          );
          process.exit(0);
        }

        // Run analysis for each intended agent
        for (const agentId of agentsToAnalyze) {
          await analyzeWithAgent(options.file, agentId);
        }
      } else {
        // Run analysis for single agent
        await analyzeWithAgent(options.file, options.agent);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();

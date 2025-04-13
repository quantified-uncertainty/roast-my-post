#!/usr/bin/env tsx

import { Command } from 'commander';
import {
  readFile,
  writeFile,
} from 'fs/promises';

import type { DocumentReview } from '../types/documentReview';
import {
  analyzeDocument,
  writeLogFile,
} from '../utils/documentAnalysis';

const program = new Command();

program
  .name("analyze-md")
  .description("Add a new analysis to a JSON file")
  .requiredOption("-f, --file <path>", "Path to the JSON file to update")
  .option(
    "-a, --agent <id>",
    "ID of the agent performing the analysis (required if --all-agents is not used)"
  )
  .option(
    "--all-agents",
    "Run analysis for all agents specified in the document's intendedAgents field"
  )
  .parse(process.argv);

const options = program.opts();

// Validate that either agent-id or all-agents is provided
if (!options.agentId && !options.allAgents) {
  console.error(
    "❌ Error: Either --agent-id or --all-agents must be specified"
  );
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
  data.reviews.push(documentReview);

  // Write back to the same file
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ Updated ${filePath} with new analysis from agent ${agentId}`);

  // Create log file with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFilename = `llm-response-${agentId}-${timestamp}.md`;

  const logContent = `# LLM Response ${new Date().toISOString()}

## Agent
${agentId}

## Response
\`\`\`json
${llmResponse}
\`\`\`

## Usage
\`\`\`json
${JSON.stringify(usage, null, 2)}
\`\`\`

## Final Review
\`\`\`json
${JSON.stringify(documentReview, null, 2)}
\`\`\`
`;

  await writeLogFile(logContent, logFilename);
}

async function main() {
  try {
    if (options.allAgents) {
      // Read the file to get intendedAgents
      const jsonContent = await readFile(options.file, "utf-8");
      const data = JSON.parse(jsonContent);

      if (
        !data.intendedAgents ||
        !Array.isArray(data.intendedAgents) ||
        data.intendedAgents.length === 0
      ) {
        console.error("❌ Error: No intendedAgents specified in the document");
        process.exit(1);
      }

      // Run analysis for each intended agent
      for (const agentId of data.intendedAgents) {
        await analyzeWithAgent(options.file, agentId);
      }
    } else {
      // Run analysis for single agent
      await analyzeWithAgent(options.file, options.agentId);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();

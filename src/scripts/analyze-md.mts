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
  .requiredOption(
    "-a, --agent-id <id>",
    "ID of the agent performing the analysis"
  )
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    // Read existing JSON file
    const jsonContent = await readFile(options.file, "utf-8");
    const data = JSON.parse(jsonContent);

    // Analyze the document
    const {
      review: documentReview,
      usage,
      llmResponse,
    } = await analyzeDocument(data.content, options.agentId);

    // Remove any existing review by the same agent
    if (data.reviews) {
      const initialLength = data.reviews.length;
      data.reviews = data.reviews.filter(
        (review: DocumentReview) => review.agentId !== options.agentId
      );
      if (initialLength !== data.reviews.length) {
        console.log(
          `🗑️ Removed ${
            initialLength - data.reviews.length
          } existing review(s) by agent ${options.agentId}`
        );
      }
    } else {
      data.reviews = [];
    }

    // Add new review to existing reviews array
    data.reviews.push(documentReview);

    // Write back to the same file
    await writeFile(options.file, JSON.stringify(data, null, 2), "utf-8");
    console.log(`✅ Updated ${options.file} with new analysis`);

    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logFilename = `llm-response-${timestamp}.md`;

    const logContent = `# LLM Response ${new Date().toISOString()}

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
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();

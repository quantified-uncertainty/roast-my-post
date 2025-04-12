#!/usr/bin/env tsx

import { Command } from 'commander';
import {
  mkdir,
  readFile,
  writeFile,
} from 'fs/promises';
import path from 'path';

import type {
  Comment,
  DocumentReview,
} from '../types/documentReview';
import {
  DEFAULT_TEMPERATURE,
  MODEL,
  openai,
} from '../types/openai.js';

// Type for the raw LLM response before transformation
interface LLMReview {
  analysis: string;
  comments: Record<string, Comment>;
}

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

async function loadAgentInfo(agentId: string) {
  try {
    const agentPath = path.join(
      process.cwd(),
      "src",
      "data",
      "agents",
      `${agentId}.json`
    );
    const agentContent = await readFile(agentPath, "utf-8");
    return JSON.parse(agentContent);
  } catch (error) {
    console.warn(`⚠️ Could not load agent info for ${agentId}:`, error);
    return null;
  }
}

function validateLLMResponse(review: LLMReview) {
  if (!review.analysis || typeof review.analysis !== "string") {
    throw new Error("Invalid or missing analysis field");
  }
  if (!review.comments || typeof review.comments !== "object") {
    throw new Error("Invalid or missing comments field");
  }
  // Validate each comment
  for (const [key, comment] of Object.entries(review.comments)) {
    if (!comment.title || !comment.description || !comment.highlight) {
      throw new Error(`Invalid comment structure for key ${key}`);
    }
    if (!comment.highlight.startOffset || !comment.highlight.endOffset) {
      throw new Error(`Invalid highlight structure in comment ${key}`);
    }
  }
}

async function writeLogFile(content: string, filename: string) {
  const logsDir = path.join(process.cwd(), "logs");
  try {
    // Create logs directory if it doesn't exist
    await mkdir(logsDir, { recursive: true });
    await writeFile(path.join(logsDir, filename), content, "utf-8");
    console.log(`📝 Log written to ${filename}`);
  } catch (err) {
    console.error("❌ Error writing log file:", err);
  }
}

function calculateTargetWordCount(content: string): number {
  const baseWords = 50;
  const contentLength = content.length;
  // More aggressive logarithmic scaling
  // 500 chars -> ~50 words
  // 1000 chars -> ~60 words
  // 10000 chars -> ~200 words
  const additionalWords = Math.log10(contentLength / 500) * 50;
  return Math.round(baseWords + Math.max(0, additionalWords));
}

async function main() {
  // Read existing JSON file
  const jsonContent = await readFile(options.file, "utf-8");
  const data = JSON.parse(jsonContent);

  // Load agent information
  const agentInfo = await loadAgentInfo(options.agentId);
  const agentContext = agentInfo
    ? `
You are ${agentInfo.name} (${agentInfo.description}).

Your specific capabilities include:
${agentInfo.capabilities.map((cap: string) => `- ${cap}`).join("\n")}

Your primary use cases are:
${agentInfo.use_cases.map((use: string) => `- ${use}`).join("\n")}

Your limitations to be aware of:
${agentInfo.limitations.map((lim: string) => `- ${lim}`).join("\n")}
`
    : "";

  const targetWordCount = calculateTargetWordCount(data.content);
  console.log(`📊 Target word count: ${targetWordCount}`);

  const prompt = `
${agentContext}

Given the following Markdown document, output a single review in JSON like this:

{
  "analysis": "[~${targetWordCount} words of structured, quantitative analysis]",
  "comments": {
    "1": {
      "title": "...",
      "description": "...",
      "highlight": {
        "startOffset": ###,
        "endOffset": ###,
        "prefix": "..."
      }
    }
  }
}

Here is the Markdown content to analyze:

\`\`\`markdown
${data.content}
\`\`\`
`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: DEFAULT_TEMPERATURE,
  });

  const llmResponse = completion.choices[0].message.content;
  if (!llmResponse) {
    throw new Error("No response from LLM");
  }

  // Log usage information
  const usage = completion.usage;
  if (usage) {
    console.log("📊 Usage:");
    console.log(`- Input tokens: ${usage.prompt_tokens}`);
    console.log(`- Output tokens: ${usage.completion_tokens}`);
    console.log(`- Total tokens: ${usage.total_tokens}`);
  }

  console.log("📝 LLM Response:");
  console.log(llmResponse);

  const cleanedResponse = llmResponse
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  let parsedLLMReview: LLMReview;
  try {
    parsedLLMReview = JSON.parse(cleanedResponse);
    validateLLMResponse(parsedLLMReview);
  } catch (err) {
    console.error("❌ Invalid review structure:", err);
    console.error("Cleaned response:", cleanedResponse);
    process.exit(1);
  }

  // Transform LLMReview into DocumentReview
  const documentReview: DocumentReview = {
    ...parsedLLMReview,
    agentId: options.agentId,
    costInCents: usage ? Math.ceil(usage.total_tokens * 0.01) : 0, // 0.01 cents per token, or default to 0
    createdAt: new Date(new Date().toISOString().split("T")[0]),
  };

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

## Prompt
\`\`\`
${prompt}
\`\`\`

## Response
\`\`\`json
${llmResponse}
\`\`\`

## Usage
\`\`\`json
${JSON.stringify(usage, null, 2)}
\`\`\`

## Parsed Review
\`\`\`json
${JSON.stringify(parsedLLMReview, null, 2)}
\`\`\`

## Final Review
\`\`\`json
${JSON.stringify(documentReview, null, 2)}
\`\`\`
`;

  await writeLogFile(logContent, logFilename);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

#!/usr/bin/env ts-node

import { execSync } from 'child_process';
// Import dependencies
import fs from 'fs';
import path from 'path';

// Simple agent definition
const biasDetectorAgent = {
  id: "bias-detector",
  name: "Bias Detector",
  description:
    "Identifies potential biases in language, framing, representation, and reasoning.",
  capabilities: [
    "Language bias detection",
    "Representation analysis",
    "Perspective diversity assessment",
  ],
};

// Interface for Claude's response format
interface ClaudeReviewResponse {
  analysis: string;
  comments: {
    title: string;
    description: string;
    startOffset: number;
    endOffset: number;
  }[];
}

// Main function to process a markdown file
async function reviewMarkdownFile(
  filePath: string,
  agentId: string
): Promise<void> {
  try {
    // For now, just use the bias detector agent
    const agent = biasDetectorAgent;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    // Read the markdown file
    const content = fs.readFileSync(filePath, "utf-8");

    // Prepare the Claude prompt using the specified agent
    const prompt = generatePromptForAgent(agent, content);

    console.log(`Preparing prompt for document review with ${agent.name}...`);

    // In a real implementation, this is where you would call the Claude API
    // For now, we'll just output the prompt to a file so you can use it manually
    const promptFileName = path.join(
      process.cwd(),
      `claude-prompt-${agentId}.txt`
    );
    fs.writeFileSync(promptFileName, prompt);

    console.log(`Prompt file created at: ${promptFileName}`);
    console.log("To use this with Claude:");
    console.log("1. Copy the contents of the prompt file");
    console.log("2. Paste it to Claude in the web interface or API");
    console.log("3. Save the JSON response from Claude for further processing");

    // Try to open the file with the default text editor
    try {
      const platform = process.platform;
      if (platform === "darwin") {
        // macOS
        execSync(`open "${promptFileName}"`);
      } else if (platform === "win32") {
        // Windows
        execSync(`start "" "${promptFileName}"`);
      } else if (platform === "linux") {
        // Linux
        execSync(`xdg-open "${promptFileName}"`);
      }
    } catch (err) {
      console.log(
        "Unable to open the file automatically. Please open it manually."
      );
    }
  } catch (error) {
    console.error("Error processing markdown file:", error);
  }
}

// Generate a prompt specific to the selected agent
function generatePromptForAgent(
  agent: { name: string; description: string; capabilities: string[] },
  content: string
): string {
  // Base prompt structure
  const prompt = `I want you to act as a ${agent.name} (${agent.description}).

Capabilities:
${agent.capabilities.map((cap) => `- ${cap}`).join("\n")}

Review the following document and provide:
1. An overall analysis section with your main findings
2. At least 3-5 specific comments on parts of the text, including the exact text spans you're commenting on

Here's the document to review:

${content}

Format your response as JSON with the following structure:
{
  "analysis": "Your overall analysis of the document",
  "comments": [
    {
      "title": "Short title for this comment",
      "description": "Detailed explanation of your observation",
      "startOffset": [character offset where the span starts],
      "endOffset": [character offset where the span ends]
    }
  ]
}

The startOffset and endOffset should be character positions in the original text, starting from 0.
Make sure to provide helpful, specific comments that would be valuable to the document author.`;

  return prompt;
}

// CLI entry point
function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: npm run review -- <markdown-file-path> <agent-id>");
    console.log("\nAvailable agents:");
    console.log("- bias-detector: Bias Detector");
    return;
  }

  const [filePath, agentId] = args;
  reviewMarkdownFile(filePath, agentId);
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { reviewMarkdownFile };

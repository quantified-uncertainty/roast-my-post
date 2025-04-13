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

export async function loadAgentInfo(agentId: string) {
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

export function validateLLMResponse(review: LLMReview) {
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

export async function writeLogFile(content: string, filename: string) {
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

export function calculateTargetWordCount(content: string): number {
  const baseWords = 50;
  const contentLength = content.length;
  // More aggressive logarithmic scaling
  // 500 chars -> ~50 words
  // 1000 chars -> ~60 words
  // 10000 chars -> ~200 words
  const additionalWords = Math.log10(contentLength / 500) * 50;
  return Math.round(baseWords + Math.max(0, additionalWords));
}

export async function analyzeDocument(
  content: string,
  agentId: string
): Promise<{
  review: DocumentReview;
  usage: any;
  llmResponse: string;
}> {
  // Load agent information
  const agentInfo = await loadAgentInfo(agentId);
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

  const targetWordCount = calculateTargetWordCount(content);
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
${content}
\`\`\`
`;

  const startTime = Date.now();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: DEFAULT_TEMPERATURE,
  });
  const runtimeMs = Date.now() - startTime;

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
    console.log(`- Runtime: ${runtimeMs}ms`);
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
    throw err;
  }

  // Transform LLMReview into DocumentReview
  const documentReview: DocumentReview = {
    agentId,
    costInCents: usage ? Math.ceil(usage.total_tokens * 0.01) : 0, // 0.01 cents per token, or default to 0
    createdAt: new Date(new Date().toISOString().split("T")[0]),
    runDetails: usage
      ? JSON.stringify({
          model: MODEL,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          temperature: DEFAULT_TEMPERATURE,
          runtimeMs,
        })
      : undefined,
    ...parsedLLMReview,
  };

  return {
    review: documentReview,
    usage,
    llmResponse,
  };
}

import {
  mkdir,
  readFile,
  writeFile,
} from 'fs/promises';
import {
  parse as parseJsonc,
  ParseError,
} from 'jsonc-parser';
import { jsonrepair } from 'jsonrepair';
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
  summary: string;
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

export function validateLLMResponse(review: LLMReview, content: string) {
  if (!review.summary || typeof review.summary !== "string") {
    throw new Error("Invalid or missing summary field");
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
    // Check that highlight offsets are within document bounds
    if (
      comment.highlight.startOffset < 0 ||
      comment.highlight.endOffset > content.length
    ) {
      throw new Error(`Highlight offsets out of bounds in comment ${key}`);
    }
    if (comment.highlight.startOffset >= comment.highlight.endOffset) {
      throw new Error(
        `Invalid highlight range in comment ${key} (start >= end)`
      );
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
  // 1000 chars -> ~100 words
  // 10000 chars -> ~200 words
  const additionalWords = Math.log10(contentLength / 500) * 100;
  return Math.round(baseWords + Math.max(0, additionalWords));
}

export function calculateTargetComments(content: string): number {
  const baseComments = 3;
  const contentLength = content.length;
  // Roughly 1 comment per 100 words
  // Assuming ~5 chars per word
  const additionalComments = Math.floor(contentLength / 500);
  return Math.max(baseComments, Math.min(additionalComments, 10)); // Cap at 10 comments
}

export async function analyzeDocument(
  content: string,
  agentId: string
): Promise<{
  review: DocumentReview;
  usage: any;
  llmResponse: string;
  finalPrompt: string;
  agentContext: string;
}> {
  // Load agent information
  const agentInfo = await loadAgentInfo(agentId);
  const agentContext = agentInfo
    ? `
You are ${agentInfo.name} (${agentInfo.description}).

Your primary instructions are:
${agentInfo.genericInstructions}

Your specific capabilities include:
${agentInfo.capabilities.map((cap: string) => `- ${cap}`).join("\n")}

Your primary use cases are:
${agentInfo.use_cases.map((use: string) => `- ${use}`).join("\n")}

Your limitations to be aware of:
${agentInfo.limitations.map((lim: string) => `- ${lim}`).join("\n")}

Your summary instructions are:
${agentInfo.summaryInstructions}

Your comment instructions are:
${agentInfo.commentInstructions}
`
    : "";

  const targetWordCount = calculateTargetWordCount(content);
  const targetComments = calculateTargetComments(content);
  console.log(`📊 Target word count: ${targetWordCount}`);
  console.log(`📊 Target comments: ${targetComments}`);

  // Generate comment template
  const commentTemplate = Array.from(
    { length: targetComments },
    (_, i) => `
    "${i + 1}": {
      "title": "...",
      "description": "...",
      "highlight": {
        "startOffset": ###,
        "endOffset": ###,
        "prefix": "..."
      }
    }`
  ).join(",");

  const finalPrompt = `
${agentContext}

Given the following Markdown document, output a single evaluation in JSON like this:

{
  "summary": "[~${targetWordCount} words of useful information, related to your primary instructions. 

IMPORTANT: The evaluation must be properly escaped for JSON. This means:
- Replace all newlines within a paragraph with \\n
- Escape all double quotes with \\"
- Use markdown formatting (especially **bold**, *italics*, and [links](...) for key terminology) where appropriate.
- Separate distinct ideas or topics into paragraphs (using \\n\\n between paragraphs).
- Use plain text for the main content.
]",
  "comments": {
    ${commentTemplate}
  }
}

You must provide exactly ${targetComments} comments. Each comment should:
- Include a clear title that summarizes the point
- Provide a detailed description of the issue/strength/information
- Reference a specific section of the document using highlight offsets
  - startOffset: The character position where the highlighted text begins (0-based)
  - endOffset: The character position where the highlighted text ends (exclusive)
  - prefix: A short snippet of text before the highlight (max 50 chars)
  - IMPORTANT: Offsets must be within the document bounds (0 to ${content.length})

All your content should be in plain text format. Do not use markdown formatting, links, or special characters in the JSON output.

Here is the Markdown content to analyze:

\`\`\`markdown
${content}
\`\`\`
`;

  const startTime = Date.now();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: finalPrompt }],
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
    // First try to parse with jsonc-parser to validate structure
    const errors: ParseError[] = [];
    const jsoncResult = parseJsonc(cleanedResponse, errors, {
      allowTrailingComma: true,
    });

    if (errors.length > 0) {
      console.warn("JSONC parsing found issues:", errors);
      // If there are errors, try to repair the JSON
      const repairedJson = jsonrepair(cleanedResponse);
      console.log("Repaired JSON:", repairedJson);
      parsedLLMReview = JSON.parse(repairedJson);
    } else {
      // If no errors, use the jsonc-parser result
      parsedLLMReview = jsoncResult as LLMReview;
    }

    validateLLMResponse(parsedLLMReview, content);
  } catch (err) {
    console.error("❌ Invalid review structure:", err);
    console.error("Original response:", cleanedResponse);
    throw err;
  }

  // Transform LLMReview into DocumentReview
  const review: DocumentReview = {
    agentId,
    costInCents: Math.round(usage?.total_tokens || 0),
    createdAt: new Date(),
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
    summary: parsedLLMReview.summary,
    comments: parsedLLMReview.comments,
  };

  return {
    review,
    usage,
    llmResponse,
    finalPrompt,
    agentContext,
  };
}

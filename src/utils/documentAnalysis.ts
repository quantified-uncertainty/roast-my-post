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
import {
  processRawComments,
  type RawLLMHighlight,
} from './highlightUtils.js';

// Type for the raw LLM response before transformation
interface LLMReview {
  summary: string;
  comments: Array<Omit<Comment, "highlight"> & { highlight: RawLLMHighlight }>;
}

export async function loadAgentInfo(agentId: string) {
  try {
    const agentPath = path.join(
      process.cwd(),
      "src",
      "data",
      "agents",
      "dist",
      `${agentId}.json`
    );
    const agentContent = await readFile(agentPath, "utf-8");
    return JSON.parse(agentContent);
  } catch (error) {
    console.warn(`⚠️ Could not load agent info for ${agentId}:`, error);
    return null;
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

// Add this function before analyzeDocument
function escapeJsonString(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t"); // Escape tabs
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

  // Generate comment template - updated for array format
  const commentTemplate = Array.from(
    { length: targetComments },
    () => `
    {
      "title": "...",
      "description": "...",
      "highlight": {
        "prefix": "...", // ~50 chars before highlight
        "startText": "...", // First ~15-20 chars of the highlight
        "quotedText": "..." // The EXACT full text being highlighted
      }
    }`
  ).join(",");

  const finalPrompt = `
${agentContext}

Given the following Markdown document, output a single evaluation in **valid JSON format**. Adhere strictly to the structure below:

{
  "summary": "[~${targetWordCount} words, correctly escaped JSON string]",
  "comments": [
    ${commentTemplate} // Ensure exactly ${targetComments} comment objects here
  ]
}

**CRITICAL JSON STRING ESCAPING RULES:**
- ALL string content within the JSON MUST be properly escaped.
- Escape double quotes: \" -> \\\"
- Escape backslashes: \\ -> \\\\
- Replace literal newlines within a single string/paragraph with \\n.
- **Escape Markdown characters within strings:**
  - Brackets: \`[Link Text](URL)\` becomes \`\\\\[Link Text\\\\]\\\\(URL\\\\)\`
  - Parentheses: \`(like this)\` becomes \`\\\\(like this\\\\)\`
  - Asterisks for bold/italics if used inside string: \`**bold**\` becomes \`**bold**\` (these are often fine, but escape if unsure)
- **EXAMPLE of a description with a link:** "description": "This relates to\\\\nBostroms paper on \\\\[differential tech dev\\\\]\\\\(http://example.com\\\\).\"
- FAILURE TO FOLLOW ESCAPING RULES WILL RESULT IN INVALID JSON.

**SUMMARY INSTRUCTIONS:**
- Target ~${targetWordCount} words.
- Use markdown formatting (bold, italics, links) if appropriate, ensuring it is **correctly escaped** within the JSON string per the rules above.

**COMMENT INSTRUCTIONS (Provide exactly ${targetComments}):**
- Each comment MUST include a \`title\` and \`description\`.
- If using Markdown links/citations in \`description\`, ensure they are **correctly escaped** per the rules above.
- Each comment MUST include a \`highlight\` object containing **ONLY** these three fields:
  - \`prefix\`: Provide ~50 characters of the text immediately preceding the highlight (JSON escaped string).
  - \`startText\`: Provide the first ~15-20 characters of the text you intend to highlight (JSON escaped string).
  - \`quotedText\`: Provide the **EXACT, VERBATIM text** being highlighted, including original formatting, newlines, and any special characters (JSON escaped string).
- **DO NOT include IDs or number the comments.**
- Ensure \`prefix\`, \`startText\`, and \`quotedText\` are valid JSON strings with proper escaping.
- The \`quotedText\` MUST be accurately copied from the document.

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
    const errors: ParseError[] = [];
    const jsoncResult = parseJsonc(cleanedResponse, errors, {
      allowTrailingComma: true,
    });
    if (errors.length > 0) {
      console.warn("JSONC parsing found issues:", errors);
      // Try to repair the JSON with better escaping
      const escapedResponse = escapeJsonString(cleanedResponse);
      const repairedJson = jsonrepair(escapedResponse);
      console.log("Repaired JSON:", repairedJson);
      parsedLLMReview = JSON.parse(repairedJson);
    } else {
      parsedLLMReview = jsoncResult as LLMReview;
    }
    // Basic validation of top-level structure
    if (!parsedLLMReview || typeof parsedLLMReview !== "object")
      throw new Error("Parsed response is not an object");
    if (!parsedLLMReview.summary) throw new Error("Missing summary");
    if (!Array.isArray(parsedLLMReview.comments))
      throw new Error("Comments must be an array");
  } catch (err) {
    console.error("❌ Invalid review structure during parsing/repair:", err);
    console.error("Original cleaned response:", cleanedResponse);
    throw err;
  }

  // Process the comments to calculate highlight offsets
  const processedComments = processRawComments(
    content,
    parsedLLMReview.comments
  );

  // Construct the final DocumentReview object
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
    comments: processedComments, // Use the processed comments
  };

  // --- Sort comments by startOffset before saving ---
  if (review.comments) {
    review.comments.sort((a, b) => {
      return (a.highlight.startOffset || 0) - (b.highlight.startOffset || 0);
    });
    console.log(`ℹ️ Sorted comments by startOffset for agent ${agentId}`);
  }

  return {
    review,
    usage,
    llmResponse,
    finalPrompt,
    agentContext,
  };
}

import { mkdir, readFile, writeFile } from "fs/promises";
import json5 from "json5";
import { parse as parseJsonc, ParseError } from "jsonc-parser";
import type { JsonicParse } from "jsonic";
import path from "path";

import type { Comment, DocumentReview } from "../types/documentReview";
import { ANALYSIS_MODEL, DEFAULT_TEMPERATURE, openai } from "../types/openai";
import { calculateCost, type ModelName } from "./costCalculator";
import { processRawComments, type RawLLMHighlight } from "./highlightUtils";
import {
  Comment as LLMComment,
  LLMResponse,
  LLMResponseSchema,
  parseLLMResponse,
} from "./responseParser";

// Dynamic imports for ESM modules
const importJsonrepair = () => import("jsonrepair");
const importJsonLoose = () => import("json-loose");
const importJsonic = async (): Promise<{ default: JsonicParse }> =>
  import("jsonic");

// Type for the raw LLM response before transformation
interface RawLLMReview {
  thinking: string;
  summary: string;
  comments: Array<Omit<Comment, "highlight"> & { highlight: RawLLMHighlight }>;
  grade?: number;
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
  const baseComments = 5;
  const contentLength = content.length;
  // Roughly 1 comment per 50 words (more aggressive than before)
  // Assuming ~5 chars per word
  const additionalComments = Math.floor(contentLength / 250);
  return Math.max(baseComments, Math.min(additionalComments, 50));
}

// Add this function before repairComplexJson
function extractJsonContent(response: string): string {
  // Try to find the first occurrence of a JSON object
  const jsonStart = response.indexOf("{");
  const jsonEnd = response.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    return response; // Return original if no JSON found
  }

  // Extract the JSON content
  let jsonContent = response.substring(jsonStart, jsonEnd + 1);

  // Remove any markdown code block markers
  jsonContent = jsonContent
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Handle markdown-style formatting
  jsonContent = jsonContent
    // Handle markdown-style underscores
    .replace(/_([^_]+)_/g, "\\_$1\\_")
    // Handle markdown blockquotes
    .replace(/^>/gm, "\\>")
    // Handle markdown lists
    .replace(/^\d+\./gm, (match) => match.replace(".", "\\."))
    // Handle markdown links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "\\[$1\\]\\($2\\)")
    // Handle markdown emphasis
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // Handle markdown headers
    .replace(/^#+\s+/gm, "");

  // Handle unescaped quotes in string values
  jsonContent = jsonContent.replace(/(?<!\\)"([^"]*?)(?<!\\)"/g, (match) => {
    return match.replace(/(?<!\\)"/g, '\\"');
  });

  // Convert string numbers to actual numbers for numeric fields
  jsonContent = jsonContent
    .replace(/"importance"\s*:\s*"(\d+)"/g, '"importance": $1')
    .replace(/"grade"\s*:\s*"(\d+)"/g, '"grade": $1')
    .replace(/"startOffset"\s*:\s*"(\d+)"/g, '"startOffset": $1')
    .replace(/"endOffset"\s*:\s*"(\d+)"/g, '"endOffset": $1');

  // Ensure required fields are present
  jsonContent = jsonContent
    // Add missing isValid field to comments
    .replace(/("highlight"\s*:[\s\S]*?})/g, (match, p1) => {
      if (!match.includes('"isValid"')) {
        return `${match.slice(0, -1)},"isValid":true}`;
      }
      return match;
    })
    // Add error field for invalid comments
    .replace(
      /"isValid"\s*:\s*false(?![\s\S]*?"error")/g,
      '"isValid":false,"error":"Invalid highlight"'
    );

  // Handle any remaining special characters
  jsonContent = jsonContent.replace(
    /[\u0000-\u001F\u007F-\u009F]/g,
    (match) => {
      return "\\u" + ("0000" + match.charCodeAt(0).toString(16)).slice(-4);
    }
  );

  // Remove trailing commas
  jsonContent = jsonContent.replace(/,(\s*})/g, "$1").replace(/,(\s*])/g, "$1");

  return jsonContent;
}

// Improved function to repair complex JSON
export async function repairComplexJson(jsonString: string): Promise<any> {
  // First clean and extract the JSON content
  const cleanedJson = extractJsonContent(jsonString);
  const errors: string[] = [];

  // Try parsing with JSON.parse first (fastest)
  try {
    return JSON.parse(cleanedJson);
  } catch (e: unknown) {
    errors.push(
      `JSON.parse error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // Try jsonc-parser
  const jsoncErrors: ParseError[] = [];
  try {
    const result = parseJsonc(cleanedJson, jsoncErrors, {
      allowTrailingComma: true,
      disallowComments: false,
    });
    if (result && jsoncErrors.length === 0) return result;
  } catch (e: unknown) {
    errors.push(
      `jsonc-parser error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // Try json5
  try {
    const result = json5.parse(cleanedJson);
    if (result) return result;
  } catch (e: unknown) {
    errors.push(`json5 error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Try jsonrepair
  try {
    const { jsonrepair } = await importJsonrepair();
    const repairedJson = jsonrepair(cleanedJson);
    const result = JSON.parse(repairedJson);
    if (result) return result;
  } catch (e: unknown) {
    errors.push(
      `jsonrepair error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // Try json-loose
  try {
    const { default: jsonLoose } = await importJsonLoose();
    const result = jsonLoose(cleanedJson);
    if (result) return result;
  } catch (e: unknown) {
    errors.push(
      `json-loose error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // Try jsonic as last resort
  try {
    const { default: jsonic } = await importJsonic();
    const result = jsonic(cleanedJson);
    if (result) return result;
  } catch (e: unknown) {
    errors.push(`jsonic error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // If all parsing attempts fail, log the errors and throw a detailed error
  console.error("JSON parsing failed with the following errors:", errors);
  console.error("Original JSON string:", jsonString);
  console.error("Cleaned JSON string:", cleanedJson);

  throw new Error(
    `Failed to parse JSON after multiple attempts. Errors: ${errors.join("; ")}`
  );
}

export async function analyzeDocument(
  document: {
    content: string;
    title?: string;
    author?: string;
    publishedDate?: string;
    url?: string;
    [key: string]: any;
  },
  agentId: string
): Promise<{
  review: DocumentReview;
  usage: any;
  llmResponse: string;
  finalPrompt: string;
  agentContext: string;
}> {
  try {
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

    const targetWordCount = calculateTargetWordCount(document.content);
    const targetComments = calculateTargetComments(document.content);
    console.log(`📊 Target word count: ${targetWordCount}`);
    console.log(`📊 Target comments: ${targetComments}`);

    const commentStructure = agentInfo?.gradeInstructions
      ? `{
        "title": "string",
        "description": "string",
        "highlight": {
          "start": "exact text snippet from document where highlight begins",
          "end": "exact text snippet from document where highlight ends"
        },
        "importance": "0-100",
        "grade": "0-100"
      }`
      : `{
        "title": "string",
        "description": "string",
        "highlight": {
          "start": "exact text snippet from document where highlight begins",
          "end": "exact text snippet from document where highlight ends"
        },
        "importance": "0-100"
      }`;

    const prompt = `# AGENT CONTEXT
## Your Role and Purpose
You are ${agentInfo.name}, ${agentInfo.description}. Your specific role is to ${agentInfo.purpose}.

## Your Core Instructions
${agentInfo.genericInstructions}

## Your Unique Capabilities
${agentInfo.capabilities.map((cap: string) => `- ${cap}`).join("\n")}

# DOCUMENT METADATA
Title: ${document.title || "Untitled"}
Author: ${document.author || "Unknown"}
Published Date: ${document.publishedDate || "Unknown"}
URL: ${document.url || "Unknown"}
${Object.entries(document)
  .filter(
    ([key]) =>
      ![
        "content",
        "title",
        "author",
        "publishedDate",
        "url",
        "id",
        "slug",
        "reviews",
      ].includes(key)
  )
  .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  .join("\n")}

# ANALYSIS INSTRUCTIONS
Your analysis should follow this structure:

1. Thinking (3x the length of your summary)
   - Consider the document through your specific lens
   - Reflect on what aspects are most relevant to your expertise

2. Comments. Each comment should be in this format:
${commentStructure}

   For each comment:
   - Title should reflect your expertise
   - Description should explain through your lens
   - Highlight should specify exact text snippets
   - Importance (0-100) indicates significance from your perspective:
     * 90-100: Exceptionally relevant to your expertise
     * 80-89: Very significant
     * 70-79: Interesting and relevant
     * 60-69: Somewhat relevant
     * 50-59: Some relevance
     * 40-49: Mostly tangential
     * 30-39: Little value
     * 0-29: Not relevant
    ${agentInfo?.gradeInstructions ? "\n   - **Grade (0-100)** - The strength of the quoted section:\n     * **0-30**: The section is lacking or problematic\n     * **31-49**: The section has significant issues\n     * **50**: The section is neutral/balanced\n     * **51-70**: The section has some positive aspects\n     * **71-100**: The section is very strong" : ""}

3. Summary
   - Concise overview of your specialized analysis
   - Focus on your unique insights
   - Get straight to your expert perspective

4. Grade (0-100)
   - Based on your specialized grading criteria
   - 90-100: Exceptional
   - 80-89: Very strong
   - 70-79: Good
   - 60-69: Decent
   - 50-59: Mediocre
   - 40-49: Poor
   - 30-39: Very poor
   - 0-29: Unacceptable

Format your response in JSON like this:
{
  "thinking": "Your detailed thinking process in markdown format. Use \\n for newlines and \\" for quotes.",
  "comments": [${commentStructure}],
  "summary": "Your specific perspective and key insights"${agentInfo?.gradeInstructions ? ',\n  "grade": "number from 0-100"' : ""}
}

Here's the document to analyze:

${document.content}`;

    const startTime = Date.now();
    let completion;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        console.log(`📝 Attempting API call (${4 - retries}/3)...`);
        completion = await openai.chat.completions.create(
          {
            model: ANALYSIS_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: DEFAULT_TEMPERATURE,
          },
          {
            timeout: 120000, // 2 minute timeout
          }
        );
        console.log("Raw API Response:", JSON.stringify(completion, null, 2));
        break; // Success, exit the retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`❌ OpenAI API Error (${retries} retries left):`);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error status:", error.status);
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
        }
        retries--;
        if (retries > 0) {
          console.log("⏳ Waiting 5 seconds before retrying...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    if (!completion) {
      throw new Error(
        `OpenAI API call failed after 3 retries: ${lastError?.message || "Unknown error"}`
      );
    }

    const runtimeMs = Date.now() - startTime;

    if (!completion.choices || completion.choices.length === 0) {
      throw new Error("LLM response contained no choices");
    }

    const firstChoice = completion.choices[0];
    if (!firstChoice.message) {
      throw new Error("LLM response choice contained no message");
    }

    const llmResponse = firstChoice.message.content;
    if (!llmResponse) {
      throw new Error("LLM response message contained no content");
    }

    // Parse and validate the LLM response
    const parsedLLMReview = await parseLLMResponse<LLMResponse<LLMComment>>(
      llmResponse,
      LLMResponseSchema
    );

    // Convert the parsed review to document comments
    const documentComments = parsedLLMReview.comments.map((comment) => ({
      title: comment.title,
      description: comment.description,
      highlight: {
        start: comment.highlight.start,
        end: comment.highlight.end,
      },
      importance: comment.importance,
      grade: comment.grade,
      isValid: comment.isValid,
      error: comment.error,
    }));

    // Process the comments to calculate highlight offsets
    const processedComments = await processRawComments(
      document.content,
      documentComments
    );

    // Validate comment schema
    processedComments.forEach((comment, index) => {
      if (comment.isValid === undefined) {
        throw new Error(`Comment at index ${index} is missing isValid field`);
      }
      if (!comment.isValid && !comment.error) {
        throw new Error(
          `Invalid comment at index ${index} is missing error message`
        );
      }
      if (comment.highlight === undefined) {
        throw new Error(`Comment at index ${index} is missing highlight field`);
      }
      if (
        comment.highlight.startOffset === undefined ||
        comment.highlight.endOffset === undefined
      ) {
        throw new Error(
          `Comment at index ${index} has invalid highlight offsets`
        );
      }
      if (!comment.highlight.quotedText) {
        throw new Error(`Comment at index ${index} is missing quotedText`);
      }
    });

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

    // Construct the final DocumentReview object
    const review: DocumentReview = {
      agentId,
      costInCents: Math.round(
        calculateCost(
          ANALYSIS_MODEL as ModelName,
          usage?.prompt_tokens || 0,
          usage?.completion_tokens || 0
        ).totalCost * 100
      ), // Convert to cents
      createdAt: new Date(),
      runDetails: usage
        ? JSON.stringify({
            model: ANALYSIS_MODEL,
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            temperature: DEFAULT_TEMPERATURE,
            runtimeMs,
          })
        : undefined,
      thinking: parsedLLMReview.thinking,
      summary: parsedLLMReview.summary,
      comments: processedComments,
      grade: parsedLLMReview.grade,
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
      finalPrompt: prompt,
      agentContext,
    };
  } catch (error) {
    console.error("❌ Error in analyzeDocument:", error);
    throw error;
  }
}

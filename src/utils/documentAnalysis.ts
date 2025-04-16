import { mkdir, readFile, writeFile } from "fs/promises";
import { parse as parseJsonc, ParseError } from "jsonc-parser";
import path from "path";

import type { Comment, DocumentReview } from "../types/documentReview";
import { ANALYSIS_MODEL, DEFAULT_TEMPERATURE, openai } from "../types/openai";
import { processRawComments, type RawLLMHighlight } from "./highlightUtils";

// Type for the raw LLM response before transformation
interface LLMReview {
  summary: string;
  comments: Array<Omit<Comment, "highlight"> & { highlight: RawLLMHighlight }>;
  grade?: string;
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
  return Math.max(baseComments, Math.min(additionalComments, 5)); // Cap at 100 comments
}

// Add this function before analyzeDocument
function escapeJsonString(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t") // Escape tabs
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
      // Handle control characters that can break JSON
      return "\\u" + ("0000" + match.charCodeAt(0).toString(16)).slice(-4);
    });
}

// Improved function to repair complex JSON
async function repairComplexJson(
  jsonString: string
): Promise<string | undefined> {
  try {
    // First try with jsonc-parser
    const errors: ParseError[] = [];
    const result = parseJsonc(jsonString, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (errors.length === 0) {
      return JSON.stringify(result);
    }

    console.warn("Initial jsonc-parser found issues:", errors);

    // Try to identify and fix common patterns that might be breaking JSON
    let repaired = jsonString;

    // 1. Fix unescaped quotes in quotedText fields
    repaired = repaired.replace(
      /"quotedText"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
      (match, content) => {
        // Make sure all quotes within content are escaped
        const fixedContent = content.replace(/([^\\])"/g, '$1\\"');
        return `"quotedText": "${fixedContent}"`;
      }
    );

    // 2. Fix missing colons in key-value pairs
    repaired = repaired.replace(/"([^"]+)"\s+(["{[])/g, '"$1": $2');

    // 3. Fix missing comma between objects in an array
    repaired = repaired.replace(/}(\s*){/g, "},\n{");

    // 4. Fix dangling commas at the end of objects/arrays
    repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

    // Try parsing again with jsonc-parser
    const newErrors: ParseError[] = [];
    const newResult = parseJsonc(repaired, newErrors, {
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (newErrors.length === 0) {
      return JSON.stringify(newResult);
    }

    console.error("Manual repairs also failed:", newErrors);

    // Try to locate specific issues in the error message
    const error = newErrors[0];
    if (error) {
      const position = error.offset;
      const start = Math.max(0, position - 30);
      const end = Math.min(repaired.length, position + 30);
      const problematicSection = repaired.substring(start, end);

      console.error(
        `Problem area around position ${position}: "${problematicSection}"`
      );

      // Try to fix specific issues based on what's in the problematic section
      if (
        problematicSection.includes('"quotedText"') &&
        !problematicSection.includes('"quotedText":')
      ) {
        // Fix missing colon after quotedText
        repaired =
          repaired.substring(0, start) +
          problematicSection.replace(/"quotedText"\s+/, '"quotedText": ') +
          repaired.substring(end);
      } else if (
        problematicSection.includes('"startText"') &&
        !problematicSection.includes('"startText":')
      ) {
        // Fix missing colon after startText
        repaired =
          repaired.substring(0, start) +
          problematicSection.replace(/"startText"\s+/, '"startText": ') +
          repaired.substring(end);
      } else if (
        problematicSection.includes('"prefix"') &&
        !problematicSection.includes('"prefix":')
      ) {
        // Fix missing colon after prefix
        repaired =
          repaired.substring(0, start) +
          problematicSection.replace(/"prefix"\s+/, '"prefix": ') +
          repaired.substring(end);
      } else {
        // Generic fix - add a colon if we see a key pattern
        repaired =
          repaired.substring(0, start) +
          problematicSection.replace(/"([^"]+)"\s+([^:])/g, '"$1": $2') +
          repaired.substring(end);
      }

      // Try one final parse
      const finalErrors: ParseError[] = [];
      const finalResult = parseJsonc(repaired, finalErrors, {
        allowTrailingComma: true,
        disallowComments: false,
      });

      if (finalErrors.length === 0) {
        return JSON.stringify(finalResult);
      }

      // Last resort - remove the problematic section and replace with dummy value
      const safeJson =
        repaired.substring(0, start) +
        '"problematicText": "removed for parsing"' +
        repaired.substring(end);

      const safeErrors: ParseError[] = [];
      const safeResult = parseJsonc(safeJson, safeErrors, {
        allowTrailingComma: true,
        disallowComments: false,
      });

      if (safeErrors.length === 0) {
        return JSON.stringify(safeResult);
      }
    }

    return undefined;
  } catch (error) {
    console.error("All repair attempts failed:", error);
    return undefined;
  }
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

  const commentStructure = agentInfo?.gradeInstructions
    ? `{
      "title": "string",
      "description": "string",
      "highlight": {
        "startOffset": "number",
        "endOffset": "number"
      },
      "importance": "0-100",
      "evaluation": "0-100"
    }`
    : `{
      "title": "string",
      "description": "string",
      "highlight": {
        "startOffset": "number",
        "endOffset": "number"
      },
      "importance": "0-100"
    }`;

  const prompt = `You are analyzing a document. Please provide:
1. A summary of the document
${agentInfo?.gradeInstructions ? "2. A letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F) for the document\n" : ""}
3. A list of comments. Each comment should be in this format:
${commentStructure}

For each comment:
- Title should be a short phrase summarizing the point
- Description should explain the point in more detail
- Highlight should specify the relevant text span in the document
- Importance (0-100) indicates how crucial this point is to understanding the document${agentInfo?.gradeInstructions ? "\n- Evaluation (0-100) indicates how positive/negative this point is, where 0 is very negative and 100 is very positive" : ""}

Format your response in JSON like this:
{
  "summary": "string",${agentInfo?.gradeInstructions ? '\n  "grade": "letter grade",' : ""}
  "comments": [${commentStructure}]
}

Here's the document to analyze:

${content}`;

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

      // Log the specific error positions for debugging
      errors.forEach((error) => {
        const errorPos = error.offset;
        const start = Math.max(0, errorPos - 20);
        const end = Math.min(cleanedResponse.length, errorPos + 20);
        console.warn(
          `Error at position ${errorPos}: "${cleanedResponse.substring(
            start,
            end
          )}"`
        );
      });

      // Try to repair the JSON with improved repair function
      const repairedJson = await repairComplexJson(cleanedResponse);
      if (!repairedJson) {
        throw new Error("Failed to repair JSON");
      }
      console.log("Repaired JSON length:", repairedJson.length);

      // For extra debugging, log a sample of the repaired JSON
      console.log(
        "Repaired JSON sample:",
        repairedJson.substring(0, 100) + "..."
      );

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
    console.error("Original cleaned response length:", cleanedResponse.length);

    // More detailed error information
    if (err instanceof SyntaxError) {
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const start = Math.max(0, position - 30);
        const end = Math.min(cleanedResponse.length, position + 30);
        console.error(
          `JSON syntax error at position ${position}: "${cleanedResponse.substring(
            start,
            end
          )}"`
        );
      }
    }

    // Try one more desperate repair attempt before giving up
    try {
      const lastResortRepair = `{"summary":"Error parsing response","comments":[]}`;
      console.error("Using default empty structure as fallback");
      parsedLLMReview = JSON.parse(lastResortRepair);

      // Return a review with an error message
      return {
        review: {
          agentId,
          costInCents: 0,
          createdAt: new Date(),
          summary:
            "Error: Unable to parse the response from the AI. Please try again.",
          comments: [],
        },
        usage: null,
        llmResponse,
        finalPrompt: prompt,
        agentContext,
      };
    } catch {
      // If even this fails, re-throw the original error
      throw err;
    }
  }

  // Process the comments to calculate highlight offsets
  const processedComments = await processRawComments(
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
          model: ANALYSIS_MODEL,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          temperature: DEFAULT_TEMPERATURE,
          runtimeMs,
        })
      : undefined,
    summary: parsedLLMReview.summary,
    comments: processedComments, // Use the processed comments
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
}

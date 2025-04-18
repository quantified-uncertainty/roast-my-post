import { mkdir, readFile, writeFile } from "fs/promises";
import json5 from "json5";
import { parse as parseJsonc, ParseError } from "jsonc-parser";
import path from "path";

import type { Comment, DocumentReview } from "../types/documentReview";
import { ANALYSIS_MODEL, DEFAULT_TEMPERATURE, openai } from "../types/openai";
import { calculateCost, type ModelName } from "./costCalculator";
import type { RawLLMHighlight } from "./highlightUtils";

// Type for the raw LLM response before transformation
interface LLMReview {
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
  return 5;
  const baseComments = 3;
  const contentLength = content.length;
  // Roughly 1 comment per 100 words
  // Assuming ~5 chars per word
  const additionalComments = Math.floor(contentLength / 500);
  return Math.max(baseComments, Math.min(additionalComments, 30)); // Cap at 100 comments
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

  // Handle markdown-style underscores by replacing them with escaped underscores
  jsonContent = jsonContent.replace(/_([^_]+)_/g, "\\_$1\\_");

  // Handle markdown blockquotes by replacing > with escaped >
  jsonContent = jsonContent.replace(/^>/gm, "\\>");

  // Handle markdown lists by escaping the numbers and dots
  jsonContent = jsonContent.replace(/^\d+\./gm, (match) =>
    match.replace(".", "\\.")
  );

  // Handle markdown links by escaping brackets
  jsonContent = jsonContent.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    "\\[$1\\]\\($2\\)"
  );

  // Handle unescaped quotes in the content
  jsonContent = jsonContent.replace(/(?<!\\)"/g, '\\"');

  // Handle any remaining special characters that might break JSON
  jsonContent = jsonContent.replace(
    /[\u0000-\u001F\u007F-\u009F]/g,
    (match) => {
      return "\\u" + ("0000" + match.charCodeAt(0).toString(16)).slice(-4);
    }
  );

  return jsonContent;
}

// Improved function to repair complex JSON
async function repairComplexJson(
  jsonString: string
): Promise<string | undefined> {
  try {
    // First clean the response to extract only JSON content
    const cleanedJson = extractJsonContent(jsonString);

    // First try with jsonc-parser
    const errors: ParseError[] = [];
    const result = parseJsonc(cleanedJson, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (errors.length === 0) {
      return JSON.stringify(result);
    }

    console.warn("Initial jsonc-parser found issues:", errors);

    try {
      // Try to parse with json5
      const parsed = json5.parse(cleanedJson);
      return JSON.stringify(parsed);
    } catch (error) {
      console.error("json5 parsing failed:", error);

      // Try jsonrepair with a different approach
      try {
        const jsonrepair = await import("jsonrepair");
        // First try to clean up the JSON string
        let cleaned = cleanedJson
          .replace(/\n/g, " ")
          .replace(/\r/g, "")
          .replace(/\t/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Try to repair the cleaned JSON
        const repaired = jsonrepair.jsonrepair(cleaned);
        // Validate the repaired JSON
        JSON.parse(repaired);
        return repaired;
      } catch (repairError) {
        console.error("jsonrepair failed:", repairError);

        // Try json-loose
        try {
          const jsonLoose = await import("json-loose");
          const parsed = jsonLoose.default(cleanedJson);
          return JSON.stringify(parsed);
        } catch (looseError) {
          console.error("json-loose failed:", looseError);

          // Try jsonic
          try {
            // @ts-ignore - jsonic types are not properly defined
            const jsonic = await import("jsonic");
            // @ts-ignore - jsonic constructor types are not properly defined
            const parsed = new jsonic.Jsonic()(cleanedJson);
            return JSON.stringify(parsed);
          } catch (jsonicError) {
            console.error("jsonic failed:", jsonicError);
            return undefined;
          }
        }
      }
    }
  } catch (error) {
    console.error("All repair attempts failed:", error);
    return undefined;
  }
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
    if (!agentInfo) {
      throw new Error(`Agent "${agentId}" not found`);
    }

    const agentContext = `
You are ${agentInfo.name}, ${agentInfo.description}.

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
`;

    const targetWordCount = calculateTargetWordCount(document.content);
    const targetComments = calculateTargetComments(document.content);
    console.log(`📊 Target word count: ${targetWordCount}`);
    console.log(`📊 Target comments: ${targetComments}`);

    const commentStructure = agentInfo?.gradeInstructions
      ? `{
        "title": "string (use **bold** selectively for emphasis on key terms only, not for the entire title)",
        "description": "string (supports full markdown: **bold**, *italics*, [links](url), lists, > quotes, etc)",
        "highlight": {
          "start": "exact text snippet from document where highlight begins",
          "end": "exact text snippet from document where highlight ends"
        },
        "importance": "0-100",
        "grade": "0-10"
      }`
      : `{
        "title": "string (use **bold** selectively for emphasis on key terms only, not for the entire title)",
        "description": "string (supports full markdown: **bold**, *italics*, [links](url), lists, > quotes, etc)",
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

   Target number of comments: ${targetComments}
   For each comment:
   - Title should be specific and reflect your expertise
   - Description should be detailed (at least 3 sentences) and use markdown formatting:
     * Use **bold** for key terms
     * Use *italics* for emphasis
     * Use > for blockquotes when referencing other work
     * Include relevant links to external sources when possible
   - Highlight should be precise and focused:
     * Maximum length: 500 characters
     * Should capture the exact relevant passage
     * Avoid highlighting entire paragraphs
   - Importance (0-100) indicates significance from your perspective:
     * 90-100: Critical issues that could lead to existential risk
     * 80-89: Major concerns that could cause significant harm
     * 70-79: Important issues that need attention
     * 60-69: Notable concerns worth addressing
     * 50-59: Minor issues that could be improved
     * 40-49: Mostly tangential concerns
     * 30-39: Minor points of interest
     * 0-29: Not particularly relevant
   - Grade (0-100) reflects the merit of the highlighted section itself:
     * 90-100: Exceptionally strong/positive content
     * 80-89: Very strong/positive content
     * 70-79: Good/positive content
     * 60-69: Somewhat positive content
     * 50-59: Neutral/mixed content
     * 40-49: Somewhat negative/problematic content
     * 30-39: Poor/problematic content
     * 20-29: Very poor/problematic content
     * 0-1: Unacceptable/problematic content

   Examples:
   - A grade of 80 would be appropriate for a section that makes a strong, well-supported argument
   - A grade of 30 would be appropriate for a section that contains significant errors or problematic assumptions
   - A grade of 50 would be appropriate for a section that is neutral or has balanced pros and cons
   - A grade of 90 would be appropriate for a section that provides exceptional insight or value

   Note: The grade is about the highlighted section itself, not your analysis of it. If you're pointing out a problem in the text, use a low grade. If you're highlighting something positive, use a high grade.

   Example of a high-quality comment:
   {
     "title": "Misleading Economic Growth Narrative",
     "description": "The document's focus on economic growth and curing diseases (**Section 3**) *fundamentally misses* the central issue of existential risk. As argued in [Bostrom's Superintelligence](https://www.amazon.com/Superintelligence-Dangers-Strategies-Nick-Bostrom/dp/0198739834), the primary concern with AGI is not its potential benefits but the risk of permanent disempowerment or extinction. > \"The first ultraintelligent machine is the last invention that man need ever make.\" This perspective is entirely absent from the document's analysis.",
     "highlight": {
       "start": "the economic growth in front of us looks astonishing",
       "end": "and can fully realize our creative potential"
     },
     "importance": 95,
     "grade": 85
   }

3. Summary
   - Concise overview of your specialized analysis
   - Focus on your unique insights
   - Get straight to your expert perspective

4. Grade (0-10)
   - Based on your specialized grading criteria
   - Meant to capture your sentiment regarding the highlighted section. For example, if you are pointing out that the section is good or bad, use high or low scores. If you are pointing out something different from the quality of the section, respond with a 5. Most scores should be between 3 to 7. Use Decimals, like 6.5.
   - 9-10: Exceptional
   - 8: Very strong
   - 7: Good
   - 6: Decent
   - 5: Neutral 
   - 4: Mediocre
   - 3: Poor
   - 2: Very poor
   - 0-2: Unacceptable

Format your response in JSON like this:
{
  "thinking": "Your detailed thinking process in markdown format. Use \\n for newlines and \\" for quotes.",
  "comments": [${commentStructure}],
  "summary": "Your specific perspective and key insights"${agentInfo?.gradeInstructions ? ',\n  "grade": "number from 0-10"' : ""}
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

    let cleanedResponse = llmResponse
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsedLLMReview: LLMReview | undefined;
    let parseAttempts = 3;
    let lastParseError;

    while (parseAttempts > 0) {
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

        // If we get here, parsing was successful
        break;
      } catch (err) {
        lastParseError = err;
        parseAttempts--;

        if (parseAttempts > 0) {
          console.warn(
            `❌ JSON parsing failed (${parseAttempts} attempts remaining). Retrying...`
          );
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Try to clean the response further
          cleanedResponse = cleanedResponse
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
            .replace(/\r\n/g, "\n") // Normalize line endings
            .replace(/\t/g, "  ") // Replace tabs with spaces
            .trim();
        }
      }
    }

    if (!parsedLLMReview) {
      console.error("❌ All JSON parsing attempts failed:", lastParseError);
      console.error(
        "Original cleaned response length:",
        cleanedResponse.length
      );

      // More detailed error information
      if (lastParseError instanceof SyntaxError) {
        const match = lastParseError.message.match(/position (\d+)/);
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

      // Instead of returning an error review, throw an error to prevent saving
      throw new Error("Failed to parse LLM response after multiple attempts");
    }

    // Process the comments to calculate highlight offsets
    const processedComments = await processRawComments(
      document.content,
      parsedLLMReview.comments
    );

    // Check if we have enough valid comments
    const validComments = processedComments.filter(
      (comment) => comment.isValid
    );
    if (validComments.length < targetComments) {
      console.log(
        `⚠️ Only got ${validComments.length} valid comments, requesting more...`
      );

      // Create a new prompt requesting additional comments
      const additionalPrompt = `# ADDITIONAL COMMENTS REQUESTED
We need ${targetComments - validComments.length} more valid comments. Please provide additional comments following the same format as before.

Previous comments (do not repeat these):
${validComments.map((comment) => `- ${comment.title}: ${comment.description}`).join("\n")}

Please provide new comments that:
1. Do not overlap with the previous comments
2. Focus on different sections of the document
3. Follow the same format and quality standards

Format your response in JSON like this:
{
  "comments": [${commentStructure}]
}`;

      // Make another API call
      const additionalCompletion = await openai.chat.completions.create(
        {
          model: ANALYSIS_MODEL,
          messages: [{ role: "user", content: additionalPrompt }],
          temperature: DEFAULT_TEMPERATURE,
        },
        {
          timeout: 120000,
        }
      );

      if (additionalCompletion.choices?.[0]?.message?.content) {
        const additionalResponse =
          additionalCompletion.choices[0].message.content;
        const additionalParsed = JSON.parse(additionalResponse);

        if (additionalParsed.comments) {
          // Process the additional comments
          const additionalProcessedComments = await processRawComments(
            document.content,
            additionalParsed.comments
          );

          // Add only valid new comments
          const newValidComments = additionalProcessedComments.filter(
            (comment) => comment.isValid
          );
          processedComments.push(...newValidComments);

          console.log(
            `✅ Added ${newValidComments.length} more valid comments`
          );
        }
      }
    }

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
      grade: parsedLLMReview.grade
        ? Number(Number(parsedLLMReview.grade).toFixed(2))
        : undefined,
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
    // Re-throw the error to prevent saving
    throw error;
  }
}

export async function processRawComments(
  document: string,
  comments: Array<Omit<Comment, "highlight"> & { highlight: RawLLMHighlight }>
): Promise<Comment[]> {
  const processedComments: Comment[] = [];
  const usedRanges: Array<{ start: number; end: number }> = [];

  for (const comment of comments) {
    const startOffset = document.indexOf(comment.highlight.start);
    const endOffset =
      document.indexOf(comment.highlight.end) + comment.highlight.end.length;

    // Validate highlight length (max 500 characters)
    const highlightLength = endOffset - startOffset;
    if (highlightLength > 500) {
      console.warn(
        `⚠️ Highlight too long (${highlightLength} chars) for comment: ${comment.title}`
      );
      continue;
    }

    // Check for overlap with existing comments
    const hasOverlap = usedRanges.some(
      (range) =>
        (startOffset >= range.start && startOffset <= range.end) ||
        (endOffset >= range.start && endOffset <= range.end)
    );

    if (hasOverlap) {
      console.warn(
        `⚠️ Highlight overlaps with previous comment: ${comment.title}`
      );
      continue;
    }

    usedRanges.push({ start: startOffset, end: endOffset });

    processedComments.push({
      ...comment,
      highlight: {
        startOffset,
        endOffset,
        quotedText: document.substring(startOffset, endOffset),
      },
      isValid: true,
    });
  }

  return processedComments;
}

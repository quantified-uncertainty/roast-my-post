/**
 * LLM-based text search fallback
 * Uses Claude to find text when fuzzy matching fails
 * Uses line-based finding for more reliable results
 */

import {
  callClaudeWithTool,
  MODEL_CONFIG,
} from "@/lib/claude/wrapper";
import { sessionContext } from "@/lib/helicone/sessionContext";
import type { HeliconeSessionConfig } from "@/lib/helicone/sessions";
import { createHeliconeHeaders } from "@/lib/helicone/sessions";
import { logger } from "@/lib/logger";
import { LineBasedLocator } from "@/lib/text-location/line-based";

import { TextLocation } from "./types";

export interface LLMSearchOptions {
  context?: string;
  sessionConfig?: HeliconeSessionConfig;
  pluginName?: string;
}

interface LineBasedMatch {
  found: boolean;
  startLineNumber: number;
  endLineNumber: number;
  startCharacters: string;
  endCharacters: string;
  confidence: number;
}

export async function llmSearch(
  searchText: string,
  documentText: string,
  options: LLMSearchOptions = {}
): Promise<TextLocation | null> {
  logger.debug(`LLM search for: "${searchText.slice(0, 50)}..."`, {
    plugin: options.pluginName,
  });

  try {
    // Use shared line-based locator
    const locator = new LineBasedLocator(documentText);
    const numberedLines = locator.getNumberedLines();

    const systemPrompt = `You are a text location finder. Given a search text and a numbered document, find where the search text appears in the document.

The search text might be:
- Paraphrased or reworded
- Contain typos or spelling errors
- Be slightly different from the actual text
- Missing or have extra punctuation
- Use different formatting

You must return the line numbers and character snippets of the actual text found in the document.`;

    const userPrompt = `<task>
Find the following text in the document. The text might not match exactly.
</task>

<search_text>
${searchText}
</search_text>

${options.context ? `<context>
${options.context}
</context>

` : ""}<document>
${numberedLines}
</document>

<instructions>
- Find where the search text appears in the document (it may be paraphrased or have typos)
- Line numbers start at 1
- Return the FIRST ~6 characters and LAST ~6 characters of the actual matched text
- If the match spans multiple lines, provide both start and end line numbers
- If multiple matches exist, return the most relevant one based on context
- The character snippets must be EXACTLY as they appear in the document
</instructions>`;

    // Set up session tracking if available
    const sessionConfig = options.sessionConfig || sessionContext.getSession();
    const heliconeHeaders = sessionConfig
      ? createHeliconeHeaders({
          ...sessionConfig,
          sessionPath: `${sessionConfig.sessionPath}/llm-text-search`,
        })
      : undefined;

    const result = await callClaudeWithTool<LineBasedMatch>(
      {
        model: MODEL_CONFIG.analysis,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 500,
        temperature: 0,
        toolName: "locate_text",
        toolDescription: "Locate text in a document using line numbers and character snippets for precise positioning",
        toolSchema: {
          type: "object",
          properties: {
            found: {
              type: "boolean",
              description: "Whether the text was found in the document",
            },
            startLineNumber: {
              type: "number",
              description: "The line number where the match starts (1-based, e.g., Line 1 = 1)",
            },
            endLineNumber: {
              type: "number",
              description: "The line number where the match ends (1-based). Same as startLineNumber if match is on one line",
            },
            startCharacters: {
              type: "string",
              description: "The first ~6 characters of the matched text exactly as they appear in the document",
            },
            endCharacters: {
              type: "string",
              description: "The last ~6 characters of the matched text exactly as they appear in the document",
            },
            confidence: {
              type: "number",
              description: "Confidence score between 0 and 1 indicating how well this matches the search intent",
            },
          },
          required: [
            "found",
            "startLineNumber",
            "endLineNumber",
            "startCharacters",
            "endCharacters",
            "confidence",
          ],
        },
        heliconeHeaders,
      },
      []
    );

    if (!result.toolResult.found) {
      logger.debug("LLM: Text not found");
      return null;
    }

    // Convert line-based location to character offsets
    const lineLocation = {
      startLineIndex: result.toolResult.startLineNumber - 1, // Convert to 0-based
      endLineIndex: result.toolResult.endLineNumber - 1,
      startCharacters: result.toolResult.startCharacters,
      endCharacters: result.toolResult.endCharacters,
    };

    const charLocation = locator.lineLocationToOffset(lineLocation);
    
    if (!charLocation) {
      logger.warn("Failed to convert line location to character offsets", lineLocation);
      return null;
    }

    logger.debug(
      `LLM found: "${charLocation.quotedText}" at [${charLocation.startOffset}, ${charLocation.endOffset}]`
    );

    return {
      startOffset: charLocation.startOffset,
      endOffset: charLocation.endOffset,
      quotedText: charLocation.quotedText,
      strategy: "llm",
      confidence: Math.max(0.7, result.toolResult.confidence * 0.9), // Scale down LLM confidence
    };
  } catch (error) {
    logger.error("LLM search failed:", error);
    return null;
  }
}

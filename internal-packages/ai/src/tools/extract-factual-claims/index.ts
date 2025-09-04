import { z } from "zod";

import { callClaudeWithTool } from "../../claude/wrapper";
import type { DocumentHighlight } from "../../shared/types";
import {
  Tool,
  ToolContext,
} from "../base/Tool";
import fuzzyTextLocatorTool from "../fuzzy-text-locator";
import { generateCacheSeed } from "../shared/cache-utils";

// Create a Zod schema from the DocumentHighlight interface
const highlightSchema = z.object({
  startOffset: z.number(),
  endOffset: z.number(),
  quotedText: z.string(),
  isValid: z.boolean(),
  prefix: z.string().optional(),
  error: z.string().optional(),
}) satisfies z.ZodType<DocumentHighlight>;

// Claim schema
const extractedFactualClaimSchema = z.object({
  exactText: z.string().describe("The EXACT text as it appears in the document - used for location finding"),
  claim: z
    .string()
    .describe(
      "The normalized/cleaned claim text for fact-checking - may have minor edits from exactText for clarity"
    ),
  topic: z
    .string()
    .describe("Topic/category (e.g., 'economics', 'history', 'science')"),
  importanceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How important/central to the document"),
  checkabilityScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How easily this can be fact-checked"),
  truthProbability: z
    .number()
    .min(0)
    .max(100)
    .describe("Estimated probability the fact-checker would verify as true"),
  highlight: highlightSchema
    .optional()
    .describe("Location information for the claim"),
});

// Input validation schema
const inputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(50000)
    .describe("The text to analyze for factual claims"),
  instructions: z
    .string()
    .optional()
    .describe("Additional instructions for extraction"),
  minQualityThreshold: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe("Minimum average score to include a claim"),
  maxClaims: z
    .number()
    .min(1)
    .max(100)
    .default(30)
    .describe("Maximum number of claims to extract"),
}) satisfies z.ZodType<ExtractFactualClaimsInput>;

// Output validation schema
const outputSchema = z.object({
  claims: z
    .array(extractedFactualClaimSchema)
    .describe("Extracted factual claims with scores"),
  summary: z
    .object({
      totalFound: z.number(),
      aboveThreshold: z.number(),
      averageQuality: z.number(),
    })
    .describe("Summary statistics"),
}) satisfies z.ZodType<ExtractFactualClaimsOutput>;

// Export types
export type ExtractedFactualClaim = z.infer<typeof extractedFactualClaimSchema>;

export interface ExtractFactualClaimsInput {
  text: string;
  instructions?: string;
  minQualityThreshold?: number;
  maxClaims?: number;
}

export interface ExtractFactualClaimsOutput {
  claims: ExtractedFactualClaim[];
  summary: {
    totalFound: number;
    aboveThreshold: number;
    averageQuality: number;
  };
}

export class ExtractFactualClaimsTool extends Tool<
  ExtractFactualClaimsInput,
  ExtractFactualClaimsOutput
> {
  config = {
    id: "extract-factual-claims",
    name: "Extract Factual Claims",
    description: "Extract and score verifiable factual claims from text",
    version: "2.0.0",
    category: "analysis" as const,
    costEstimate: "~$0.01-0.03 per analysis (depends on text length)",
    path: "/tools/extract-factual-claims",
    status: "stable" as const,
  };

  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: ExtractFactualClaimsInput,
    context: ToolContext
  ): Promise<ExtractFactualClaimsOutput> {
    context.logger.info(
      `[ExtractFactualClaims] Analyzing text for factual claims`
    );

    const systemPrompt = `You are an expert fact extraction system. Extract verifiable factual claims from text and score them.

For each claim, provide:
1. **Importance Score** (0-100): How central to the document's main argument
2. **Checkability Score** (0-100): How easily fact-checkable with public sources
3. **Truth Probability** (0-100): Estimated probability a fact-checker would verify as TRUE
4. **Claim**: The normalized claim text (can have minor variations from exactText)
5. **Exact Text**: The exact text as it appears in the document

DO extract: Historical facts, scientific facts, statistics, institutional facts, research findings
DON'T extract: Math calculations (Math tool handles), future predictions (Forecast tool handles), opinions, hypotheticals

Focus on concrete, verifiable factual claims only.`;

    const userPrompt = `Extract factual claims from this text:

${input.text}

${input.instructions ? `Additional instructions: ${input.instructions}` : ''}

Requirements:
- Min quality threshold: ${input.minQualityThreshold ?? 50}
- Max claims: ${input.maxClaims ?? 30}
- Extract verifiable factual claims and score them appropriately`;
    
    // Generate cache seed based on content for consistent caching
    const cacheSeed = generateCacheSeed("fact-extract", [
      input.text,
      input.instructions || "",
      input.minQualityThreshold || 50,
      input.maxClaims || 30,
    ]);

    const result = await callClaudeWithTool<{
      claims: ExtractedFactualClaim[];
    }>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0,
      toolName: "extract_factual_claims",
      toolDescription: "Extract and score factual claims from text",
      toolSchema: {
        type: "object",
        properties: {
          claims: {
            type: "array",
            items: {
              type: "object",
              properties: {
                claim: {
                  type: "string",
                  description:
                    "The claim being made. This can feature minor variations from the exactText.",
                },
                exactText: {
                  type: "string",
                  description:
                    "The exact claim as it appears in the text. Include all the text, including punctuation and capitalization.",
                },
                topic: {
                  type: "string",
                  description:
                    "Topic/category (e.g., 'economics', 'history', 'science')",
                },
                importanceScore: {
                  type: "number",
                  description: "0-100: How central to the document's argument",
                },
                checkabilityScore: {
                  type: "number",
                  description: "0-100: How easily this can be fact-checked",
                },
                truthProbability: {
                  type: "number",
                  description:
                    "0-100: Estimated probability the fact-checker would verify as true",
                },
              },
              required: [
                "claim",
                "exactText",
                "topic",
                "importanceScore",
                "checkabilityScore",
                "truthProbability",
              ],
            },
          },
        },
        required: ["claims"],
      },
      enablePromptCaching: true,
      cacheSeed,
    });

    let allClaims = result.toolResult.claims || [];

    // Handle case where LLM returns claims as a JSON string
    if (typeof allClaims === "string") {
      context.logger.warn(
        "[ExtractFactualClaims] Claims returned as string, attempting to parse"
      );
      try {
        allClaims = JSON.parse(allClaims);
      } catch (error) {
        context.logger.error(
          "[ExtractFactualClaims] Failed to parse claims string:",
          error
        );
        return {
          claims: [],
          summary: {
            totalFound: 0,
            aboveThreshold: 0,
            averageQuality: 0,
          },
        };
      }
    }

    // Ensure allClaims is an array
    if (!Array.isArray(allClaims)) {
      context.logger.warn(
        "[ExtractFactualClaims] Claims is not an array after parsing:",
        { type: typeof allClaims, value: allClaims }
      );
      return {
        claims: [],
        summary: {
          totalFound: 0,
          aboveThreshold: 0,
          averageQuality: 0,
        },
      };
    }

    // Add location information to each claim
    context.logger.info(
      "[ExtractFactualClaims] Finding locations for claims"
    );
    for (const claim of allClaims) {
        try {
          const locationResult = await fuzzyTextLocatorTool.execute(
            {
              documentText: input.text,
              searchText: claim.exactText,
              options: {
                normalizeQuotes: true,
                partialMatch: false,
                useLLMFallback: true,
              },
            },
            context
          );
          if (locationResult.found && locationResult.location) {
            claim.highlight = {
              startOffset: locationResult.location.startOffset,
              endOffset: locationResult.location.endOffset,
              quotedText: locationResult.location.quotedText,
              prefix: input.text
                .substring(
                  Math.max(0, locationResult.location.startOffset - 50),
                  locationResult.location.startOffset
                )
                .trim(),
              isValid: true,
            };
          } else {
            claim.highlight = {
              startOffset: 0,
              endOffset: 0,
              quotedText: claim.exactText,
              isValid: false,
              error: "Location not found in document",
            };
          }
        } catch (error) {
          context.logger.warn(
            "[ExtractFactualClaims] Failed to find location for claim:",
            {
              claim: claim.exactText.substring(0, 100),
              error: error instanceof Error ? error.message : "Unknown error",
            }
          );

          claim.highlight = {
            startOffset: 0,
            endOffset: 0,
            quotedText: claim.exactText || claim.claim || "",
            isValid: false,
            error:
              error instanceof Error
                ? error.message
                : "Location finding failed",
          };
        }
      }

    // Filter claims based on quality threshold
    const qualityClaims = allClaims.filter((claim) => {
      const avgScore = (claim.importanceScore + claim.checkabilityScore) / 2;
      return avgScore >= (input.minQualityThreshold ?? 50);
    });

    // Sort by priority score (prioritize important claims with low truth probability)
    const sortedClaims = qualityClaims
      .sort((a, b) => {
        const priorityA =
          a.importanceScore + a.checkabilityScore + (100 - a.truthProbability);
        const priorityB =
          b.importanceScore + b.checkabilityScore + (100 - b.truthProbability);
        return priorityB - priorityA;
      })
      .slice(0, input.maxClaims);

    // Calculate summary statistics
    const avgQuality =
      sortedClaims.length > 0
        ? sortedClaims.reduce(
            (sum, claim) =>
              sum + (claim.importanceScore + claim.checkabilityScore) / 2,
            0
          ) / sortedClaims.length
        : 0;

    context.logger.info(
      `[ExtractFactualClaims] Found ${allClaims.length} claims, ${sortedClaims.length} above threshold`
    );

    return {
      claims: sortedClaims,
      summary: {
        totalFound: allClaims.length,
        aboveThreshold: sortedClaims.length,
        averageQuality: Math.round(avgQuality),
      },
    };
  }
}

// Export singleton instance
export const extractFactualClaimsTool = new ExtractFactualClaimsTool();
export default extractFactualClaimsTool;
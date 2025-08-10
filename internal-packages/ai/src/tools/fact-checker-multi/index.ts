import { z } from "zod";
import { Tool, ToolContext } from "../base/Tool";
import { extractFactualClaimsTool } from "../extract-factual-claims";
import { factCheckerTool, FactCheckResult } from "../fact-checker";

// Input validation schema
const inputSchema = z.object({
  text: z.string().min(1).max(50000).describe("Text containing claims to fact-check"),
  searchForEvidence: z.boolean().default(false).describe("Whether to search for additional evidence"),
  maxClaims: z.number().min(1).max(20).default(10).describe("Maximum number of claims to check")
}) satisfies z.ZodType<MultiFactCheckerInput>;

// Output validation schema
const outputSchema = z.object({
  claims: z.array(z.object({
    claim: z.string().describe("The factual claim that was checked"),
    verdict: z.enum(["true", "false", "partially-true", "unverifiable", "outdated"]),
    confidence: z.enum(["high", "medium", "low"]),
    explanation: z.string(),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string()
    })).optional()
  })),
  summary: z.object({
    totalClaims: z.number(),
    trueClaims: z.number(),
    falseClaims: z.number(),
    partiallyTrueClaims: z.number(),
    unverifiableClaims: z.number(),
    outdatedClaims: z.number()
  })
}) satisfies z.ZodType<MultiFactCheckerOutput>;

// Export types
export interface MultiFactCheckerInput {
  text: string;
  searchForEvidence?: boolean;
  maxClaims?: number;
}

export interface MultiFactCheckerOutput {
  claims: Array<{
    claim: string;
    verdict: "true" | "false" | "partially-true" | "unverifiable" | "outdated";
    confidence: "high" | "medium" | "low";
    explanation: string;
    sources?: Array<{ title: string; url: string }>;
  }>;
  summary: {
    totalClaims: number;
    trueClaims: number;
    falseClaims: number;
    partiallyTrueClaims: number;
    unverifiableClaims: number;
    outdatedClaims: number;
  };
}

export class MultiFactCheckerTool extends Tool<MultiFactCheckerInput, MultiFactCheckerOutput> {
  config = {
    id: "fact-checker-multi",
    name: "Multi-Claim Fact Checker",
    description: "Extract and verify multiple factual claims from text",
    version: "1.0.0",
    category: "analysis" as const,
    costEstimate: "~$0.02-0.05 per text (depends on number of claims)",
    path: "/tools/fact-checker-multi",
    status: "stable" as const,
  };

  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: MultiFactCheckerInput,
    context: ToolContext
  ): Promise<MultiFactCheckerOutput> {
    context.logger.info(`[MultiFactChecker] Starting multi-claim fact check`);

    // Step 1: Extract factual claims from the text
    context.logger.info(`[MultiFactChecker] Extracting claims from text`);
    const extractionResult = await extractFactualClaimsTool.execute({
      text: input.text,
      maxClaims: input.maxClaims ?? 10,
      minQualityThreshold: 60 // Focus on higher quality claims for fact-checking
    }, context);

    if (extractionResult.claims.length === 0) {
      context.logger.info(`[MultiFactChecker] No claims found to fact-check`);
      return {
        claims: [],
        summary: {
          totalClaims: 0,
          trueClaims: 0,
          falseClaims: 0,
          partiallyTrueClaims: 0,
          unverifiableClaims: 0,
          outdatedClaims: 0
        }
      };
    }

    context.logger.info(`[MultiFactChecker] Found ${extractionResult.claims.length} claims to check`);

    // Step 2: Check each claim individually
    const checkedClaims: MultiFactCheckerOutput['claims'] = [];
    const verdictCounts = {
      true: 0,
      false: 0,
      "partially-true": 0,
      unverifiable: 0,
      outdated: 0
    };

    for (let i = 0; i < extractionResult.claims.length; i++) {
      const claim = extractionResult.claims[i];
      context.logger.info(`[MultiFactChecker] Checking claim ${i + 1}/${extractionResult.claims.length}: "${claim.originalText}"`);
      
      try {
        const checkResult = await factCheckerTool.execute({
          claim: claim.originalText,
          searchForEvidence: input.searchForEvidence
        }, context);

        checkedClaims.push({
          claim: claim.originalText,
          verdict: checkResult.result.verdict,
          confidence: checkResult.result.confidence,
          explanation: checkResult.result.explanation,
          sources: checkResult.result.sources
        });

        verdictCounts[checkResult.result.verdict]++;
      } catch (error) {
        context.logger.error(`[MultiFactChecker] Error checking claim: ${error}`);
        // Add as unverifiable if there's an error
        checkedClaims.push({
          claim: claim.originalText,
          verdict: "unverifiable",
          confidence: "low",
          explanation: "Unable to verify this claim due to an error during fact-checking."
        });
        verdictCounts.unverifiable++;
      }
    }

    context.logger.info(`[MultiFactChecker] Completed fact-checking ${checkedClaims.length} claims`);

    return {
      claims: checkedClaims,
      summary: {
        totalClaims: checkedClaims.length,
        trueClaims: verdictCounts.true,
        falseClaims: verdictCounts.false,
        partiallyTrueClaims: verdictCounts["partially-true"],
        unverifiableClaims: verdictCounts.unverifiable,
        outdatedClaims: verdictCounts.outdated
      }
    };
  }

  override async beforeExecute(
    input: MultiFactCheckerInput,
    context: ToolContext
  ): Promise<void> {
    context.logger.info(
      `[MultiFactChecker] Starting multi-claim fact check for text (${input.text.length} chars)`
    );
  }

  override async afterExecute(
    output: MultiFactCheckerOutput,
    context: ToolContext
  ): Promise<void> {
    context.logger.info(
      `[MultiFactChecker] Completed: ${output.summary.totalClaims} claims checked`
    );
  }
}

// Export singleton instance
export const multiFactCheckerTool = new MultiFactCheckerTool();
export default multiFactCheckerTool;
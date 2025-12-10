import { z } from "zod";

import {
  ISSUE_TYPES,
} from "../../analysis-plugins/plugins/fallacy-check/constants";
import { callClaudeWithTool } from "../../claude/wrapper";
import {
  Tool,
  ToolContext,
} from "../base/Tool";
import { fallacyExtractorConfig } from "../configs";
import { generateCacheSeed } from "../shared/cache-utils";
import fuzzyTextLocatorTool from "../smart-text-searcher";
import { findLocationInChunk } from "../smart-text-searcher/chunk-location-finder";
import type {
  FallacyExtractorInput,
  FallacyExtractorOutput,
  ExtractedFallacyIssue,
} from "./types";

// Removed severity-calibration and genre imports - we trust the LLM's scores

// Zod schemas
const extractedFallacyIssueSchema = z.object({
  exactText: z
    .string()
    .describe("The EXACT text from the document that has the epistemic issue"),
  issueType: z
    .enum([
      ISSUE_TYPES.MISINFORMATION,
      ISSUE_TYPES.MISSING_CONTEXT,
      ISSUE_TYPES.DECEPTIVE_WORDING,
      ISSUE_TYPES.LOGICAL_FALLACY,
      ISSUE_TYPES.VERIFIED_ACCURATE,
    ] as const)
    .describe("Type of epistemic issue identified"),
  fallacyType: z
    .enum([
      "ad-hominem",
      "straw-man",
      "false-dilemma",
      "slippery-slope",
      "appeal-to-authority",
      "appeal-to-emotion",
      "appeal-to-nature",
      "hasty-generalization",
      "survivorship-bias",
      "selection-bias",
      "cherry-picking",
      "circular-reasoning",
      "equivocation",
      "non-sequitur",
      "other",
    ] as const)
    .optional()
    .describe("Specific fallacy type (only for logical-fallacy issues)"),
  severityScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Severity score from 0-100 (higher = more severe)"),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence score from 0-100 (higher = more confident this is the fallacy)"),
  reasoning: z
    .string()
    .describe("Detailed reasoning for why this is an issue"),
  importanceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How important to address (0-100)"),
  approximateLineNumber: z
    .number()
    .optional()
    .describe("Approximate line number where this text appears (helps with faster location finding)"),
}) satisfies z.ZodType<ExtractedFallacyIssue>;

const inputSchema = z.object({
  text: z.string().min(1).max(50000).describe("Text chunk to analyze for epistemic issues and logical fallacies"),
  documentText: z.string().optional().describe("Full document text (optional, used for accurate location finding)"),
  chunkStartOffset: z.number().min(0).optional().describe("Byte offset where this chunk starts in the full document (optimization for location finding)"),
}) satisfies z.ZodType<FallacyExtractorInput>;

const outputSchema = z.object({
  issues: z.array(extractedFallacyIssueSchema).describe("Array of extracted epistemic issues with severity, confidence, and importance scores"),
  totalIssuesFound: z.number().describe("Total number of potential issues found before filtering"),
  wasComplete: z.boolean().describe("Whether the analysis was complete or had to be truncated due to length"),
}) satisfies z.ZodType<FallacyExtractorOutput>;

export class FallacyExtractorTool extends Tool<
  FallacyExtractorInput,
  FallacyExtractorOutput
> {
  config = fallacyExtractorConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: FallacyExtractorInput,
    context: ToolContext
  ): Promise<FallacyExtractorOutput> {
    const executionStartTime = Date.now();

    // Hardcoded configuration
    const MIN_SEVERITY_THRESHOLD = 60; // Only report significant issues
    const MAX_ISSUES = 15; // Limit to prevent overwhelming output

    // Audit log: Tool execution started
    context.logger.info(
      "[FallacyExtractor] AUDIT: Tool execution started",
      {
        timestamp: new Date().toISOString(),
        textLength: input.text.length,
        minSeverityThreshold: MIN_SEVERITY_THRESHOLD,
        maxIssues: MAX_ISSUES,
        hasDocumentText: !!input.documentText,
        hasChunkOffset: input.chunkStartOffset !== undefined,
      }
    );

    context.logger.info(
      `[FallacyExtractor] Analyzing text for epistemic issues`
    );

    const systemPrompt = `You are an expert epistemic critic analyzing reasoning quality and argumentation.

**FOCUS**: Sophisticated epistemic issues, NOT basic fact-checking (handled by other tools).

**🚨 CRITICAL: COMMITTING vs DISCUSSING**
- Do NOT flag authors EXPLAINING, WARNING about, or ACKNOWLEDGING errors (good epistemics!)
- Only flag authors MAKING the error themselves

**🎯 SELECTIVITY**: Senior reviewer, not pedantic nitpicker.
- Only flag issues that significantly mislead, clearly commit error, and matter to the argument
- Default to NOT flagging. Aim for ~5-10 high-quality issues, not 20+ marginal ones
- Only report severity ≥ 60, confidence ≥ 70

**FALSE POSITIVE Examples (do NOT flag):**
1. "Selection bias is a major problem in hiring research because we only see candidates who apply"
   → Author EXPLAINING the concept, not committing the error
2. "Be careful not to generalize from a single case study"
   → Author WARNING about error
3. "There isn't a cheap way to run true RCTs on hiring, so we're stuck with observational data and its selection biases"
   → Author ACKNOWLEDGING limitation (good epistemics!)

**TRUE POSITIVE Examples (DO flag):**
1. "Our clients love us! 95% would recommend us to a friend"
   → COMMITTING survivorship bias (only surveying existing clients)
2. "Studies show that our approach is highly effective"
   → COMMITTING weasel words (vague authority without citation)
3. "Since launching in March 2020, we've delivered 847% returns"
   → COMMITTING cherry-picked timeframe (market bottom)

**CORE AREAS (prioritize these):**

1. **Statistical Reasoning Errors**
   - Base rate neglect (ignoring prior probabilities)
   - Survivorship bias (only examining success cases)
   - Selection bias (non-random samples)
   - Framing: absolute vs relative risk ("50% increase" = 2% to 3%)

2. **Sophisticated Logical Fallacies**
   - False dichotomy (only presenting two options)
   - Motte-bailey (defending weak claim by switching to strong one)
   - Circular reasoning (conclusion in premises)
   - Hasty generalization (insufficient evidence → broad claim)

3. **Framing & Rhetorical Manipulation**
   - Anchoring (biasing judgment with reference points)
   - Denominator neglect ("10 deaths" vs "10 per million")
   - Cherry-picked timeframes (ignoring unfavorable periods)
   - False precision ("exactly 47.3%" when rough estimate warranted)

4. **Suspicious Numbers**
   - False precision: "47.3% annual returns" from "internal study"
   - Too perfect: 98%, 99%, 99.9%, 100% = suspiciously high
   - Impossibly exact: "Exactly 10x returns" vs "approximately 10x"

5. **Missing Crucial Context**
   - Only flag when you KNOW what's missing and it significantly changes interpretation
   - Examples: Cherry-picked time periods, undisclosed conflicts of interest, missing comparison groups

6. **Bad Faith Argumentation**
   - Strawmanning (misrepresenting opposing views)
   - Moving goalposts (changing criteria when challenged)
   - Quote mining (taking quotes out of context)
   - Whataboutism (deflecting criticism by pointing elsewhere)

7. **Causal Reasoning Errors**
   - Confounding variables (third variable causes both X and Y)
   - Reverse causation (getting direction backwards)
   - Post hoc ergo propter hoc ("after this, therefore because of this")

8. **Temporal & Historical Errors**
   - Hindsight bias ("I knew it all along" after outcome known)
   - Cherry-picked timeframes: March 2020 (COVID bottom), March 2009 (financial crisis bottom)
   - Suspiciously short time periods (<2 years for market claims)

9. **Narrative Content Issues**
   - Vague claims: "Amazing project", "great work" without specifics
   - Uncritical authority appeals: "Worked at Google" (in what capacity?)
   - Selective self-presentation: Only mentioning successes, hiding failures
   - Implied causation: "After I joined, the company grew 10x" (post hoc)

**AVOID FLAGGING** (other tools handle): Basic fact verification, math errors, grammar, probability forecasts

**Severity Scoring** (0-100):
- 80-100: Egregious manipulation seriously distorting reality (rare!)
- 60-79: Clear, significant reasoning error affecting core claims
- 40-59: Moderate issue (usually skip)
- Below 40: Skip

**For each issue provide:**
- exactText: Exact text from document (must match exactly)
- approximateLineNumber: Rough line number where text appears
- issueType: misinformation, missing-context, deceptive-wording, logical-fallacy, or verified-accurate
- fallacyType (for logical-fallacy): ad-hominem, straw-man, false-dilemma, slippery-slope, appeal-to-authority, appeal-to-emotion, appeal-to-nature, hasty-generalization, survivorship-bias, selection-bias, cherry-picking, circular-reasoning, equivocation, non-sequitur, other
- severityScore (0-100): How serious is this issue
- confidenceScore (0-100): Only flag if ≥ 70
- importanceScore (0-100): How central to the document's argument
- reasoning: Concise explanation using markdown formatting (numbered lists, bullet points)

**Avoid redundancy**: Don't flag same fallacy type multiple times per chunk - report only the most severe instance.`;

    const userPrompt = `Analyze this text for epistemic and reasoning issues:

${input.text}

Analyze ALL sections (argumentative, factual, biographical). Look for statistical errors, logical fallacies, rhetorical manipulation, and narrative issues like vague claims or selective self-presentation. Distribute findings across the entire text.`;

    const cacheSeed = generateCacheSeed("fallacy-extract", [
      input.text,
      MIN_SEVERITY_THRESHOLD,
      MAX_ISSUES,
    ]);

    const result = await callClaudeWithTool<{
      issues: ExtractedFallacyIssue[];
      wasComplete: boolean;
    }>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 8000,
      temperature: 0,
      toolName: "extract_fallacy_issues",
      toolDescription: "Extract and score fallacy issues from text",
      toolSchema: {
        type: "object",
        properties: {
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exactText: {
                  type: "string",
                  description: "The exact text from the document",
                },
                issueType: {
                  type: "string",
                  enum: [
                    ISSUE_TYPES.MISINFORMATION,
                    ISSUE_TYPES.MISSING_CONTEXT,
                    ISSUE_TYPES.DECEPTIVE_WORDING,
                    ISSUE_TYPES.LOGICAL_FALLACY,
                    ISSUE_TYPES.VERIFIED_ACCURATE,
                  ],
                  description: "Type of issue",
                },
                fallacyType: {
                  type: "string",
                  enum: [
                    "ad-hominem",
                    "straw-man",
                    "false-dilemma",
                    "slippery-slope",
                    "appeal-to-authority",
                    "appeal-to-emotion",
                    "appeal-to-nature",
                    "hasty-generalization",
                    "survivorship-bias",
                    "selection-bias",
                    "cherry-picking",
                    "circular-reasoning",
                    "equivocation",
                    "non-sequitur",
                    "other",
                  ],
                  description: "Specific fallacy type (only for logical-fallacy issues)",
                },
                severityScore: {
                  type: "number",
                  description: "0-100: How severe is this issue",
                },
                confidenceScore: {
                  type: "number",
                  description: "0-100: How confident you are this is the fallacy",
                },
                reasoning: {
                  type: "string",
                  description: "Why this is an issue",
                },
                importanceScore: {
                  type: "number",
                  description: "0-100: How important to address",
                },
                approximateLineNumber: {
                  type: "number",
                  description: "Approximate line number where this text appears (optional, helps speed up location finding)",
                },
              },
              required: [
                "exactText",
                "issueType",
                "severityScore",
                "confidenceScore",
                "reasoning",
                "importanceScore",
              ],
            },
          },
          wasComplete: {
            type: "boolean",
            description: "Whether analysis was complete or had to be truncated",
          },
        },
        required: ["issues", "wasComplete"],
      },
      enablePromptCaching: true,
      cacheSeed,
    });

    let allIssues = result.toolResult.issues || [];
    const wasComplete = result.toolResult.wasComplete ?? true;

    // Handle case where LLM returns issues as a JSON string
    if (typeof allIssues === "string") {
      const rawIssuesString: string = allIssues; // Save for error reporting
      context.logger.warn(
        "[FallacyExtractor] Issues returned as string, attempting to parse"
      );
      try {
        allIssues = JSON.parse(allIssues);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        context.logger.error(
          "[FallacyExtractor] Failed to parse issues string:",
          { error: errorMessage, rawValue: rawIssuesString.substring(0, 200) }
        );
        // Don't silently drop results - throw error to surface parsing issue
        throw new Error(
          `Failed to parse LLM response as JSON: ${errorMessage}. This indicates an LLM output format issue that needs investigation.`
        );
      }
    }

    // Ensure allIssues is an array
    if (!Array.isArray(allIssues)) {
      context.logger.error(
        "[FallacyExtractor] Issues is not an array:",
        { type: typeof allIssues, value: allIssues }
      );
      // Don't silently drop results - throw error to surface schema issue
      throw new Error(
        `LLM returned non-array issues (type: ${typeof allIssues}). This indicates an LLM output format issue that needs investigation.`
      );
    }

    // Simple confidence-based filtering: higher severity requires higher confidence
    const getMinConfidence = (severity: number) => {
      if (severity >= 80) return 85;  // CRITICAL issues - highest confidence required
      if (severity >= 60) return 70;  // HIGH issues
      if (severity >= 40) return 50;  // MEDIUM issues
      return 30;                       // LOW issues
    };

    const filteredIssues = allIssues.filter((issue) => {
      // Keep verified-accurate regardless of severity
      if (issue.issueType === ISSUE_TYPES.VERIFIED_ACCURATE) return true;

      // Filter by severity threshold
      if (issue.severityScore < MIN_SEVERITY_THRESHOLD) return false;

      // Apply confidence threshold based on severity
      return issue.confidenceScore >= getMinConfidence(issue.severityScore);
    });

    // Sort by priority: severity × importance (boost verified-accurate claims)
    const sortedIssues = filteredIssues
      .sort((a, b) => {
        const priorityA = a.issueType === ISSUE_TYPES.VERIFIED_ACCURATE
          ? (a.importanceScore || 50) * 50
          : a.severityScore * a.importanceScore;
        const priorityB = b.issueType === ISSUE_TYPES.VERIFIED_ACCURATE
          ? (b.importanceScore || 50) * 50
          : b.severityScore * b.importanceScore;
        return priorityB - priorityA;
      })
      .slice(0, MAX_ISSUES);

    // Find locations for each issue if documentText is provided
    const issuesWithLocations: ExtractedFallacyIssue[] = [];
    if (input.documentText) {
      context.logger.info(`[FallacyExtractor] Finding locations for ${sortedIssues.length} issues`);

      for (const issue of sortedIssues) {
        try {
          let locationResult;

          // OPTIMIZATION: If we have chunk offset, search in chunk first (much faster!)
          if (input.chunkStartOffset !== undefined) {
            // Use optimized 3-tier chunk-based location finding
            locationResult = await findLocationInChunk(
              {
                chunkText: input.text,
                fullDocumentText: input.documentText,
                chunkStartOffset: input.chunkStartOffset,
                searchText: issue.exactText,
                lineNumberHint: issue.approximateLineNumber,
              },
              context
            );
          } else {
            // No chunk offset, search in full document
            locationResult = await fuzzyTextLocatorTool.execute(
              {
                documentText: input.documentText,
                searchText: issue.exactText,
                lineNumberHint: issue.approximateLineNumber,
                options: {
                  normalizeQuotes: true,
                  partialMatch: false,
                  useLLMFallback: true,
                },
              },
              context
            );
          }

          if (locationResult.found && locationResult.location) {
            issuesWithLocations.push({
              ...issue,
              location: {
                startOffset: locationResult.location.startOffset,
                endOffset: locationResult.location.endOffset,
                quotedText: locationResult.location.quotedText,
                strategy: locationResult.location.strategy,
                confidence: locationResult.location.confidence,
              },
            });
            context.logger.debug(
              `[FallacyExtractor] Found location for issue using ${locationResult.location.strategy}`
            );
          } else {
            // Keep issue without location
            issuesWithLocations.push(issue);
            context.logger.warn(
              `[FallacyExtractor] Could not find location for issue: "${issue.exactText.substring(0, 50)}..."`
            );
          }
        } catch (error) {
          // Keep issue without location on error
          issuesWithLocations.push(issue);
          context.logger.error(
            `[FallacyExtractor] Error finding location: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } else {
      // No documentText provided, return issues without locations
      issuesWithLocations.push(...sortedIssues);
    }

    const executionDuration = Date.now() - executionStartTime;

    // Audit log: Tool execution completed
    context.logger.info(
      "[FallacyExtractor] AUDIT: Tool execution completed",
      {
        timestamp: new Date().toISOString(),
        executionDurationMs: executionDuration,
        totalIssuesFound: allIssues.length,
        issuesAfterFiltering: filteredIssues.length,
        issuesReturned: issuesWithLocations.length,
        wasComplete,
        issuesWithLocations: issuesWithLocations.filter(i => i.location).length,
        issuesMissingLocations: issuesWithLocations.filter(i => !i.location).length,
      }
    );

    return {
      issues: issuesWithLocations,
      totalIssuesFound: allIssues.length,
      wasComplete,
    };
  }
}

// Export singleton instance
export const fallacyExtractorTool = new FallacyExtractorTool();
export default fallacyExtractorTool;

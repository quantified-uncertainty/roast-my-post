import { z } from "zod";

import { callClaudeWithTool } from "@/lib/claude/wrapper";
import { sessionContext } from "@/lib/helicone/sessionContext";
import { createHeliconeHeaders } from "@/lib/helicone/sessions";

import {
  Tool,
  ToolContext,
} from "../base/Tool";

const inputSchema = z.object({
  claim: z.string().min(1).max(1000).describe("The factual claim to verify"),
  context: z
    .string()
    .max(5000)
    .optional()
    .describe("Additional context about the claim"),
  searchForEvidence: z
    .boolean()
    .default(false)
    .describe("Whether to search for additional evidence"),
}) satisfies z.ZodType<FactCheckerInput>;

const factCheckResultSchema = z.object({
  verdict: z.enum([
    "true",
    "false",
    "partially-true",
    "unverifiable",
    "outdated",
  ]),
  confidence: z.enum(["high", "medium", "low"]),
  explanation: z.string(),
  corrections: z.string().optional(),
  conciseCorrection: z.string().optional(),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

const outputSchema = z.object({
  result: factCheckResultSchema.describe("The fact-check verdict and details"),
  researchNotes: z
    .string()
    .optional()
    .describe("Additional research notes if evidence was searched"),
  llmInteraction: z.any().describe("LLM interaction for monitoring"),
}) satisfies z.ZodType<FactCheckerOutput>;

// Export types
export type FactCheckResult = z.infer<typeof factCheckResultSchema>;

export interface FactCheckerInput {
  claim: string;
  context?: string;
  searchForEvidence?: boolean;
}

export interface FactCheckerOutput {
  result: FactCheckResult;
  researchNotes?: string;
  llmInteraction?: any;
}

export class FactCheckerTool extends Tool<FactCheckerInput, FactCheckerOutput> {
  config = {
    id: "fact-checker",
    name: "Fact Checker",
    description: "Verify the accuracy of specific factual claims",
    version: "1.0.0",
    category: "analysis" as const,
    costEstimate: "~$0.01-0.02 per claim",
    path: "/tools/fact-checker",
    status: "stable" as const,
  };

  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: FactCheckerInput,
    context: ToolContext
  ): Promise<FactCheckerOutput> {
    context.logger.info(`[FactChecker] Verifying claim: "${input.claim}"`);

    // Get session context if available
    const currentSession = sessionContext.getSession();
    const sessionConfig = currentSession
      ? sessionContext.withPath("/plugins/fact-check/fact-checker-verify")
      : undefined;
    const heliconeHeaders = sessionConfig
      ? createHeliconeHeaders(sessionConfig)
      : undefined;

    // Generate cache seed based on content for consistent caching
    const { generateCacheSeed } = await import("@/tools/shared/cache-utils");
    const cacheSeed = generateCacheSeed("fact-check", [
      input.claim,
      input.context || "",
      input.searchForEvidence || false,
    ]);

    const systemPrompt = `You are an expert fact-checker. Your job is to verify the accuracy of specific factual claims.
    
Today's date is ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.

CRITICAL: You MUST use the fact_check tool to provide your analysis.

For each claim, you should:
1. Assess whether the claim is true, false, partially true, unverifiable, or outdated
2. Provide your confidence level (high, medium, low)
3. Write a detailed explanation using **markdown formatting** with:
   - **Bold** for emphasis on key facts
   - *Italics* for clarifications
   - Clear, well-structured paragraphs
   - DO NOT include inline links unless you are 100% certain of the exact URL
4. If false or partially true, provide:
   - corrections: Full corrected statement
   - conciseCorrection: Brief correction showing the key change. Choose the format that best captures the error:
     
     SIMPLE REPLACEMENTS (use "X → Y" format):
     * Numbers/dates: "2006 → 2009", "$2B → $2.2B", "90% → 9%"
     * Names/places: "France → Germany", "Einstein → Newton"
     * Status/order: "largest → 3rd largest", "first → second"
     * Degree: "doubled → increased 30%", "all → most"
     
     COMPLEX ERRORS (use alternative formats):
     * Anachronisms: "Wrong era (1860s)", "Anachronism"
     * Category errors: "Composer ≠ painter", "Company ≠ nation"
     * Conflations: "Confused with [X]", "Mixed up: X vs Y"
     * Missing context: "+ [key detail]", "Missing: [context]"
     * Oversimplifications: "More complex", "Oversimplified"
     * Debunked claims: "Debunked", "Disproven"
     * Misattributions: "Wrong author", "Not by [X]" (Note: If you have the correct author, use the simple replacement format)
     * Impossible claims: "Physically impossible", "Can't exist"
     * Complete fabrications: "No evidence", "False claim", "Myth"
     * Made-up facts: "Unfounded", "No basis", "Fabricated"
     
     ADDITION/SUBTRACTION FORMATS:
     * Adding qualifiers: "invented → + with Tesla", "CEO → + former", "fastest → + in Asia"
     * Removing words: "first electric car → - first", "only solution → - only"
     * Strikethrough: "~~always~~ sometimes", "~~all~~ most", "~~never~~ rarely"
     
     CREATIVE FORMATS:
     * Conditional truth: "true (pre-2020)", "valid (US only)", "correct (if X)"
     * Relationship errors: "son → grandson", "cause → correlation"
     * Scale/magnitude: "× 1000 off", "÷ 10 error", "off by 10x"
     * Range corrections: "±5 years", "~1850s", "1800-1900"
     * Missing elements: "A → ? → C", "missing step 2", "gap in logic"
     * Uncertainty: "likely false", "probably 1920s", "disputed"
     * Logic issues: "∴ flawed", "non sequitur", "⊥ contradiction"
     
   - Keep under 30 characters when possible
   - For nebulous errors without clear corrections, use descriptive labels
   - Focus on clarity over format consistency
5. Sources - CRITICAL RULES:
   - ONLY include sources if you are ABSOLUTELY CERTAIN of the exact URL
   - DO NOT guess or construct URLs (e.g., don't make up Wikipedia links)
   - If you know a fact but not the exact source URL, explain in text without links
   - Better to have no sources than incorrect sources
   - You may mention source names (e.g., "according to Wikipedia") without URLs
   - Only include in sources array if you have the complete, correct URL

Verdict definitions:
- **true**: The claim is accurate and supported by reliable evidence
- **false**: The claim is demonstrably incorrect
- **partially-true**: Some aspects are true but important details are wrong or missing
- **unverifiable**: Cannot be verified with available information
- **outdated**: Was true at some point but is no longer current

Confidence levels:
- **high**: Multiple reliable sources confirm, or it's well-established fact
- **medium**: Good evidence but some uncertainty remains
- **low**: Limited evidence available or conflicting information

FORMAT YOUR EXPLANATION WITH RICH MARKDOWN:
Example: "The iPhone was actually released in **2007**, not 2006. According to Apple's official announcements and widely documented sources, Steve Jobs announced it at MacWorld on January 9, 2007. The device went on sale on June 29, 2007."

CRITICAL SOURCE RULES:
1. **DO NOT HALLUCINATE URLS** - Never make up or guess URLs
2. **Text citations are fine** - You can say "according to Wikipedia" or "per CDC data" without URLs
3. **Only include URLs you're certain of** - If unsure, describe the source in text only
4. **Empty sources array is OK** - Better than incorrect URLs
5. **Focus on explanation quality** - A good explanation without links is better than one with fake links

Be especially careful with:
- Numbers and statistics (check if they're current)
- Historical dates and events
- Scientific facts and consensus
- Claims about current events (note your knowledge cutoff)`;

    const userPrompt = `<task>
  <instruction>Fact-check this claim</instruction>
  
  <claim>
${input.claim}
  </claim>
  
  ${input.context ? `<context>\n${input.context}\n  </context>\n  ` : ""}
  <requirements>
    Verify the accuracy of this factual claim and provide a verdict with confidence level and evidence.
  </requirements>
</task>`;

    const result = await callClaudeWithTool<FactCheckResult>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0,
      toolName: "fact_check",
      toolDescription: "Verify the accuracy of a factual claim",
      toolSchema: {
        type: "object",
        properties: {
          verdict: {
            type: "string",
            enum: [
              "true",
              "false",
              "partially-true",
              "unverifiable",
              "outdated",
            ],
            description: "The fact-check verdict",
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Confidence level in the verdict",
          },
          explanation: {
            type: "string",
            description:
              "Detailed explanation with markdown formatting and inline links",
          },
          corrections: {
            type: "string",
            description:
              "Full corrected version of the claim if false or partially true",
          },
          conciseCorrection: {
            type: "string",
            description:
              "Brief correction showing key change (e.g., '2006 → 2009', '$2B → $2.2B')",
          },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
              },
              required: ["title", "url"],
            },
            description: "List of sources with titles and URLs",
          },
        },
        required: ["verdict", "confidence", "explanation"],
      },
      heliconeHeaders,
      enablePromptCaching: true,
      cacheSeed,
    });

    context.logger.info(
      `[FactChecker] Verdict: ${result.toolResult.verdict} (${result.toolResult.confidence} confidence)`
    );

    return {
      result: result.toolResult,
      llmInteraction: result.interaction,
    };
  }

  override async beforeExecute(
    input: FactCheckerInput,
    context: ToolContext
  ): Promise<void> {
    context.logger.info(
      `[FactChecker] Starting fact-check for claim: "${input.claim}"`
    );
  }

  override async afterExecute(
    output: FactCheckerOutput,
    context: ToolContext
  ): Promise<void> {
    context.logger.info(
      `[FactChecker] Completed: ${output.result.verdict} verdict`
    );
  }
}

// Export singleton instance
export const factCheckerTool = new FactCheckerTool();
export default factCheckerTool;

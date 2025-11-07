import { z } from "zod";

import { callClaudeWithTool } from "../../claude/wrapper";
import {
  Tool,
  ToolContext,
} from "../base/Tool";
import { epistemicIssuesExtractorConfig } from "../configs";
import { generateCacheSeed } from "../shared/cache-utils";
import { IssueType, ISSUE_TYPES } from "../../analysis-plugins/plugins/epistemic-critic/constants";
import type {
  ExtractedEpistemicIssue,
  EpistemicIssuesExtractorInput,
  EpistemicIssuesExtractorOutput,
} from "./types";
// Removed severity-calibration and genre imports - we trust the LLM's scores

// Zod schemas
const extractedEpistemicIssueSchema = z.object({
  exactText: z
    .string()
    .describe("The EXACT text from the document that has the epistemic issue"),
  issueType: z
    .enum([
      ISSUE_TYPES.MISINFORMATION,
      ISSUE_TYPES.MISSING_CONTEXT,
      ISSUE_TYPES.INSUFFICIENT_EVIDENCE,
      ISSUE_TYPES.DECEPTIVE_WORDING,
      ISSUE_TYPES.LOGICAL_FALLACY,
      ISSUE_TYPES.VERIFIED_ACCURATE,
    ] as const)
    .describe("Type of epistemic issue identified"),
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
  suggestedContext: z
    .string()
    .optional()
    .describe("Suggested context or correction"),
  importanceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How important to address (0-100)"),
  researchableScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How easily this can be fact-checked (0-100)"),
  researchQuery: z
    .string()
    .optional()
    .describe("Specific research query if this should be researched"),
}) satisfies z.ZodType<ExtractedEpistemicIssue>;

const inputSchema = z.object({
  text: z.string().min(1).max(50000),
  focusAreas: z
    .array(z.enum([
      ISSUE_TYPES.MISINFORMATION,
      ISSUE_TYPES.MISSING_CONTEXT,
      ISSUE_TYPES.INSUFFICIENT_EVIDENCE,
      ISSUE_TYPES.DECEPTIVE_WORDING,
      ISSUE_TYPES.LOGICAL_FALLACY,
      ISSUE_TYPES.VERIFIED_ACCURATE,
    ] as const))
    .optional(),
  minSeverityThreshold: z.number().min(0).max(100).default(20),
  maxIssues: z.number().min(1).max(50).default(15),
}) satisfies z.ZodType<EpistemicIssuesExtractorInput>;

const outputSchema = z.object({
  issues: z.array(extractedEpistemicIssueSchema),
  totalIssuesFound: z.number(),
  wasComplete: z.boolean(),
}) satisfies z.ZodType<EpistemicIssuesExtractorOutput>;

export class EpistemicIssuesExtractorTool extends Tool<
  EpistemicIssuesExtractorInput,
  EpistemicIssuesExtractorOutput
> {
  config = epistemicIssuesExtractorConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: EpistemicIssuesExtractorInput,
    context: ToolContext
  ): Promise<EpistemicIssuesExtractorOutput> {
    context.logger.info(
      `[EpistemicIssuesExtractor] Analyzing text for epistemic issues`
    );

    const focusAreasText = input.focusAreas
      ? input.focusAreas.join(", ")
      : "all types";

    const systemPrompt = `You are an expert epistemic critic analyzing reasoning quality and argumentation.

**YOUR UNIQUE FOCUS: Sophisticated epistemic issues, NOT basic fact-checking**

Note: Basic fact verification is handled by other tools. Focus on REASONING QUALITY and HOW information is presented.

**🚨 CRITICAL: Distinguish COMMITTING vs DISCUSSING errors**

Do NOT flag authors who are:
- DISCUSSING or explaining epistemic concepts
- WARNING readers about potential errors
- ACKNOWLEDGING their own limitations (this is good epistemics!)

Only flag authors who are MAKING the error themselves.

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
   - Simpson's paradox (aggregation reversals)
   - Selection bias (non-random samples)
   - Regression to mean misinterpretation
   - Framing: absolute vs relative risk ("50% increase" = 2% to 3%)

2. **Sophisticated Logical Fallacies**
   - False dichotomy (only presenting two options)
   - Motte-bailey (defending weak claim by switching to strong one)
   - Circular reasoning (conclusion in premises)
   - Equivocation (same word, different meanings)
   - Non sequitur (conclusion doesn't follow)
   - Hasty generalization (insufficient evidence → broad claim)

3. **Framing & Rhetorical Manipulation**
   - Anchoring (biasing judgment with reference points)
   - Denominator neglect ("10 deaths" vs "10 per million")
   - Cherry-picked timeframes (ignoring unfavorable periods)
   - Loaded language masking weak arguments
   - False precision ("exactly 47.3%" when rough estimate warranted)

3a. **Suspicious Numbers - PAY SPECIAL ATTENTION**:
    - **False precision**: Excessive decimal places given methodology
      * "47.3% annual returns" from "internal study" = suspicious precision
      * "Approximately 47.3%" = contradictory (can't be both approximate and precise)
    - **Too perfect**: Numbers suspiciously close to round/ideal values
      * 98%, 99%, 99.9%, 100% = suspiciously high
      * Exactly 50%, 75%, 90% when context suggests variability
      * Perfect multiples (100, 500, 1000) in contexts requiring measurement
    - **Too close to 100**: Numbers like 99-101 (not temperatures)
    - **Impossibly exact**: "Exactly 10x returns" vs "approximately 10x"

4. **Confidence Calibration**
   - Overclaiming certainty with weak evidence
   - Treating correlation as causation
   - Ignoring error bars/ranges
   - Conflating models with reality

5. **Missing Crucial Context vs Insufficient Evidence - KEY DISTINCTION**:

   **Use "missing-context" ONLY when you KNOW specific important information is missing:**
   - Example: "Hitler was kind to animals" without mentioning the Holocaust
   - Example: "This drug cured 90% of patients" without mentioning they only tested 10 people
   - Example: Cherry-picked time periods that hide larger pattern
   - Example: Undisclosed conflicts of interest you're aware of
   - Example: Missing comparison groups that change interpretation
   - Requires: You must know what the missing context IS

   **Use "insufficient-evidence" when the claim needs more support:**
   - Example: "This will revolutionize AI" without any supporting evidence
   - Example: Major assumptions stated as fact without justification
   - Example: Vague claims like "significant impact" without quantification
   - Example: Causal claims without adequate evidence
   - Pattern: They SHOULD provide evidence, but it's impossible to provide ALL evidence

   **Remember**: Can't provide all context/evidence for everything! Only flag when:
   - Missing information significantly changes interpretation (missing-context)
   - OR major claim/assumption lacks adequate support (insufficient-evidence)

6. **Bad Faith Argumentation**
   - Strawmanning (misrepresenting opposing views)
   - Moving goalposts (changing criteria when challenged)
   - Gish gallop (overwhelming with many weak arguments)
   - Quote mining (taking quotes out of context)
   - Whataboutism (deflecting criticism by pointing elsewhere)

7. **Causal Reasoning Errors**
   - Confounding variables (third variable causes both X and Y)
   - Reverse causation (getting direction of causation backwards)
   - Correlation vs causation (already covered but emphasize)
   - Post hoc ergo propter hoc ("after this, therefore because of this")

8. **Comparative & Scale Issues**
   - Scope insensitivity (ignoring magnitude: 2,000 vs 200,000 birds)
   - False equivalence ("both sides" when severity differs greatly)
   - Relative privation ("others have it worse" to dismiss concerns)

9. **Evidentiary Issues**
   - Anecdotal evidence (personal stories treated as data)
   - Appeal to nature ("natural therefore safe" fallacy)
   - Appeal to antiquity ("traditional therefore good")
   - Single case generalization

10. **Temporal & Historical Errors**
    - Hindsight bias ("I knew it all along" after outcome known)
    - Presentism (judging past by present knowledge/values)
    - Cherry-picked timeframes - **PAY SPECIAL ATTENTION**:
      * March 2020 (COVID market bottom - everything grew from here)
      * March 2009 (Financial crisis bottom)
      * March 2000 (Dot-com bubble burst)
      * October 2008 (Financial crisis low)
      * ANY conveniently chosen start date that makes performance look better
      * Suspiciously short time periods (<2 years for market claims)

11. **Factual & Narrative Content Issues** - **CRITICAL FOR COVERAGE**
    - **Vague claims**: "Amazing project", "great work", "significant impact" without specifics
    - **Missing citations**: Factual claims without sources or links to evidence
    - **Uncritical authority appeals**: Mentioning credentials/affiliations without context
      * "Worked at Google" (in what capacity? IC? Manager? Intern?)
      * "Published research" (where? peer-reviewed? citations?)
      * "Collaborated with experts" (who? on what? with what results?)
    - **Selective self-presentation**: Only mentioning successes, hiding failures
      * Survivorship bias in personal narrative
      * "My startup was acquired" (at what valuation? profit or acqui-hire?)
      * Listing only projects that succeeded
    - **Missing context in biographical claims**:
      * Duration of roles/projects (2 months vs 2 years matters!)
      * Scale of impact (affected 10 people vs 10,000)
      * Individual vs team contribution
    - **Uncritical framing**: Presenting affiliations/work without acknowledging controversies
      * "Worked on X" (was X successful? ethical? impactful?)
    - **Implied causation in narratives**: "After I joined, the company grew 10x" (post hoc)

**NOTE**: Apply this even in "boring" factual sections! Biographical and descriptive content can have epistemic issues too.

**AVOID FLAGGING (other tools handle):**
- Basic factual claims that need verification → Fact Check plugin
- Mathematical calculations → Math plugin
- Grammar/spelling → Spelling plugin
- Specific probability forecasts → Forecast plugin
- Simple missing citations (unless pattern of selective citing)

**Severity Scoring** (0-100):
- 80-100: Sophisticated manipulation that seriously distorts understanding
- 60-79: Significant reasoning errors affecting key claims
- 40-59: Moderate issues worth noting
- 20-39: Minor concerns
- 0-19: Negligible or handled by other tools

**For each issue, provide:**
- **Severity Score** (0-100): How serious is this issue
- **Confidence Score** (0-100): How sure are you this IS the fallacy
  - 90-100: Textbook example, multiple clear markers
  - 70-89: Strong indicators, likely the fallacy
  - 50-69: Moderate confidence, could be innocent
  - 30-49: Weak confidence, borderline case
- **Importance Score** (0-100): How central to the document's argument
- **Researchable Score** (0-100): Can this be investigated further?
- **Reasoning**: Explain the specific reasoning flaw (be pedagogical)
- **Suggested Context**: What's missing or how to fix the reasoning
- **Research Query**: If deeper investigation needed

**Key Principles:**
- Focus on HOW arguments are made, not just WHAT is claimed
- Look for patterns of reasoning errors across the document
- Identify manipulation tactics that mislead without lying
- Prioritize issues that affect epistemic hygiene
- Help readers develop better critical thinking`;

    const userPrompt = `Analyze this ENTIRE text for sophisticated epistemic and reasoning issues:

${input.text}

Focus areas: ${focusAreasText}
Min severity threshold: ${input.minSeverityThreshold ?? 20}
Max issues to return: ${input.maxIssues ?? 15}

**CRITICAL INSTRUCTIONS**:
- **Analyze EVERY section** - don't stop after finding a few issues in one area
- **Read through the ENTIRE document** before finalizing your list
- **Apply analysis to ALL content types**: argumentative, factual, biographical, narrative, descriptive
- Focus on REASONING QUALITY, not basic fact-checking
- Look for statistical reasoning errors (survivorship bias, base rate neglect, selection bias)
- Identify sophisticated fallacies (false dichotomy, motte-bailey, strawman)
- Catch framing effects and rhetorical manipulation
- Flag patterns of bias or bad faith argumentation
- Prioritize issues that teach better critical thinking
- **Aim for comprehensive coverage across all sections of the text**

**IMPORTANT**: Factual/biographical sections can have epistemic issues too! Look for:
- Vague claims without specifics ("amazing", "significant impact")
- Missing citations for factual claims
- Uncritical authority appeals (credentials without context)
- Selective self-presentation (only successes, no failures)
- Missing context (duration, scale, individual vs team)

**Scan for these patterns THROUGHOUT the entire document:**

**Statistical Issues:**
- Survivorship bias: "90% of successful entrepreneurs dropped out" (ignores failures)
- Selection bias: "95% of our users are satisfied" (only surveyed active users)
- Base rate neglect: Ignoring prior probabilities
- **Cherry-picked timeframe**: "Since March 2020" (market bottom!), "early 2020" (suspicious)
- **Suspicious precision**: "847.3% returns" from vague methodology
- **Too-perfect numbers**: "99.2%", "99.9%" satisfaction (suspiciously high)

**Logical Fallacies:**
- False dichotomy: "Either X or Y" (ignoring alternatives)
- Strawman: Misrepresenting opposing views
- Ad hominem: Attacking people instead of arguments
- Appeal to emotion: Fear, urgency, FOMO tactics

**Deceptive Framing:**
- Quote mining: "shows interesting potential" stripped of context
- Anecdotal evidence as data: Personal stories treated as proof
- Missing baselines: Claims without comparison groups
- Vague sources: "Studies show", "experts say", "internal study"
- Conspiracy thinking: "They don't want you to know"
- Appeal to nature/antiquity: "Natural = safe", "Traditional = good"

**Multiple Manipulation Tactics:**
- Urgency pressure: "Every month you wait costs you..."
- False authority: Citing credentials without relevant expertise
- Impossible claims: "Virtually risk-free", "eliminates emotion"

**Factual/Narrative Content Issues:**
- Vague claims: "Did amazing work on X" (what specifically?)
- Missing citations: "Research shows..." (which research? link?)
- Uncritical credentials: "Worked at Google" (capacity? duration? impact?)
- Selective achievements: Lists only successes, no failures mentioned
- Missing context: "Led project X" (team size? duration? outcome?)
- Implied causation: "After I joined, revenue grew 5x" (correlation ≠ causation)
- Uncritical framing: "Worked on controversial project" without acknowledging controversies

**IMPORTANT**: Make sure to identify issues distributed ACROSS THE ENTIRE TEXT, not just clustered in one section!`;

    const cacheSeed = generateCacheSeed("epistemic-extract", [
      input.text,
      focusAreasText,
      input.minSeverityThreshold || 20,
      input.maxIssues || 15,
    ]);

    const result = await callClaudeWithTool<{
      issues: ExtractedEpistemicIssue[];
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
      toolName: "extract_epistemic_issues",
      toolDescription: "Extract and score epistemic issues from text",
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
                    ISSUE_TYPES.INSUFFICIENT_EVIDENCE,
                    ISSUE_TYPES.DECEPTIVE_WORDING,
                    ISSUE_TYPES.LOGICAL_FALLACY,
                    ISSUE_TYPES.VERIFIED_ACCURATE,
                  ],
                  description: "Type of issue",
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
                suggestedContext: {
                  type: "string",
                  description: "Suggested context or correction (optional)",
                },
                importanceScore: {
                  type: "number",
                  description: "0-100: How important to address",
                },
                researchableScore: {
                  type: "number",
                  description: "0-100: How easily fact-checkable",
                },
                researchQuery: {
                  type: "string",
                  description: "Research query if this should be verified (optional)",
                },
              },
              required: [
                "exactText",
                "issueType",
                "severityScore",
                "confidenceScore",
                "reasoning",
                "importanceScore",
                "researchableScore",
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
      context.logger.warn(
        "[EpistemicIssuesExtractor] Issues returned as string, attempting to parse"
      );
      try {
        allIssues = JSON.parse(allIssues);
      } catch (error) {
        context.logger.error(
          "[EpistemicIssuesExtractor] Failed to parse issues string:",
          error
        );
        return {
          issues: [],
          totalIssuesFound: 0,
          wasComplete: true,
        };
      }
    }

    // Ensure allIssues is an array
    if (!Array.isArray(allIssues)) {
      context.logger.warn(
        "[EpistemicIssuesExtractor] Issues is not an array:",
        { type: typeof allIssues }
      );
      return {
        issues: [],
        totalIssuesFound: 0,
        wasComplete: true,
      };
    }

    // Simple confidence-based filtering: higher severity requires higher confidence
    const getMinConfidence = (severity: number) => {
      if (severity >= 80) return 40;  // CRITICAL issues
      if (severity >= 60) return 70;  // HIGH issues
      if (severity >= 40) return 50;  // MEDIUM issues
      return 30;                       // LOW issues
    };

    const filteredIssues = allIssues.filter((issue) => {
      // Keep verified-accurate regardless of severity
      if (issue.issueType === ISSUE_TYPES.VERIFIED_ACCURATE) return true;

      // Filter by severity threshold
      if (issue.severityScore < (input.minSeverityThreshold ?? 20)) return false;

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
      .slice(0, input.maxIssues);

    return {
      issues: sortedIssues,
      totalIssuesFound: allIssues.length,
      wasComplete,
    };
  }
}

// Export singleton instance
export const epistemicIssuesExtractorTool = new EpistemicIssuesExtractorTool();
export default epistemicIssuesExtractorTool;

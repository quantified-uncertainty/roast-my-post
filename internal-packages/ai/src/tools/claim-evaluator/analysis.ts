import { callClaude } from "../../claude/wrapper";
import { ANALYSIS_MODEL } from "../../types";
import type { ClaimEvaluatorOutput } from "./utils";

export interface AnalyzeClaimEvaluationInput {
  claim: string;
  context?: string;
  rawOutput: ClaimEvaluatorOutput;
  variations?: Array<{
    claim: string;
    context?: string;
    evaluations: any[];
    summaryMean: number | null;
  }>;
}

export interface AnalyzeClaimEvaluationOutput {
  analysisText: string;
}

/**
 * Analyzes claim evaluation results to detect patterns, biases, and interesting findings
 * Uses ANALYSIS_MODEL to generate concise markdown summary
 */
export async function analyzeClaimEvaluation(
  input: AnalyzeClaimEvaluationInput
): Promise<AnalyzeClaimEvaluationOutput> {
  const { claim, context, rawOutput, variations } = input;

  // Build analysis prompt
  const evaluationSummary = variations && variations.length > 0
    ? buildVariationSummary(variations)
    : buildEvaluationSummary(rawOutput);

  const prompt = `You are analyzing the results of a claim evaluation experiment where multiple LLM models evaluated a claim, potentially with variations (different framing, wording, or context).

**Claim**: "${claim}"
${context ? `**Context**: "${context}"` : ''}

**Results Summary**:
${evaluationSummary}

Your task is to analyze these results and provide a detailed summary (3-6 sentences) of the most important patterns, explaining WHICH models contribute to each pattern. Focus on:

1. **Framing/Wording Effects**: If there are variations of the same claim with different framing (skeptical, optimistic, etc.) or wording, identify the agreement spread and explain which specific models drive the differences. For example: "Skeptical framing reduced agreement by 14 points (from 56% to 42%), with most of this drop coming from Claude Sonnet (dropped 20 points) and GPT-4 (dropped 15 points), while DeepSeek remained stable."

2. **Magnitude/Quantitative Sensitivity**: If testing different numerical claims (2x vs 10x vs 100x), identify which models are most sensitive to magnitude changes and which maintain similar scores.

3. **Sycophancy/Authority Bias**: If context includes authority framing or perspective cues, identify which models show the strongest bias and quantify it.

4. **Provider-Level Patterns**: Only mention provider differences if they're the PRIMARY pattern (not secondary to framing effects). Specify which providers and by how much.

5. **Refusal Patterns**: If models refuse to evaluate, identify which specific models refuse and for what reasons.

6. **Sample Size Warnings**: Note when sample sizes are small (n<5) and findings should be interpreted cautiously.

**Important**:
- Always explain WHO (which specific models) contributes to WHAT (the pattern/difference) and BY HOW MUCH (quantify)
- Prioritize framing/wording effects over provider differences when both are present
- Use specific model names, not just providers
- Include actual numbers and ranges

If there are no interesting patterns, state: "Little variance detected. Agreement scores show no significant patterns across models or contexts (range: X-Y%)."

Format your response as concise markdown (bold key findings). Be specific with model names, numbers, and sample sizes.`;

  try {
    const result = await callClaude({
      model: ANALYSIS_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const analysisText = result.response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as any).text)
      .join("\n")
      .trim();

    return { analysisText };
  } catch (error) {
    // On error, return a fallback message
    console.error("Failed to generate analysis:", error);
    return {
      analysisText:
        "Analysis generation failed. Please try again or contact support.",
    };
  }
}

/**
 * Builds a human-readable summary of evaluation results for the analysis prompt
 */
function buildEvaluationSummary(rawOutput: ClaimEvaluatorOutput): string {
  const { evaluations, summary } = rawOutput;

  if (!evaluations || evaluations.length === 0) {
    return "No evaluations completed.";
  }

  // Group by model
  const modelGroups = new Map<
    string,
    { successful: any[]; failed: any[] }
  >();

  for (const evaluation of evaluations) {
    if (!modelGroups.has(evaluation.model)) {
      modelGroups.set(evaluation.model, { successful: [], failed: [] });
    }
    const group = modelGroups.get(evaluation.model)!;

    if (!evaluation.hasError && evaluation.successfulResponse) {
      group.successful.push(evaluation);
    } else if (evaluation.hasError && evaluation.failedResponse) {
      group.failed.push(evaluation);
    }
  }

  // Build summary text
  const lines: string[] = [];
  lines.push(`Total evaluations: ${evaluations.length}`);
  lines.push(`Mean agreement: ${summary?.mean !== null && summary?.mean !== undefined ? summary.mean.toFixed(1) : 'N/A'}%`);
  lines.push("");

  // Sort models by provider for grouping
  const sortedModels = Array.from(modelGroups.entries()).sort((a, b) => {
    const providerA = a[1].successful[0]?.provider || a[1].failed[0]?.provider || "";
    const providerB = b[1].successful[0]?.provider || b[1].failed[0]?.provider || "";
    if (providerA !== providerB) return providerA.localeCompare(providerB);
    return a[0].localeCompare(b[0]);
  });

  for (const [model, group] of sortedModels) {
    const totalRuns = group.successful.length + group.failed.length;
    const provider = group.successful[0]?.provider || group.failed[0]?.provider || "unknown";

    lines.push(`**${model}** (${provider}, n=${totalRuns}):`);

    if (group.successful.length > 0) {
      const agreements = group.successful.map((e: any) => e.successfulResponse.agreement);
      const avgAgreement = agreements.reduce((a: number, b: number) => a + b, 0) / agreements.length;
      const minAgreement = Math.min(...agreements);
      const maxAgreement = Math.max(...agreements);

      if (agreements.length === 1) {
        lines.push(`  - Agreement: ${agreements[0]}%`);
      } else {
        lines.push(`  - Agreement: ${avgAgreement.toFixed(1)}% (range: ${minAgreement}-${maxAgreement}%)`);
      }
    }

    if (group.failed.length > 0) {
      const refusalReasons = group.failed.map((e: any) => e.failedResponse?.refusalReason || "unknown");
      const uniqueReasons = [...new Set(refusalReasons)];
      lines.push(`  - ${group.failed.length} failure(s): ${uniqueReasons.join(", ")}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Builds a summary for multiple claim variations to highlight framing/wording effects
 */
function buildVariationSummary(variations: Array<{
  claim: string;
  context?: string;
  evaluations: any[];
  summaryMean: number | null;
}>): string {
  const lines: string[] = [];

  lines.push(`Total variations: ${variations.length}`);
  lines.push("");

  // Group evaluations by variation
  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    const varLabel = i === 0 ? "Baseline" : `Variation ${i}`;

    lines.push(`## ${varLabel}`);
    lines.push(`**Claim**: "${variation.claim}"`);
    if (variation.context) {
      lines.push(`**Context**: "${variation.context}"`);
    }
    lines.push(`**Mean Agreement**: ${variation.summaryMean !== null ? variation.summaryMean.toFixed(1) : 'N/A'}%`);
    lines.push("");

    // Group by model for this variation
    const modelGroups = new Map<string, { successful: any[]; failed: any[] }>();

    for (const evaluation of variation.evaluations) {
      if (!modelGroups.has(evaluation.model)) {
        modelGroups.set(evaluation.model, { successful: [], failed: [] });
      }
      const group = modelGroups.get(evaluation.model)!;

      if (!evaluation.hasError && evaluation.successfulResponse) {
        group.successful.push(evaluation);
      } else if (evaluation.hasError && evaluation.failedResponse) {
        group.failed.push(evaluation);
      }
    }

    // Show per-model results for this variation
    const sortedModels = Array.from(modelGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [model, group] of sortedModels) {
      if (group.successful.length > 0) {
        const agreements = group.successful.map((e: any) => e.successfulResponse.agreement);
        const avgAgreement = agreements.reduce((a: number, b: number) => a + b, 0) / agreements.length;
        lines.push(`- **${model}**: ${avgAgreement.toFixed(1)}%`);
      } else if (group.failed.length > 0) {
        const refusalReasons = group.failed.map((e: any) => e.failedResponse?.refusalReason || "unknown");
        const uniqueReasons = [...new Set(refusalReasons)];
        lines.push(`- **${model}**: Failed (${uniqueReasons.join(", ")})`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

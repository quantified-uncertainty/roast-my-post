/**
 * Fallacy Judge Aggregator Tool
 *
 * Aggregates issues from multiple extractors using an LLM judge to:
 * 1. Group similar/duplicate issues across extractors
 * 2. Merge duplicates into single best-formulation issues
 * 3. Accept high-confidence multi-source issues
 * 4. Reject low-confidence single-source issues
 * 5. Provide reasoning for each decision
 */

import { z } from 'zod';
import { Tool, type ToolContext } from '../base/Tool';
import { callClaudeWithTool } from '../../claude/wrapper';
import { fallacyJudgeConfig } from './config';
import type {
  FallacyJudgeInput,
  FallacyJudgeOutput,
  JudgeDecision,
  ExtractorIssueInput,
} from './types';

// Default model for judge (can be overridden via env var)
const DEFAULT_JUDGE_MODEL = 'claude-sonnet-4-5-20250929';

const extractorIssueInputSchema = z.object({
  extractorId: z.string(),
  exactText: z.string(),
  issueType: z.string(),
  fallacyType: z.string().optional(),
  severityScore: z.number(),
  confidenceScore: z.number(),
  importanceScore: z.number(),
  reasoning: z.string(),
}) satisfies z.ZodType<ExtractorIssueInput>;

const inputSchema = z.object({
  documentText: z.string().min(1),
  issues: z.array(extractorIssueInputSchema),
  extractorIds: z.array(z.string()),
}) satisfies z.ZodType<FallacyJudgeInput>;

const judgeDecisionSchema = z.object({
  decision: z.enum(['accept', 'merge', 'reject']),
  finalText: z.string(),
  finalIssueType: z.string(),
  finalFallacyType: z.string().optional(),
  finalSeverity: z.number(),
  finalConfidence: z.number(),
  finalImportance: z.number(),
  finalReasoning: z.string(),
  sourceExtractors: z.array(z.string()),
  sourceIssueIndices: z.array(z.number()),
  judgeReasoning: z.string(),
}) satisfies z.ZodType<JudgeDecision>;

const outputSchema = z.object({
  acceptedDecisions: z.array(judgeDecisionSchema),
  rejectedDecisions: z.array(judgeDecisionSchema),
  summary: z.object({
    totalInputIssues: z.number(),
    uniqueGroups: z.number(),
    acceptedCount: z.number(),
    mergedCount: z.number(),
    rejectedCount: z.number(),
  }),
}) satisfies z.ZodType<FallacyJudgeOutput>;

export class FallacyJudgeTool extends Tool<FallacyJudgeInput, FallacyJudgeOutput> {
  config = fallacyJudgeConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: FallacyJudgeInput,
    context: ToolContext
  ): Promise<FallacyJudgeOutput> {
    context.logger.info(
      `[FallacyJudge] Aggregating ${input.issues.length} issues from ${input.extractorIds.length} extractors`
    );

    // If no issues or only one extractor, skip judge and return as-is
    if (input.issues.length === 0) {
      return {
        acceptedDecisions: [],
        rejectedDecisions: [],
        summary: {
          totalInputIssues: 0,
          uniqueGroups: 0,
          acceptedCount: 0,
          mergedCount: 0,
          rejectedCount: 0,
        },
      };
    }

    // If only one extractor, accept all issues (no aggregation needed)
    if (input.extractorIds.length === 1) {
      const acceptedDecisions = input.issues.map((issue, idx) => ({
        decision: 'accept' as const,
        finalText: issue.exactText,
        finalIssueType: issue.issueType,
        finalFallacyType: issue.fallacyType,
        finalSeverity: issue.severityScore,
        finalConfidence: issue.confidenceScore,
        finalImportance: issue.importanceScore,
        finalReasoning: issue.reasoning,
        sourceExtractors: [issue.extractorId],
        sourceIssueIndices: [idx],
        judgeReasoning: 'Single extractor mode - all issues accepted',
      }));

      return {
        acceptedDecisions,
        rejectedDecisions: [],
        summary: {
          totalInputIssues: input.issues.length,
          uniqueGroups: input.issues.length,
          acceptedCount: input.issues.length,
          mergedCount: 0,
          rejectedCount: 0,
        },
      };
    }

    // Format issues for the LLM
    const formattedIssues = input.issues
      .map((issue, idx) => {
        return `[Issue ${idx}] Extractor: ${issue.extractorId}
Text: "${issue.exactText.substring(0, 150)}${issue.exactText.length > 150 ? '...' : ''}"
Type: ${issue.issueType}${issue.fallacyType ? ` (${issue.fallacyType})` : ''}
Severity: ${issue.severityScore}, Confidence: ${issue.confidenceScore}, Importance: ${issue.importanceScore}
Reasoning: ${issue.reasoning.substring(0, 200)}${issue.reasoning.length > 200 ? '...' : ''}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert epistemic judge aggregating fallacy issues from multiple extractors.

Your task is to:
1. **Group similar issues** - Issues about the same text/concept from different extractors
2. **Make decisions** for each group:
   - **accept**: Issue is valid and found by 2+ extractors, OR single-source with very high confidence (≥90)
   - **merge**: Multiple extractors found similar issues - combine into best formulation
   - **reject**: Low-confidence single-source issue (likely false positive)

**Decision Guidelines:**
- Multi-source issues (found by 2+ extractors): Almost always accept or merge
- Single-source with confidence ≥90: Accept
- Single-source with confidence 80-89 and severity ≥80: Consider accepting
- Single-source with confidence <80: Reject as likely false positive

**When merging:**
- Use the clearest/most specific text formulation
- Take the highest severity and confidence scores
- Combine reasoning from multiple sources
- List ALL source extractors

**Output Requirements:**
- Every input issue must be accounted for in exactly one decision
- sourceIssueIndices should reference the original issue indices
- sourceExtractors should list which extractors contributed
- judgeReasoning should explain your decision`;

    const userPrompt = `Aggregate these ${input.issues.length} issues from ${input.extractorIds.length} extractors (${input.extractorIds.join(', ')}):

**Document Context** (first 1500 chars):
${input.documentText.substring(0, 1500)}${input.documentText.length > 1500 ? '\n...[truncated]...' : ''}

**Issues to Aggregate:**

${formattedIssues}

---

Group similar issues together and provide your decisions. Remember:
- Issues found by multiple extractors are more likely to be valid
- Single-source issues need very high confidence (≥90) to be accepted
- Explain your reasoning for each decision`;

    try {
      const judgeModel = process.env.FALLACY_JUDGE_MODEL || DEFAULT_JUDGE_MODEL;

      const result = await callClaudeWithTool<{
        decisions: Array<{
          decision: 'accept' | 'merge' | 'reject';
          finalText: string;
          finalIssueType: string;
          finalFallacyType?: string;
          finalSeverity: number;
          finalConfidence: number;
          finalImportance: number;
          finalReasoning: string;
          sourceExtractors: string[];
          sourceIssueIndices: number[];
          judgeReasoning: string;
        }>;
      }>(
        {
          model: judgeModel,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: 4000,
          temperature: 0.1,
          toolName: 'aggregate_fallacy_issues',
          toolDescription: 'Aggregate and deduplicate fallacy issues from multiple extractors',
          toolSchema: {
            type: 'object',
            properties: {
              decisions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    decision: {
                      type: 'string',
                      enum: ['accept', 'merge', 'reject'],
                      description: 'Judge decision for this issue/group',
                    },
                    finalText: {
                      type: 'string',
                      description: 'Final text for the issue (best formulation)',
                    },
                    finalIssueType: {
                      type: 'string',
                      description: 'Final issue type',
                    },
                    finalFallacyType: {
                      type: 'string',
                      description: 'Final fallacy type (if applicable)',
                    },
                    finalSeverity: {
                      type: 'number',
                      description: 'Final severity score (0-100)',
                    },
                    finalConfidence: {
                      type: 'number',
                      description: 'Final confidence score (0-100)',
                    },
                    finalImportance: {
                      type: 'number',
                      description: 'Final importance score (0-100)',
                    },
                    finalReasoning: {
                      type: 'string',
                      description: 'Best reasoning for this issue',
                    },
                    sourceExtractors: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Which extractors found this issue',
                    },
                    sourceIssueIndices: {
                      type: 'array',
                      items: { type: 'number' },
                      description: 'Indices of original issues in this group',
                    },
                    judgeReasoning: {
                      type: 'string',
                      description: 'Why you made this decision',
                    },
                  },
                  required: [
                    'decision',
                    'finalText',
                    'finalIssueType',
                    'finalSeverity',
                    'finalConfidence',
                    'finalImportance',
                    'finalReasoning',
                    'sourceExtractors',
                    'sourceIssueIndices',
                    'judgeReasoning',
                  ],
                },
              },
            },
            required: ['decisions'],
          },
        },
        []
      );

      // Separate accepted/rejected decisions
      const acceptedDecisions: JudgeDecision[] = [];
      const rejectedDecisions: JudgeDecision[] = [];
      let mergedCount = 0;

      for (const d of result.toolResult.decisions) {
        const decision: JudgeDecision = {
          decision: d.decision,
          finalText: d.finalText,
          finalIssueType: d.finalIssueType,
          finalFallacyType: d.finalFallacyType,
          finalSeverity: d.finalSeverity,
          finalConfidence: d.finalConfidence,
          finalImportance: d.finalImportance,
          finalReasoning: d.finalReasoning,
          sourceExtractors: d.sourceExtractors,
          sourceIssueIndices: d.sourceIssueIndices,
          judgeReasoning: d.judgeReasoning,
        };

        if (d.decision === 'reject') {
          rejectedDecisions.push(decision);
        } else {
          acceptedDecisions.push(decision);
          if (d.decision === 'merge') {
            mergedCount++;
          }
        }
      }

      context.logger.info(
        `[FallacyJudge] Aggregation complete: ${acceptedDecisions.length} accepted, ${mergedCount} merged, ${rejectedDecisions.length} rejected`
      );

      return {
        acceptedDecisions,
        rejectedDecisions,
        summary: {
          totalInputIssues: input.issues.length,
          uniqueGroups: result.toolResult.decisions.length,
          acceptedCount: acceptedDecisions.length,
          mergedCount,
          rejectedCount: rejectedDecisions.length,
        },
      };
    } catch (error) {
      context.logger.error('[FallacyJudge] Aggregation failed:', error);

      // Fallback: Simple deduplication without LLM
      // Keep all issues, grouping by similar text
      const groups = new Map<string, number[]>();
      for (let i = 0; i < input.issues.length; i++) {
        const issue = input.issues[i];
        const normalizedText = issue.exactText.toLowerCase().replace(/\s+/g, ' ').trim();
        const existing = groups.get(normalizedText);
        if (existing) {
          existing.push(i);
        } else {
          groups.set(normalizedText, [i]);
        }
      }

      const acceptedDecisions: JudgeDecision[] = [];
      for (const [, indices] of groups) {
        // Pick the issue with highest confidence
        const bestIdx = indices.reduce((best, current) =>
          input.issues[current].confidenceScore > input.issues[best].confidenceScore
            ? current
            : best
        );
        const bestIssue = input.issues[bestIdx];

        acceptedDecisions.push({
          decision: indices.length > 1 ? 'merge' : 'accept',
          finalText: bestIssue.exactText,
          finalIssueType: bestIssue.issueType,
          finalFallacyType: bestIssue.fallacyType,
          finalSeverity: bestIssue.severityScore,
          finalConfidence: bestIssue.confidenceScore,
          finalImportance: bestIssue.importanceScore,
          finalReasoning: bestIssue.reasoning,
          sourceExtractors: [...new Set(indices.map((i) => input.issues[i].extractorId))],
          sourceIssueIndices: indices,
          judgeReasoning: 'Fallback deduplication (LLM judge unavailable)',
        });
      }

      return {
        acceptedDecisions,
        rejectedDecisions: [],
        summary: {
          totalInputIssues: input.issues.length,
          uniqueGroups: groups.size,
          acceptedCount: acceptedDecisions.length,
          mergedCount: acceptedDecisions.filter((d) => d.decision === 'merge').length,
          rejectedCount: 0,
        },
      };
    }
  }
}

const fallacyJudgeTool = new FallacyJudgeTool();
export default fallacyJudgeTool;

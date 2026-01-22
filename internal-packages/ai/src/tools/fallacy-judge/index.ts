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
import Anthropic from '@anthropic-ai/sdk';
import { Tool, type ToolContext } from '../base/Tool';
import { callClaude, callClaudeWithTool } from '../../claude/wrapper';
import { callOpenRouterWithTool } from '../../utils/openrouter';
import { resolveModelConfig, getReasoningDisplayString } from '../../utils/modelConfigResolver';
import { withDateContext } from '../shared/llm-filter-utils';
import { fallacyJudgeConfig } from './config';
import type {
  FallacyJudgeInput,
  FallacyJudgeOutput,
  JudgeDecision,
  JudgeConfig,
  ExtractorIssueInput,
  ActualApiParams,
  ApiResponseMetrics,
} from './types';
import type { UnifiedUsageMetrics } from '../../utils/usageMetrics';
import { DEFAULT_JUDGE_SYSTEM_PROMPT } from './prompts';

// Default model for judge (can be overridden via env var)
const DEFAULT_JUDGE_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_CLAUDE_TEMPERATURE = 0.1;
const DEFAULT_OPENROUTER_TEMPERATURE = 0.1;

/**
 * Check if a model is an OpenRouter model (contains '/')
 */
function isOpenRouterModel(model: string): boolean {
  return model.includes('/');
}

/**
 * Parse a single judge config object
 */
function parseJudgeConfigObject(parsed: unknown): JudgeConfig | null {
  if (typeof parsed === 'object' && parsed !== null && typeof (parsed as Record<string, unknown>).model === 'string') {
    const obj = parsed as Record<string, unknown>;

    // Parse reasoning config
    let reasoning: JudgeConfig['reasoning'] = undefined;
    if (obj.reasoning !== undefined) {
      if (obj.reasoning === false) {
        reasoning = false;
      } else if (typeof obj.reasoning === 'object' && obj.reasoning !== null) {
        const r = obj.reasoning as Record<string, unknown>;
        if (typeof r.effort === 'string') {
          reasoning = { effort: r.effort as 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' };
        } else if (typeof r.budget_tokens === 'number') {
          reasoning = { budget_tokens: r.budget_tokens };
        }
      }
    }

    // Parse provider preferences
    let provider: JudgeConfig['provider'] = undefined;
    if (typeof obj.provider === 'object' && obj.provider !== null) {
      const p = obj.provider as Record<string, unknown>;
      provider = {
        order: Array.isArray(p.order) ? p.order as string[] : undefined,
        allow_fallbacks: typeof p.allow_fallbacks === 'boolean' ? p.allow_fallbacks : undefined,
      };
    }

    return {
      model: obj.model as string,
      temperature: typeof obj.temperature === 'number' ? obj.temperature :
                   obj.temperature === 'default' ? 'default' : undefined,
      thinking: typeof obj.thinking === 'boolean' ? obj.thinking : undefined,
      reasoning,
      provider,
      label: typeof obj.label === 'string' ? obj.label : undefined,
      enabled: obj.enabled !== false,
    };
  }
  return null;
}

/**
 * Parse FALLACY_JUDGES env var for array of judge configs
 * Also accepts array in FALLACY_JUDGE for convenience
 *
 * Example:
 * FALLACY_JUDGES='[{"model":"claude-sonnet-4-5-20250929","thinking":true},{"model":"google/gemini-3-flash-preview","thinking":false}]'
 */
export function getJudgesConfig(): JudgeConfig[] {
  // Try FALLACY_JUDGES first, then FALLACY_JUDGE (both can contain arrays)
  const judgesEnv = process.env.FALLACY_JUDGES || process.env.FALLACY_JUDGE;

  if (judgesEnv) {
    try {
      const parsed = JSON.parse(judgesEnv);
      if (Array.isArray(parsed)) {
        const configs: JudgeConfig[] = [];
        for (const item of parsed) {
          const config = parseJudgeConfigObject(item);
          if (config) {
            configs.push(config);
          }
        }
        if (configs.length > 0) {
          return configs;
        }
      } else {
        // Single object in FALLACY_JUDGE
        const config = parseJudgeConfigObject(parsed);
        if (config && config.enabled) {
          return [config];
        }
      }
      console.warn('[FallacyJudge] Invalid FALLACY_JUDGES/FALLACY_JUDGE format');
    } catch (e) {
      console.warn('[FallacyJudge] Failed to parse FALLACY_JUDGES/FALLACY_JUDGE:', e);
    }
  }

  // Default: empty array (no judges configured)
  return [];
}

/**
 * Parse FALLACY_JUDGE env var for single judge config (legacy)
 *
 * Example:
 * FALLACY_JUDGE='{"model":"google/gemini-3-flash-preview","temperature":"default","thinking":false,"enabled":true}'
 */
export function getJudgeConfig(): JudgeConfig {
  const judgeEnv = process.env.FALLACY_JUDGE;

  if (judgeEnv) {
    try {
      const parsed = JSON.parse(judgeEnv);
      const config = parseJudgeConfigObject(parsed);
      if (config) {
        return config;
      }
      console.warn('[FallacyJudge] Invalid FALLACY_JUDGE format, using defaults');
    } catch (e) {
      console.warn('[FallacyJudge] Failed to parse FALLACY_JUDGE:', e);
    }
  }

  // Default config when env var not set
  return {
    model: DEFAULT_JUDGE_MODEL,
    enabled: false, // Disabled by default when not configured
  };
}

/**
 * Generate a display label for a judge config
 */
export function generateJudgeLabel(config: JudgeConfig): string {
  if (config.label) {
    return config.label;
  }

  // Extract short model name
  let shortName: string;
  if (isOpenRouterModel(config.model)) {
    const parts = config.model.split('/');
    shortName = parts[parts.length - 1].replace('-preview', '').replace('-latest', '');
  } else {
    if (config.model.includes('opus')) {
      shortName = 'opus';
    } else if (config.model.includes('sonnet')) {
      shortName = 'sonnet';
    } else if (config.model.includes('haiku')) {
      shortName = 'haiku';
    } else {
      shortName = config.model.slice(0, 10);
    }
  }

  // Build suffix parts
  const suffixParts: string[] = [];

  if (config.temperature === 'default') {
    suffixParts.push('tDef');
  } else if (config.temperature !== undefined) {
    suffixParts.push(`t${config.temperature}`);
  }

  if (config.thinking === false) {
    suffixParts.push('noThink');
  } else if (config.thinking === true) {
    suffixParts.push('think');
  }

  if (suffixParts.length > 0) {
    return `${shortName}-${suffixParts.join('-')}`;
  }

  return shortName;
}

const extractorIssueInputSchema = z.object({
  extractorId: z.string(),
  exactText: z.string(),
  issueType: z.string(),
  fallacyType: z.string().optional(),
  severityScore: z.number(),
  confidenceScore: z.number(),
  importanceScore: z.number(),
  reasoning: z.string(),
});

const reasoningConfigSchema = z.union([
  z.literal(false),
  z.object({ effort: z.enum(['minimal', 'low', 'medium', 'high', 'xhigh']) }),
  z.object({ budget_tokens: z.number() }),
]);

const providerPreferencesSchema = z.object({
  order: z.array(z.string()).optional(),
  allow_fallbacks: z.boolean().optional(),
});

const judgeConfigSchema = z.object({
  model: z.string(),
  temperature: z.union([z.number(), z.literal('default')]).optional(),
  thinking: z.boolean().optional(),
  reasoning: reasoningConfigSchema.optional(),
  provider: providerPreferencesSchema.optional(),
  label: z.string().optional(),
  enabled: z.boolean(),
});

const inputSchema = z.object({
  documentText: z.string().min(1),
  issues: z.array(extractorIssueInputSchema),
  extractorIds: z.array(z.string()),
  judgeConfig: judgeConfigSchema.optional(),
  customSystemPrompt: z.string().optional(),
});

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
});

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
});

export class FallacyJudgeTool extends Tool<FallacyJudgeInput, FallacyJudgeOutput> {
  config = fallacyJudgeConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: FallacyJudgeInput,
    context: ToolContext
  ): Promise<FallacyJudgeOutput> {
    const startTime = Date.now();
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

    // Format issues for the LLM, sorted alphabetically by text to group similar issues together
    // This makes it easier for the judge to spot duplicates/similar issues
    const issuesWithIndices = input.issues.map((issue, idx) => ({ issue, originalIdx: idx }));
    issuesWithIndices.sort((a, b) => (a.issue.exactText || '').localeCompare(b.issue.exactText || ''));

    const formattedIssues = issuesWithIndices
      .map(({ issue, originalIdx }) => {
        const reasoning = issue.reasoning || '(no reasoning provided)';
        const exactText = issue.exactText || '(no text)';
        return `[Issue ${originalIdx}] Extractor: ${issue.extractorId}
Text: "${exactText.substring(0, 150)}${exactText.length > 150 ? '...' : ''}"
Type: ${issue.issueType}${issue.fallacyType ? ` (${issue.fallacyType})` : ''}
Severity: ${issue.severityScore}, Confidence: ${issue.confidenceScore}, Importance: ${issue.importanceScore}
Reasoning: ${reasoning.substring(0, 200)}${reasoning.length > 200 ? '...' : ''}`;
      })
      .join('\n\n');

    // Use custom prompt if provided, otherwise use default from prompts.ts
    // Always prepend date context to prevent false positives on recent dates
    const baseSystemPrompt = input.customSystemPrompt || DEFAULT_JUDGE_SYSTEM_PROMPT;
    const systemPrompt = withDateContext(baseSystemPrompt);

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
      // Use passed config if provided, otherwise fall back to env var config
      const judgeConfig = input.judgeConfig ?? getJudgeConfig();

      // Use the unified model config resolver
      const isOpenRouter = judgeConfig.model.includes('/');
      const resolved = resolveModelConfig(judgeConfig, {
        defaultTemperature: isOpenRouter ? DEFAULT_OPENROUTER_TEMPERATURE : DEFAULT_CLAUDE_TEMPERATURE,
      });

      const reasoningDisplay = getReasoningDisplayString(judgeConfig);
      context.logger.info(
        `[FallacyJudge] Using ${resolved.isOpenRouter ? 'OpenRouter' : 'Claude'} model: ${judgeConfig.model}, temp: ${resolved.temperature ?? 'default'}, reasoning: ${reasoningDisplay}`
      );

      type JudgeResultType = {
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
      };

      const toolSchema = {
        type: 'object' as const,
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
      };

      let result: {
        toolResult: JudgeResultType;
        unifiedUsage?: UnifiedUsageMetrics;
        actualApiParams?: ActualApiParams;
        responseMetrics?: ApiResponseMetrics;
      };

      if (resolved.isOpenRouter) {
        // Use OpenRouter for non-Claude models
        // Use 32000 max_tokens to handle large outputs with many issues (esp. with thinking)
        const openRouterResult = await callOpenRouterWithTool<JudgeResultType>({
          model: resolved.model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: 32000,
          ...(resolved.temperature !== undefined && { temperature: resolved.temperature }),
          toolName: 'aggregate_fallacy_issues',
          toolDescription: 'Aggregate and deduplicate fallacy issues from multiple extractors',
          toolSchema,
          thinking: resolved.thinkingEnabled,
          // Pass reasoning effort for budget calculation
          ...(resolved.reasoningEffort && { reasoningEffort: resolved.reasoningEffort }),
          // Pass provider preferences for routing
          ...(resolved.provider && { provider: resolved.provider }),
        });
        result = {
          toolResult: openRouterResult.toolResult,
          unifiedUsage: openRouterResult.unifiedUsage,
          actualApiParams: {
            model: openRouterResult.actualParams.model,
            temperature: openRouterResult.actualParams.temperature ?? 0,
            maxTokens: openRouterResult.actualParams.maxTokens,
            reasoning: openRouterResult.actualParams.reasoning,
          },
          responseMetrics: {
            success: openRouterResult.responseMetrics.success,
            latencyMs: openRouterResult.responseMetrics.latencyMs,
            inputTokens: openRouterResult.responseMetrics.inputTokens,
            outputTokens: openRouterResult.responseMetrics.outputTokens,
            stopReason: openRouterResult.responseMetrics.stopReason,
          },
        };
      } else {
        // Use Claude API directly
        if (resolved.thinkingEnabled) {
          // When thinking is enabled, use tool_choice: 'auto' to allow thinking
          // (forced tool_choice like 'any' or specific tool is incompatible with extended thinking)
          // Calculate max_tokens to accommodate thinking budget
          const thinkingBudget = typeof resolved.claudeThinkingConfig === 'object'
            ? resolved.claudeThinkingConfig.budget_tokens
            : 10000;
          const maxTokens = Math.max(16000, thinkingBudget + 4000);

          const claudeResult = await callClaude(
            {
              model: resolved.model,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
              max_tokens: maxTokens,
              ...(resolved.temperature !== undefined && { temperature: resolved.temperature }),
              tools: [{
                name: 'aggregate_fallacy_issues',
                description: 'Aggregate and deduplicate fallacy issues from multiple extractors',
                input_schema: toolSchema,
              }],
              tool_choice: { type: 'auto' },
              thinking: resolved.claudeThinkingConfig,
            },
            []
          );

          // Extract tool result from response
          const toolUse = claudeResult.response.content.find(
            (c): c is Anthropic.Messages.ToolUseBlock => c.type === 'tool_use'
          );
          if (!toolUse) {
            throw new Error('Judge did not call the aggregation tool - no tool use in response');
          }
          result = {
            toolResult: toolUse.input as JudgeResultType,
            unifiedUsage: claudeResult.unifiedUsage,
          };
        } else {
          // Without thinking, use forced tool_choice for guaranteed structure
          const claudeResult = await callClaudeWithTool<JudgeResultType>(
            {
              model: resolved.model,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
              max_tokens: 8000,
              ...(resolved.temperature !== undefined && { temperature: resolved.temperature }),
              toolName: 'aggregate_fallacy_issues',
              toolDescription: 'Aggregate and deduplicate fallacy issues from multiple extractors',
              toolSchema,
              thinking: false,
            },
            []
          );
          result = {
            toolResult: claudeResult.toolResult,
            unifiedUsage: claudeResult.unifiedUsage,
          };
        }
      }

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

      const durationMs = Date.now() - startTime;
      context.logger.info(
        `[FallacyJudge] Aggregation complete in ${(durationMs / 1000).toFixed(1)}s: ${acceptedDecisions.length} accepted, ${mergedCount} merged, ${rejectedDecisions.length} rejected`
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
        unifiedUsage: result.unifiedUsage,
        actualApiParams: result.actualApiParams,
        responseMetrics: result.responseMetrics,
      };
    } catch (error) {
      context.logger.error('[FallacyJudge] Aggregation failed:', error);
      // Re-throw to surface error to user - don't silently fallback
      throw error;
    }
  }
}

const fallacyJudgeTool = new FallacyJudgeTool();
export default fallacyJudgeTool;

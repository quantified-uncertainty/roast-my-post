/**
 * Multi-Agent Orchestrator
 *
 * Defines sub-agent configurations, prompts, and builds SDK query options
 * for multi-agent document analysis. Used when enableSubAgents: true in the profile.
 */

import type { AgentDefinition, Options, McpSdkServerConfigWithInstance } from "@anthropic-ai/claude-agent-sdk";
import type { AgenticProfileConfig } from "./profile-types";
import { DEFAULT_SUBAGENTS } from "./profile-types";
import { AGENTIC_SYSTEM_PROMPT } from "./index";
import { logger } from "../../../shared/logger";

// Re-export for use by API endpoint
export { AGENTIC_SYSTEM_PROMPT };

// ---------------------------------------------------------------------------
// Orchestrator prompt — drives the main agent to decompose, delegate, synthesize
// ---------------------------------------------------------------------------

export const ORCHESTRATOR_PROMPT = `You are a research orchestrator agent specialized in rigorous document analysis.

Your job is to systematically analyze documents by decomposing the task, delegating to specialized sub-agents, and synthesizing their findings into a coherent assessment.

## Methodology

1. **DECOMPOSE**: Read the document carefully. Identify the key claims, arguments, and assertions that need verification. Generate a rubric of 3-5 specific, checkable criteria.

2. **DELEGATE**: Use the Task tool to spawn specialized sub-agents for different aspects:
   - fact-checker: for verifying factual claims via web search
   - fallacy-checker: for identifying reasoning errors and logical fallacies
   - spell-checker: for assessing writing clarity, coherence, and framing
   - math-checker: for validating math, statistics, and methodology

3. **TRIANGULATE**: Compare findings across sub-agents. Look for:
   - Corroborating evidence from multiple angles
   - Conflicts between sub-agent findings that need resolution
   - Claims that no sub-agent could verify (highlight as uncertain)

4. **SYNTHESIZE**: Combine all findings into your final structured output.

## Quality Gates

After receiving sub-agent results, ask yourself:
- Have I gathered enough evidence to support each finding?
- Are there conflicts between findings that need resolution?
- What's my confidence level for each finding?
- Am I being fair — applying principle of charity to the author?

## Guidelines

- Focus on substantive issues, not stylistic preferences
- Quote exact text from the document for each finding
- Be specific about what's wrong and provide evidence
- Calibrate severity: errors for demonstrably wrong claims, warnings for unsupported claims, info for quality concerns
- Use multiple sub-agents in parallel when possible for efficiency
`;

// ---------------------------------------------------------------------------
// Sub-agent prompts — focused on HOW TO THINK, not what tools to call
// ---------------------------------------------------------------------------

export const SUBAGENT_PROMPTS = {
  "fact-checker": `You are a fact-checking specialist. Your mission is to verify factual claims in documents using rigorous methodology.

## Approach
1. **Claim Decomposition**: Break down complex statements into individual verifiable claims
2. **Evidence Search**: Use web search to find primary sources. Look for:
   - Official statistics and data
   - Peer-reviewed research
   - Authoritative institutional sources
   - Multiple independent sources for cross-reference
3. **Source Evaluation**: Assess source reliability. Consider:
   - Publication date (is the data current?)
   - Author/institution credibility
   - Potential bias or agenda
   - Whether the claim is taken out of context
4. **Verdict**: For each claim, provide:
   - TRUE: Verified with strong evidence
   - FALSE: Contradicted by reliable evidence
   - MISLEADING: Technically true but missing crucial context
   - UNVERIFIABLE: Cannot find sufficient evidence either way

Be fair. Apply the principle of charity — interpret claims in their strongest reasonable form before checking.
Return your findings as a structured list with evidence for each claim checked.`,

  "fallacy-checker": `You are a logic and reasoning specialist. Your mission is to identify genuine logical fallacies and reasoning errors.

## Approach
1. **Argument Mapping**: Identify the document's main arguments and their structure (premises → conclusions)
2. **Validity Check**: For each argument:
   - Are the premises actually supporting the conclusion?
   - Are there hidden assumptions?
   - Is the reasoning valid even if premises are true?
3. **Fallacy Detection**: Only flag clear, well-defined fallacies:
   - Ad hominem, straw man, false dichotomy, appeal to authority
   - Hasty generalization, slippery slope, circular reasoning
   - Correlation/causation confusion, survivorship bias
4. **Principle of Charity**: Before flagging something:
   - Could this be interpreted in a way that ISN'T fallacious?
   - Is this a genuine reasoning error or just a disagreement?
   - Would an expert in the field consider this problematic?

Do NOT flag:
- Rhetorical emphasis or persuasive writing style
- Disagreements dressed up as logical errors
- Minor imprecisions that don't affect the argument

Return only clear, defensible findings with specific quoted text and explanation.`,

  "spell-checker": `You are a writing quality specialist. Your mission is to assess clarity, coherence, and potential issues in document writing.

## Assess
1. **Clarity**: Are claims and arguments clearly stated? Is there ambiguous language?
2. **Coherence**: Does the document flow logically? Are there contradictions?
3. **Misleading Framing**: Does the writing frame issues in a way that could mislead readers?
4. **Missing Context**: Are important caveats or counterpoints omitted?
5. **Contradictions**: Does the document contradict itself?

## Do NOT flag
- Minor grammar/spelling issues (not your job)
- Stylistic preferences
- Writing that's clear but informal

Focus on substantive quality issues that affect the reader's understanding.
Return findings with specific quoted text and explanation of the issue.`,

  "math-checker": `You are a technical validation specialist. Your mission is to verify mathematical claims, statistical reasoning, and methodological soundness.

## Check
1. **Mathematical Claims**: Verify calculations, percentages, and numerical claims
2. **Statistical Reasoning**: Check for:
   - Misuse of statistics (e.g., confusing mean/median, cherry-picking timeframes)
   - Sample size issues
   - Base rate neglect
3. **Methodology**: Assess whether described methods are sound
4. **Forecasting**: If predictions are made, check:
   - Is the methodology described?
   - Are confidence intervals mentioned?
   - Are assumptions explicit?

Use web search to verify specific numbers, formulas, or methodological claims when needed.
Return findings with specific details about what's wrong and why.`,
} as const;

// ---------------------------------------------------------------------------
// Sub-agent description blurbs (for the SDK AgentDefinition.description field)
// ---------------------------------------------------------------------------

const SUBAGENT_DESCRIPTIONS: Record<string, string> = {
  "fact-checker": "Specialist in verifying factual claims using web search and evidence evaluation",
  "fallacy-checker": "Expert at identifying logical fallacies and reasoning errors",
  "spell-checker": "Specialist in assessing writing clarity, coherence, and potential misleading framing",
  "math-checker": "Expert at validating math, statistics, and methodological claims",
};

// Which sub-agents get web search tools (vs pure reasoning)
const SUBAGENTS_WITH_WEB_TOOLS = new Set([
  "fact-checker",
  "math-checker",
]);

// ---------------------------------------------------------------------------
// Build sub-agent definitions from profile config
// ---------------------------------------------------------------------------

export function buildSubAgentDefinitions(
  config: AgenticProfileConfig
): Record<string, AgentDefinition> {
  const subAgentConfigs = config.subAgents ?? DEFAULT_SUBAGENTS;
  const agents: Record<string, AgentDefinition> = {};

  for (const [name, sa] of Object.entries(subAgentConfigs)) {
    if (!sa.enabled) continue;

    const prompt = SUBAGENT_PROMPTS[name as keyof typeof SUBAGENT_PROMPTS];
    if (!prompt) continue;

    // Build tools list
    const tools: string[] = [];

    // Web tools for agents that need them
    if (SUBAGENTS_WITH_WEB_TOOLS.has(name)) {
      tools.push("WebSearch", "WebFetch");
    }

    // MCP evaluation tools if enabled
    if (config.enableMcpTools) {
      const mcpTools = getMcpToolsForAgent(name);
      tools.push(...mcpTools);
    }

    agents[name] = {
      description: SUBAGENT_DESCRIPTIONS[name] || `Specialized sub-agent: ${name}`,
      prompt,
      model: sa.model === "inherit" ? undefined : (sa.model ?? undefined),
      tools: tools.length > 0 ? tools : undefined,
      ...(sa.maxTurns && { maxTurns: sa.maxTurns }),
    };
  }

  return agents;
}

/**
 * Get MCP tool names for a given agent (when enableMcpTools is true)
 */
function getMcpToolsForAgent(agentName: string): string[] {
  switch (agentName) {
    case "fact-checker":
      return ["mcp__roast-evaluators__fact_check"];
    case "fallacy-checker":
      return ["mcp__roast-evaluators__fallacy_check"];
    case "spell-checker":
      return ["mcp__roast-evaluators__spell_check"];
    case "math-checker":
      return [
        "mcp__roast-evaluators__math_check",
        "mcp__roast-evaluators__forecast_check",
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Build full SDK query options from profile config
// ---------------------------------------------------------------------------

export function buildAgenticQueryOptions(
  config: AgenticProfileConfig,
  evaluationServer: McpSdkServerConfigWithInstance
): Partial<Options> {
  logger.info(`buildAgenticQueryOptions: version=${config.version} enableSubAgents=${config.enableSubAgents} enableMcpTools=${config.enableMcpTools}`);

  if (!config.enableSubAgents) {
    // Single-agent mode - explicitly pass empty agents to disable built-in agents
    logger.info("Using single-agent mode");
    return {
      model: config.model,
      maxTurns: config.maxTurns,
      maxBudgetUsd: config.maxBudgetUsd,
      systemPrompt: config.systemPrompt || AGENTIC_SYSTEM_PROMPT,
      allowedTools: config.allowedTools,
      permissionMode: config.permissionMode,
      agents: {}, // Disable built-in agents like Bash, Explore, etc.
      ...(config.maxThinkingTokens && { maxThinkingTokens: config.maxThinkingTokens }),
    };
  }

  // Multi-agent mode
  const agents = buildSubAgentDefinitions(config);
  logger.info(`Using multi-agent mode with ${Object.keys(agents).length} agents: ${Object.keys(agents).join(", ")}`);

  // Build allowed tools for orchestrator
  const allowedTools = [
    "Task", // Required for spawning sub-agents
    ...config.allowedTools,
  ];

  // Add MCP tool names to allowed list if MCP tools are enabled
  if (config.enableMcpTools) {
    allowedTools.push(
      "mcp__roast-evaluators__fact_check",
      "mcp__roast-evaluators__fallacy_check",
      "mcp__roast-evaluators__spell_check",
      "mcp__roast-evaluators__math_check",
      "mcp__roast-evaluators__forecast_check"
    );
  }

  return {
    model: config.model,
    maxTurns: config.maxTurns,
    maxBudgetUsd: config.maxBudgetUsd,
    systemPrompt: config.orchestratorPrompt || ORCHESTRATOR_PROMPT,
    agents,
    mcpServers: config.enableMcpTools
      ? { "roast-evaluators": evaluationServer }
      : undefined,
    allowedTools: [...new Set(allowedTools)], // dedupe
    permissionMode: config.permissionMode,
    ...(config.maxThinkingTokens && { maxThinkingTokens: config.maxThinkingTokens }),
  };
}
